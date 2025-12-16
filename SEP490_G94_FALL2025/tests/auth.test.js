const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const { login } = require('../controllers/auth.controller');
const { ROLES } = require('../config/role');

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));
jest.mock('jsonwebtoken', () => ({ sign: jest.fn() }));
jest.mock('../models/user');


const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('auth.controller - login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('trả về 400 khi thiếu email hoặc password', async () => {
    const req = { body: { email: 'anhnphe171575@fpt.edu.vn' } };
    const res = mockResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email và mật khẩu là bắt buộc' });
    expect(User.findOne).not.toHaveBeenCalled();
  });

  it('trả về 401 khi không tìm thấy user', async () => {
    User.findOne.mockResolvedValue(null);

    const req = { body: { email: 'user@example.com', password: 'secret' } };
    const res = mockResponse();

    await login(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ email: 'user@example.com' });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email hoặc mật khẩu không đúng' });
  });

  it('trả về 400 khi tài khoản là google (không có password)', async () => {
    User.findOne.mockResolvedValue({
      email: 'vinhnmhe170835@fpt.edu.vn',
      password: null,
    });

    const req = { body: { email: 'vinhnmhe170835@fpt.edu.vn', password: 'secret' } };
    const res = mockResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Tài khoản được tạo qua Google. Vui lòng đăng nhập bằng Google.',
    });
  });

  it('trả về 401 khi mật khẩu không khớp', async () => {
    User.findOne.mockResolvedValue({
      email: 'anhnphe171575@fpt.edu.vn',
      password: '$2b$10$aZr2Xk/39QXttsEEJtJsX.76EcpUsW3R.EFWsPf8/OdN0QhDhrJP.' // stored hash
    });
  
    bcrypt.compare.mockResolvedValue(false); // mật khẩu sai
  
    const req = { 
      body: { 
        email: 'anhnphe171575@fpt.edu.vn',
        password: '1234567' 
      } 
    };
  
    const res = mockResponse();
  
    await login(req, res);
  
    expect(bcrypt.compare).toHaveBeenCalledWith(
      '1234567', 
      '$2b$10$aZr2Xk/39QXttsEEJtJsX.76EcpUsW3R.EFWsPf8/OdN0QhDhrJP.'
    );
  
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email hoặc mật khẩu không đúng' });
  });
  

  it('trả về 403 khi user chưa xác thực email', async () => {
    User.findOne.mockResolvedValue({
      email: 'anhnphe171575@fpt.edu.vn',
      password: '123456',
      verified: false,
    });
    bcrypt.compare.mockResolvedValue(true);

    const req = { body: { email: 'anhnphe171575@fpt.edu.vn', password: '123456' } };
    const res = mockResponse();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Tài khoản chưa được xác thực email. Vui lòng kiểm tra email và xác thực tài khoản.',
      requiresVerification: true,
      email: 'anhnphe171575@fpt.edu.vn',
    });
  });

  it('đăng nhập thành công trả về token và thông tin user', async () => {
    const user = {
      _id: '68d574d521bd410ce37b5858',
      email: 'anhnphe171575@fpt.edu.vn',
      password: '123456',
      verified: true,
      role: ROLES.STUDENT,
      full_name: 'Nguyen Van A1',
      avatar: 'avatar.png'
    };
    User.findOne.mockResolvedValue(user);
    bcrypt.compare.mockResolvedValue(true); 
    jwt.sign.mockReturnValue('signed-token');

    const req = { body: { email: 'anhnphe171575@fpt.edu.vn', password: '123456' } };
    const res = mockResponse();

    await login(req, res);

    expect(jwt.sign).toHaveBeenCalledWith(
      { id: '68d574d521bd410ce37b5858', email: 'anhnphe171575@fpt.edu.vn', role: ROLES.STUDENT, full_name: 'Nguyen Van A1' },
      'test-secret',
      { expiresIn: '7d' }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Đăng nhập thành công',
      token: 'signed-token',
      user: {
        id: '68d574d521bd410ce37b5858',
        email: 'anhnphe171575@fpt.edu.vn',
        full_name: 'Nguyen Van A1',
        role: ROLES.STUDENT,
        avatar: 'avatar.png',
        verified: true,
        isAdmin: false,
        isStudent: true,
        redirectUrl: '/dashboard',
      },
    });
  });
});

