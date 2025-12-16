jest.mock('../models/project', () => ({
  findOne: jest.fn(),
  create: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  exists: jest.fn()
}));

jest.mock('../models/team', () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn()
}));

jest.mock('../models/user', () => ({
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn()
}));

jest.mock('../models/folder', () => ({
  findOne: jest.fn(),
  create: jest.fn()
}));

jest.mock('../models/document', () => ({
  create: jest.fn(),
  findOne: jest.fn()
}));

jest.mock('../config/documentTemplates', () => []);

jest.mock('../config/firebase', () => ({
  storage: {},
  ref: jest.fn(() => ({})),
  uploadBytes: jest.fn().mockResolvedValue({}),
  getDownloadURL: jest.fn().mockResolvedValue('https://example.com/file')
}));

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue(Buffer.from('mock'))
  }
}));

jest.mock('../utils/semester', () => ({
  getCurrentSemester: jest.fn(() => 'Fall2025')
}));

const Project = require('../models/project');
const Team = require('../models/team');
const User = require('../models/user');
const Folder = require('../models/folder');
const { ROLES } = require('../config/role');

const { createProject } = require('../controllers/project.controller');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('project.controller - createProject', () => {
  const baseReq = {
    user: { _id: 'user123', role: ROLES.STUDENT },
    body: {
      topic: 'Test Project',
      code: 'PRJ123',
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      description: 'Test description'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Project.findOne.mockResolvedValue(null);
    Team.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue([])
    });
    Team.findOne.mockResolvedValue(null);
    Folder.findOne.mockResolvedValue({ _id: 'folder123' });
  });

  it('trả về 400 khi thiếu topic hoặc code', async () => {
    const req = {
      ...baseReq,
      body: { topic: 'Test Project' }
    };
    const res = mockResponse();

    await createProject(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Thiếu tiêu đề hoặc mã dự án' });
  });

  it('trả về 409 khi mã dự án đã tồn tại', async () => {
    Project.findOne.mockResolvedValueOnce({ _id: 'existingProjectId' });
    const res = mockResponse();

    await createProject(baseReq, res);

    expect(Project.findOne).toHaveBeenCalledWith({ code: 'PRJ123' });
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'Mã dự án đã tồn tại' });
  });

  it('trả về 409 khi user đã có project trong semester hiện tại', async () => {
    Project.findOne.mockResolvedValueOnce(null);

    Project.findOne.mockResolvedValueOnce({
      _id: 'existing123',
      topic: 'Existing Project',
      code: 'EX123',
      semester: 'Fall2025'
    });
    User.findById.mockResolvedValue({ _id: 'user123' });

    const res = mockResponse();

    await createProject(baseReq, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('đã tạo dự án'),
      existingProject: expect.objectContaining({
        id: 'existing123',
        topic: 'Existing Project'
      })
    }));
  });

  it('tạo project và team thành công', async () => {
    Project.findOne.mockResolvedValue(null);

    Project.create.mockResolvedValue({
      _id: 'project123',
      topic: 'Test Project',
      code: 'PRJ123',
      semester: 'Fall2025',
      created_by: 'user123',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31')
    });
    User.findByIdAndUpdate.mockResolvedValue({});
    Team.findOne.mockResolvedValueOnce(null);
    Team.create.mockResolvedValue({
      _id: 'team123',
      name: 'Test Project Team',
      team_code: 'TEAM01'
    });

    const res = mockResponse();

    await createProject(baseReq, res);

    expect(Project.create).toHaveBeenCalledWith(expect.objectContaining({
      topic: 'Test Project',
      code: 'PRJ123',
      created_by: 'user123',
      semester: 'Fall2025'
    }));
    expect(Team.create).toHaveBeenCalledWith(expect.objectContaining({
      project_id: 'project123',
      team_code: expect.any(String),
      team_member: expect.arrayContaining([
        expect.objectContaining({ user_id: 'user123', team_leader: 1 })
      ])
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      project: expect.objectContaining({ _id: 'project123', topic: 'Test Project', code: 'PRJ123' }),
      team: expect.objectContaining({ id: 'team123', team_code: 'TEAM01' }),
      message: expect.stringContaining('Tạo dự án và team thành công')
    }));
  });

  it('trả về 500 khi gặp lỗi không mong muốn', async () => {
    Project.findOne.mockRejectedValue(new Error('Database error'));
    const res = mockResponse();

    await createProject(baseReq, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});
