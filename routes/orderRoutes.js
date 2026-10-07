const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createOrder,
  getOrders,
  getOrderById,
  updateOrderStatus,
  getReceipt,
  getReceiptDownload,
} = require('../controllers/orderController');

router.post('/', protect, createOrder);
router.get('/', protect, getOrders);
router.get('/:id/receipt', protect, getReceipt);
router.get('/:id/receipt/download', protect, getReceiptDownload);
router.get('/:id', protect, getOrderById);
router.put('/:id/status', protect, authorize('vendor', 'admin'), updateOrderStatus);

module.exports = router;
