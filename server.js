require('dotenv').config();
const connectDB = require('./config/db');
const createServer = require('./createServer');

// Runs the server on your own machine (npm run dev / npm start).
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
