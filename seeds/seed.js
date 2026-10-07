require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const { uploadImageFromUrl } = require('../utils/cloudinaryUpload');

// Demo products. Each has a remote image URL that Cloudinary fetches and
// stores under "royal-bliz/products", so every product image is hosted on
// Cloudinary (nothing is stored locally).
const demoProducts = [
  {
    name: 'Wireless Bluetooth Headphones',
    description: 'Over-ear wireless headphones with deep bass, noise isolation and 20-hour battery life.',
    price: 25000,
    category: 'Electronics',
    stock: 25,
    rating: 4.5,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
  },
  {
    name: 'Smart Fitness Watch',
    description: 'Track your steps, heart rate and sleep with this stylish waterproof smart watch.',
    price: 18000,
    category: 'Electronics',
    stock: 40,
    rating: 4.2,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
  },
  {
    name: 'Classic Denim Jacket',
    description: 'Timeless blue denim jacket made from premium cotton. A wardrobe essential.',
    price: 15000,
    category: 'Fashion',
    stock: 30,
    rating: 4.4,
    imageUrl: 'https://images.unsplash.com/photo-1551537482-f2075a1d41f2',
  },
  {
    name: 'Everyday Sneakers',
    description: 'Comfortable, lightweight sneakers for everyday wear. Available in multiple sizes.',
    price: 22000,
    category: 'Fashion',
    stock: 35,
    rating: 4.1,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
  },
  {
    name: 'Luxury Skincare Set',
    description: 'A complete skincare routine with cleanser, serum and moisturizer for glowing skin.',
    price: 32000,
    category: 'Beauty',
    stock: 20,
    rating: 4.7,
    imageUrl: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883',
  },
  {
    name: 'Matte Lipstick Collection',
    description: 'Long-lasting matte lipsticks in six rich shades, enriched with vitamin E.',
    price: 9500,
    category: 'Beauty',
    stock: 50,
    rating: 4.3,
    imageUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa',
  },
  {
    name: 'Ceramic Coffee Mug Set',
    description: 'Set of four handcrafted ceramic mugs, perfect for coffee and tea lovers.',
    price: 8000,
    category: 'Home',
    stock: 60,
    rating: 4.6,
    imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d',
  },
  {
    name: 'Scented Soy Candle',
    description: 'Relaxing lavender-scented soy candle with a burn time of over 40 hours.',
    price: 6500,
    category: 'Home',
    stock: 45,
    rating: 4.5,
    imageUrl: 'https://images.unsplash.com/photo-1603006905003-be475563bc59',
  },
  {
    name: 'Yoga Mat',
    description: 'Non-slip, extra-thick yoga mat with carrying strap. Great for home workouts.',
    price: 7000,
    category: 'Sports',
    stock: 55,
    rating: 4.4,
    imageUrl: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f',
  },
  {
    name: 'Football',
    description: 'Durable size 5 football suitable for training and matches on any surface.',
    price: 5500,
    category: 'Sports',
    stock: 70,
    rating: 4.2,
    imageUrl: 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c',
  },
  {
    name: 'Minimalist Leather Watch',
    description: 'Elegant minimalist watch with a genuine leather strap and quartz movement.',
    price: 12000,
    category: 'Accessories',
    stock: 30,
    rating: 4.6,
    imageUrl: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49',
  },
  {
    name: 'Canvas Backpack',
    description: 'Spacious and durable canvas backpack with a padded laptop compartment.',
    price: 14000,
    category: 'Accessories',
    stock: 25,
    rating: 4.3,
    imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62',
  },
];

const seed = async () => {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('Cloudinary is not configured. Add CLOUDINARY_* values to your .env file before seeding.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Ensure a demo vendor exists to own the products.
    let vendor = await User.findOne({ email: 'demo.vendor@royalbliz.com' });
    if (!vendor) {
      vendor = await User.create({
        fullName: 'Demo Vendor',
        email: 'demo.vendor@royalbliz.com',
        password: 'password123',
        role: 'vendor',
        storeName: 'Royal Bliz Demo Store',
        storeDescription: 'The official demo store for ROYAL BLIZ.',
      });
      console.log('Created demo vendor: demo.vendor@royalbliz.com / password123');
    }

    // Remove old demo products (and their Cloudinary assets) to avoid duplicates.
    const oldProducts = await Product.find({ vendor: vendor._id });
    if (oldProducts.length) {
      for (const p of oldProducts) {
        if (p.cloudinaryPublicId) {
          try {
            const cloudinary = require('../config/cloudinary');
            await cloudinary.uploader.destroy(p.cloudinaryPublicId);
          } catch (e) {
            /* best effort */
          }
        }
      }
      await Product.deleteMany({ vendor: vendor._id });
      console.log(`Removed ${oldProducts.length} old demo products`);
    }

    console.log(`Uploading ${demoProducts.length} demo product images to Cloudinary...`);

    for (const item of demoProducts) {
      const uploaded = await uploadImageFromUrl(item.imageUrl, 'royal-bliz/products');
      await Product.create({
        name: item.name,
        description: item.description,
        price: item.price,
        category: item.category,
        stock: item.stock,
        rating: item.rating,
        image: uploaded.url,
        cloudinaryPublicId: uploaded.publicId,
        vendor: vendor._id,
      });
      console.log(`  ✓ ${item.name}`);
    }

    console.log('Demo products seeded successfully.');
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('seed failed:', error.message);
    process.exit(1);
  }
};

seed();
