const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');

// GET /api/admin/dashboard  (admin only)
const getDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'buyer' });
    const totalVendors = await User.countDocuments({ role: 'vendor' });
    const totalProducts = await Product.countDocuments();
    const totalOrders = await Order.countDocuments();

    const paidOrders = await Order.find({ paymentStatus: 'paid' });
    const totalSales = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('buyer', 'fullName email');

    const recentProducts = await Product.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('vendor', 'fullName storeName');

    res.json({
      totalUsers,
      totalVendors,
      totalProducts,
      totalOrders,
      totalSales,
      recentOrders,
      recentProducts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/users  (admin only - buyers)
const getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'buyer' }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/vendors  (admin only)
const getVendors = async (req, res) => {
  try {
    const vendors = await User.find({ role: 'vendor' }).select('-password').sort({ createdAt: -1 });

    const withCounts = await Promise.all(
      vendors.map(async (vendor) => {
        const productCount = await Product.countDocuments({ vendor: vendor._id });
        return { ...vendor.toObject(), productCount };
      })
    );

    res.json(withCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/products  (admin only)
const getProducts = async (req, res) => {
  try {
    const products = await Product.find().populate('vendor', 'fullName storeName').sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/admin/orders  (admin only)
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find().populate('buyer', 'fullName email').sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /api/admin/vendors/:id/status  (admin only - deactivate/activate)
const updateVendorStatus = async (req, res) => {
  try {
    const vendor = await User.findById(req.params.id);
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    const { isActive } = req.body;
    vendor.isActive = isActive !== undefined ? Boolean(isActive) : !vendor.isActive;
    await vendor.save();

    res.json({ message: `Vendor ${vendor.isActive ? 'activated' : 'deactivated'}` });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getDashboard,
  getUsers,
  getVendors,
  getProducts,
  getOrders,
  updateVendorStatus,
};
