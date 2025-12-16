const Milestone = require('../models/milestone');
const Comment = require('../models/comment');
const ActivityLog = require('../models/activity_log');
const Document = require('../models/document');
const Feature = require('../models/feature');
const Function = require('../models/function');
const FeaturesMilestone = require('../models/feature_milestone');
const Project = require('../models/project');

jest.mock('../models/milestone');
jest.mock('../models/comment');
jest.mock('../models/activity_log');
jest.mock('../models/document');
jest.mock('../models/feature');

jest.mock('../models/function');
jest.mock('../models/feature_milestone'); 
jest.mock('../models/project');
jest.mock('../utils/milestoneBusinessRules');
jest.mock('../utils/statusHelper');

const {
  listMilestones,
  getMilestone,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  createMilestoneFromFeatures,
  getMilestoneProgress,
  getGanttHierarchy,
  listUpdates,
  createUpdate,
  updateComment,
  deleteComment,
  listFiles,
  uploadFile,
  listActivityLogs,
  getMilestoneRules
} = require('../controllers/milestone.controller');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('milestone.controller - listMilestones', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về danh sách milestones thành công', async () => {
    const mockMilestones = [
      {
        _id: 'milestone1',
        title: 'Milestone 1',
        project_id: 'project123',
        start_date: new Date('2024-01-01'),
        deadline: new Date('2024-01-31')
      },
      {
        _id: 'milestone2',
        title: 'Milestone 2',
        project_id: 'project123',
        start_date: new Date('2024-02-01'),
        deadline: new Date('2024-02-28')
      }
    ];

    Milestone.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue(mockMilestones)
        })
      })
    });

    const req = {
      params: { projectId: 'project123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await listMilestones(req, res);

    expect(Milestone.find).toHaveBeenCalledWith({ project_id: 'project123' });
    expect(res.json).toHaveBeenCalledWith(mockMilestones);
  });

  it('xử lý lỗi server (500)', async () => {
    Milestone.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockRejectedValue(new Error('Database error'))
        })
      })
    });

    const req = {
      params: { projectId: 'project123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await listMilestones(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});

describe('milestone.controller - getMilestone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về milestone thành công', async () => {
    const mockMilestone = {
      _id: 'milestone123',
      title: 'Test Milestone',
      project_id: 'project123',
      created_by: { _id: 'user123', full_name: 'User', email: 'user@test.com' }
    };

    Milestone.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockMilestone)
      })
    });

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await getMilestone(req, res);

    expect(Milestone.findOne).toHaveBeenCalledWith({
      _id: 'milestone123',
      project_id: 'project123'
    });
    expect(res.json).toHaveBeenCalledWith(mockMilestone);
  });

  it('trả về 404 khi không tìm thấy milestone', async () => {
    Milestone.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(null)
      })
    });

    const req = {
      params: { projectId: 'project123', milestoneId: 'nonexistent' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await getMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy milestone' });
  });

  it('xử lý lỗi server (500)', async () => {
    Milestone.findOne.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockRejectedValue(new Error('Database error'))
      })
    });

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await getMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});

