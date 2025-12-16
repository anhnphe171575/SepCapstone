const Document = require('../models/document');
const DocumentHistory = require('../models/document_history');
const Folder = require('../models/folder');
const Team = require('../models/team');
const User = require('../models/user');
const Project = require('../models/project');
const mongoose = require('mongoose');

// Mock các models và services
jest.mock('../models/document');
jest.mock('../models/document_history');
jest.mock('../models/folder');
jest.mock('../models/team');
jest.mock('../models/user');
jest.mock('../models/project');
jest.mock('../config/firebase');
jest.mock('../services/sendNotifications');

// Import controller sau khi mock
const {
  uploadDocument,
  getDocumentsByProject,
  getDocumentsByFolder,
  getDocument,
  updateDocument,
  updateDocumentStatus,
  updateFinalRelease,
  deleteDocument,
  searchDocuments,
  getDocumentDashboard,
  getDocumentActivityLogs
} = require('../controllers/document.controller');

const { storage, ref, uploadBytes, getDownloadURL, deleteObject } = require('../config/firebase');
const { sendNotificationsToUsers } = require('../services/sendNotifications');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Helper function để tạo chainable populate mock
const createChainablePopulate = (finalValue) => {
  const createChain = () => {
    const chain = {
      populate: jest.fn().mockImplementation(() => createChain()),
      sort: jest.fn().mockImplementation(() => createChain()),
      skip: jest.fn().mockImplementation(() => createChain()),
      limit: jest.fn().mockImplementation(() => createChain()),
      select: jest.fn().mockImplementation(() => createChain())
    };
    chain.then = (resolve) => Promise.resolve(finalValue).then(resolve);
    chain.catch = (reject) => Promise.resolve(finalValue).catch(reject);
    return chain;
  };
  return createChain();
};

// Helper để tạo mock query với sort
const createQueryWithSort = (finalValue) => {
  const query = {
    sort: jest.fn().mockReturnThis(),
    then: (resolve) => Promise.resolve(finalValue).then(resolve),
    catch: (reject) => Promise.resolve(finalValue).catch(reject)
  };
  return query;
};

