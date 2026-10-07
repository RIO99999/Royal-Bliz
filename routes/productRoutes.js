const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const {
  getProducts,
  getProductById,
  getVendors,
  createProduct,
  updateProduct,
  deleteProduct,
} = require('../controllers/productController');
const { getReviews, createReview } = require('../controllers/reviewController');

router.get('/', getProducts);
router.get('/vendors', getVendors);
router.get('/:id', getProductById);
router.get('/:id/reviews', getReviews);
router.post('/:id/reviews', protect, authorize('buyer'), createReview);
router.post('/', protect, authorize('vendor'), upload.single('image'), createProduct);
router.put('/:id', protect, authorize('vendor'), upload.single('image'), updateProduct);
router.delete('/:id', protect, authorize('vendor', 'admin'), deleteProduct);

module.exports = router;
