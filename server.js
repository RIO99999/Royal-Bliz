require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const wishlistRoutes = require('./routes/wishlistRoutes');

const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// IMPORTANT: the Paystack webhook needs the RAW body to verify its HMAC
// signature, so it must be registered BEFORE express.json().
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
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

connectDB().then(() => {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
