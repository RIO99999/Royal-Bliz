const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
    },
    profilePicture: {
      type: String,
      default: '',
    },
    profilePicturePublicId: {
      type: String,
      default: '',
    },
    // Role is decided ONLY on the backend. Never accept role blindly from client.
    role: {
      type: String,
      enum: ['buyer', 'vendor', 'admin'],
      default: 'buyer',
    },
    storeName: {
      type: String,
      default: '',
    },
    storeDescription: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    address: {
      type: String,
      default: '',
    },
    // Aggregated vendor rating (computed from buyer reviews).
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    // Admin can deactivate a vendor (or any user).
    isActive: {
      type: Boolean,
      default: true,
    },
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    resetPasswordToken: {
      type: String,
      default: '',
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Hash the password before saving (only when it changed).
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare a plain password with the stored hash.
userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