describe('document.controller - uploadDocument', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 400 khi không có file được upload', async () => {
    const req = {
      body: { project_id: 'project123', title: 'Test Document' },
      file: null,
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await uploadDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không có file được upload' });
  });

  it('trả về 400 khi thiếu project_id hoặc title', async () => {
    const req = {
      body: { project_id: 'project123' }, 
      file: { originalname: 'test.pdf', buffer: Buffer.from('test'), mimetype: 'application/pdf' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await uploadDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Thiếu thông tin bắt buộc' });
  });

  it('trả về 404 khi folder không tồn tại', async () => {
    Folder.findById.mockResolvedValue(null);

    const req = {
      body: { project_id: 'project123', title: 'Test Document', folder_id: 'folder123' },
      file: { originalname: 'test.pdf', buffer: Buffer.from('test'), mimetype: 'application/pdf' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await uploadDocument(req, res);

    expect(Folder.findById).toHaveBeenCalledWith('folder123');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy thư mục' });
  });

  it('trả về 400 khi folder không thuộc project', async () => {
    Folder.findById.mockResolvedValue({
      _id: 'folder123',
      project_id: { toString: () => 'project456' }
    });

    const req = {
      body: { project_id: 'project123', title: 'Test Document', folder_id: 'folder123' },
      file: { originalname: 'test.pdf', buffer: Buffer.from('test'), mimetype: 'application/pdf' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await uploadDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Thư mục không thuộc dự án này' });
  });

  it('upload document thành công (document mới)', async () => {
    const mockFolder = {
      _id: 'folder123',
      project_id: { toString: () => 'project123' }
    };
    Folder.findById.mockResolvedValue(mockFolder);

    Document.find.mockReturnValue(createQueryWithSort([])); // Không có document trùng tên

    const mockStorageRef = { ref: 'mockRef' };
    const mockSnapshot = { ref: 'snapshotRef' };
    ref.mockReturnValue(mockStorageRef);
    uploadBytes.mockResolvedValue(mockSnapshot);
    getDownloadURL.mockResolvedValue('https://firebase.com/file.pdf');

    const mockDocument = {
      _id: 'doc123',
      project_id: 'project123',
      folder_id: 'folder123',
      title: 'Test Document',
      version: '1.0',
      file_url: 'https://firebase.com/file.pdf',
      created_by: 'user123',
      populate: jest.fn().mockResolvedValue({
        _id: 'doc123',
        created_by: { full_name: 'Test User', email: 'test@test.com' }
      })
    };

    Document.create.mockResolvedValue(mockDocument);
    Document.findById.mockResolvedValue({
      _id: 'doc123',
      created_by: { full_name: 'Test User', email: 'test@test.com' }
    });

    DocumentHistory.create.mockResolvedValue({});

    Team.findOne.mockResolvedValue({
      team_member: [
        { user_id: 'user456' },
        { user_id: 'user789' }
      ]
    });

    const mockProject = {
      topic: 'Test Project',
      code: 'TP001'
    };
    Project.findById.mockReturnValue({
      select: jest.fn().mockResolvedValue(mockProject)
    });

    sendNotificationsToUsers.mockResolvedValue();

    const req = {
      body: { project_id: 'project123', title: 'Test Document', folder_id: 'folder123' },
      file: { originalname: 'test.pdf', buffer: Buffer.from('test'), mimetype: 'application/pdf' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await uploadDocument(req, res);

    expect(Document.create).toHaveBeenCalled();
    expect(DocumentHistory.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Upload tài liệu thành công',
        isNewVersion: false
      })
    );
  });

  it('upload document thành công (version mới)', async () => {
    const mockFolder = {
      _id: 'folder123',
      project_id: { toString: () => 'project123' }
    };
    Folder.findById.mockResolvedValue(mockFolder);

    const existingDoc = {
      _id: 'doc123',
      title: 'Test Document',
      version: '1.0'
    };
    Document.find.mockReturnValue(createQueryWithSort([existingDoc]));

    const mockStorageRef = { ref: 'mockRef' };
    const mockSnapshot = { ref: 'snapshotRef' };
    ref.mockReturnValue(mockStorageRef);
    uploadBytes.mockResolvedValue(mockSnapshot);
    getDownloadURL.mockResolvedValue('https://firebase.com/file.pdf');

    const mockDocument = {
      _id: 'doc124',
      project_id: 'project123',
      folder_id: 'folder123',
      title: 'Test Document',
      version: '1.1',
      file_url: 'https://firebase.com/file.pdf',
      created_by: 'user123'
    };

    Document.create.mockResolvedValue(mockDocument);
    Document.findById.mockResolvedValue({
      _id: 'doc124',
      created_by: { full_name: 'Test User', email: 'test@test.com' }
    });

    DocumentHistory.create.mockResolvedValue({});
    Team.findOne.mockResolvedValue({ team_member: [] });
    sendNotificationsToUsers.mockResolvedValue();

    const req = {
      body: { project_id: 'project123', title: 'Test Document', folder_id: 'folder123' },
      file: { originalname: 'test.pdf', buffer: Buffer.from('test'), mimetype: 'application/pdf' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await uploadDocument(req, res);

    expect(Document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        version: '1.1'
      })
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        isNewVersion: true,
        previousVersion: '1.0'
      })
    );
  });

  it('xử lý lỗi khi upload thất bại', async () => {
    Folder.findById.mockResolvedValue({
      _id: 'folder123',
      project_id: { toString: () => 'project123' }
    });

    Document.find.mockReturnValue(createQueryWithSort([]));
    uploadBytes.mockRejectedValue(new Error('Upload failed'));

    const req = {
      body: { project_id: 'project123', title: 'Test Document', folder_id: 'folder123' },
      file: { originalname: 'test.pdf', buffer: Buffer.from('test'), mimetype: 'application/pdf' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await uploadDocument(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Lỗi upload tài liệu'
      })
    );
  });
});




