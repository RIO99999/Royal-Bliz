const transporter = require('../config/nodemailer');

// Send an email. Never throws: email failures should not break the main flow.
const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'ROYAL BLIZ <no-reply@royalbliz.com>',
      to,
      subject,
      html,
    });
    return info;
  } catch (error) {
    console.error('Email send failed:', error.message);
    return null;
  }
};

module.exports = sendEmail;
