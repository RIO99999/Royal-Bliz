const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getDashboard,
  getUsers,
  getVendors,
  getProducts,
  getOrders,
  updateVendorStatus,
} = require('../controllers/adminController');

// Every admin route requires a logged-in admin.
router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.get('/vendors', getVendors);
router.get('/products', getProducts);
router.get('/orders', getOrders);
router.patch('/vendors/:id/status', updateVendorStatus);

module.exports = router;
