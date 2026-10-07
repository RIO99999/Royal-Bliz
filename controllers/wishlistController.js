const User = require('../models/User');
const Product = require('../models/Product');

// GET /api/wishlist  (protected - buyer)
const getWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    res.json(user.wishlist || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/wishlist/:productId  (protected - buyer)
const addToWishlist = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const user = await User.findById(req.user._id);
    if (!user.wishlist.includes(product._id)) {
      user.wishlist.push(product._id);
      await user.save();
    }

    res.json({ message: 'Added to wishlist', wishlist: user.wishlist });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/wishlist/:productId  (protected - buyer)
const removeFromWishlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.wishlist = user.wishlist.filter(
      (id) => id.toString() !== req.params.productId.toString()
    );
    await user.save();

    res.json({ message: 'Removed from wishlist', wishlist: user.wishlist });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { getWishlist, addToWishlist, removeFromWishlist };
