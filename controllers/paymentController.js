const crypto = require('crypto');
const Order = require('../models/Order');
const sendEmail = require('../utils/sendEmail');
const { generateReceipt, generateReceiptNumber } = require('../utils/receipt');
const { uploadRaw, getSignedRawUrl } = require('../utils/cloudinaryUpload');
const frontendUrl = require('../utils/frontendUrl');

// Convert Paystack channel codes into friendly names for the receipt.
const friendlyChannel = (channel) => {
  const map = {
    card: 'Card',
    bank: 'Bank Transfer',
    bank_transfer: 'Bank Transfer',
    ussd: 'USSD',
    qr: 'QR Code',
    mobile_money: 'Mobile Money',
  };
  return map[channel] || 'Paystack';
};

// Mark an order as paid, generate the receipt (once), and email the buyer.
// This is safe to call multiple times: it never creates duplicate receipts.
const finalizePaidOrder = async (order, paymentMethod) => {
  const wasAlreadyPaid = order.paymentStatus === 'paid';

  if (!wasAlreadyPaid) {
    order.paymentStatus = 'paid';
    order.paidAt = new Date();
    await order.save();
  }

  // Generate the receipt only if it does not already exist.
  if (!order.receiptUrl) {
    try {
      order.receiptNumber = await generateReceiptNumber();
      const pdfBuffer = await generateReceipt(order, paymentMethod);
      const uploaded = await uploadRaw(pdfBuffer, 'royal-bliz/receipts', order.receiptNumber);
      order.receiptUrl = uploaded.url;
      order.receiptPublicId = uploaded.publicId;
      await order.save();
    } catch (error) {
      // Payment stays PAID; receipt generation can be retried later.
      console.error('Receipt generation failed:', error.message);
    }
  }

  // Email the receipt/download link once (on the transition to paid).
  if (!wasAlreadyPaid) {
    const receiptLink = `${frontendUrl}/buyer/orders/${order._id}`;
    sendEmail({
      to: order.shippingAddress.email,
      subject: `Payment received — ${order.orderNumber}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e9f0;border-radius:12px;overflow:hidden">
        <div style="background:#0B1F3A;color:#fff;padding:24px;text-align:center">
          <h1 style="margin:0;color:#fff">ROYAL BLIZ</h1>
          <p style="margin:4px 0 0;color:#F28C28">SHOP • SELL • GROW</p>
        </div>
        <div style="padding:24px;color:#1f2a37">
          <h2>Payment received</h2>
          <p>Thank you! Your payment for order <strong>${order.orderNumber}</strong> has been confirmed.</p>
          <p>Receipt number: <strong>${order.receiptNumber || '—'}</strong></p>
          <p style="text-align:center;margin:28px 0"><a href="${receiptLink}" style="background:#F28C28;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">View Order &amp; Download Receipt</a></p>
        </div>
      </div>`,
    });
  }
};

const orderSummary = (order) => ({
  _id: order._id,
  orderNumber: order.orderNumber,
  paymentStatus: order.paymentStatus,
  orderStatus: order.orderStatus,
  totalAmount: order.totalAmount,
  receiptUrl: getSignedRawUrl(order.receiptPublicId),
  receiptNumber: order.receiptNumber,
  createdAt: order.createdAt,
});

// POST /api/payments/initialize  (protected - buyer)
const initializePayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ message: 'Order id is required' });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    if (order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    if (order.paymentStatus === 'paid') {
      return res.status(400).json({ message: 'This order is already paid' });
    }

    const reference = order.paymentReference || `RB-${order.orderNumber}-${Date.now()}`;
    order.paymentReference = reference;
    await order.save();

    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: order.shippingAddress.email,
        amount: Math.round(order.totalAmount * 100), // kobo
        currency: 'NGN',
        reference,
        callback_url: `${frontendUrl}/payment/verify?reference=${reference}`,
        metadata: { orderId: order._id.toString() },
      }),
    });

    const data = await response.json();
    if (!data.status) {
      return res.status(400).json({ message: data.message || 'Could not initialize payment' });
    }

    res.json({
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
      reference,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/payments/verify/:reference  (protected)
const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.params;

    const order = await Order.findOne({ paymentReference: reference });
    if (!order) {
      return res.status(404).json({ message: 'Order not found for this reference' });
    }

    if (req.user.role === 'buyer' && order.buyer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Idempotent: already paid -> return success and ensure receipt exists.
    if (order.paymentStatus === 'paid') {
      await finalizePaidOrder(order, 'Paystack');
      return res.json({ status: true, message: 'Payment already verified', order: orderSummary(order) });
    }

    const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
    });
    const data = await response.json();

    if (!data.status || data.data.status !== 'success') {
      order.paymentStatus = 'failed';
      await order.save();
      return res.json({ status: false, message: 'Payment was not successful' });
    }

    // Verify reference amount and currency server-side. Never trust the client.
    const expectedAmount = Math.round(order.totalAmount * 100);
    if (data.data.amount !== expectedAmount || data.data.currency !== 'NGN') {
      order.paymentStatus = 'failed';
      await order.save();
      return res.json({ status: false, message: 'Payment amount or currency mismatch' });
    }

    await finalizePaidOrder(order, friendlyChannel(data.data.channel));

    return res.json({ status: true, message: 'Payment verified successfully', order: orderSummary(order) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/payments/webhook  (no auth - secured by HMAC signature)
const webhook = async (req, res) => {
  try {
    const signature = req.headers['x-paystack-signature'];
    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
      .update(req.body) // req.body is a Buffer here (express.raw)
      .digest('hex');

    if (hash !== signature) {
      return res.status(401).send('Invalid signature');
    }

    const event = JSON.parse(req.body.toString());

    if (event.event === 'charge.success') {
      const data = event.data;
      const reference = data.reference;

      const order = await Order.findOne({ paymentReference: reference });
      if (!order) {
        return res.sendStatus(200);
      }

      // Idempotent: already paid, nothing to do.
      if (order.paymentStatus === 'paid') {
        return res.sendStatus(200);
      }

      const expectedAmount = Math.round(order.totalAmount * 100);
      if (data.currency !== 'NGN' || data.amount !== expectedAmount) {
        order.paymentStatus = 'failed';
        await order.save();
        return res.sendStatus(200);
      }

      await finalizePaidOrder(order, friendlyChannel(data.channel));
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error.message);
    res.sendStatus(200);
  }
};

module.exports = { initializePayment, verifyPayment, webhook };
