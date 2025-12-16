const Task = require('../models/task');
const TaskDependency = require('../models/task_dependency');
const Function = require('../models/function');
const ActivityLog = require('../models/activity_log');
const User = require('../models/user');

jest.mock('../models/task');
jest.mock('../models/task_dependency');
jest.mock('../models/function');
jest.mock('../models/activity_log');
jest.mock('../models/user');
jest.mock('../utils/taskValidation');
jest.mock('../utils/taskDateValidation');
jest.mock('../utils/taskNotificationHelper');

const { addDependency, createTask, updateTask } = require('../controllers/task.controller');
const { validateTaskCreation, validateTaskUpdate: validateTaskUpdateLogic } = require('../utils/taskValidation');
const { validateTaskDates, validateTaskUpdate } = require('../utils/taskDateValidation');
const { notifyTaskCreated, notifyTaskAssigned, notifyTaskStatusChanged, notifyTaskDeadlineChanged, notifyTaskPriorityChanged } = require('../utils/taskNotificationHelper');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const createChainablePopulate = (finalValue) => {
  const createChain = () => {
    const chain = {
      populate: jest.fn().mockImplementation(() => createChain())
    };
    chain.then = (resolve) => Promise.resolve(finalValue).then(resolve);
    chain.catch = (reject) => Promise.resolve(finalValue).catch(reject);
    return chain;
  };
  return createChain();
};

