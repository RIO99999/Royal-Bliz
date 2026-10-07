const PDFDocument = require('pdfkit');
const Order = require('../models/Order');

// Format a number as Nigerian Naira.
const naira = (amount) => {
  return 'NGN ' + Number(amount || 0).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

// Generate a unique receipt number like "RB-2025-000123".
const generateReceiptNumber = async () => {
  let number = '';
  let exists = true;
  while (exists) {
    const year = new Date().getFullYear();
    const seq = String(Math.floor(100000 + Math.random() * 900000));
    number = `RB-${year}-${seq}`;
    // Make sure it is unique in the database.
    const found = await Order.findOne({ receiptNumber: number });
    exists = !!found;
  }
  return number;
};

// Generate a professional PDF receipt and return it as a Buffer.
const generateReceipt = (order, paymentMethod = 'Paystack') => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const navy = '#0B1F3A';
    const blue = '#163A63';
    const orange = '#F28C28';
    const gray = '#6B7280';
    const light = '#F5F7FA';

    // Header band
    doc.rect(0, 0, doc.page.width, 130).fill(navy);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(30).text('ROYAL BLIZ', 50, 40);
    doc.font('Helvetica').fontSize(12).fillColor(orange).text('SHOP • SELL • GROW', 50, 80);

    doc.font('Helvetica-Bold').fontSize(16).fillColor('#FFFFFF').text('Official Payment Receipt', 50, 105);

    // Receipt meta (right aligned)
    doc.font('Helvetica').fontSize(10).fillColor('#FFFFFF').text(`Receipt No: ${order.receiptNumber}`, 50, 105, { align: 'right' });
    doc.text(`Order No: ${order.orderNumber}`, 50, 120, { align: 'right' });

    // Customer details
    let y = 160;
    doc.fillColor(blue).font('Helvetica-Bold').fontSize(13).text('Customer Details', 50, y);
    y += 22;
    doc.fillColor('#1F2A37').font('Helvetica').fontSize(11);
    doc.text(`Name:   ${order.shippingAddress.name}`, 50, y);
    doc.text(`Email:  ${order.shippingAddress.email}`, 50, y + 16);
    doc.text(`Phone:  ${order.shippingAddress.phone}`, 50, y + 32);
    doc.text(`Address: ${order.shippingAddress.address}`, 50, y + 48);

    y += 80;

    // Items table header
    doc.fillColor(light).rect(50, y, doc.page.width - 100, 22).fill();
    doc.fillColor(navy).font('Helvetica-Bold').fontSize(10);
    doc.text('Item', 60, y + 7, { width: 220 });
    doc.text('Qty', 290, y + 7, { width: 50, align: 'right' });
    doc.text('Price', 370, y + 7, { width: 80, align: 'right' });
    doc.text('Total', 460, y + 7, { width: 80, align: 'right' });
    y += 22;

    // Items rows
    doc.font('Helvetica').fontSize(10).fillColor('#1F2A37');
    order.items.forEach((item) => {
      doc.text(item.name, 60, y + 7, { width: 220 });
      doc.text(String(item.quantity), 290, y + 7, { width: 50, align: 'right' });
      doc.text(naira(item.price), 370, y + 7, { width: 80, align: 'right' });
      doc.text(naira(item.price * item.quantity), 460, y + 7, { width: 80, align: 'right' });
      y += 22;
    });

    y += 10;

    // Totals
    const subtotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipping = order.shippingFee || 0;
    const discount = order.discount || 0;
    const totalPaid = order.totalAmount;

    const line = (label, value, isBold = false) => {
      doc.font(isBold ? 'Helvetica-Bold' : 'Helvetica').fontSize(11);
      doc.fillColor(isBold ? navy : '#1F2A37');
      doc.text(label, 380, y, { width: 100 });
      doc.text(value, 480, y, { width: 100, align: 'right' });
      y += 20;
    };

    line('Subtotal', naira(subtotal));
    line('Shipping', naira(shipping));
    line('Discount', '-' + naira(discount));
    doc.moveTo(380, y).lineTo(560, y).stroke(gray).strokeOpacity(0.4);
    y += 6;
    line('Total Paid', naira(totalPaid), true);

    y += 14;

    // Payment info
    doc.fillColor(blue).font('Helvetica-Bold').fontSize(13).text('Payment Information', 50, y);
    y += 22;
    doc.fillColor('#1F2A37').font('Helvetica').fontSize(11);
    doc.text(`Payment Method:   ${paymentMethod}`, 50, y);
    doc.text(`Payment Reference: ${order.paymentReference}`, 50, y + 16);
    doc.text(`Payment Date:      ${new Date(order.paidAt || Date.now()).toLocaleString()}`, 50, y + 32);
    doc.text(`Currency:          NGN`, 50, y + 48);
    doc.text(`Payment Status:    PAID`, 50, y + 64);

    // Footer
    doc.fillColor(gray).font('Helvetica').fontSize(9).text('Thank you for shopping with ROYAL BLIZ.', 50, doc.page.height - 80);
    doc.text('This is a computer-generated receipt and does not require a signature.', 50, doc.page.height - 65);

    doc.end();
  });
};

module.exports = { generateReceipt, generateReceiptNumber, naira };
