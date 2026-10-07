const mongoose = require('mongoose');

// A snapshot of a product inside an order, so it keeps its
// name/price even if the product later changes.
const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, default: '' },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    shippingAddress: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },
    paymentReference: { type: String, default: '' },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed'],
      default: 'pending',
    },
    orderStatus: {
      type: String,
      enum: ['processing', 'shipped', 'delivered', 'cancelled'],
      default: 'processing',
    },
    orderNumber: { type: String, required: true, unique: true },
    receiptNumber: { type: String, default: '' },
    receiptUrl: { type: String, default: '' },
    receiptPublicId: { type: String, default: '' },
    paidAt: { type: Date },
    // Carrier tracking number, filled in by the vendor when shipping.
    trackingNumber: { type: String, default: '' },
    // Timeline of status changes used for order tracking.
    statusHistory: [
      {
        status: {
          type: String,
          enum: ['processing', 'shipped', 'delivered', 'cancelled'],
        },
        at: { type: Date },
        _id: false,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
