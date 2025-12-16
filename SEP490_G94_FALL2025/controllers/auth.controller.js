const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const User = require('../models/user');
const { ROLES } = require('../config/role');
const { OAuth2Client } = require('google-auth-library');
const { transporter, hasEmailCredentials } = require('../config/email');
const redisClient = require('../config/redis');

dotenv.config();

const OTP_TTL_SECONDS = parseInt(process.env.OTP_TTL_SECONDS || '60', 10); // default 1 minute


function computeIsAdmin(role) {
  if (typeof role === 'number') {
    // ADMIN_DEVELOPER = 0 là super admin
    if (ROLES.ADMIN_DEVELOPER !== undefined && ROLES.ADMIN_DEVELOPER === 0 && role === 0)
       return true;
    return (role & ROLES.ADMIN) !== 0;
  }
  return false;
}

// POST /api/auth/register
async function register(req, res) {
  try {
    const { 
      full_name, 
      email, 
      password, 
      phone, 
      dob, 
      major, 
      address, 
      role = 1 // Default STUDENT role
    } = req.body;

    // Validation
    if (!full_name || !email || !password || !phone || !dob || !address) {
      return res.status(400).json({ message: 'Vui lòng điền đầy đủ thông tin bắt buộc' });
    }

    // Nếu email có đuôi @fpt.edu.vn, thông báo không cần đăng ký
    if (email.endsWith('@fpt.edu.vn')) {
      return res.status(400).json({ 
        message: 'Bạn không cần phải đăng ký. Vui lòng đăng nhập.',
        shouldLogin: true
      });
    }

    // Validate password
    if (password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP expiration time (15 minutes = 900 seconds)
    const REGISTRATION_OTP_TTL_SECONDS = 15 * 60; // 15 minutes

    // Persist OTP in Redis
    await redisClient.set(`register_otp:${email}`, otp, 'EX', REGISTRATION_OTP_TTL_SECONDS);

    // Create user with verified = false
    const user = await User.create({
      full_name,
      email,
      password: hashedPassword,
      phone,
      dob: new Date(dob),
      major: major || undefined,
      address: Array.isArray(address) ? address : [address],
      role,
      avatar: '', // Default empty avatar
      verified: false // Chưa verify email
    });

    // Send OTP via email
    try {
      if (hasEmailCredentials) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Mã OTP xác thực đăng ký tài khoản',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Xác thực đăng ký tài khoản</h2>
              <p>Xin chào ${full_name},</p>
              <p>Cảm ơn bạn đã đăng ký tài khoản. Vui lòng sử dụng mã OTP sau để xác thực email của bạn:</p>
              <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
              </div>
              <p><strong>Lưu ý:</strong> Mã OTP này sẽ hết hạn sau 15 phút.</p>
              <p>Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.</p>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">Đây là email tự động, vui lòng không trả lời.</p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Continue even if email fails - return OTP for development
    }

    // Return response (include OTP in development mode)
    const response = {
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP xác thực.',
      email: email
    };

    if (!hasEmailCredentials) {
      response.otp = otp; // Only return OTP in development
      response.message = 'Đăng ký thành công. Mã OTP đã được tạo (development mode).';
    }

    return res.status(201).json(response);

  } catch (error) {
    console.error('Register error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email đã được sử dụng' });
    }
    return res.status(500).json({ message: 'Lỗi máy chủ khi đăng ký' });
  }
}

// POST /api/auth/verify-registration-otp
async function verifyRegistrationOTP(req, res) {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email và mã OTP là bắt buộc' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản với email này' });
    }

    // Check if already verified
    if (user.verified) {
      return res.status(400).json({ message: 'Email đã được xác thực rồi' });
    }

    // Retrieve OTP from Redis
    const storedOtp = await redisClient.get(`register_otp:${email}`);
    if (!storedOtp) {
      return res.status(400).json({ message: 'Mã OTP không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.' });
    }

    // Verify OTP
    if (storedOtp !== otp) {
      return res.status(400).json({ message: 'Mã OTP không đúng' });
    }

    // OTP is valid - set verified = true and clear OTP from Redis
    user.verified = true;
    await user.save();
    await redisClient.del(`register_otp:${email}`);

    return res.status(200).json({
      message: 'Xác thực email thành công. Bạn có thể đăng nhập ngay bây giờ.',
      email: email
    });

  } catch (error) {
    console.error('Verify registration OTP error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi xác thực OTP' });
  }
}

