require('dotenv').config();

const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');

const { notFound, errorHandler } = require('./middleware/errorHandler');
const { allowedOrigins, isAllowedOrigin, describeConfigProblems } = require('./utils/clientOrigin');

// Builds the Express app. Kept free of any DB connection or listener so the
// same app can be served by server.js locally and by a serverless function
// on Vercel (which must export the app, never call app.listen).
const createServer = () => {
  const app = express();

  // IMPORTANT: the Paystack webhook needs the RAW body to verify its HMAC
  // signature, so it must be registered BEFORE express.json().
  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

  // CORS is driven by CLIENT_URL (comma-separated list). Requests from origins
  // that are not on the list are rejected outright, so a deployed frontend can
  // never be silently blocked by a stale localhost-only value.
  app.use(
    cors({
      origin(origin, callback) {
        if (isAllowedOrigin(origin)) return callback(null, true);
        return callback(new Error(`Origin not allowed by CORS: ${origin}`));
      },
      credentials: true,
    })
  );

  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({ message: 'ROYAL BLIZ API is running' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payments', paymentRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/wishlist', wishlistRoutes);

  app.use(notFound);
  app.use(errorHandler);

  return app;
};

// Surface the allowed origins in the logs so a misconfigured CLIENT_URL is
// obvious on the very first request after a deploy. A wrong value here shows up
// in the browser only as an opaque "blocked by CORS policy" error.
console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
describeConfigProblems().forEach((problem) => {
  console.warn(`[CORS CONFIG WARNING] ${problem}`);
});

module.exports = createServer;
