// 404 handler for unknown routes.
const notFound = (req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
};

// Central error handler.
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  // Multer errors and our own thrown errors carry a message.
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Server error';

  res.status(statusCode).json({
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
};

module.exports = { notFound, errorHandler };
