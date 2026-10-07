const Order = require('../models/Order');
const Product = require('../models/Product');
const sendEmail = require('../utils/sendEmail');
const { getSignedRawUrl } = require('../utils/cloudinaryUpload');
const { generateReceipt } = require('../utils/receipt');
const { isPhoneValid, PHONE_HINT } = require('../utils/validators');

// Create a human-friendly order number.
const generateOrderNumber = () => {
  return `RB-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
};

const naira = (amount) =>
  'NGN ' + Number(amount || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 });

// POST /api/orders  (protected - buyer)
const createOrder = async (req, res) => {
  try {
    const { items, shippingAddress } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty' });
    }
    if (!shippingAddress || !shippingAddress.name || !shippingAddress.email || !shippingAddress.phone || !shippingAddress.address) {
      return res.status(400).json({ message: 'Please fill in all shipping details' });
    }
    if (!isPhoneValid(shippingAddress.phone)) {
      return res.status(400).json({ message: PHONE_HINT });
    }

    const orderItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({ message: 'A product in your cart no longer exists' });
      }
      const quantity = Number(item.quantity) || 1;

      if (product.stock < quantity) {
        return res.status(400).json({ message: `Not enough stock for "${product.name}"` });
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity,
      });
      totalAmount += product.price * quantity;

      // Reduce stock for this demo flow.
      product.stock -= quantity;
      await product.save();
    }

    const order = await Order.create({
      buyer: req.user._id,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentStatus: 'pending',
      orderStatus: 'processing',
      orderNumber: generateOrderNumber(),
      statusHistory: [{ status: 'processing', at: new Date() }],
    });

    // Order confirmation email.
    const itemsHtml = orderItems
      .map((i) => `<li>${i.name} x ${i.quantity} — ${naira(i.price * i.quantity)}</li>`)
      .join('');
    sendEmail({
      to: shippingAddress.email,
      subject: `Order confirmation ${order.orderNumber}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e9f0;border-radius:12px;overflow:hidden">
        <div style="background:#0B1F3A;color:#fff;padding:24px;text-align:center">
          <h1 style="margin:0;color:#fff">ROYAL BLIZ</h1>
          <p style="margin:4px 0 0;color:#F28C28">SHOP • SELL • GROW</p>
        </div>
        <div style="padding:24px;color:#1f2a37">
          <h2>Thanks for your order!</h2>
          <p>Order number: <strong>${order.orderNumber}</strong></p>
          <p>We have received your order and it is awaiting payment.</p>
          <ul>${itemsHtml}</ul>
          <p><strong>Total: ${naira(totalAmount)}</strong></p>
        </div>
      </div>`,
    });

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/orders  (protected)
const getOrders = async (req, res) => {
  try {
    let orders;

    if (req.user.role === 'admin') {
      orders = await Order.find().populate('buyer', 'fullName email').sort({ createdAt: -1 });
    } else if (req.user.role === 'vendor') {
      // Orders that contain at least one of this vendor's products.
      const productIds = (await Product.find({ vendor: req.user._id }).select('_id')).map((p) => p._id);
      orders = await Order.find({ 'items.product': { $in: productIds } })
        .populate('buyer', 'fullName email')
        .sort({ createdAt: -1 });
    } else {
      orders = await Order.find({ buyer: req.user._id }).sort({ createdAt: -1 });
    }

    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/orders/:id  (protected)
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('buyer', 'fullName email');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isBuyer = order.buyer._id.toString() === req.user._id.toString();

    if (isAdmin || isBuyer) {
      return res.json(order);
    }

    // Vendor can view an order if it contains their products.
    if (req.user.role === 'vendor') {
      const productIds = (await Product.find({ vendor: req.user._id }).select('_id')).map((p) => p._id.toString());
      const hasProduct = order.items.some((i) => productIds.includes(i.product.toString()));
      if (hasProduct) {
        return res.json(order);
      }
    }

    return res.status(403).json({ message: 'Not authorized to view this order' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/orders/:id/status  (vendor own products, or admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { orderStatus, trackingNumber } = req.body;
    const valid = ['processing', 'shipped', 'delivered', 'cancelled'];
    if (!valid.includes(orderStatus)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (req.user.role !== 'admin') {
      const productIds = (await Product.find({ vendor: req.user._id }).select('_id')).map((p) => p._id.toString());
      const hasProduct = order.items.some((i) => productIds.includes(i.product.toString()));
      if (!hasProduct) {
        return res.status(403).json({ message: 'Not authorized to update this order' });
      }
    }

    order.orderStatus = orderStatus;
    if (trackingNumber !== undefined) {
      order.trackingNumber = String(trackingNumber).trim();
    }
    order.statusHistory.push({ status: orderStatus, at: new Date() });
    const updated = await order.save();
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/orders/:id/receipt  (protected - buyer own, or admin)
const getReceipt = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isBuyer = order.buyer.toString() === req.user._id.toString();

    if (!isAdmin && !isBuyer) {
      return res.status(403).json({ message: 'Not authorized to access this receipt' });
    }

    if (order.paymentStatus !== 'paid' || !order.receiptUrl) {
      return res.status(404).json({ message: 'Receipt not available' });
    }

    res.json({
      receiptUrl: getSignedRawUrl(order.receiptPublicId),
      receiptNumber: order.receiptNumber,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/orders/:id/receipt/download  (protected - buyer own, or admin)
// Streams a freshly generated PDF so the download never depends on Cloudinary
// raw delivery / signed-URL ACL rules.
const getReceiptDownload = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isBuyer = order.buyer.toString() === req.user._id.toString();

    if (!isAdmin && !isBuyer) {
      return res.status(403).json({ message: 'Not authorized to access this receipt' });
    }

    if (order.paymentStatus !== 'paid') {
      return res.status(400).json({ message: 'Receipt is only available after payment' });
    }

    const pdfBuffer = await generateReceipt(order, 'Paystack');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="receipt-${order.orderNumber}.pdf"`
    );
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getReceipt,
  getReceiptDownload,
};
