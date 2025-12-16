const MeetingSchedule = require('../models/meeting_schedule');
const Project = require('../models/project');
const Team = require('../models/team');

jest.mock('../models/meeting_schedule');
jest.mock('../models/project');
jest.mock('../models/team');

const { createMeeting } = require('../controllers/meeting.controller');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('meeting.controller - createMeeting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseReq = () => ({
    params: { projectId: 'project123' },
    body: {
      topic: 'Weekly meeting',
      description: 'Discuss progress',
      meeting_date: '2024-03-10',
      start_time: '09:00',
      end_time: '10:00',
      meeting_type: 'regular',
      location: 'Online',
      google_meet_link: 'https://meet.google.com/abc',
    },
    user: { id: 'user123', role: 1 },
  });

  it('trả về 404 khi không tìm thấy project', async () => {
    Project.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null),
    });
    const req = baseReq();
    const res = mockResponse();

    await createMeeting(req, res);

    expect(Project.findById).toHaveBeenCalledWith('project123');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Không tìm thấy dự án',
    });
  });

  it('trả về 404 khi không tìm thấy team của project', async () => {
    Project.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'project123', supervisor_id: null }),
    });
    Team.findOne.mockResolvedValue(null);
    const req = baseReq();
    const res = mockResponse();

    await createMeeting(req, res);

    expect(Team.findOne).toHaveBeenCalledWith({ project_id: 'project123' });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Không tìm thấy team cho dự án này',
    });
  });

  it('trả về 400 khi thiếu topic', async () => {
    Project.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'project123', supervisor_id: null }),
    });
    Team.findOne.mockResolvedValue({ project_id: 'project123' });
    const req = baseReq();
    req.body.topic = '   ';
    const res = mockResponse();

    await createMeeting(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Vui lòng nhập chủ đề cuộc họp',
    });
  });

  it('trả về 400 khi thiếu ngày hoặc giờ họp', async () => {
    Project.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'project123', supervisor_id: null }),
    });
    Team.findOne.mockResolvedValue({ project_id: 'project123' });
    const req = baseReq();
    req.body.meeting_date = '';
    const res = mockResponse();

    await createMeeting(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Vui lòng chọn ngày họp, thời gian bắt đầu và kết thúc',
    });
  });

  it('trả về 400 khi định dạng thời gian không hợp lệ', async () => {
    Project.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'project123', supervisor_id: null }),
    });
    Team.findOne.mockResolvedValue({ project_id: 'project123' });
    const req = baseReq();
    req.body.start_time = '9h';
    const res = mockResponse();

    await createMeeting(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Định dạng thời gian không hợp lệ. Vui lòng sử dụng định dạng HH:mm',
    });
  });

  it('trả về 400 khi thời gian kết thúc không sau thời gian bắt đầu', async () => {
    Project.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'project123', supervisor_id: null }),
    });
    Team.findOne.mockResolvedValue({ project_id: 'project123' });
    const req = baseReq();
    req.body.start_time = '10:00';
    req.body.end_time = '09:00';
    const res = mockResponse();

    await createMeeting(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
    });
  });

  it('trả về 400 khi có xung đột lịch họp', async () => {
    Project.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'project123', supervisor_id: null }),
    });
    Team.findOne.mockResolvedValue({ project_id: 'project123' });
    const conflict = { _id: 'meeting456', topic: 'Existing', start_time: '09:30', end_time: '10:30' };
    MeetingSchedule.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(conflict),
    });

    const req = baseReq();
    const res = mockResponse();

    await createMeeting(req, res);

    expect(MeetingSchedule.findOne).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Đã có lịch họp trong khoảng thời gian này. Vui lòng chọn thời gian khác',
      conflict,
    });
  });

  it('tạo meeting với status = approved khi người tạo là giảng viên hướng dẫn', async () => {
    const supervisorId = 'mentor123';
    const project = {
      _id: 'project123',
      supervisor_id: { _id: supervisorId, full_name: 'Mentor', email: 'mentor@example.com' },
    };
    Project.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(project),
    });
    Team.findOne.mockResolvedValue({ project_id: 'project123' });
    MeetingSchedule.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    // Mock constructor
    const saveMock = jest.fn().mockResolvedValue(undefined);
    const populateMock = jest.fn().mockResolvedValue(undefined);
    MeetingSchedule.mockImplementation((data) => ({
      ...data,
      save: saveMock,
      populate: populateMock,
    }));

    const req = baseReq();
    req.user.id = supervisorId; // creator is mentor
    const res = mockResponse();

    await createMeeting(req, res);

    expect(saveMock).toHaveBeenCalled();
    expect(populateMock).toHaveBeenCalledWith([
      { path: 'mentor_id', select: 'full_name email avatar' },
      { path: 'requested_by', select: 'full_name email avatar' },
    ]);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Tạo lịch họp thành công',
      })
    );
  });

  it('tạo meeting với status = pending khi người tạo không phải giảng viên', async () => {
    const supervisorId = 'mentor123';
    const project = {
      _id: 'project123',
      supervisor_id: { _id: supervisorId, full_name: 'Mentor', email: 'mentor@example.com' },
    };
    Project.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(project),
    });
    Team.findOne.mockResolvedValue({ project_id: 'project123' });
    MeetingSchedule.findOne.mockReturnValue({
      select: jest.fn().mockResolvedValue(null),
    });

    const saveMock = jest.fn().mockResolvedValue(undefined);
    const populateMock = jest.fn().mockResolvedValue(undefined);
    MeetingSchedule.mockImplementation((data) => ({
      ...data,
      save: saveMock,
      populate: populateMock,
    }));

    const req = baseReq();
    req.user.id = 'student456'; // creator is not mentor
    const res = mockResponse();

    await createMeeting(req, res);

    expect(saveMock).toHaveBeenCalled();
    expect(populateMock).toHaveBeenCalledWith([
      { path: 'mentor_id', select: 'full_name email avatar' },
      { path: 'requested_by', select: 'full_name email avatar' },
    ]);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: 'Yêu cầu lịch họp đã được gửi, chờ giảng viên xác nhận',
      })
    );
  });

  it('trả về 400 khi thời gian không hợp lệ (Date parse lỗi)', async () => {
    const originalDate = global.Date;

    // Mock Date để các lần tạo Date với chuỗi thời gian trả về NaN
    const DateMock = jest
      .spyOn(global, 'Date')
      // @ts-ignore
      .mockImplementation(function (value) {
        if (typeof value === 'string' && value.startsWith('2000-01-01T')) {
          // trả về Date invalid
          return new originalDate('invalid-date');
        }
        // các trường hợp khác dùng Date gốc
        // @ts-ignore
        return new originalDate(value);
      });

    Project.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue({ _id: 'project123', supervisor_id: null }),
    });
    Team.findOne.mockResolvedValue({ project_id: 'project123' });

    const req = baseReq();
    const res = mockResponse();

    await createMeeting(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Thời gian không hợp lệ',
    });

    DateMock.mockRestore();
  });

  it('trả về 500 khi xảy ra lỗi server khi tạo lịch họp', async () => {
    // Giả lập lỗi bất ngờ ở tầng project (ví dụ lỗi DB)
    Project.findById.mockImplementation(() => {
      throw new Error('Database error');
    });

    const req = baseReq();
    const res = mockResponse();

    await createMeeting(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi server khi tạo lịch họp',
    });
  });
});


