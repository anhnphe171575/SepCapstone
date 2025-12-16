const User = require('../models/user');
const Project = require('../models/project');
const Task = require('../models/task');
const Feature = require('../models/feature');
const bcrypt = require('bcryptjs');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

jest.mock('../models/user');
jest.mock('../models/project');
jest.mock('../models/task');
jest.mock('../models/feature');
jest.mock('bcryptjs');
jest.mock('xlsx');
jest.mock('exceljs');

const {
  getMe,
  getUserProfile,
  updateProfile,
  getAllUsers,
  deleteUser,
  updateUser,
  getDashboardSupervisor,
  importLecturersFromExcel,
  exportUsersToExcel
} = require('../controllers/user.controller');

const { ROLES } = require('../config/role');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

describe('user.controller - importLecturersFromExcel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 403 khi không phải admin', async () => {
    const req = {
      user: { role: ROLES.STUDENT },
      file: null
    };
    const res = mockResponse();

    await importLecturersFromExcel(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Bạn không có quyền import tài khoản'
    });
  });

  it('trả về 400 khi thiếu file', async () => {
    const req = {
      user: { role: ROLES.ADMIN },
      file: null
    };
    const res = mockResponse();

    await importLecturersFromExcel(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Vui lòng tải lên file Excel (.xls, .xlsx)'
    });
  });

  it('trả về 400 khi file không chứa dữ liệu', async () => {
    const mockWorkbook = {
      SheetNames: []
    };

    XLSX.read.mockReturnValue(mockWorkbook);

    const req = {
      user: { role: ROLES.ADMIN },
      file: {
        buffer: Buffer.from('test')
      }
    };
    const res = mockResponse();

    await importLecturersFromExcel(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'File Excel không chứa dữ liệu'
    });
  });

  it('import lecturers thành công', async () => {
    const mockWorkbook = {
      SheetNames: ['Sheet1'],
      Sheets: {
        Sheet1: {}
      }
    };

    const mockRows = [
      {
        'Full Name': 'Test Lecturer',
        'Email': 'lecturer@test.com',
        'Phone': '0123456789',
        'DOB': new Date('1990-01-01')
      }
    ];

    XLSX.read.mockReturnValue(mockWorkbook);
    XLSX.utils.sheet_to_json.mockReturnValue(mockRows);

    User.findOne.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashedPassword');
    User.create.mockResolvedValue({
      _id: 'lecturer123',
      full_name: 'Test Lecturer',
      email: 'lecturer@test.com'
    });

    const req = {
      user: { role: ROLES.ADMIN },
      file: {
        buffer: Buffer.from('test')
      }
    };
    const res = mockResponse();

    await importLecturersFromExcel(req, res);

    expect(XLSX.read).toHaveBeenCalled();
    expect(User.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: expect.stringContaining('Import hoàn tất'),
        data: expect.objectContaining({
          inserted: expect.any(Number)
        })
      })
    );
  });

  it('xử lý lỗi server (500)', async () => {
    XLSX.read.mockImplementation(() => {
      throw new Error('File error');
    });

    const req = {
      user: { role: ROLES.ADMIN },
      file: {
        buffer: Buffer.from('test')
      }
    };
    const res = mockResponse();

    await importLecturersFromExcel(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Lỗi máy chủ khi import Excel',
      error: 'File error'
    });
  });
});


