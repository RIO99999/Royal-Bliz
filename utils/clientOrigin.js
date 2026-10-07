// Resolves which frontend origin(s) the API should trust and link back to.
//
// CLIENT_URL is a comma-separated list of ORIGINS. An origin is only
// scheme + host + optional port: never a path, query or fragment.
//   CLIENT_URL=https://royal-bliz.vercel.app,http://localhost:5173
//
// Common mistakes are tolerated rather than silently breaking CORS, because a
// wrong value here makes every browser request fail with "blocked by CORS
// policy" and no useful server-side explanation:
//   royal-bliz.vercel.app                 -> https://royal-bliz.vercel.app
//   https://royal-blizz-ebon.vercel.app/login -> https://royal-blizz-ebon.vercel.app
//   https://site.com/                     -> https://site.com

const DEFAULT_CLIENT_ORIGIN = 'http://localhost:5173';

function normalizeOrigin(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const { protocol, host } = new URL(withScheme);
    return host ? `${protocol}//${host}` : null; // path/query/hash are dropped
  } catch {
    return null;
  }
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

// A value that normalisation changed, or that could not be parsed, is almost
// always a misconfiguration worth shouting about on boot.
function describeConfigProblems() {
  const problems = [];
  const raw = String(process.env.CLIENT_URL || '');
  if (!raw) return problems;

  for (const entry of raw.split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    const normalized = normalizeOrigin(trimmed);
    if (!normalized) {
      problems.push(`"${trimmed}" is not a valid origin and was ignored`);
    } else if (normalized !== trimmed) {
      problems.push(`"${trimmed}" was interpreted as "${normalized}"`);
    }
  }

  // In production a localhost-only list means no real visitor can reach the API.
  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 1) {
    if (/localhost|127\.0\.0\.1/.test(allowedOrigins[0])) {
      problems.push(
        `only localhost is allowed in production (${allowedOrigins[0]}); ` +
          'set CLIENT_URL to your deployed frontend origin'
      );
    }
  }

  return problems;
}

module.exports = {
  allowedOrigins,
  primaryOrigin,
  normalizeOrigin,
  isAllowedOrigin,
  describeConfigProblems,
};
