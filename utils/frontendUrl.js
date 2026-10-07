// The frontend address used for links the backend sends in emails and Paystack
// redirects (password reset, receipt, payment callback).
//
// It prefers the Origin header of the incoming request, so the link always
// points at the site the user is actually on — even when Vercel gives your
// frontend a new URL. Falls back to CLIENT_URL, then localhost for dev.
const DEFAULT_ORIGIN = 'http://localhost:5173';

const stripSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

const frontendUrl = (origin) => stripSlash(origin || process.env.CLIENT_URL) || DEFAULT_ORIGIN;

module.exports = frontendUrl;