// POST /api/auth/resend-registration-otp
async function resendRegistrationOTP(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản với email này' });
    }

    // Check if already verified
    if (user.verified) {
      return res.status(400).json({ message: 'Email đã được xác thực rồi' });
    }

    // Generate new 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP expiration time (15 minutes = 900 seconds)
    const REGISTRATION_OTP_TTL_SECONDS = 15 * 60; // 15 minutes

    // Persist OTP in Redis
    await redisClient.set(`register_otp:${email}`, otp, 'EX', REGISTRATION_OTP_TTL_SECONDS);

    // Send OTP via email
    try {
      if (hasEmailCredentials) {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Mã OTP xác thực đăng ký tài khoản',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Xác thực đăng ký tài khoản</h2>
              <p>Xin chào ${user.full_name},</p>
              <p>Bạn đã yêu cầu gửi lại mã OTP. Vui lòng sử dụng mã OTP sau để xác thực email của bạn:</p>
              <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
              </div>
              <p><strong>Lưu ý:</strong> Mã OTP này sẽ hết hạn sau 15 phút.</p>
              <hr style="margin: 20px 0;">
              <p style="color: #666; font-size: 12px;">Đây là email tự động, vui lòng không trả lời.</p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
      }
    } catch (emailError) {
      console.error('Email sending error:', emailError);
    }

    const response = {
      message: 'Mã OTP mới đã được gửi đến email của bạn',
      email: email
    };

    if (!hasEmailCredentials) {
      response.otp = otp; // Only return OTP in development
      response.message = 'Mã OTP mới đã được tạo (development mode).';
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('Resend registration OTP error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi gửi lại OTP' });
  }
}

// POST /api/auth/login 
async function login(req, res) {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email và mật khẩu là bắt buộc' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'Tài khoản được tạo qua Google. Vui lòng đăng nhập bằng Google.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });
    }

    // Kiểm tra verified sau khi xác thực mật khẩu
    if (!user.verified) {
      return res.status(403).json({ 
        message: 'Tài khoản chưa được xác thực email. Vui lòng kiểm tra email và xác thực tài khoản.',
        requiresVerification: true,
        email: user.email
      });
    }

    // Kiểm tra role để điều hướng
    const isAdmin = computeIsAdmin(user.role);
    const isStudent = user.role === ROLES.STUDENT;

    const payload = {
      id: user._id,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      message: 'Đăng nhập thành công',
      token,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar: user.avatar,
        verified: user.verified,
        isAdmin: isAdmin,
        isStudent: isStudent,
        // Điều hướng dựa trên role
        redirectUrl: isAdmin ? '/admin/dashboard' : isStudent ? '/dashboard' : '/supervisor/projects'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ' });
  }
}

// POST /api/auth/google
async function googleLogin(req, res) {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ message: 'Thiếu idToken' });
    }

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      return res.status(500).json({ message: 'Thiếu GOOGLE_CLIENT_ID trong cấu hình máy chủ' });
    }

    const client = new OAuth2Client(googleClientId);
    const ticket = await client.verifyIdToken({ idToken, audience: googleClientId });
    const payload = ticket.getPayload();

    const email = payload?.email;
    const fullName = payload?.name;
    const avatar = payload?.picture;

    if (!email) {
      return res.status(400).json({ message: 'Không lấy được email từ Google token' });
    }

    let user = await User.findOne({ email });
    if (!user) {
      // Create user if not exists (upsert)
      const safeName = fullName || email.split('@')[0];
      const now = new Date();
      const defaultAddress = [{ street: 'unknown', city: 'unknown', postalCode: '00000', contry: 'unknown' }];
      user = await User.create({
        full_name: safeName,
        address: defaultAddress,
        email,
        // no password for Google accounts
        role: ROLES.STUDENT, // Mặc định là STUDENT, sẽ tự động nâng cấp thành STUDENT_LEADER khi tạo project
        phone: 'N/A',
        dob: now,
        avatar: avatar || '',
        verified: true, // Google login tự động verified
      });
    }

    const jwtPayload = {
      id: user._id,
      email: user.email,
      role: user.role,
      full_name: user.full_name || fullName,
    };
    const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      message: 'Đăng nhập Google thành công',
      token,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name || fullName,
        role: user.role,
        avatar: user.avatar || avatar,
        
      },
    });
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(401).json({ message: 'Xác thực Google thất bại' });
  }
}

