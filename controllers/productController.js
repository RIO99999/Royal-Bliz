const Product = require('../models/Product');
const User = require('../models/User');
const { uploadImage, destroyImage } = require('../utils/cloudinaryUpload');

// GET /api/products  (public, with search/filter/sort)
const getProducts = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, sort, vendor } = req.query;

    const query = {};

    if (search) {
      // Match the product name OR the vendor's store name / full name.
      const matchingVendors = await User.find({
        role: 'vendor',
        $or: [
          { storeName: { $regex: search, $options: 'i' } },
          { fullName: { $regex: search, $options: 'i' } },
        ],
      }).select('_id');
      const vendorIds = matchingVendors.map((v) => v._id);
      query.$or = [{ name: { $regex: search, $options: 'i' } }];
      if (vendorIds.length) {
        query.$or.push({ vendor: { $in: vendorIds } });
      }
    }
    if (category && category !== 'All') {
      query.category = category;
    }
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (vendor) {
      query.vendor = vendor;
    }

    let sortOption = { createdAt: -1 };
    if (sort === 'price-asc') sortOption = { price: 1 };
    if (sort === 'price-desc') sortOption = { price: -1 };
    if (sort === 'rating') sortOption = { rating: -1 };

    const products = await Product.find(query)
      .populate('vendor', 'fullName storeName rating ratingCount')
      .sort(sortOption);

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/products/:id  (public)
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('vendor', 'fullName storeName rating ratingCount');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/products/vendors  (public - list active vendors for filtering)
const getVendors = async (req, res) => {
  try {
    const vendors = await User.find({ role: 'vendor', isActive: true })
      .select('_id fullName storeName')
      .sort({ storeName: 1 });
    res.json(vendors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// POST /api/products  (vendor only, multipart "image")
const createProduct = async (req, res) => {
  try {
    const { name, description, price, category, stock } = req.body;

    if (!name || !description || !price || !category) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a product image' });
    }

    const uploaded = await uploadImage(req.file.buffer, 'royal-bliz/products');

    // Rating is derived from buyer reviews, never set by the vendor.
    const product = await Product.create({
      name,
      description,
      price: Number(price),
      category,
      stock: stock !== undefined ? Number(stock) : 0,
      image: uploaded.url,
      cloudinaryPublicId: uploaded.publicId,
      vendor: req.user._id,
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/products/:id  (vendor, own product only)
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Vendors can only modify their own products.
    if (product.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only edit your own products' });
    }

    const { name, description, price, category, stock } = req.body;

    if (name !== undefined) product.name = name;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (category !== undefined) product.category = category;
    if (stock !== undefined) product.stock = Number(stock);
    // Rating is derived from buyer reviews; the vendor cannot set it.

    // If a new image is provided, replace it and delete the old asset.
    if (req.file) {
      const uploaded = await uploadImage(req.file.buffer, 'royal-bliz/products');
      if (product.cloudinaryPublicId) {
        await destroyImage(product.cloudinaryPublicId);
      }
      product.image = uploaded.url;
      product.cloudinaryPublicId = uploaded.publicId;
    }

    const updated = await product.save();
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// DELETE /api/products/:id  (vendor own product, or admin any product)
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = product.vendor.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'You can only delete your own products' });
    }

    // Remove the image asset from Cloudinary.
    if (product.cloudinaryPublicId) {
      await destroyImage(product.cloudinaryPublicId);
    }

    await product.deleteOne();
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  getProductById,
  getVendors,
  createProduct,
  updateProduct,
  deleteProduct,
};
