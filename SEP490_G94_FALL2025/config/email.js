const nodemailer = require('nodemailer');

// Check if email credentials are available
const hasEmailCredentials = process.env.EMAIL_USER && process.env.EMAIL_PASS;

let transporter;

if (hasEmailCredentials) {

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS // Should be Gmail App Password
    },
    tls: {
      rejectUnauthorized: false
    }
  });
} else {
  // Create a mock transporter for development when credentials are missing
  transporter = {
    sendMail: async (mailOptions) => {

      
      // Simulate successful email sending
      return { 
        messageId: 'dev-' + Date.now(),
        accepted: [mailOptions.to],
        rejected: [],
        pending: [],
        response: 'Mock email sent successfully'
      };
    }
  };
}

module.exports = { transporter, hasEmailCredentials }; 