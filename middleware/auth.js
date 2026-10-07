const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes: require a valid JWT and attach req.user.
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

// Role-based middleware. Usage: authorize('vendor', 'admin')
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Not authorized to access this route' });
    }
    next();
  };
};

module.exports = { protect, authorize };
