const mongoose = require('mongoose');

// Connects to MongoDB. The promise is cached so a serverless instance
// reconnects at most once, and every caller can await the same attempt.
// Errors are re-thrown rather than exiting the process, because a serverless
// function must stay alive to answer the next request; the local entry point
// (server.js) decides for itself whether a failure is fatal.
let connectionPromise = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose
    .connect(process.env.MONGO_URI)
    .then((conn) => {
      console.log(`MongoDB connected: ${conn.connection.host}`);
      return conn;
    })
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
};

module.exports = connectDB;