describe('task.controller - addDependency', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    TaskDependency.find.mockResolvedValue([]);
  });

  it('trả về 400 khi thiếu depends_on_task_id', async () => {
    const req = {
      params: { taskId: 'task123' },
      body: { dependency_type: 'FS' },
      user: { _id: 'user123' },
    };
    const res = mockResponse();

    await addDependency(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Thiếu depends_on_task_id' });
    expect(Task.findById).not.toHaveBeenCalled();
  });

  it('trả về 400 khi dependency_type không hợp lệ', async () => {
    const req = {
      params: { taskId: 'task123' },
      body: {
        depends_on_task_id: 'task456',
        dependency_type: 'INVALID',
      },
      user: { _id: 'user123' },
    };
    const res = mockResponse();

    await addDependency(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'dependency_type phải là một trong: FS, FF, SS, SF, relates_to',
    });
  });

  it('trả về 400 khi lag_days không phải số', async () => {
    const req = {
      params: { taskId: 'task123' },
      body: {
        depends_on_task_id: 'task456',
        dependency_type: 'FS',
        lag_days: 'not-a-number',
      },
      user: { _id: 'user123' },
    };
    const res = mockResponse();

    await addDependency(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'lag_days phải là số' });
  });

  it('trả về 400 khi is_mandatory không phải boolean', async () => {
    const req = {
      params: { taskId: 'task123' },
      body: {
        depends_on_task_id: 'task456',
        dependency_type: 'FS',
        is_mandatory: 'not-boolean',
      },
      user: { _id: 'user123' },
    };
    const res = mockResponse();

    await addDependency(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'is_mandatory phải là boolean' });
  });

  it('trả về 404 khi không tìm thấy task', async () => {
    Task.findById.mockResolvedValue(null);

    const req = {
      params: { taskId: 'task123' },
      body: {
        depends_on_task_id: 'task456',
        dependency_type: 'FS',
      },
      user: { _id: 'user123' },
    };
    const res = mockResponse();

    await addDependency(req, res);

    expect(Task.findById).toHaveBeenCalledWith('task123');
    expect(Task.findById).toHaveBeenCalledWith('task456');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy task' });
  });

  it('trả về 404 khi không tìm thấy depends_on_task', async () => {
    Task.findById
      .mockResolvedValueOnce({ _id: 'task123', title: 'Task 1' })
      .mockResolvedValueOnce(null);

    const req = {
      params: { taskId: 'task123' },
      body: {
        depends_on_task_id: 'task456',
        dependency_type: 'FS',
      },
      user: { _id: 'user123' },
    };
    const res = mockResponse();

    await addDependency(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy task' });
  });

  it('trả về 400 khi phát hiện circular dependency', async () => {
    const task1 = { _id: 'task123', title: 'Task 1', status: 'To Do' };
    const task2 = { _id: 'task456', title: 'Task 2', status: 'To Do' };

    Task.findById
      .mockResolvedValueOnce(task1)
      .mockResolvedValueOnce(task2);

    TaskDependency.find.mockResolvedValueOnce([
      { depends_on_task_id: 'task123' } 
    ]);

    const req = {
      params: { taskId: 'task123' },
      body: {
        depends_on_task_id: 'task456',
        dependency_type: 'FS',
      },
      user: { _id: 'user123' },
    };
    const res = mockResponse();

    await addDependency(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Không thể tạo dependency: Phát hiện circular dependency',
    });
    expect(TaskDependency.create).not.toHaveBeenCalled();
  });

  it('tạo dependency thành công với relates_to (không check circular)', async () => {
    const task1 = {
      _id: 'task123',
      title: 'Task 1',
      status: 'To Do',
      start_date: new Date('2024-01-01'),
      deadline: new Date('2024-01-10'),
    };
    const task2 = {
      _id: 'task456',
      title: 'Task 2',
      status: 'To Do',
      start_date: new Date('2024-01-05'),
      deadline: new Date('2024-01-15'),
    };

    Task.findById
      .mockResolvedValueOnce(task1)
      .mockResolvedValueOnce(task2);

    const createdDependency = {
      _id: 'dep123',
      task_id: 'task123',
      depends_on_task_id: 'task456',
      dependency_type: 'relates_to',
      lag_days: 0,
      is_mandatory: true,
      populate: jest.fn().mockImplementation(function() {
        this.depends_on_task_id = task2;
        return Promise.resolve(this);
      }),
    };

    TaskDependency.create.mockResolvedValue(createdDependency);

    const req = {
      params: { taskId: 'task123' },
      body: {
        depends_on_task_id: 'task456',
        dependency_type: 'relates_to',
        notes: 'Related tasks',
      },
      user: { _id: 'user123' },
    };
    const res = mockResponse();

    await addDependency(req, res);

    expect(TaskDependency.create).toHaveBeenCalledWith({
      task_id: 'task123',
      depends_on_task_id: 'task456',
      dependency_type: 'relates_to',
      lag_days: 0,
      is_mandatory: true,
      created_by: 'user123',
      notes: 'Related tasks',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      dependency: expect.objectContaining({
        _id: 'dep123',
        task_id: 'task123',
        depends_on_task_id: task2,
        dependency_type: 'relates_to',
      }),
      warning: null,
      status_warning: null,
      warnings: null,
      message: 'Phụ thuộc được tạo thành công',
    });
  });

  it('tạo dependency thành công không có violation', async () => {
    const task1 = {
      _id: 'task123',
      title: 'Task 1',
      status: 'To Do',
      start_date: new Date('2024-01-11'),
      deadline: new Date('2024-01-20'),
    };
    const task2 = {
      _id: 'task456',
      title: 'Task 2',
      status: 'Done',
      start_date: new Date('2024-01-01'),
      deadline: new Date('2024-01-10'),
    };

    Task.findById
      .mockResolvedValueOnce(task1)
      .mockResolvedValueOnce(task2);

    const createdDependency = {
      _id: 'dep123',
      task_id: 'task123',
      depends_on_task_id: 'task456',
      dependency_type: 'FS',
      populate: jest.fn().mockImplementation(function() {
        this.depends_on_task_id = task2;
        return Promise.resolve(this);
      }),
    };

    TaskDependency.create.mockResolvedValue(createdDependency);

    const req = {
      params: { taskId: 'task123' },
      body: {
        depends_on_task_id: 'task456',
        dependency_type: 'FS',
        lag_days: 0,
        is_mandatory: true,
      },
      user: { _id: 'user123' },
    };
    const res = mockResponse();

    await addDependency(req, res);

    expect(TaskDependency.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      dependency: expect.objectContaining({
        _id: 'dep123',
        task_id: 'task123',
        depends_on_task_id: task2,
        dependency_type: 'FS',
      }),
      warning: null,
      status_warning: null,
      warnings: null,
      message: 'Phụ thuộc được tạo thành công',
    });
  });

  it('tạo dependency thành công nhưng có date violation warning', async () => {
    const task1 = {
      _id: 'task123',
      title: 'Task 1',
      status: 'To Do',
      start_date: new Date('2024-01-05'),
      deadline: new Date('2024-01-20'),
    };
    const task2 = {
      _id: 'task456',
      title: 'Task 2',
      status: 'Doing',
      start_date: new Date('2024-01-01'),
      deadline: new Date('2024-01-10'),
    };

    Task.findById
      .mockResolvedValueOnce(task1)
      .mockResolvedValueOnce(task2);

    const createdDependency = {
      _id: 'dep123',
      task_id: 'task123',
      depends_on_task_id: 'task456',
      dependency_type: 'FS',
      populate: jest.fn().mockImplementation(function() {
        this.depends_on_task_id = task2;
        return Promise.resolve(this);
      }),
    };

    TaskDependency.create.mockResolvedValue(createdDependency);

    const req = {
      params: { taskId: 'task123' },
      body: {
        depends_on_task_id: 'task456',
        dependency_type: 'FS',
        lag_days: 0,
        strict_validation: false,
      },
      user: { _id: 'user123' },
    };
    const res = mockResponse();

    await addDependency(req, res);

    const requiredStartDate = new Date('2024-01-10');
    const expectedWarningMessage = `Task "Task 1" bắt đầu ${new Date('2024-01-05').toLocaleDateString()} nhưng phải đợi task "Task 2" kết thúc ${new Date('2024-01-10').toLocaleDateString()}`;
    const expectedSuggestion = `Nên thay đổi ngày bắt đầu thành ${requiredStartDate.toLocaleDateString()} hoặc muộn hơn`;

    expect(TaskDependency.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      dependency: expect.objectContaining({
        _id: 'dep123',
        task_id: 'task123',
        depends_on_task_id: task2,
        dependency_type: 'FS',
      }),
      warning: expect.objectContaining({
        type: 'date_violation',
        severity: 'warning',
        message: expectedWarningMessage,
        current_start_date: task1.start_date,
        current_deadline: task1.deadline,
        required_start_date: requiredStartDate,
        predecessor_deadline: task2.deadline,
        lag_days: 0,
        suggestion: expectedSuggestion,
        auto_adjust_available: true,
      }),
      status_warning: null,
      warnings: expect.arrayContaining([
        expect.objectContaining({
          type: 'date_violation',
          severity: 'warning',
          message: expectedWarningMessage,
          current_start_date: task1.start_date,
          current_deadline: task1.deadline,
          predecessor_deadline: task2.deadline,
          lag_days: 0,
          suggestion: expectedSuggestion,
          auto_adjust_available: true,
        }),
      ]),
      message: 'Dependency created with 1 warning(s)',
    });
  });

  it('trả về 400 và xóa dependency khi strict_validation = true và có violation', async () => {
    const task1 = {
      _id: 'task123',
      title: 'Task 1',
      status: 'To Do',
      start_date: new Date('2024-01-05'),
      deadline: new Date('2024-01-20'),
    };
    const task2 = {
      _id: 'task456',
      title: 'Task 2',
      status: 'Doing',
      start_date: new Date('2024-01-01'),
      deadline: new Date('2024-01-10'),
    };

    Task.findById
      .mockResolvedValueOnce(task1)
      .mockResolvedValueOnce(task2);

    const createdDependency = {
      _id: 'dep123',
      task_id: 'task123',
      depends_on_task_id: 'task456',
      dependency_type: 'FS',
      populate: jest.fn().mockImplementation(function() {
        this.depends_on_task_id = task2;
        return Promise.resolve(this);
      }),
    };

    TaskDependency.create.mockResolvedValue(createdDependency);
    TaskDependency.findByIdAndDelete.mockResolvedValue(createdDependency);

    const req = {
      params: { taskId: 'task123' },
      body: {
        depends_on_task_id: 'task456',
        dependency_type: 'FS',
        strict_validation: true,
      },
      user: { _id: 'user123' },
    };
    const res = mockResponse();

    await addDependency(req, res);

    const requiredStartDate = new Date('2024-01-10');
    const expectedViolationMessage = `Task "Task 1" bắt đầu ${new Date('2024-01-05').toLocaleDateString()} nhưng phải đợi task "Task 2" kết thúc ${new Date('2024-01-10').toLocaleDateString()}`;
    const expectedViolationSuggestion = `Nên thay đổi ngày bắt đầu thành ${requiredStartDate.toLocaleDateString()} hoặc muộn hơn`;
    const expectedErrorMessage = `Không thể tạo dependency vì vi phạm quy tắc ngày tháng. ${expectedViolationMessage}`;

    expect(TaskDependency.create).toHaveBeenCalled();
    expect(TaskDependency.findByIdAndDelete).toHaveBeenCalledWith('dep123');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Date violation detected',
      violation: expect.objectContaining({
        type: 'date_violation',
        severity: 'warning',
        message: expectedViolationMessage,
        current_start_date: task1.start_date,
        current_deadline: task1.deadline,
        required_start_date: requiredStartDate,
        predecessor_deadline: task2.deadline,
        lag_days: 0,
        suggestion: expectedViolationSuggestion,
        auto_adjust_available: true,
      }),
      message: expectedErrorMessage,
      suggestion: expectedViolationSuggestion,
      can_auto_fix: true,
    });
  });

  it('tạo dependency thành công với lag_days', async () => {
    const task1 = {
      _id: 'task123',
      title: 'Task 1',
      status: 'To Do',
      start_date: new Date('2024-01-13'),
      deadline: new Date('2024-01-20'),
    };
    const task2 = {
      _id: 'task456',
      title: 'Task 2',
      status: 'Done',
      start_date: new Date('2024-01-01'),
      deadline: new Date('2024-01-10'),
    };

    Task.findById
      .mockResolvedValueOnce(task1)
      .mockResolvedValueOnce(task2);

    const createdDependency = {
      _id: 'dep123',
      task_id: 'task123',
      depends_on_task_id: 'task456',
      dependency_type: 'FS',
      lag_days: 3,
      populate: jest.fn().mockImplementation(function() {
        this.depends_on_task_id = task2;
        return Promise.resolve(this);
      }),
    };

    TaskDependency.create.mockResolvedValue(createdDependency);

    const req = {
      params: { taskId: 'task123' },
      body: {
        depends_on_task_id: 'task456',
        dependency_type: 'FS',
        lag_days: 3,
        is_mandatory: false,
      },
      user: { _id: 'user123' },
    };
    const res = mockResponse();

    await addDependency(req, res);

    expect(TaskDependency.create).toHaveBeenCalledWith({
      task_id: 'task123',
      depends_on_task_id: 'task456',
      dependency_type: 'FS',
      lag_days: 3,
      is_mandatory: false,
      created_by: 'user123',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      dependency: expect.objectContaining({
        _id: 'dep123',
        task_id: 'task123',
        depends_on_task_id: task2,
        dependency_type: 'FS',
        lag_days: 3,
      }),
      warning: null,
      status_warning: null,
      warnings: null,
      message: 'Phụ thuộc được tạo thành công',
    });
  });

  it('tạo dependency thành công nhưng có status violation warning', async () => {
    const task1 = {
      _id: 'task123',
      title: 'Task 1',
      status: 'Doing',
      start_date: new Date('2024-01-11'),
      deadline: new Date('2024-01-20'),
    };
    const task2 = {
      _id: 'task456',
      title: 'Task 2',
      status: 'To Do',
      start_date: new Date('2024-01-01'),
      deadline: new Date('2024-01-10'),
    };

    Task.findById
      .mockResolvedValueOnce(task1)
      .mockResolvedValueOnce(task2);

    const createdDependency = {
      _id: 'dep123',
      task_id: 'task123',
      depends_on_task_id: 'task456',
      dependency_type: 'FS',
      populate: jest.fn().mockImplementation(function() {
        this.depends_on_task_id = task2;
        return Promise.resolve(this);
      }),
    };

    TaskDependency.create.mockResolvedValue(createdDependency);

    const req = {
      params: { taskId: 'task123' },
      body: {
        depends_on_task_id: 'task456',
        dependency_type: 'FS',
      },
      user: { _id: 'user123' },
    };
    const res = mockResponse();

    await addDependency(req, res);

    const expectedStatusWarningMessage = expect.stringContaining('Xung đột trạng thái');
    const expectedStatusSuggestion = expect.stringContaining('phải được hoàn thành trước khi task sau bắt đầu');

    expect(TaskDependency.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      dependency: expect.objectContaining({
        _id: 'dep123',
        task_id: 'task123',
        depends_on_task_id: task2,
        dependency_type: 'FS',
      }),
      warning: null,
      status_warning: expect.objectContaining({
        type: 'status_violation',
        severity: 'warning',
        message: expectedStatusWarningMessage,
        suggestion: expectedStatusSuggestion,
        current_status: 'Doing',
        predecessor_status: 'To Do',
      }),
      warnings: expect.arrayContaining([
        expect.objectContaining({
          type: 'status_violation',
          severity: 'warning',
          message: expectedStatusWarningMessage,
          current_status: 'Doing',
          predecessor_status: 'To Do',
          suggestion: expectedStatusSuggestion,
        }),
      ]),
      message: 'Dependency created with 1 warning(s)',
    });
  });

  it('xử lý lỗi duplicate dependency (code 11000)', async () => {
    const task1 = {
      _id: 'task123',
      title: 'Task 1',
      status: 'To Do',
    };
    const task2 = {
      _id: 'task456',
      title: 'Task 2',
      status: 'To Do',
    };

    Task.findById
      .mockResolvedValueOnce(task1)
      .mockResolvedValueOnce(task2);

    const duplicateError = new Error('Duplicate key');
    duplicateError.code = 11000;

    TaskDependency.create.mockRejectedValue(duplicateError);

    const req = {
      params: { taskId: 'task123' },
      body: {
        depends_on_task_id: 'task456',
        dependency_type: 'FS',
      },
      user: { _id: 'user123' },
    };
    const res = mockResponse();

    await addDependency(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Dependency đã tồn tại' });
  });

  it('xử lý lỗi server (500)', async () => {
    const task1 = {
      _id: 'task123',
      title: 'Task 1',
      status: 'To Do',
    };
    const task2 = {
      _id: 'task456',
      title: 'Task 2',
      status: 'To Do',
    };

    Task.findById
      .mockResolvedValueOnce(task1)
      .mockResolvedValueOnce(task2);

    TaskDependency.create.mockRejectedValue(new Error('Database error'));

    const req = {
      params: { taskId: 'task123' },
      body: {
        depends_on_task_id: 'task456',
        dependency_type: 'FS',
      },
      user: { _id: 'user123' },
    };
    const res = mockResponse();

    await addDependency(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error',
    });
  });
});