describe('milestone.controller - createMilestone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 400 khi thiếu title', async () => {
    const req = {
      params: { projectId: 'project123' },
      body: { description: 'Test description' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Thiếu tiêu đề' });
    expect(Milestone.create).not.toHaveBeenCalled();
  });

  it('trả về 404 khi không tìm thấy project', async () => {
    Project.findById.mockResolvedValue(null);

        const req = {
        params: { projectId: 'nonexistent' },
        body: { title: 'Test Milestone' },
        user: { _id: 'user123' }
        };
    const res = mockResponse();

    await createMilestone(req, res);

    expect(Project.findById).toHaveBeenCalledWith('nonexistent');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy project' });
  });

  it('trả về 400 khi ngày không hợp lệ', async () => {
    const mockProject = {
      _id: 'project123',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31')
    };

    Project.findById.mockResolvedValue(mockProject);

    const req = {
      params: { projectId: 'project123' },
      body: {
        title: 'Test Milestone',
        start_date: 'invalid-date',
        deadline: '2024-01-31'
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Ngày không hợp lệ' });
  });

  it('trả về 400 khi start_date > deadline', async () => {
    const mockProject = {
      _id: 'project123',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31')
    };

    Project.findById.mockResolvedValue(mockProject);

    const req = {
      params: { projectId: 'project123' },
      body: {
        title: 'Test Milestone',
        start_date: '2024-01-31',
        deadline: '2024-01-01'
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Ngày bắt đầu phải trước deadline' });
  });

  it('trả về 400 khi milestone start_date trước project start_date', async () => {
    const mockProject = {
      _id: 'project123',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31')
    };

    Project.findById.mockResolvedValue(mockProject);

    const req = {
      params: { projectId: 'project123' },
      body: {
        title: 'Test Milestone',
        start_date: '2023-12-01',
        deadline: '2024-01-31'
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Ngày bắt đầu milestone không được trước ngày bắt đầu project'
    });
  });

  it('tạo milestone thành công', async () => {
    const mockProject = {
      _id: 'project123',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31')
    };

    const createdMilestone = {
      _id: 'milestone123',
      title: 'Test Milestone',
      code: 'MS-123456-001',
      project_id: 'project123',
      start_date: new Date('2024-01-01'),
      deadline: new Date('2024-01-31'),
      created_by: 'user123'
    };

    Project.findById.mockResolvedValue(mockProject);
    Milestone.findOne.mockResolvedValue(null); // Code không trùng
    Milestone.create.mockResolvedValue(createdMilestone);
    FeaturesMilestone.insertMany.mockResolvedValue([]);
    ActivityLog.create.mockResolvedValue({ _id: 'log123' });

    const req = {
      params: { projectId: 'project123' },
      body: {
        title: 'Test Milestone',
        start_date: '2024-01-01',
        deadline: '2024-01-31',
        description: 'Test description',
        tags: ['tag1', 'tag2'],
        feature_ids: ['feature1', 'feature2']
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createMilestone(req, res);

    expect(Milestone.create).toHaveBeenCalled();
    expect(FeaturesMilestone.insertMany).toHaveBeenCalled();
    expect(ActivityLog.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(createdMilestone);
  });

  it('xử lý lỗi server (500)', async () => {
    Project.findById.mockResolvedValue({
      _id: 'project123',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31')
    });
    Milestone.findOne.mockResolvedValue(null);
    Milestone.create.mockRejectedValue(new Error('Database error'));

    const req = {
      params: { projectId: 'project123' },
      body: { title: 'Test Milestone' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});

describe('milestone.controller - updateMilestone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 404 khi không tìm thấy milestone', async () => {
    Milestone.findOne.mockResolvedValue(null);

    const req = {
      params: { projectId: 'project123', milestoneId: 'nonexistent' },
      body: { title: 'Updated Title' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy milestone' });
  });

  it('trả về 404 khi không tìm thấy project', async () => {
    const mockMilestone = {
      _id: 'milestone123',
      title: 'Test Milestone',
      project_id: 'project123',
      start_date: new Date('2024-01-01'),
      deadline: new Date('2024-01-31')
    };

    Milestone.findOne.mockResolvedValue(mockMilestone);
    Project.findById.mockResolvedValue(null);

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      body: { title: 'Updated Title' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy project' });
  });

  it('trả về 400 khi start_date > deadline', async () => {
    const mockMilestone = {
      _id: 'milestone123',
      title: 'Test Milestone',
      project_id: 'project123',
      start_date: new Date('2024-01-01'),
      deadline: new Date('2024-01-31')
    };

    const mockProject = {
      _id: 'project123',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31')
    };

    Milestone.findOne.mockResolvedValue(mockMilestone);
    Project.findById.mockResolvedValue(mockProject);

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      body: {
        start_date: '2024-01-31',
        deadline: '2024-01-01'
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Ngày bắt đầu phải trước deadline' });
  });

  it('cập nhật milestone thành công', async () => {
    const mockMilestone = {
      _id: 'milestone123',
      title: 'Test Milestone',
      project_id: 'project123',
      start_date: new Date('2024-01-01'),
      deadline: new Date('2024-01-31')
    };

    const mockProject = {
      _id: 'project123',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31')
    };

    const updatedMilestone = {
      ...mockMilestone,
      title: 'Updated Title',
      last_updated_by: { _id: 'user123', full_name: 'User', email: 'user@test.com' }
    };

    Milestone.findOne.mockResolvedValue(mockMilestone);
    Project.findById.mockResolvedValue(mockProject);
    Milestone.findOneAndUpdate.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockResolvedValue(updatedMilestone)
      })
    });
    ActivityLog.create.mockResolvedValue({ _id: 'log123' });

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      body: { title: 'Updated Title' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateMilestone(req, res);

    expect(Milestone.findOneAndUpdate).toHaveBeenCalled();
    expect(ActivityLog.create).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(updatedMilestone);
  });

  it('xử lý lỗi server (500)', async () => {
    Milestone.findOne.mockRejectedValue(new Error('Database error'));

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      body: { title: 'Updated Title' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});

describe('milestone.controller - deleteMilestone', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 404 khi không tìm thấy milestone', async () => {
    Milestone.findOne.mockResolvedValue(null);

    const req = {
      params: { projectId: 'project123', milestoneId: 'nonexistent' },
      query: {},
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await deleteMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy milestone' });
  });

  it('trả về 400 khi milestone có features liên kết và không force', async () => {
    const mockMilestone = {
      _id: 'milestone123',
      title: 'Test Milestone',
      project_id: 'project123'
    };

    Milestone.findOne.mockResolvedValue(mockMilestone);
    FeaturesMilestone.find.mockResolvedValue([
      { _id: 'link1', feature_id: 'feature1', milestone_id: 'milestone123' }
    ]);
    Comment.find.mockResolvedValue([]);

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      query: { force: false },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await deleteMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('Không thể xóa milestone vì còn'),
        dependencies: expect.objectContaining({
          features: 1
        })
      })
    );
  });

  it('xóa milestone thành công khi không có dependencies', async () => {
    const mockMilestone = {
      _id: 'milestone123',
      title: 'Test Milestone',
      project_id: 'project123'
    };

    Milestone.findOne.mockResolvedValue(mockMilestone);
    FeaturesMilestone.find.mockResolvedValue([]);
    Comment.find.mockResolvedValue([]);
    FeaturesMilestone.deleteMany.mockResolvedValue({ deletedCount: 0 });
    Comment.deleteMany.mockResolvedValue({ deletedCount: 0 });
    ActivityLog.deleteMany.mockResolvedValue({ deletedCount: 0 });
    Milestone.deleteOne.mockResolvedValue({ deletedCount: 1 });
    ActivityLog.create.mockResolvedValue({ _id: 'log123' });

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      query: {},
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await deleteMilestone(req, res);

    expect(FeaturesMilestone.deleteMany).toHaveBeenCalledWith({ milestone_id: 'milestone123' });
    expect(Comment.deleteMany).toHaveBeenCalledWith({ milestone_id: 'milestone123' });
    expect(ActivityLog.deleteMany).toHaveBeenCalledWith({ milestone_id: 'milestone123' });
    expect(Milestone.deleteOne).toHaveBeenCalledWith({ _id: 'milestone123' });
    expect(ActivityLog.create).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Milestone đã được xóa'
    });
  });

  it('xóa milestone với force=true thành công', async () => {
    const mockMilestone = {
      _id: 'milestone123',
      title: 'Test Milestone',
      project_id: 'project123'
    };

    Milestone.findOne.mockResolvedValue(mockMilestone);
    FeaturesMilestone.find.mockResolvedValue([
      { _id: 'link1', feature_id: 'feature1', milestone_id: 'milestone123' }
    ]);
    FeaturesMilestone.deleteMany.mockResolvedValue({ deletedCount: 1 });
    Comment.deleteMany.mockResolvedValue({ deletedCount: 0 });
    ActivityLog.deleteMany.mockResolvedValue({ deletedCount: 0 });
    Milestone.deleteOne.mockResolvedValue({ deletedCount: 1 });
    ActivityLog.create.mockResolvedValue({ _id: 'log123' });

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      query: { force: 'true' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await deleteMilestone(req, res);

    expect(Milestone.deleteOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Milestone đã được xóa'
    });
  });

  it('xử lý lỗi server (500)', async () => {
    Milestone.findOne.mockRejectedValue(new Error('Database error'));

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      query: {},
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await deleteMilestone(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});

describe('milestone.controller - createMilestoneFromFeatures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 400 khi thiếu title hoặc feature_ids', async () => {
    const req = {
      params: { projectId: 'project123' },
      body: { title: 'Test Milestone' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createMilestoneFromFeatures(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Thiếu tiêu đề hoặc danh sách features'
    });
  });

  it('trả về 404 khi không tìm thấy features', async () => {
    Feature.find.mockResolvedValue([]);

    const req = {
      params: { projectId: 'project123' },
      body: {
        title: 'Test Milestone',
        feature_ids: ['feature1', 'feature2']
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createMilestoneFromFeatures(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy features' });
  });

  it('tạo milestone từ features thành công', async () => {
    const mockFeatures = [
      {
        _id: 'feature1',
        title: 'Feature 1',
        start_date: new Date('2024-01-01'),
        deadline: new Date('2024-01-15')
      },
      {
        _id: 'feature2',
        title: 'Feature 2',
        start_date: new Date('2024-01-10'),
        deadline: new Date('2024-01-20')
      }
    ];

    const mockProject = {
      _id: 'project123',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31')
    };

    const createdMilestone = {
      _id: 'milestone123',
      title: 'Test Milestone',
      code: 'MS-123456-001',
      project_id: 'project123',
      start_date: new Date('2024-01-01'),
      deadline: new Date('2024-01-20')
    };

    Feature.find.mockResolvedValue(mockFeatures);
    Project.findById.mockResolvedValue(mockProject);
    Milestone.findOne.mockResolvedValue(null);
    Milestone.create.mockResolvedValue(createdMilestone);
    FeaturesMilestone.insertMany.mockResolvedValue([]);
    ActivityLog.create.mockResolvedValue({ _id: 'log123' });

    const req = {
      params: { projectId: 'project123' },
      body: {
        title: 'Test Milestone',
        feature_ids: ['feature1', 'feature2']
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createMilestoneFromFeatures(req, res);

    expect(Milestone.create).toHaveBeenCalled();
    expect(FeaturesMilestone.insertMany).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(createdMilestone);
  });

  it('xử lý lỗi server (500)', async () => {
    Feature.find.mockRejectedValue(new Error('Database error'));

    const req = {
      params: { projectId: 'project123' },
      body: {
        title: 'Test Milestone',
        feature_ids: ['feature1']
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createMilestoneFromFeatures(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});

describe('milestone.controller - getMilestoneProgress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 404 khi không tìm thấy milestone', async () => {
    Milestone.findOne.mockResolvedValue(null);

    const req = {
      params: { projectId: 'project123', milestoneId: 'nonexistent' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await getMilestoneProgress(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy milestone' });
  });

  it('trả về progress 0 khi không có features', async () => {
    const mockMilestone = {
      _id: 'milestone123',
      title: 'Test Milestone',
      project_id: 'project123'
    };

    Milestone.findOne.mockResolvedValue(mockMilestone);
    FeaturesMilestone.find.mockResolvedValue([]);

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await getMilestoneProgress(req, res);

    expect(res.json).toHaveBeenCalledWith({
      milestone_id: 'milestone123',
      milestone_title: 'Test Milestone',
      progress: {
        overall: 0,
        by_feature: [],
        by_task: { total: 0, completed: 0, percentage: 0 },
        by_function: { total: 0, completed: 0, percentage: 0 }
      }
    });
  });

  it('trả về progress thành công với features và tasks', async () => {
    const mockMilestone = {
      _id: 'milestone123',
      title: 'Test Milestone',
      project_id: 'project123'
    };

    const mockFeatureLinks = [
      { _id: 'link1', feature_id: 'feature1', milestone_id: 'milestone123' }
    ];

    const mockFeatures = [
      {
        _id: 'feature1',
        title: 'Feature 1',
        status: { value: 'completed', name: 'Completed' }
      }
    ];

    const mockTasks = [
      {
        _id: 'task1',
        feature_id: 'feature1',
        status: 'Done'
      }
    ];

    const mockFunctions = [
      {
        _id: 'func1',
        feature_id: 'feature1',
        status: { value: 'completed', name: 'Completed' }
      }
    ];

    Milestone.findOne.mockResolvedValue(mockMilestone);
    FeaturesMilestone.find.mockResolvedValue(mockFeatureLinks);
    Feature.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockFeatures)
    });
    Task.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockTasks)
    });
    Function.find.mockReturnValue({
      populate: jest.fn().mockResolvedValue(mockFunctions)
    });

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await getMilestoneProgress(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        milestone_id: 'milestone123',
        milestone_title: 'Test Milestone',
        progress: expect.objectContaining({
          overall: expect.any(Number),
          by_feature: expect.any(Array),
          by_task: expect.objectContaining({
            total: expect.any(Number)
          }),
          by_function: expect.objectContaining({
            total: expect.any(Number)
          })
        })
      })
    );
  });

  it('xử lý lỗi server (500)', async () => {
    Milestone.findOne.mockRejectedValue(new Error('Database error'));

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await getMilestoneProgress(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});

describe('milestone.controller - listUpdates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về danh sách comments thành công', async () => {
    const mockComments = [
      {
        _id: 'comment1',
        content: 'Comment 1',
        user_id: { _id: 'user1', full_name: 'User 1' }
      },
      {
        _id: 'comment2',
        content: 'Comment 2',
        user_id: { _id: 'user2', full_name: 'User 2' }
      }
    ];

    Comment.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockComments)
      })
    });

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await listUpdates(req, res);

    expect(Comment.find).toHaveBeenCalledWith({
      project_id: 'project123',
      milestone_id: 'milestone123'
    });
    expect(res.json).toHaveBeenCalledWith(mockComments);
  });

  it('xử lý lỗi server (500)', async () => {
    Comment.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Database error'))
      })
    });

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await listUpdates(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});

describe('milestone.controller - createUpdate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 400 khi thiếu content', async () => {
    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      body: {},
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createUpdate(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Nội dung cập nhật bắt buộc' });
    expect(Comment.create).not.toHaveBeenCalled();
  });

  it('tạo comment thành công', async () => {
    const createdComment = {
      _id: 'comment123',
      content: 'Test comment',
      project_id: 'project123',
      milestone_id: 'milestone123',
      user_id: { _id: 'user123', full_name: 'User', email: 'user@test.com' }
    };

    Comment.create.mockResolvedValue(createdComment);
    const mockPopulate = jest.fn().mockResolvedValue(createdComment);
    createdComment.populate = mockPopulate;
    ActivityLog.create.mockResolvedValue({ _id: 'log123' });

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      body: {
        content: 'Test comment',
        files: []
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createUpdate(req, res);

    expect(Comment.create).toHaveBeenCalledWith({
      project_id: 'project123',
      milestone_id: 'milestone123',
      content: 'Test comment',
      files: [],
      user_id: 'user123'
    });
    expect(ActivityLog.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(createdComment);
  });

  it('xử lý lỗi server (500)', async () => {
    Comment.create.mockRejectedValue(new Error('Database error'));

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      body: { content: 'Test comment' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createUpdate(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});

describe('milestone.controller - updateComment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 404 khi không tìm thấy comment', async () => {
    Comment.findOne.mockResolvedValue(null);

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123', commentId: 'nonexistent' },
      body: { content: 'Updated content' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateComment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy bình luận' });
  });

  it('trả về 403 khi user không phải là owner', async () => {
    const existingComment = {
      _id: 'comment123',
      content: 'Original content',
      user_id: 'user456'
    };

    Comment.findOne.mockResolvedValue(existingComment);

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123', commentId: 'comment123' },
      body: { content: 'Updated content' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateComment(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không có quyền sửa bình luận này' });
  });

  it('cập nhật comment thành công', async () => {
    const existingComment = {
      _id: 'comment123',
      content: 'Original content',
      user_id: 'user123'
    };

    const updatedComment = {
      ...existingComment,
      content: 'Updated content',
      user_id: { _id: 'user123', full_name: 'User', email: 'user@test.com' }
    };

    Comment.findOne.mockResolvedValue(existingComment);
    Comment.findByIdAndUpdate.mockReturnValue({
      populate: jest.fn().mockResolvedValue(updatedComment)
    });
    ActivityLog.create.mockResolvedValue({ _id: 'log123' });

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123', commentId: 'comment123' },
      body: { content: 'Updated content' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateComment(req, res);

    expect(Comment.findByIdAndUpdate).toHaveBeenCalled();
    expect(ActivityLog.create).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(updatedComment);
  });

  it('xử lý lỗi server (500)', async () => {
    Comment.findOne.mockRejectedValue(new Error('Database error'));

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123', commentId: 'comment123' },
      body: { content: 'Updated content' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateComment(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});

describe('milestone.controller - deleteComment', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 404 khi không tìm thấy comment', async () => {
    Comment.findOne.mockResolvedValue(null);

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123', commentId: 'nonexistent' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await deleteComment(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy bình luận' });
  });

  it('trả về 403 khi user không phải là owner', async () => {
    const existingComment = {
      _id: 'comment123',
      content: 'Test content',
      user_id: 'user456'
    };

    Comment.findOne.mockResolvedValue(existingComment);

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123', commentId: 'comment123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await deleteComment(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không có quyền xóa bình luận này' });
  });

  it('xóa comment thành công', async () => {
    const existingComment = {
      _id: 'comment123',
      content: 'Test content',
      user_id: 'user123'
    };

    Comment.findOne.mockResolvedValue(existingComment);
    Comment.deleteOne.mockResolvedValue({ deletedCount: 1 });
    ActivityLog.create.mockResolvedValue({ _id: 'log123' });

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123', commentId: 'comment123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await deleteComment(req, res);

    expect(Comment.deleteOne).toHaveBeenCalledWith({ _id: 'comment123' });
    expect(ActivityLog.create).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('xử lý lỗi server (500)', async () => {
    Comment.findOne.mockRejectedValue(new Error('Database error'));

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123', commentId: 'comment123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await deleteComment(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});

describe('milestone.controller - listFiles', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về danh sách files thành công', async () => {
    const mockFiles = [
      {
        _id: 'file1',
        title: 'File 1',
        file_url: 'https://example.com/file1.pdf'
      },
      {
        _id: 'file2',
        title: 'File 2',
        file_url: 'https://example.com/file2.pdf'
      }
    ];

    Document.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockFiles)
    });

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await listFiles(req, res);

    expect(Document.find).toHaveBeenCalledWith({ project_id: 'project123' });
    expect(res.json).toHaveBeenCalledWith(mockFiles);
  });

  it('xử lý lỗi server (500)', async () => {
    Document.find.mockReturnValue({
      sort: jest.fn().mockRejectedValue(new Error('Database error'))
    });

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await listFiles(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});

describe('milestone.controller - uploadFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 400 khi thiếu file', async () => {
    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      file: null,
      body: {},
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await uploadFile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Thiếu file' });
    expect(Document.create).not.toHaveBeenCalled();
  });

  it('upload file thành công', async () => {
    const mockFile = {
      path: 'https://cloudinary.com/file.pdf',
      originalname: 'test.pdf',
      mimetype: 'application/pdf'
    };

    const createdDocument = {
      _id: 'doc123',
      title: 'test.pdf',
      file_url: 'https://cloudinary.com/file.pdf',
      project_id: 'project123',
      created_by: 'user123'
    };

    Document.create.mockResolvedValue(createdDocument);
    ActivityLog.create.mockResolvedValue({ _id: 'log123' });

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      file: mockFile,
      body: { title: 'Test File', version: '1.0' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await uploadFile(req, res);

    expect(Document.create).toHaveBeenCalled();
    expect(ActivityLog.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(createdDocument);
  });

  it('xử lý lỗi server (500)', async () => {
    const mockFile = {
      path: 'https://cloudinary.com/file.pdf',
      originalname: 'test.pdf'
    };

    Document.create.mockRejectedValue(new Error('Database error'));

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      file: mockFile,
      body: {},
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await uploadFile(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});

describe('milestone.controller - listActivityLogs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về danh sách activity logs thành công', async () => {
    const mockLogs = [
      {
        _id: 'log1',
        action: 'CREATE_MILESTONE',
        created_by: { _id: 'user1', full_name: 'User 1' }
      },
      {
        _id: 'log2',
        action: 'UPDATE_MILESTONE',
        created_by: { _id: 'user2', full_name: 'User 2' }
      }
    ];

    ActivityLog.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockResolvedValue(mockLogs)
      })
    });

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await listActivityLogs(req, res);

    expect(ActivityLog.find).toHaveBeenCalledWith({
      project_id: 'project123',
      milestone_id: 'milestone123'
    });
    expect(res.json).toHaveBeenCalledWith(mockLogs);
  });

  it('xử lý lỗi server (500)', async () => {
    ActivityLog.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        sort: jest.fn().mockRejectedValue(new Error('Database error'))
      })
    });

    const req = {
      params: { projectId: 'project123', milestoneId: 'milestone123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await listActivityLogs(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});

describe('milestone.controller - getGanttHierarchy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 400 khi projectId không hợp lệ', async () => {
    const req = {
      params: { projectId: 'invalid-id' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await getGanttHierarchy(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'projectId không hợp lệ' });
  });

  it('trả về hierarchy thành công', async () => {
    const mockMilestones = [
      {
        _id: 'milestone1',
        title: 'Milestone 1',
        project_id: 'project123',
        start_date: new Date('2024-01-01'),
        deadline: new Date('2024-01-31')
      }
    ];

    const mockFeatureLinks = [
      { _id: 'link1', feature_id: 'feature1', milestone_id: 'milestone1' }
    ];

    const mockFeatures = [
      {
        _id: 'feature1',
        title: 'Feature 1',
        project_id: 'project123'
      }
    ];

    const mockFunctions = [
      {
        _id: 'func1',
        title: 'Function 1',
        feature_id: 'feature1'
      }
    ];

    Milestone.find.mockReturnValue({
      sort: jest.fn().mockResolvedValue(mockMilestones)
    });
    FeaturesMilestone.find.mockResolvedValue(mockFeatureLinks);
    Feature.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockFeatures)
    });
    Function.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockFunctions)
    });

    const req = {
      params: { projectId: '507f1f77bcf86cd799439011' }, // Valid ObjectId
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await getGanttHierarchy(req, res);

    expect(Milestone.find).toHaveBeenCalledWith({ project_id: '507f1f77bcf86cd799439011' });
    expect(res.json).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String),
          features: expect.any(Array)
        })
      ])
    );
  });

  it('xử lý lỗi server (500)', async () => {
    Milestone.find.mockReturnValue({
      sort: jest.fn().mockRejectedValue(new Error('Database error'))
    });

    const req = {
      params: { projectId: '507f1f77bcf86cd799439011' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await getGanttHierarchy(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});

describe('milestone.controller - getMilestoneRules', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về rules thành công', async () => {
    const mockRules = {
      transitions: [
        { from: 'planned', to: 'active' },
        { from: 'active', to: 'completed' }
      ]
    };

    const { getStatusTransitionRules } = require('../utils/milestoneBusinessRules');
    getStatusTransitionRules.mockReturnValue(mockRules);

    const req = {
      params: {},
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await getMilestoneRules(req, res);

    expect(getStatusTransitionRules).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: mockRules,
      description: 'Các quy tắc kinh doanh cho Milestone (Milestone Business Rules)'
    });
  });

  it('xử lý lỗi server (500)', async () => {
    const { getStatusTransitionRules } = require('../utils/milestoneBusinessRules');
    getStatusTransitionRules.mockImplementation(() => {
      throw new Error('Rules error');
    });

    const req = {
      params: {},
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await getMilestoneRules(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Rules error'
    });
  });
});

