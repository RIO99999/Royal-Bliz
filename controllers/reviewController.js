const Product = require('../models/Product');
const User = require('../models/User');
const Review = require('../models/Review');

const round1 = (n) => Math.round(n * 10) / 10;

// Recompute a product's aggregate rating + review count.
const recomputeProductRating = async (productId) => {
  const rows = await Review.aggregate([
    { $match: { product: productId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = rows.length ? rows[0].avg : 0;
  const count = rows.length ? rows[0].count : 0;
  await Product.findByIdAndUpdate(productId, {
    rating: round1(avg),
    ratingCount: count,
  });
  return { avg, count };
};

// Recompute a vendor's aggregate rating across all of their products.
const recomputeVendorRating = async (vendorId) => {
  const rows = await Review.aggregate([
    { $match: { vendor: vendorId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = rows.length ? rows[0].avg : 0;
  const count = rows.length ? rows[0].count : 0;
  await User.findByIdAndUpdate(vendorId, {
    rating: round1(avg),
    ratingCount: count,
  });
  return { avg, count };
};

// GET /api/products/:id/reviews  (public)
const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.id })
      .populate('buyer', 'fullName')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/products/:id/reviews  (buyer only)
const createReview = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const rating = Number(req.body.rating);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    const comment = String(req.body.comment || '').trim();

    // Upsert so a buyer edits their existing review rather than duplicating it.
    const review = await Review.findOneAndUpdate(
      { product: product._id, buyer: req.user._id },
      { rating, comment, vendor: product.vendor },
      { new: true, upsert: true, setDefaultsOnInsert: true, runValidators: true }
    );

    await recomputeProductRating(product._id);
    await recomputeVendorRating(product.vendor);

    res.status(201).json(review);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getReviews, createReview, recomputeProductRating, recomputeVendorRating };
