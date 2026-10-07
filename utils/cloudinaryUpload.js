const cloudinary = require('../config/cloudinary');

// Upload an image buffer straight to Cloudinary (memory storage).
const uploadImage = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'image' },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(fileBuffer);
  });
};

// Upload a non-image file (PDF receipt) as a "raw" resource.
const uploadRaw = (fileBuffer, folder, publicId) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: `${publicId}.pdf`, resource_type: 'raw', overwrite: false },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(fileBuffer);
  });
};

// Upload an image from a remote URL (used by the seed script).
const uploadImageFromUrl = (imageUrl, folder) => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(imageUrl, { folder }, (error, result) => {
      if (error) return reject(error);
      resolve({ url: result.secure_url, publicId: result.public_id });
    });
  });
};

// Delete an image asset. Resolves even on failure (best effort).
const destroyImage = (publicId) => {
  return new Promise((resolve) => {
    if (!publicId) return resolve(null);
    cloudinary.uploader.destroy(publicId, { resource_type: 'image' }, (error, result) => {
      if (error) console.error('Cloudinary destroy failed:', error.message);
      resolve(result);
    });
  });
};

// Delete a raw (PDF) asset. Resolves even on failure (best effort).
const destroyRaw = (publicId) => {
  return new Promise((resolve) => {
    if (!publicId) return resolve(null);
    cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }, (error, result) => {
      if (error) console.error('Cloudinary raw destroy failed:', error.message);
      resolve(result);
    });
  });
};

// Build a SIGNED URL for a raw asset. This works even when the Cloudinary
// account restricts "raw" delivery to signed URLs (avoids "deny or ACL failure").
const getSignedRawUrl = (publicId) => {
  if (!publicId) return '';
  return cloudinary.url(publicId, { resource_type: 'raw', sign_url: true });
};

module.exports = { uploadImage, uploadRaw, uploadImageFromUrl, destroyImage, destroyRaw, getSignedRawUrl };