// POST /api/auth/forgot-password
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ message: 'Email là bắt buộc' });
    }

    // Find user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng với email này' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Set OTP expiration time
    const otpExpires = new Date(Date.now() + OTP_TTL_SECONDS * 1000);

    // Persist OTP in Redis
    await redisClient.set(`otp:${email}`, otp, 'EX', OTP_TTL_SECONDS);

    // Check if email credentials are available
    if (!hasEmailCredentials) {
      // Return OTP directly in development mode when email is not configured
      return res.status(200).json({
        message: 'Mã OTP đã được tạo',
        email: email,
        otp: otp, // Only return OTP in development
        otpExpires: otpExpires
      });
    }

    // Send OTP via email
    try {
      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Mã OTP đặt lại mật khẩu của bạn',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Đặt lại mật khẩu</h2>
            <p>Xin chào ${user.full_name},</p>
            <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng sử dụng mã OTP sau:</p>
            <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
              <h1 style="color: #007bff; font-size: 32px; margin: 0; letter-spacing: 5px;">${otp}</h1>
            </div>
            <p><strong>Lưu ý:</strong> Mã OTP này sẽ hết hạn sau 1 phút.</p>
            <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
            <hr style="margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">Đây là email tự động, vui lòng không trả lời.</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);

      return res.status(200).json({
        message: 'Mã OTP đã được gửi đến email của bạn',
        email: email,
        otpExpires: otpExpires
      });
    } catch (emailError) {
      console.error('Email sending error:', emailError);
      // Even if email fails, we still return the OTP for development
      return res.status(200).json({
        message: 'Mã OTP đã được tạo nhưng không thể gửi email (kiểm tra cấu hình email)',
        email: email,
        otp: otp, // Return OTP for debugging
        otpExpires: otpExpires
      });
    }

  } catch (error) {
    return res.status(500).json({ message: 'Lỗi máy chủ khi gửi OTP' });
  }
}

// POST /api/auth/verify-otp
async function verifyOTP(req, res) {
  try {
    const { email, otp } = req.body;
    
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email và mã OTP là bắt buộc' });
    }

    // Find user by email
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản với email này' });
    }

    // Retrieve OTP from Redis
    const storedOtp = await redisClient.get(`otp:${email}`);
    if (!storedOtp) {
      return res.status(400).json({ message: 'Mã OTP không tồn tại hoặc đã hết hạn' });
    }

    if (storedOtp !== otp) {
      return res.status(400).json({ message: 'Mã OTP không đúng' });
    }

    // OTP is valid - clear it from Redis
    await redisClient.del(`otp:${email}`);

    // Generate a temporary token for password reset (valid for 1 minutes)
    const resetToken = jwt.sign(
      { 
        id: user._id, 
        email: user.email,
        purpose: 'password_reset' 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '1m' }
    );

    return res.status(200).json({
      message: 'Mã OTP hợp lệ',
      resetToken: resetToken,
      email: email,
      expiresIn: '1m'
    });

  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi xác thực OTP' });
  }
}

// POST /api/auth/reset-password
async function resetPassword(req, res) {
  try {
    const { resetToken, newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ message: 'Mật khẩu mới là bắt buộc' });
    }

    // Validate password strength
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    // Verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }

    // Check if token is for password reset
    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ message: 'Token không hợp lệ cho việc reset password' });
    }

    // Find user by ID from token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    return res.status(200).json({
      message: 'Mật khẩu đã được cập nhật thành công',
      email: user.email
    });

  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi reset mật khẩu' });
  }
}


async function changePassword(req, res) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Chưa xác thực' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại và mật khẩu mới là bắt buộc' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
    }

    const userId = req.user._id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    if (!user.password) {
      return res.status(400).json({ message: 'Tài khoản được tạo qua Google. Không thể thay đổi mật khẩu.' });
    }

    // Kiểm tra mật khẩu hiện tại
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
    }

    // Hash mật khẩu mới
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    // Cập nhật mật khẩu
    user.password = hashedNewPassword;
    await user.save();

    return res.status(200).json({
      message: 'Mật khẩu đã được thay đổi thành công'
    });

  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ khi thay đổi mật khẩu' });
  }
}


// GET /api/auth/profile - Get current user profile
async function getProfile(req, res) {
  try {
    // User info is already available from middleware
    const user = req.user;
    
    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin profile thành công',
      data: {
        _id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        avatar: user.avatar || ''
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Lỗi máy chủ' 
    });
  }
}


module.exports = { 
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
};

