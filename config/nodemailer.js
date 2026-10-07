const nodemailer = require('nodemailer');

// SMTP transporter built from environment variables.
// SMTP_PORT 587 -> secure:false (STARTTLS), 465 -> secure:true (SSL).
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

module.exports = transporter;
