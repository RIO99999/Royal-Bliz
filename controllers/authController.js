const crypto = require('crypto');
const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const { uploadImage, destroyImage } = require('../utils/cloudinaryUpload');
const frontendUrl = require('../utils/frontendUrl');
const {
  isNameValid,
  isPasswordValid,
  isPhoneValid,
  NAME_HINT,
  PASSWORD_HINT,
  PHONE_HINT,
} = require('../utils/validators');

// Return a user object without the password.
const sanitizeUser = (user) => {
  const obj = user.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  return obj;
};

// POST /api/auth/register  (multipart: optional "profilePicture" file)
const register = async (req, res) => {
  try {
    const { fullName, email, password, confirmPassword, role } = req.body;

    if (!fullName || !email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'Please fill in all required fields' });
    }
    if (!isNameValid(fullName)) {
      return res.status(400).json({ message: NAME_HINT });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    if (!isPasswordValid(password)) {
      return res.status(400).json({ message: PASSWORD_HINT });
    }

    // Only Buyer or Vendor can be chosen. Admin is never created from signup.
    const allowedRole = role === 'vendor' ? 'vendor' : 'buyer';

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: 'This email is already registered' });
    }

    let profilePicture = '';
    let profilePicturePublicId = '';

    if (req.file) {
      const uploaded = await uploadImage(req.file.buffer, 'royal-bliz/profiles');
      profilePicture = uploaded.url;
      profilePicturePublicId = uploaded.publicId;
    }

    const user = await User.create({
      fullName,
      email,
      password,
      role: allowedRole,
      profilePicture,
      profilePicturePublicId,
      storeName: allowedRole === 'vendor' ? fullName + "'s Store" : '',
    });

    // Welcome email (non-blocking).
    sendEmail({
      to: user.email,
      subject: 'Welcome to ROYAL BLIZ',
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e9f0;border-radius:12px;overflow:hidden">
        <div style="background:#0B1F3A;color:#fff;padding:24px;text-align:center">
          <h1 style="margin:0;color:#fff">ROYAL BLIZ</h1>
          <p style="margin:4px 0 0;color:#F28C28">SHOP • SELL • GROW</p>
        </div>
        <div style="padding:24px;color:#1f2a37">
          <h2>Welcome, ${user.fullName}!</h2>
          <p>Your ${allowedRole} account has been created successfully. You can now explore the marketplace and start ${allowedRole === 'vendor' ? 'selling your products' : 'shopping'}.</p>
        </div>
      </div>`,
    });

    res.status(201).json({
      token: generateToken(user._id),
      user: sanitizeUser(user),
    });
  } catch (error) {
    // Handle duplicate key race gracefully.
    if (error.code === 11000) {
      return res.status(400).json({ message: 'This email is already registered' });
    }
    res.status(400).json({ message: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please enter email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.isActive) {
      return res.status(403).json({ message: 'Your account has been deactivated. Contact support.' });
    }

    // Role is read from the database here and sent to the client for routing.
    res.json({
      token: generateToken(user._id),
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  // Always return the same message so we don't reveal whether an email exists.
  const generic = { message: 'If that email exists, a reset link has been sent' };

  try {
    if (!email) return res.status(400).json({ message: 'Please enter your email' });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.json(generic);

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
    await user.save();

    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    sendEmail({
      to: user.email,
      subject: 'Reset your ROYAL BLIZ password',
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border:1px solid #e5e9f0;border-radius:12px;overflow:hidden">
        <div style="background:#0B1F3A;color:#fff;padding:24px;text-align:center">
          <h1 style="margin:0;color:#fff">ROYAL BLIZ</h1>
          <p style="margin:4px 0 0;color:#F28C28">Password Reset</p>
        </div>
        <div style="padding:24px;color:#1f2a37">
          <p>Hi ${user.fullName},</p>
          <p>We received a request to reset your password. Click the button below to choose a new one. This link expires in 30 minutes.</p>
          <p style="text-align:center;margin:28px 0">
            <a href="${resetUrl}" style="background:#F28C28;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">Reset Password</a>
          </p>
          <p>If you did not request this, you can safely ignore this email.</p>
        </div>
      </div>`,
    });

    return res.json(generic);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// POST /api/auth/reset-password/:token
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }
    if (!isPasswordValid(password)) {
      return res.status(400).json({ message: PASSWORD_HINT });
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Reset link is invalid or has expired' });
    }

    user.password = password;
    user.resetPasswordToken = '';
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// GET /api/auth/me  (protected)
const getMe = async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
};

// PUT /api/auth/profile  (protected)
const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { fullName, phone, address, storeName, storeDescription } = req.body;

    if (fullName !== undefined) {
      if (!isNameValid(fullName)) {
        return res.status(400).json({ message: NAME_HINT });
      }
      user.fullName = fullName.trim();
    }
    if (phone !== undefined && phone !== '') {
      if (!isPhoneValid(phone)) {
        return res.status(400).json({ message: PHONE_HINT });
      }
      user.phone = phone.trim();
    }
    if (address !== undefined) user.address = address;

    if (user.role === 'vendor') {
      if (storeName !== undefined) user.storeName = storeName;
      if (storeDescription !== undefined) user.storeDescription = storeDescription;
    }

    await user.save();
    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// PUT /api/auth/profile-picture  (protected, multipart "profilePicture")
const updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' });
    }

    const user = await User.findById(req.user._id);

    // Remove the old asset first.
    if (user.profilePicturePublicId) {
      await destroyImage(user.profilePicturePublicId);
    }

    const uploaded = await uploadImage(req.file.buffer, 'royal-bliz/profiles');
    user.profilePicture = uploaded.url;
    user.profilePicturePublicId = uploaded.publicId;
    await user.save();

    res.json({ user: sanitizeUser(user) });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  updateProfilePicture,
};
