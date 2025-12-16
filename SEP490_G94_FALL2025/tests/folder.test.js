const Folder = require('../models/folder');
const Document = require('../models/document');
const Project = require('../models/project');
const Milestone = require('../models/milestone');

jest.mock('../models/folder');
jest.mock('../models/document');
jest.mock('../models/project');
jest.mock('../models/milestone');

const {
  getFoldersByProject,
  getFolder,
  createRootFolder,
  createFolder,
  updateFolder,
  deleteFolder,
  getFolderTree,
  searchFolders,
  getCurrentUser
} = require('../controllers/folder.controller');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};



describe('folder.controller - createFolder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 400 khi thiếu name hoặc project_id', async () => {
    const req = {
      body: { name: 'Test Folder' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createFolder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Thiếu tên thư mục hoặc project_id'
    });
  });

  it('trả về 401 khi chưa đăng nhập', async () => {
    const req = {
      body: { name: 'Test Folder', project_id: 'project123' },
      user: null
    };
    const res = mockResponse();

    await createFolder(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Chưa đăng nhập' });
  });

  it('trả về 404 khi không tìm thấy parent folder', async () => {
    const mockProject = {
      _id: 'project123',
      topic: 'Test Project'
    };

    Project.findById.mockResolvedValue(mockProject);
    Folder.findById.mockResolvedValue(null);

    const req = {
      body: {
        name: 'Test Folder',
        project_id: 'project123',
        parent_folder_id: 'nonexistent'
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createFolder(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy thư mục cha' });
  });

  it('trả về 400 khi parent folder không thuộc project', async () => {
    const mockProject = {
      _id: 'project123',
      topic: 'Test Project'
    };

    const mockParentFolder = {
      _id: 'parent123',
      name: 'Parent Folder',
      project_id: 'project456',
      toString: () => 'project456'
    };

    Project.findById.mockResolvedValue(mockProject);
    Folder.findById.mockResolvedValue(mockParentFolder);

    const req = {
      body: {
        name: 'Test Folder',
        project_id: 'project123',
        parent_folder_id: 'parent123'
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createFolder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Thư mục cha không thuộc dự án này' });
  });

  it('trả về 409 khi tên folder đã tồn tại trong parent', async () => {
    const mockProject = {
      _id: 'project123',
      topic: 'Test Project'
    };

    const mockParentFolder = {
      _id: 'parent123',
      name: 'Parent Folder',
      project_id: 'project123',
      toString: () => 'project123'
    };

    const existingFolder = {
      _id: 'existing123',
      name: 'Test Folder',
      project_id: 'project123',
      parent_folder_id: 'parent123'
    };

    Project.findById.mockResolvedValue(mockProject);
    Folder.findById.mockResolvedValue(mockParentFolder);
    Folder.findOne.mockResolvedValue(existingFolder);

    const req = {
      body: {
        name: 'Test Folder',
        project_id: 'project123',
        parent_folder_id: 'parent123'
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createFolder(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Tên thư mục đã tồn tại trong thư mục cha',
      suggestion: 'Hãy chọn tên khác hoặc tạo trong thư mục khác'
    });
  });

  it('tạo folder thành công', async () => {
    const mockProject = {
      _id: 'project123',
      topic: 'Test Project'
    };

    const mockParentFolder = {
      _id: 'parent123',
      name: 'Parent Folder',
      project_id: 'project123',
      toString: () => 'project123'
    };

    const createdFolder = {
      _id: 'folder123',
      name: 'Test Folder',
      project_id: 'project123',
      parent_folder_id: 'parent123',
      created_by: 'user123',
      populate: jest.fn().mockResolvedValue({
        _id: 'folder123',
        name: 'Test Folder',
        created_by: { _id: 'user123', full_name: 'User' },
        parent_folder_id: { _id: 'parent123', name: 'Parent Folder' }
      })
    };

    Project.findById.mockResolvedValue(mockProject);
    Folder.findById.mockResolvedValue(mockParentFolder);
    Folder.findOne.mockResolvedValue(null);
    Folder.create.mockResolvedValue(createdFolder);

    const req = {
      body: {
        name: 'Test Folder',
        project_id: 'project123',
        parent_folder_id: 'parent123',
        is_public: false
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createFolder(req, res);

    expect(Folder.create).toHaveBeenCalledWith({
      name: 'Test Folder',
      project_id: 'project123',
      milestone_id: null,
      parent_folder_id: 'parent123',
      created_by: 'user123',
      is_public: false
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      folder: expect.any(Object),
      message: 'Tạo thư mục thành công'
    });
  });

  it('xử lý lỗi server (500)', async () => {
    Project.findById.mockRejectedValue(new Error('Database error'));

    const req = {
      body: {
        name: 'Test Folder',
        project_id: 'project123'
      },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await createFolder(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi máy chủ',
      error: 'Database error'
    });
  });
});


