const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const { protect } = require('../middleware/auth');
const {
  register,
  login,
  forgotPassword,
  resetPassword,
  getMe,
  updateProfile,
  updateProfilePicture,
} = require('../controllers/authController');

router.post('/register', upload.single('profilePicture'), register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/profile-picture', protect, upload.single('profilePicture'), updateProfilePicture);

module.exports = router;
