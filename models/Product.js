const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    image: {
      type: String,
      required: [true, 'Product image is required'],
    },
    cloudinaryPublicId: {
      type: String,
      required: [true, 'Cloudinary public id is required'],
    },
    category: {
      type: String,
      enum: ['Electronics', 'Fashion', 'Beauty', 'Home', 'Sports', 'Accessories'],
      required: [true, 'Category is required'],
    },
    stock: {
      type: Number,
      required: true,
      min: [0, 'Stock cannot be negative'],
      default: 0,
    },
    // Aggregated rating (computed from buyer reviews, not set by the vendor).
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
