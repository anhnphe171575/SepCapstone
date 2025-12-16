const express = require('express');
const router = express.Router();
const { 
  register, 
  verifyRegistrationOTP, 
  resendRegistrationOTP,
  login,
  googleLogin, 
  forgotPassword, 
  verifyOTP, 
  resetPassword, 
  changePassword, 
  getProfile 
} = require('../controllers/auth.controller');
const verifyToken = require('../middleware/auth');

// Registration routes
router.post('/register', register);
router.post('/verify-registration-otp', verifyRegistrationOTP);
router.post('/resend-registration-otp', resendRegistrationOTP);

// Login routes
router.post('/login', login);
router.post('/google', googleLogin);

// Password reset routes
router.post('/forgot-password', forgotPassword);
router.post('/verify-otp', verifyOTP);
router.post('/reset-password', resetPassword);

// Profile routes
router.get('/profile', verifyToken, getProfile);
router.put('/change-password', verifyToken, changePassword);




module.exports = router;