describe('task.controller - createTask', () => {
  const createMockFunction = (projectId = 'project123', featureId = 'feature123') => {
    const mockFunc = {
      _id: 'func123',
      populate: jest.fn().mockResolvedValue({
        _id: 'func123',
        feature_id: {
          _id: featureId,
          project_id: {
            _id: projectId,
            toString: () => projectId
          }
        }
      }),
      feature_id: {
        _id: featureId,
        project_id: {
          _id: projectId,
          toString: () => projectId
        }
      }
    };
    return mockFunc;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    validateTaskCreation.mockResolvedValue({ valid: true, errors: [] });
    validateTaskDates.mockResolvedValue({ valid: true, errors: [] });
    notifyTaskCreated.mockResolvedValue(undefined);
    ActivityLog.create.mockResolvedValue({ _id: 'log123' });
  });

  it('trả về 400 khi validation thất bại', async () => {
    validateTaskCreation.mockResolvedValue({
      valid: false,
      errors: ['Tiêu đề là bắt buộc', 'Ngày kết thúc công việc là bắt buộc', 'Số giờ ước tính là bắt buộc']
    });

    const req = {
      params: { projectId: 'project123' },
      body: {},
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createTask(req, res);

    expect(validateTaskCreation).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Tiêu đề là bắt buộc. Ngày kết thúc công việc là bắt buộc. Số giờ ước tính là bắt buộc',
      errors: ['Tiêu đề là bắt buộc', 'Ngày kết thúc công việc là bắt buộc', 'Số giờ ước tính là bắt buộc']
    });
    expect(Task.create).not.toHaveBeenCalled();
  });

  it('trả về 400 khi thiếu function_id', async () => {
    validateTaskCreation.mockResolvedValue({ valid: true, errors: [] });

    const req = {
      params: { projectId: 'project123' },
      body: {
        title: 'Test Task',
        assignee_id: 'user456',
        deadline: '2024-12-31'
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Chọn chức năng cho công việc' });
    expect(Task.create).not.toHaveBeenCalled();
  });

  it('trả về 404 khi không tìm thấy function', async () => {
    Function.findById.mockReturnValue({
      populate: jest.fn().mockResolvedValue(null)
    });

    const req = {
      params: { projectId: 'project123' },
      body: {
        title: 'Test Task',
        function_id: 'func123',
        assignee_id: 'user456',
        deadline: '2024-12-31'
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createTask(req, res);

    expect(Function.findById).toHaveBeenCalledWith('func123');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy chức năng' });
    expect(Task.create).not.toHaveBeenCalled();
  });

  it('trả về 404 khi function không thuộc project', async () => {
    const mockFunction = createMockFunction('project456');
    Function.findById.mockReturnValue(mockFunction);

    const req = {
      params: { projectId: 'project123' },
      body: {
        title: 'Test Task',
        function_id: 'func123',
        assignee_id: 'user456',
        deadline: '2024-12-31'
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createTask(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Chức năng không thuộc dự án này' });
    expect(Task.create).not.toHaveBeenCalled();
  });

  it('trả về 400 khi date validation thất bại', async () => {
    const mockFunction = createMockFunction();
    Function.findById.mockReturnValue(mockFunction);
    validateTaskDates.mockResolvedValue({
      valid: false,
      errors: ['Ngày kết thúc công việc không được sau ngày kết thúc dự án'],
      projectInfo: {
        featureId: 'feature123',
        featureTitle: 'Test Feature',
        featureStartDate: new Date('2024-01-01'),
        featureEndDate: new Date('2024-12-31'),
        projectStartDate: new Date('2024-01-01'),
        projectEndDate: new Date('2024-12-31')
      }
    });

    const req = {
      params: { projectId: 'project123' },
      body: {
        title: 'Test Task',
        function_id: 'func123',
        assignee_id: 'user456',
        deadline: '2025-12-31'
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createTask(req, res);

    expect(validateTaskDates).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Ngày kết thúc công việc không được sau ngày kết thúc dự án',
      errors: ['Ngày kết thúc công việc không được sau ngày kết thúc dự án'],
      type: 'date_validation',
      feature_info: {
        feature_id: 'feature123',
        feature_title: 'Test Feature',
        feature_start_date: new Date('2024-01-01'),
        feature_end_date: new Date('2024-12-31'),
        project_start_date: new Date('2024-01-01'),
        project_end_date: new Date('2024-12-31')
      }
    });
    expect(Task.create).not.toHaveBeenCalled();
  });

  it('trả về 400 khi task start_date trước feature start_date', async () => {
    const mockFunction = createMockFunction();
    Function.findById.mockReturnValue(mockFunction);
    validateTaskDates.mockResolvedValue({
      valid: false,
      errors: [
        `Ngày bắt đầu công việc (2024-02-15) không được trước ngày bắt đầu feature "Test Feature" (2024-03-01)`
      ],
      projectInfo: {
        featureId: 'feature123',
        featureTitle: 'Test Feature',
        featureStartDate: new Date('2024-03-01'),
        featureEndDate: new Date('2024-06-30'),
        projectStartDate: new Date('2024-01-01'),
        projectEndDate: new Date('2024-12-31')
      }
    });

    const req = {
      params: { projectId: 'project123' },
      body: {
        title: 'Test Task',
        function_id: 'func123',
        assignee_id: 'user456',
        start_date: '2024-02-15',
        deadline: '2024-04-30'
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createTask(req, res);

    expect(validateTaskDates).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: expect.stringContaining('không được trước ngày bắt đầu feature'),
      errors: expect.arrayContaining([
        expect.stringContaining('không được trước ngày bắt đầu feature')
      ]),
      type: 'date_validation',
      feature_info: {
        feature_id: 'feature123',
        feature_title: 'Test Feature',
        feature_start_date: new Date('2024-03-01'),
        feature_end_date: new Date('2024-06-30'),
        project_start_date: new Date('2024-01-01'),
        project_end_date: new Date('2024-12-31')
      }
    });
    expect(Task.create).not.toHaveBeenCalled();
  });

  it('trả về 400 khi task deadline sau feature end_date', async () => {
    const mockFunction = createMockFunction();
    Function.findById.mockReturnValue(mockFunction);
    validateTaskDates.mockResolvedValue({
      valid: false,
      errors: [
        `Ngày kết thúc công việc (2024-07-15) không được sau ngày kết thúc feature "Test Feature" (2024-06-30)`
      ],
      projectInfo: {
        featureId: 'feature123',
        featureTitle: 'Test Feature',
        featureStartDate: new Date('2024-03-01'),
        featureEndDate: new Date('2024-06-30'),
        projectStartDate: new Date('2024-01-01'),
        projectEndDate: new Date('2024-12-31')
      }
    });

    const req = {
      params: { projectId: 'project123' },
      body: {
        title: 'Test Task',
        function_id: 'func123',
        assignee_id: 'user456',
        start_date: '2024-04-01',
        deadline: '2024-07-15'
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createTask(req, res);

    expect(validateTaskDates).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: expect.stringContaining('không được sau ngày kết thúc feature'),
      errors: expect.arrayContaining([
        expect.stringContaining('không được sau ngày kết thúc feature')
      ]),
      type: 'date_validation',
      feature_info: {
        feature_id: 'feature123',
        feature_title: 'Test Feature',
        feature_start_date: new Date('2024-03-01'),
        feature_end_date: new Date('2024-06-30'),
        project_start_date: new Date('2024-01-01'),
        project_end_date: new Date('2024-12-31')
      }
    });
    expect(Task.create).not.toHaveBeenCalled();
  });

  it('tạo task thành công với đầy đủ thông tin', async () => {
    const mockFunction = createMockFunction();
    Function.findById.mockReturnValue(mockFunction);

    const createdTask = {
      _id: 'task123',
      title: 'Test Task',
      function_id: 'func123',
      assigner_id: 'user123',
      assignee_id: 'user456',
      start_date: new Date('2024-01-01'),
      deadline: new Date('2024-12-31'),
      description: 'Test description',
      priority: 'High',
      estimate: 8,
      status: 'To Do'
    };
    Task.create.mockResolvedValue(createdTask);

    const req = {
      params: { projectId: 'project123' },
      body: {
        title: 'Test Task',
        function_id: 'func123',
        assignee_id: 'user456',
        start_date: '2024-01-01',
        deadline: '2024-12-31',
        description: 'Test description',
        priority: 'High',
        estimate: 8
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createTask(req, res);

    expect(Task.create).toHaveBeenCalledWith({
      title: 'Test Task',
      type_id: undefined,
      function_id: 'func123',
      assigner_id: 'user123',
      assignee_id: 'user456',
      start_date: new Date('2024-01-01'),
      deadline: new Date('2024-12-31'),
      description: 'Test description',
      priority: 'High',
      milestone_id: undefined,
      estimate: 8,
      status: 'To Do'
    });
    expect(ActivityLog.create).toHaveBeenCalledWith({
      project_id: 'project123',
      feature_id: 'feature123',
      function_id: 'func123',
      task_id: 'task123',
      action: 'CREATE_TASK',
      metadata: { task_id: 'task123', title: 'Test Task' },
      created_by: 'user123'
    });
    expect(notifyTaskCreated).toHaveBeenCalledWith(createdTask, 'user123', 'project123');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(createdTask);
  });

  it('xử lý lỗi server (500)', async () => {
    const mockFunction = createMockFunction();
    Function.findById.mockReturnValue(mockFunction);
    Task.create.mockRejectedValue(new Error('Database error'));

    const req = {
      params: { projectId: 'project123' },
      body: {
        title: 'Test Task',
        function_id: 'func123',
        assignee_id: 'user456',
        deadline: '2024-12-31'
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createTask(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});

describe('task.controller - updateTask', () => {
  const User = require('../models/user');
  
  jest.mock('../models/user');

  const createMockTask = (overrides = {}) => {
    return {
      _id: 'task123',
      title: 'Original Task',
      status: 'To Do',
      priority: 'Medium',
      deadline: new Date('2024-12-31'),
      start_date: new Date('2024-01-01'),
      description: 'Original description',
      assignee_id: {
        _id: 'user456',
        full_name: 'John Doe',
        email: 'john@example.com'
      },
      assigner_id: {
        _id: 'user123',
        full_name: 'Admin',
        email: 'admin@example.com'
      },
      function_id: {
        _id: 'func123',
        title: 'Test Function',
        feature_id: {
          _id: 'feature123',
          title: 'Test Feature',
          project_id: 'project123'
        }
      },
      estimate: 8,
      actual: 0,
      ...overrides
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    const { validateTaskUpdate: validateTaskUpdateLogic } = require('../utils/taskValidation');
    const { validateTaskUpdate } = require('../utils/taskDateValidation');
    const { notifyTaskAssigned, notifyTaskStatusChanged, notifyTaskDeadlineChanged, notifyTaskPriorityChanged } = require('../utils/taskNotificationHelper');
    
    validateTaskUpdateLogic.mockResolvedValue({ valid: true, errors: [] });
    validateTaskUpdate.mockResolvedValue({ valid: true, errors: [] });
    notifyTaskAssigned.mockResolvedValue(undefined);
    notifyTaskStatusChanged.mockResolvedValue(undefined);
    notifyTaskDeadlineChanged.mockResolvedValue(undefined);
    notifyTaskPriorityChanged.mockResolvedValue(undefined);
    ActivityLog.create.mockResolvedValue({ _id: 'log123' });
    
    TaskDependency.find.mockReturnValue(createChainablePopulate([]));
  });

  it('trả về 404 khi không tìm thấy task', async () => {
    const mockPopulateChain = {
      populate: jest.fn().mockResolvedValue(null)
    };
    Task.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(mockPopulateChain)
    });

    const req = {
      params: { taskId: 'nonexistent' },
      body: { title: 'New Title' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateTask(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy task' });
  });

  it('trả về 400 khi validation thất bại', async () => {
    const mockTask = createMockTask();
    const mockPopulateChain =  {
      populate: jest.fn().mockResolvedValue(mockTask)
    };
    Task.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(mockPopulateChain)
    });
    
    const { validateTaskUpdate: validateTaskUpdateLogic } = require('../utils/taskValidation');
    validateTaskUpdateLogic.mockResolvedValue({
      valid: false,
      errors: ['Tiêu đề không được để trống']
    });

    const req = {
      params: { taskId: 'task123' },
      body: { title: '' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Tiêu đề không được để trống',
      errors: ['Tiêu đề không được để trống'],
      can_force: false
    });
    expect(Task.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('trả về 400 khi date validation thất bại', async () => {
    const mockTask = createMockTask();
    const mockPopulateChain = {
      populate: jest.fn().mockResolvedValue(mockTask)
    };
    Task.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(mockPopulateChain)
    });
    
    const { validateTaskUpdate: validateTaskUpdateLogic } = require('../utils/taskValidation');
    const { validateTaskUpdate } = require('../utils/taskDateValidation');
    
    validateTaskUpdateLogic.mockResolvedValue({ valid: true, errors: [] });
    validateTaskUpdate.mockResolvedValue({
      valid: false,
      errors: ['Ngày kết thúc công việc không được sau ngày kết thúc feature'],
      projectInfo: {
        featureId: 'feature123',
        featureTitle: 'Test Feature',
        featureStartDate: new Date('2024-01-01'),
        featureEndDate: new Date('2024-06-30'),
        projectStartDate: new Date('2024-01-01'),
        projectEndDate: new Date('2024-12-31')
      }
    });

    const req = {
      params: { taskId: 'task123' },
      body: { deadline: '2024-07-31' }, 
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Ngày kết thúc công việc không được sau ngày kết thúc feature',
      errors: ['Ngày kết thúc công việc không được sau ngày kết thúc feature'],
      can_force: true,
      type: 'date_validation'
    });
    expect(Task.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('trả về 400 khi không có dữ liệu để cập nhật', async () => {
    const mockTask = createMockTask();
    const mockPopulateChain = {
      populate: jest.fn().mockResolvedValue(mockTask)
    };
    Task.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(mockPopulateChain)
    });

    const req = {
      params: { taskId: 'task123' },
      body: {}, 
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateTask(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không có dữ liệu để cập nhật' });
    expect(Task.findByIdAndUpdate).not.toHaveBeenCalled();
  });

  it('cập nhật task title thành công', async () => {
    const mockTask = createMockTask();
    const updatedTask = { ...mockTask, title: 'Updated Title' };
    
    const mockPopulateChain = {
      populate: jest.fn().mockResolvedValue(mockTask)
    };
    Task.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(mockPopulateChain)
    });
    Task.findByIdAndUpdate.mockReturnValue(createChainablePopulate(updatedTask));

    const req = {
      params: { taskId: 'task123' },
      body: { title: 'Updated Title' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateTask(req, res);

    expect(Task.findByIdAndUpdate).toHaveBeenCalled();
    expect(ActivityLog.create).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(updatedTask);
  });

  it('cập nhật task status thành công', async () => {
    const mockTask = createMockTask({ status: 'To Do' });
    const updatedTask = { ...mockTask, status: 'Doing' };
    
    const mockPopulateChain = {
      populate: jest.fn().mockResolvedValue(mockTask)
    };
    Task.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(mockPopulateChain)
    });
    Task.findByIdAndUpdate.mockReturnValue(createChainablePopulate(updatedTask));

    const req = {
      params: { taskId: 'task123' },
      body: { status: 'Doing' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateTask(req, res);

    expect(Task.findByIdAndUpdate).toHaveBeenCalled();
    const { notifyTaskStatusChanged } = require('../utils/taskNotificationHelper');
    expect(notifyTaskStatusChanged).toHaveBeenCalled();
    expect(ActivityLog.create).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(updatedTask);
  });

  it('cập nhật task deadline thành công', async () => {
    const mockTask = createMockTask();
    const newDeadline = new Date('2024-11-30');
    const updatedTask = { ...mockTask, deadline: newDeadline };
    
    const mockPopulateChain = {
      populate: jest.fn().mockResolvedValue(mockTask)
    };
    Task.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(mockPopulateChain)
    });
    Task.findByIdAndUpdate.mockReturnValue(createChainablePopulate(updatedTask));
    const { validateTaskUpdate } = require('../utils/taskDateValidation');
    validateTaskUpdate.mockResolvedValue({ valid: true, errors: [] });

    const req = {
      params: { taskId: 'task123' },
      body: { deadline: '2024-11-30' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateTask(req, res);

    expect(validateTaskUpdate).toHaveBeenCalled();
    expect(Task.findByIdAndUpdate).toHaveBeenCalled();
    const { notifyTaskDeadlineChanged } = require('../utils/taskNotificationHelper');
    expect(notifyTaskDeadlineChanged).toHaveBeenCalled();
    expect(ActivityLog.create).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(updatedTask);
  });

  it('cập nhật task assignee thành công', async () => {
    const mockTask = createMockTask();
    const newAssigneeId = 'user789';
    const updatedTask = { 
      ...mockTask, 
      assignee_id: { _id: newAssigneeId, full_name: 'Jane Doe', email: 'jane@example.com' }
    };
    
    const mockPopulateChain = {
      populate: jest.fn().mockResolvedValue(mockTask)
    };
    Task.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(mockPopulateChain)
    });
    Task.findByIdAndUpdate.mockReturnValue(createChainablePopulate(updatedTask));
    User.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue({ _id: newAssigneeId, full_name: 'Jane Doe', email: 'jane@example.com' })
    });

    const req = {
      params: { taskId: 'task123' },
      body: { assignee_id: newAssigneeId },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateTask(req, res);

    expect(Task.findByIdAndUpdate).toHaveBeenCalled();
    const { notifyTaskAssigned } = require('../utils/taskNotificationHelper');
    expect(notifyTaskAssigned).toHaveBeenCalled();
    expect(ActivityLog.create).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(updatedTask);
  });

  it('cập nhật task priority thành công', async () => {
    const mockTask = createMockTask({ priority: 'Medium' });
    const updatedTask = { ...mockTask, priority: 'High' };
    
    const mockPopulateChain = {
      populate: jest.fn().mockResolvedValue(mockTask)
    };
    Task.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(mockPopulateChain)
    });
    Task.findByIdAndUpdate.mockReturnValue(createChainablePopulate(updatedTask));

    const req = {
      params: { taskId: 'task123' },
      body: { priority: 'High' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateTask(req, res);

    expect(Task.findByIdAndUpdate).toHaveBeenCalled();
    const { notifyTaskPriorityChanged } = require('../utils/taskNotificationHelper');
    expect(notifyTaskPriorityChanged).toHaveBeenCalled();
    expect(ActivityLog.create).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(updatedTask);
  });

  it('tự động set actual = estimate khi status chuyển sang Done', async () => {
    const mockTask = createMockTask({ status: 'Doing', estimate: 8, actual: 0 });
    const updatedTask = { ...mockTask, status: 'Done', actual: 8 };
    
    const mockPopulateChain = {
      populate: jest.fn().mockResolvedValue(mockTask)
    };
    Task.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(mockPopulateChain)
    });
    Task.findByIdAndUpdate.mockReturnValue(createChainablePopulate(updatedTask));

    const req = {
      params: { taskId: 'task123' },
      body: { status: 'Done' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateTask(req, res);

    expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
      'task123',
      expect.objectContaining({ $set: expect.objectContaining({ actual: 8 }) }),
      expect.any(Object)
    );
    expect(res.json).toHaveBeenCalledWith(updatedTask);
  });

  it('reset actual về 0 khi status chuyển từ Done sang status khác', async () => {
    const mockTask = createMockTask({ status: 'Done', estimate: 8, actual: 8 });
    const updatedTask = { ...mockTask, status: 'Doing', actual: 0 };
    
    const mockPopulateChain = {
      populate: jest.fn().mockResolvedValue(mockTask)
    };
    Task.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(mockPopulateChain)
    });
    Task.findByIdAndUpdate.mockReturnValue(createChainablePopulate(updatedTask));

    const req = {
      params: { taskId: 'task123' },
      body: { status: 'Doing' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateTask(req, res);

    expect(Task.findByIdAndUpdate).toHaveBeenCalledWith(
      'task123',
      expect.objectContaining({ $set: expect.objectContaining({ actual: 0 }) }),
      expect.any(Object)
    );
    expect(res.json).toHaveBeenCalledWith(updatedTask);
  });

  it('cập nhật nhiều fields cùng lúc thành công', async () => {
    const mockTask = createMockTask();
    const updatedTask = {
      ...mockTask,
      title: 'Updated Title',
      description: 'Updated description',
      priority: 'High',
      estimate: 16
    };
    
    const mockPopulateChain = {
      populate: jest.fn().mockResolvedValue(mockTask)
    };
    Task.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(mockPopulateChain)
    });
    Task.findByIdAndUpdate.mockReturnValue(createChainablePopulate(updatedTask));

    const req = {
      params: { taskId: 'task123' },
      body: {
        title: 'Updated Title',
        description: 'Updated description',
        priority: 'High',
        estimate: 16
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateTask(req, res);

    expect(Task.findByIdAndUpdate).toHaveBeenCalled();
    expect(ActivityLog.create).toHaveBeenCalledTimes(4); 
    expect(res.json).toHaveBeenCalledWith(updatedTask);
  });

  it('xử lý lỗi server (500)', async () => {
    const mockTask = createMockTask();
    const mockPopulateChain = {
      populate: jest.fn().mockResolvedValue(mockTask)
    };
    Task.findById.mockReturnValue({
      populate: jest.fn().mockReturnValue(mockPopulateChain)
    });
    const createErrorChain = () => {
      let callCount = 0;
      const chain = {
        populate: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount >= 2) {
            return Promise.reject(new Error('Database error'));
          }
          return createErrorChain();
        })
      };
      chain.then = (resolve, reject) => Promise.reject(new Error('Database error')).then(resolve, reject);
      chain.catch = (reject) => Promise.reject(new Error('Database error')).catch(reject);
      return chain;
    };
    Task.findByIdAndUpdate.mockReturnValue(createErrorChain());

    const req = {
      params: { taskId: 'task123' },
      body: { title: 'Updated Title' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await updateTask(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});

