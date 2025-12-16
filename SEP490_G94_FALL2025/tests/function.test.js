const FunctionModel = require('../models/function');
const ActivityLog = require('../models/activity_log');
const Feature = require('../models/feature');

jest.mock('../models/function');
jest.mock('../models/activity_log');
jest.mock('../models/feature');

const { createFunction, updateFunction } = require('../controllers/function.controller');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('function.controller - createFunction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseReq = () => ({
    params: { projectId: 'project123' },
    body: {
      title: 'New Function',
      priority: 'High',
      feature_id: 'feature123',
      description: 'Desc',
    },
    user: { _id: 'user123' },
  });

  it('returns 400 when required fields are missing', async () => {
    const req = baseReq();
    req.body.title = undefined;
    const res = mockResponse();

    await createFunction(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Thiếu thông tin bắt buộc: title',
    });
    expect(FunctionModel.create).not.toHaveBeenCalled();
  });

  it('returns 404 when feature does not belong to project', async () => {
    const req = baseReq();
    const res = mockResponse();

    Feature.findOne.mockResolvedValue(null);

    await createFunction(req, res);

    expect(Feature.findOne).toHaveBeenCalledWith({
      _id: 'feature123',
      project_id: 'project123',
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Không tìm thấy feature trong project này',
    });
    expect(FunctionModel.create).not.toHaveBeenCalled();
  });

  it('creates function and logs activity when feature_id is provided', async () => {
    const req = baseReq();
    const res = mockResponse();

    Feature.findOne.mockResolvedValue({
      _id: 'feature123',
      project_id: 'project123',
    });

    const createdFunc = {
      _id: 'func123',
      title: 'New Function',
      feature_id: 'feature123',
    };
    FunctionModel.create.mockResolvedValue(createdFunc);

    const mockSelect = jest.fn().mockResolvedValue({
      _id: 'feature123',
      project_id: 'project123',
    });
    Feature.findById = jest.fn().mockReturnValue({
      select: mockSelect,
    });

    ActivityLog.create.mockResolvedValue({ _id: 'log123' });

    await createFunction(req, res);

    expect(FunctionModel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Function',
        feature_id: 'feature123',
        description: 'Desc',
      })
    );

    expect(Feature.findById).toHaveBeenCalledWith('feature123');
    expect(mockSelect).toHaveBeenCalledWith('project_id');

    expect(ActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'project123',
        feature_id: 'feature123',
        action: 'CREATE_FUNCTION',
        metadata: expect.objectContaining({
          function_id: 'func123',
          function_title: 'New Function',
          feature_id: 'feature123',
        }),
        created_by: 'user123',
      })
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Tạo chức năng thành công',
      func: createdFunc,
    });
  });

  it('creates function without feature_id and logs activity using projectId param', async () => {
    const req = baseReq();
    delete req.body.feature_id;
    const res = mockResponse();

    const createdFunc = {
      _id: 'func123',
      title: 'New Function',
      feature_id: null,
    };
    FunctionModel.create.mockResolvedValue(createdFunc);
    ActivityLog.create.mockResolvedValue({ _id: 'log123' });

    await createFunction(req, res);

    expect(Feature.findOne).not.toHaveBeenCalled();
    expect(Feature.findById).not.toHaveBeenCalled();

    expect(ActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'project123',
        feature_id: null,
        action: 'CREATE_FUNCTION',
        metadata: expect.objectContaining({
          function_id: 'func123',
          function_title: 'New Function',
          feature_id: undefined,
        }),
        created_by: 'user123',
      })
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Tạo chức năng thành công',
      func: createdFunc,
    });
  });
});

describe('function.controller - updateFunction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const baseReq = () => ({
    params: { functionId: 'func123' },
    body: {
      title: 'Updated Function',
      priority: 'High',
      description: 'Updated desc',
      feature_id: 'feature123',
    },
    user: { _id: 'user123' },
  });

  const oldFunc = {
    _id: 'func123',
    title: 'Old Function',
    priority: 'Low',
    status: 'To Do',
    description: 'Old desc',
    feature_id: 'feature123',
  };

  it('returns 400 when there is no data to update', async () => {
    const req = baseReq();
    req.body = {};
    const res = mockResponse();

    await updateFunction(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Không có dữ liệu để cập nhật',
    });
    expect(FunctionModel.findById).not.toHaveBeenCalled();
  });

  it('returns 404 when function does not exist', async () => {
    FunctionModel.findById.mockResolvedValue(null);
    const req = baseReq();
    const res = mockResponse();

    await updateFunction(req, res);

    expect(FunctionModel.findById).toHaveBeenCalledWith('func123');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Không tìm thấy function',
    });
  });



  it('updates function and logs UPDATE_FUNCTION when fields change', async () => {
    FunctionModel.findById.mockResolvedValue(oldFunc);

    const updatedFunc = {
      ...oldFunc,
      title: 'Updated Function',
      priority: 'High',
      description: 'Updated desc',
      feature_id: {
        _id: 'feature123',
        title: 'Feature Title',
        project_id: 'project123',
      },
    };

    const mockPopulate = jest.fn().mockResolvedValue(updatedFunc);
    FunctionModel.findByIdAndUpdate = jest.fn().mockReturnValue({
      populate: mockPopulate,
    });

    ActivityLog.create.mockResolvedValue({ _id: 'log123', action: 'UPDATE_FUNCTION', metadata: {} });

    const req = baseReq();
    const res = mockResponse();

    await updateFunction(req, res);

    expect(FunctionModel.findByIdAndUpdate).toHaveBeenCalledWith(
      'func123',
      { $set: expect.objectContaining({ 
        title: 'Updated Function', 
        priority: 'High',
        description: 'Updated desc',
        feature_id: 'feature123'
      }) },
      { new: true }
    );

    expect(mockPopulate).toHaveBeenCalledWith('feature_id', 'title project_id');

    expect(ActivityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: 'project123',
        feature_id: 'feature123',
        function_id: 'func123',
        action: 'UPDATE_FUNCTION',
        metadata: expect.objectContaining({
          function_id: 'func123',
          function_title: 'Updated Function',
          feature_id: 'feature123',
          changed: expect.arrayContaining(['title', 'priority', 'description', 'feature_id']),
        }),
        created_by: 'user123',
      })
    );

    expect(res.json).toHaveBeenCalledWith({
      message: 'Cập nhật function thành công',
      function: updatedFunc,
    });
  });
});
