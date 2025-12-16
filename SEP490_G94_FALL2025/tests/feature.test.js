const Feature = require('../models/feature');
const FeaturesMilestone = require('../models/feature_milestone');
const ActivityLog = require('../models/activity_log');
const Project = require('../models/project');

jest.mock('../models/feature');
jest.mock('../models/feature_milestone');
jest.mock('../models/activity_log');
jest.mock('../models/project');

const { createFeature, updateFeature } = require('../controllers/feature.controller');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('feature.controller - createFeature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseReq = () => ({
    params: { projectId: 'project123' },
    body: {
      title: 'New Feature',
      description: 'Desc',
      milestone_ids: [],
      priority: 'High',
      start_date: '2024-02-01',
      end_date: '2024-03-01',
      tags: ['tag-1'],
    },
    user: { _id: 'user123' },
  });

  it('returns 400 when title is missing', async () => {
    const req = baseReq();
    req.body.title = '';
    const res = mockResponse();

    await createFeature(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Thiếu tiêu đề' });
    expect(Project.findById).not.toHaveBeenCalled();
  });

  it('returns 404 when project is not found', async () => {
    const req = baseReq();
    const res = mockResponse();

    Project.findById.mockResolvedValue(null);

    await createFeature(req, res);

    expect(Project.findById).toHaveBeenCalledWith('project123');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy project' });
    expect(Feature.create).not.toHaveBeenCalled();
  });

  it('rejects when start date is after end date', async () => {
    const req = baseReq();
    req.body.start_date = '2024-04-01';
    req.body.end_date = '2024-03-01';
    const res = mockResponse();

    Project.findById.mockResolvedValue({
      _id: 'project123',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
    });

    await createFeature(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Start date không được sau end date',
    });
    expect(Feature.create).not.toHaveBeenCalled();
  });

  it('rejects when start date is before project start date', async () => {
    const req = baseReq();
    req.body.start_date = '2023-12-30';
    const res = mockResponse();

    Project.findById.mockResolvedValue({
      _id: 'project123',
      start_date: new Date('2024-01-05'),
      end_date: new Date('2024-12-31'),
    });

    await createFeature(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Feature start date không được trước project start date',
    });
    expect(Feature.create).not.toHaveBeenCalled();
  });

  it('rejects when end date is after project end date', async () => {
    const req = baseReq();
    req.body.end_date = '2025-01-01';
    const res = mockResponse();

    Project.findById.mockResolvedValue({
      _id: 'project123',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-06-30'),
    });

    await createFeature(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Feature end date không được sau project end date',
    });
    expect(Feature.create).not.toHaveBeenCalled();
  });

  it('creates feature, links milestones and logs activity', async () => {
    const req = baseReq();
    req.body.milestone_ids = ['ms1', 'ms2'];
    const res = mockResponse();

    const project = {
      _id: 'project123',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-12-31'),
    };
    const createdFeature = { _id: 'feature123', title: 'New Feature', project_id: 'project123' };
    const populatedFeature = { ...createdFeature, description: 'Desc', priority: 'High' };

    Project.findById.mockResolvedValue(project);
    Feature.create.mockResolvedValue(createdFeature);
    Feature.findById.mockResolvedValue(populatedFeature);
    FeaturesMilestone.insertMany.mockResolvedValue(undefined);
    ActivityLog.create.mockResolvedValue(undefined);

    await createFeature(req, res);

    expect(Feature.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Feature',
        description: 'Desc',
        project_id: 'project123',
        priority: 'High',
        start_date: new Date('2024-02-01'),
        end_date: new Date('2024-03-01'),
        tags: ['tag-1'],
      })
    );

    expect(FeaturesMilestone.insertMany).toHaveBeenCalledWith([
      { feature_id: 'feature123', milestone_id: 'ms1' },
      { feature_id: 'feature123', milestone_id: 'ms2' },
    ]);

    expect(ActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'project123',
        feature_id: 'feature123',
        action: 'CREATE_FEATURE',
        created_by: 'user123',
      })
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(populatedFeature);
  });
});

