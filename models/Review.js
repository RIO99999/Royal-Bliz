const mongoose = require('mongoose');

// A buyer's rating + feedback for a purchased product. One review per
// buyer per product (unique index). The product/vendor aggregate ratings
// are derived from these reviews, never from vendor self-rating.
const reviewSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    vendor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

reviewSchema.index({ product: 1, buyer: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
