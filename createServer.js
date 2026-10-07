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

// Builds the Express app. No DB connection or listener here, so the same app
// works locally (server.js) and on Vercel (api/index.js).
const createServer = () => {
  const app = express();

  // The Paystack webhook needs the RAW body, so register it before express.json().
  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

  // Allow any website to call the API. Auth is by Bearer token in the header,
  // not by browser cookies, so opening CORS is safe here and means you never
  // have to configure an origin allowlist again.
  app.use(cors());

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

module.exports = createServer;
