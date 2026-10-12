
const connectDB = require('../config/db');
const createServer = require('../createServer');

const app = createServer();

let connection = null;
const ensureConnected = () => {
  if (!connection) {
    connection = connectDB().catch((error) => {
      connection = null; // let the next request retry
      throw error;
    });
  }
  return connection;
};

module.exports = async (req, res) => {
  try {
    await ensureConnected();
  } catch (error) {
    console.error('Database connection failed:', error.message);
    res.status(503).json({ message: 'Database unavailable, please retry' });
    return;
  }
  return app(req, res);
};
