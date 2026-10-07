// Resolves which frontend origin(s) the API should trust and link back to.
//
// CLIENT_URL is a comma-separated list of ORIGINS. An origin is only
// scheme + host + optional port: never a path, query or fragment.
//   CLIENT_URL=https://royal-bliz.vercel.app,http://localhost:5173
//
// An entry may contain one "*" to cover a whole deployment family, which is
// what Vercel preview URLs need (a NEW url is issued on every deploy):
//   CLIENT_URL=https://royal-blizz-*.vercel.app,http://localhost:5173
//
// Common mistakes are tolerated rather than silently breaking CORS, because a
// wrong value here makes every browser request fail with "blocked by CORS
// policy" and no useful server-side explanation:
//   royal-bliz.vercel.app                     -> https://royal-bliz.vercel.app
//   https://royal-blizz-ttoy.vercel.app/login -> https://royal-blizz-ttoy.vercel.app
//   https://site.com/                         -> https://site.com

const DEFAULT_CLIENT_ORIGIN = 'http://localhost:5173';
const WILDCARD = '*';

function normalizeOrigin(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const { protocol, host } = new URL(withScheme);
    if (!host) return null;
    // path/query/hash are dropped, but a "*" host is preserved for matching.
    return `${protocol}//${host}`;
  } catch {
    return null;
  }
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Turns an allowlist entry into either an exact string or a regex.
// A "*" matches within a single host segment so that a pattern such as
// royal-blizz-*.vercel.app cannot be satisfied by an unrelated deeper host.
function toMatcher(origin) {
  if (!origin.includes(WILDCARD)) return { exact: origin };

  const pattern = origin.split(WILDCARD).map(escapeRegExp).join('[^.]*');
  return { regex: new RegExp(`^${pattern}$`, 'i') };
}

// Every origin allowed to call the API with CORS.
const allowedOrigins = String(process.env.CLIENT_URL || DEFAULT_CLIENT_ORIGIN)
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);

const allowedMatchers = allowedOrigins.map(toMatcher);

// The single origin used inside emails and payment redirect URLs.
// Emails and Paystack return URLs can only point at one place, so a wildcard
// entry is deliberately skipped: "https://site-*.vercel.app" is not a URL
// anyone can open. The first concrete entry wins, and a warning is raised if
// the list contains no concrete origin at all.
const primaryOrigin =
  allowedOrigins.find((origin) => !origin.includes(WILDCARD)) ||
  allowedOrigins[0] ||
  DEFAULT_CLIENT_ORIGIN;

function isAllowedOrigin(origin) {
  // Same-origin, curl, Postman and server-to-server calls send no Origin header.
  if (!origin) return true;

  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;

  return allowedMatchers.some((matcher) =>
    matcher.exact ? matcher.exact === normalized : matcher.regex.test(normalized)
  );
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

    // A raw entry with a path is fine (normalisation strips it) but the
    // interpretation is worth reporting.
    const normalized = normalizeOrigin(trimmed);
    if (!normalized) {
      problems.push(`"${trimmed}" is not a valid origin and was ignored`);
      continue;
    }

    // Only report a difference when normalisation genuinely changed something.
    // Do not pre-strip a trailing slash: that is itself a change worth reporting.
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withScheme);
    const canonical = `${parsed.protocol}//${parsed.host}`;
    if (canonical !== trimmed) {
      problems.push(`"${trimmed}" was interpreted as "${canonical}"`);
    }

    if (normalized.includes(WILDCARD) && !normalized.startsWith('https://')) {
      problems.push(`"${trimmed}" is a wildcard entry but not https`);
    }
  }

  // Emails and Paystack redirects need one concrete URL to link to.
  if (!allowedOrigins.some((origin) => !origin.includes(WILDCARD))) {
    problems.push(
      'no concrete CLIENT_URL entry: password-reset and payment redirect links ' +
        'need one fixed frontend URL (a wildcard cannot be linked to)'
    );
  }

  // In production a localhost-only list means no real visitor can reach the API.
  if (allowedOrigins.length === 1 && /localhost|127\.0\.0\.1/.test(allowedOrigins[0])) {
    problems.push(
      `only localhost is allowed${process.env.NODE_ENV === 'production' ? ' in production' : ''} ` +
        `(${allowedOrigins[0]}); add your deployed frontend origin`
    );
  }

  return problems;
}

module.exports = {
  allowedOrigins,
  primaryOrigin,
  normalizeOrigin,
  isAllowedOrigin,
  describeConfigProblems,
  hasWildcard: allowedOrigins.some((origin) => origin.includes(WILDCARD)),
};
