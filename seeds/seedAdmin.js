require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');

// Creates the single hidden admin from environment variables.
// Usage: npm run seed:admin
const seedAdmin = async () => {
  const { ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.error('Missing ADMIN_EMAIL or ADMIN_PASSWORD in your .env file.');
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    let admin = await User.findOne({ email: ADMIN_EMAIL.toLowerCase() });

    if (admin) {
      admin.fullName = ADMIN_NAME || 'Royal Bliz Admin';
      admin.password = ADMIN_PASSWORD; // will be hashed by the pre-save hook
      admin.role = 'admin';
      await admin.save();
      console.log('Admin already exists — password and details updated.');
    } else {
      admin = await User.create({
        fullName: ADMIN_NAME || 'Royal Bliz Admin',
        email: ADMIN_EMAIL.toLowerCase(),
        password: ADMIN_PASSWORD,
        role: 'admin',
      });
      console.log('Admin created successfully.');
    }

    console.log(`Admin email: ${admin.email}`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('seed:admin failed:', error.message);
    process.exit(1);
  }
};

seedAdmin();
