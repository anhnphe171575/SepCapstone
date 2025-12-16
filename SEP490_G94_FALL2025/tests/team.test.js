const Team = require('../models/team');
const Project = require('../models/project');
const User = require('../models/user');
const { transporter } = require('../config/email');
const { ROLES } = require('../config/role');

jest.mock('../models/team', () => ({
  findOne: jest.fn()
}));

jest.mock('../models/project', () => ({
  findById: jest.fn()
}));

jest.mock('../models/user', () => ({
  findOne: jest.fn()
}));

jest.mock('../config/email', () => ({
  transporter: {
    sendMail: jest.fn().mockResolvedValue({})
  }
}));

jest.mock('../config/role', () => ({
  ROLES: {
    STUDENT: 1,
    LECTURER: 4
  }
}));

const { inviteMemberByEmail } = require('../controllers/team.controller');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('team.controller - inviteMemberByEmail', () => {
  const projectId = 'project123';
  const email = 'test@example.com';

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.FRONTEND_URL = 'http://frontend.test';
  });

  it('trả về 404 khi không tìm thấy team', async () => {
    Team.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null)
    });

    const req = { params: { projectId }, body: { email } };
    const res = mockResponse();

    await inviteMemberByEmail(req, res);

    expect(Team.findOne).toHaveBeenCalledWith({ project_id: projectId });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Không tìm thấy team'
    });
  });

  it('trả về 400 khi email không tồn tại trong hệ thống', async () => {
    const team = {
      _id: 'team123',
      team_member: [],
      team_code: 'TEAM01',
      project_id: { code: 'PRJ1', topic: 'Project 1' }
    };
    Team.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(team)
    });
    User.findOne.mockResolvedValue(null);

    const req = { params: { projectId }, body: { email } };
    const res = mockResponse();

    await inviteMemberByEmail(req, res);

    expect(User.findOne).toHaveBeenCalledWith({ email });
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: `Email ${email} không tồn tại trong hệ thống`
    });
  });

  it('trả về 404 khi mời giảng viên nhưng không tìm thấy dự án', async () => {
    const team = {
      _id: 'team123',
      team_member: [],
      team_code: 'TEAM01',
      project_id: { code: 'PRJ1', topic: 'Project 1' }
    };
    Team.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(team)
    });
    User.findOne.mockResolvedValue({
      _id: 'lecturer1',
      email,
      role: ROLES.LECTURER
    });
    Project.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue(null)
    });

    const req = { params: { projectId }, body: { email } };
    const res = mockResponse();

    await inviteMemberByEmail(req, res);

    expect(Project.findById).toHaveBeenCalledWith(projectId);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Không tìm thấy dự án'
    });
  });

  it('trả về 400 khi dự án đã có giảng viên hướng dẫn khác', async () => {
    const team = {
      _id: 'team123',
      team_member: [],
      team_code: 'TEAM01',
      project_id: { code: 'PRJ1', topic: 'Project 1' }
    };
    Team.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(team)
    });
    const lecturerUser = {
      _id: 'lecturer1',
      email,
      role: ROLES.LECTURER
    };
    User.findOne.mockResolvedValue(lecturerUser);
    Project.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: projectId,
        supervisor_id: 'otherLecturer'
      })
    });

    const req = { params: { projectId }, body: { email } };
    const res = mockResponse();

    await inviteMemberByEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Dự án đã có giảng viên hướng dẫn. Không thể mời giảng viên khác.'
    });
  });

  it('trả về 400 khi giảng viên đã là supervisor của dự án', async () => {
    const team = {
      _id: 'team123',
      team_member: [],
      team_code: 'TEAM01',
      project_id: { code: 'PRJ1', topic: 'Project 1' }
    };
    Team.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(team)
    });
    const lecturerUser = {
      _id: 'lecturer1',
      email,
      role: ROLES.LECTURER
    };
    User.findOne.mockResolvedValue(lecturerUser);
    Project.findById.mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        _id: projectId,
        supervisor_id: 'lecturer1'
      })
    });

    const req = { params: { projectId }, body: { email } };
    const res = mockResponse();

    await inviteMemberByEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Giảng viên này đã là giảng viên hướng dẫn của dự án.'
    });
  });

  it('trả về 400 khi nhóm đã đủ 5 thành viên (sinh viên)', async () => {
    const team = {
      _id: 'team123',
      team_member: [{}, {}, {}, {}, {}],
      team_code: 'TEAM01',
      project_id: { code: 'PRJ1', topic: 'Project 1' }
    };
    Team.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(team)
    });
    User.findOne.mockResolvedValue({
      _id: 'student1',
      email,
      role: ROLES.STUDENT
    });

    const req = { params: { projectId }, body: { email } };
    const res = mockResponse();

    await inviteMemberByEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Nhóm đã đủ 5 thành viên. Không thể mời thêm thành viên nữa.'
    });
  });

  it('trả về 400 khi sinh viên đã có trong nhóm', async () => {
    const team = {
      _id: 'team123',
      team_member: [
        { user_id: 'student1', team_leader: 0 }
      ],
      team_code: 'TEAM01',
      project_id: { code: 'PRJ1', topic: 'Project 1' }
    };
    Team.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(team)
    });
    User.findOne.mockResolvedValue({
      _id: 'student1',
      email,
      role: ROLES.STUDENT
    });

    const req = { params: { projectId }, body: { email } };
    const res = mockResponse();

    await inviteMemberByEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: `Thành viên với email ${email} đã có trong nhóm. Không thể mời lại.`
    });
  });

  it('trả về 400 khi role không phải student hoặc lecturer', async () => {
    const team = {
      _id: 'team123',
      team_member: [],
      team_code: 'TEAM01',
      project_id: { code: 'PRJ1', topic: 'Project 1' }
    };
    Team.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(team)
    });
    User.findOne.mockResolvedValue({
      _id: 'user999',
      email,
      role: 999
    });

    const req = { params: { projectId }, body: { email } };
    const res = mockResponse();

    await inviteMemberByEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: `Email ${email} không hợp lệ để tham gia nhóm. Chỉ chấp nhận sinh viên hoặc giảng viên`
    });
  });

  it('trả về 400 khi team chưa có mã nhóm', async () => {
    const team = {
      _id: 'team123',
      team_member: [],
      team_code: null,
      project_id: { code: 'PRJ1', topic: 'Project 1' }
    };
    Team.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(team)
    });
    User.findOne.mockResolvedValue({
      _id: 'student1',
      email,
      role: ROLES.STUDENT
    });

    const req = { params: { projectId }, body: { email } };
    const res = mockResponse();

    await inviteMemberByEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Team chưa có mã nhóm. Vui lòng thử lại sau.'
    });
  });

  it('mời sinh viên thành công và gửi email', async () => {
    const team = {
      _id: 'team123',
      name: 'Team 1',
      team_member: [{ user_id: 'other', team_leader: 1 }],
      team_code: 'TEAM01',
      project_id: { code: 'PRJ1', topic: 'Project 1' }
    };
    Team.findOne.mockReturnValue({
      populate: jest.fn().mockResolvedValue(team)
    });
    User.findOne.mockResolvedValue({
      _id: 'student1',
      email,
      role: ROLES.STUDENT
    });

    const req = { params: { projectId }, body: { email } };
    const res = mockResponse();

    await inviteMemberByEmail(req, res);

    expect(transporter.sendMail).toHaveBeenCalled();
    const mailArg = transporter.sendMail.mock.calls[0][0];
    expect(mailArg.to).toBe(email);
    expect(mailArg.subject).toContain('Lời mời tham gia nhóm');

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      message: 'Đã gửi lời mời thành công',
      data: expect.objectContaining({
        email,
        team_code: 'TEAM01',
        user_role: 'student',
        invite_link: expect.stringContaining(`/auto-join-team/TEAM01`)
      })
    }));
  });

  it('trả về 500 khi xảy ra lỗi không mong muốn', async () => {
    Team.findOne.mockImplementation(() => {
      throw new Error('Database error');
    });

    const req = { params: { projectId }, body: { email } };
    const res = mockResponse();

    await inviteMemberByEmail(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: 'Database error'
    }));
  });
});

