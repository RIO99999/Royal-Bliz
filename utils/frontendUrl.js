// The frontend address, used only for links the backend puts in emails and
// Paystack redirects. Set CLIENT_URL in your Vercel env vars, e.g.
//   CLIENT_URL=https://royal-blizz-ttoy.vercel.app
const frontendUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

module.exports = frontendUrl;