describe('feature.controller - updateFeature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const currentFeature = {
    _id: 'feature123',
    project_id: 'project123',
    title: 'Old Feature',
    description: 'Old Desc',
    priority: 'Low',
    status: 'To Do',
    start_date: new Date('2024-02-01'),
    end_date: new Date('2024-03-01'),
    tags: ['old-tag'],
  };

  const project = {
    _id: 'project123',
    start_date: new Date('2024-01-01'),
    end_date: new Date('2024-12-31'),
  };

  const baseReq = () => ({
    params: { featureId: 'feature123' },
    body: {
      title: 'Updated Feature',
      description: 'Updated Desc',
      priority: 'High',
      status: 'Doing',
      start_date: '2024-02-10',
      end_date: '2024-03-20',
      tags: ['new-tag'],
    },
    user: { _id: 'user123' },
  });

  it('returns 404 when feature not found', async () => {
    Feature.findById.mockResolvedValue(null);
    const req = baseReq();
    const res = mockResponse();

    await updateFeature(req, res);

    expect(Feature.findById).toHaveBeenCalledWith('feature123');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy feature' });
  });

  it('rejects when new start date is after end date', async () => {
    Feature.findById.mockResolvedValue(currentFeature);
    Project.findById.mockResolvedValue(project);
    const req = baseReq();
    req.body.start_date = '2024-04-01';
    req.body.end_date = '2024-03-01';
    const res = mockResponse();

    await updateFeature(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Start date không được sau end date',
    });
    expect(Feature.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects when new start date is before project start', async () => {
    Feature.findById.mockResolvedValue(currentFeature);
    Project.findById.mockResolvedValue(project);
    const req = baseReq();
    req.body.start_date = '2023-12-25';
    const res = mockResponse();

    await updateFeature(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Feature start date không được trước project start date',
    });
    expect(Feature.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('rejects when end date is after project end', async () => {
    Feature.findById.mockResolvedValue(currentFeature);
    Project.findById.mockResolvedValue(project);
    const req = baseReq();
    req.body.end_date = '2025-01-10';
    const res = mockResponse();

    await updateFeature(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Feature end date không được sau project end date',
    });
    expect(Feature.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 when there is no data to update', async () => {
    Feature.findById.mockResolvedValue(currentFeature);
    Project.findById.mockResolvedValue(project);
    const req = baseReq();
    req.body = {};
    const res = mockResponse();

    await updateFeature(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không có dữ liệu để cập nhật' });
    expect(Feature.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('updates feature and logs activity for changed fields', async () => {
    Feature.findById.mockResolvedValue(currentFeature);
    Project.findById.mockResolvedValue(project);

    const updatedFeature = {
      ...currentFeature,
      title: 'Updated Feature',
      description: 'Updated Desc',
      priority: 'High',
      status: 'Doing',
      start_date: new Date('2024-02-10'),
      end_date: new Date('2024-03-20'),
      tags: ['new-tag'],
    };

    Feature.findByIdAndUpdate.mockResolvedValue(updatedFeature);
    ActivityLog.insertMany.mockResolvedValue(undefined);

    const req = baseReq();
    const res = mockResponse();

    await updateFeature(req, res);

    expect(Feature.findByIdAndUpdate).toHaveBeenCalledWith(
      'feature123',
      expect.objectContaining({
        title: 'Updated Feature',
        description: 'Updated Desc',
        priority: 'High',
        start_date: new Date('2024-02-10'),
        end_date: new Date('2024-03-20'),
        tags: ['new-tag'],
        last_updated_by: 'user123',
        updatedAt: expect.any(Date),
      }),
      { new: true }
    );

    expect(ActivityLog.insertMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ action: 'FEATURE_PRIORITY_CHANGED' }),
        expect.objectContaining({ action: 'FEATURE_TITLE_UPDATED' }),
        expect.objectContaining({ action: 'FEATURE_DESCRIPTION_UPDATED' }),
      ])
    );

    expect(ActivityLog.create).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(updatedFeature);
  });

  it('returns 404 when feature disappears during update', async () => {
    Feature.findById.mockResolvedValue(currentFeature);
    Project.findById.mockResolvedValue(project);
    Feature.findByIdAndUpdate.mockResolvedValue(null);
    const req = baseReq();
    const res = mockResponse();

    await updateFeature(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy feature' });
  });
});