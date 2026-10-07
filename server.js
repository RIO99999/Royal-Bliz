require('dotenv').config();
const connectDB = require('./config/db');
const createServer = require('./createServer');

// Local / traditional-host entry point. The Vercel function uses api/index.js,
// which connects per request instead of opening a listener.
connectDB()
  .then(() => {
    const app = createServer();
    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((error) => {
    console.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  });
