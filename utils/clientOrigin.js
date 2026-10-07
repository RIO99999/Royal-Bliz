// Resolves which frontend origin(s) the API should trust and link back to.
//
// CLIENT_URL is a comma-separated list, so the same deployment can serve a
// local Vite dev server and a deployed frontend without editing code:
//   CLIENT_URL=https://royal-bliz.vercel.app,http://localhost:5173
//
// A trailing slash and a missing protocol are both tolerated:
//   royal-bliz.vercel.app  ->  https://royal-bliz.vercel.app

const DEFAULT_CLIENT_ORIGIN = 'http://localhost:5173';

function normalizeOrigin(value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

// Every origin allowed to call the API with CORS.
const allowedOrigins = String(process.env.CLIENT_URL || DEFAULT_CLIENT_ORIGIN)
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

// The single origin used inside emails and payment redirect URLs.
// Emails and Paystack return URLs can only point at one place, so the first
// entry wins — put your deployed frontend first once it exists.
const primaryOrigin = allowedOrigins[0] || DEFAULT_CLIENT_ORIGIN;

function isAllowedOrigin(origin) {
  // Same-origin, curl, Postman and server-to-server calls send no Origin header.
  if (!origin) return true;
  return allowedOrigins.includes(normalizeOrigin(origin));
}

module.exports = { allowedOrigins, primaryOrigin, normalizeOrigin, isAllowedOrigin };
