const Notification = require('../models/notification');

jest.mock('../models/notification');
jest.mock('../config/socket.io');

const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllRead
} = require('../controllers/notification.controller');

const { getIO } = require('../config/socket.io');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('notification.controller - getNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 400 khi thiếu user_id', async () => {
    const req = {
      user: null,
      query: {}
    };
    const res = mockResponse();

    await getNotifications(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Thiếu user_id' });
    expect(Notification.find).not.toHaveBeenCalled();
  });

  it('trả về danh sách notifications thành công với pagination', async () => {
    const mockNotifications = [
      {
        _id: 'notif1',
        message: 'Notification 1',
        status: 'Unread',
        type: 'System',
        user_id: 'user123'
      },
      {
        _id: 'notif2',
        message: 'Notification 2',
        status: 'Read',
        type: 'Project',
        user_id: 'user123'
      }
    ];

    Notification.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue(mockNotifications)
                })
              })
            })
          })
        })
      })
    });

    Notification.countDocuments
      .mockResolvedValueOnce(2) // Total count
      .mockResolvedValueOnce(1); // Unread count

    const req = {
      user: { _id: 'user123' },
      query: { page: 1, limit: 20 }
    };
    const res = mockResponse();

    await getNotifications(req, res);

    expect(Notification.find).toHaveBeenCalledWith({ user_id: 'user123' });
    expect(Notification.countDocuments).toHaveBeenCalledWith({ user_id: 'user123' });
    expect(Notification.countDocuments).toHaveBeenCalledWith({
      user_id: 'user123',
      status: 'Unread'
    });
    expect(res.json).toHaveBeenCalledWith({
      notifications: mockNotifications,
      pagination: {
        current_page: 1,
        total_pages: 1,
        total_notifications: 2,
        limit: 20,
        unread_count: 1
      },
      message: 'Lấy danh sách thông báo thành công'
    });
  });

  it('trả về notifications với filter type và status', async () => {
    const mockNotifications = [
      {
        _id: 'notif1',
        message: 'Notification 1',
        status: 'Unread',
        type: 'Project',
        user_id: 'user123'
      }
    ];

    Notification.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue(mockNotifications)
                })
              })
            })
          })
        })
      })
    });

    Notification.countDocuments
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(1);

    const req = {
      user: { _id: 'user123' },
      query: {
        type: 'Project',
        status: 'Unread',
        page: 1,
        limit: 20
      }
    };
    const res = mockResponse();

    await getNotifications(req, res);

    expect(Notification.find).toHaveBeenCalledWith({
      user_id: 'user123',
      type: 'Project',
      status: 'Unread'
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: mockNotifications,
        pagination: expect.any(Object)
      })
    );
  });

  it('sử dụng user_id từ query nếu không có req.user', async () => {
    const mockNotifications = [];

    Notification.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockResolvedValue(mockNotifications)
                })
              })
            })
          })
        })
      })
    });

    Notification.countDocuments
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);

    const req = {
      user: null,
      query: { user_id: 'user123', page: 1, limit: 20 }
    };
    const res = mockResponse();

    await getNotifications(req, res);

    expect(Notification.find).toHaveBeenCalledWith({ user_id: 'user123' });
    expect(res.json).toHaveBeenCalled();
  });

  it('xử lý lỗi server (500)', async () => {
    Notification.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockReturnValue({
              sort: jest.fn().mockReturnValue({
                skip: jest.fn().mockReturnValue({
                  limit: jest.fn().mockRejectedValue(new Error('Database error'))
                })
              })
            })
          })
        })
      })
    });

    const req = {
      user: { _id: 'user123' },
      query: { page: 1, limit: 20 }
    };
    const res = mockResponse();

    await getNotifications(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi lấy thông báo',
      error: 'Database error'
    });
  });
});

describe('notification.controller - getUnreadCount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 400 khi thiếu user_id', async () => {
    const req = {
      user: null,
      query: {}
    };
    const res = mockResponse();

    await getUnreadCount(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Thiếu user_id' });
    expect(Notification.countDocuments).not.toHaveBeenCalled();
  });

  it('trả về unread count thành công', async () => {
    Notification.countDocuments.mockResolvedValue(5);

    const req = {
      user: { _id: 'user123' },
      query: {}
    };
    const res = mockResponse();

    await getUnreadCount(req, res);

    expect(Notification.countDocuments).toHaveBeenCalledWith({
      user_id: 'user123',
      status: 'Unread'
    });
    expect(res.json).toHaveBeenCalledWith({
      unread_count: 5,
      message: 'Lấy số lượng thông báo chưa đọc thành công'
    });
  });

  it('sử dụng user_id từ query nếu không có req.user', async () => {
    Notification.countDocuments.mockResolvedValue(3);

    const req = {
      user: null,
      query: { user_id: 'user123' }
    };
    const res = mockResponse();

    await getUnreadCount(req, res);

    expect(Notification.countDocuments).toHaveBeenCalledWith({
      user_id: 'user123',
      status: 'Unread'
    });
    expect(res.json).toHaveBeenCalledWith({
      unread_count: 3,
      message: 'Lấy số lượng thông báo chưa đọc thành công'
    });
  });

  it('xử lý lỗi server (500)', async () => {
    Notification.countDocuments.mockRejectedValue(new Error('Database error'));

    const req = {
      user: { _id: 'user123' },
      query: {}
    };
    const res = mockResponse();

    await getUnreadCount(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi lấy số lượng thông báo',
      error: 'Database error'
    });
  });
});

describe('notification.controller - markAsRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 404 khi không tìm thấy notification', async () => {
    Notification.findOne.mockResolvedValue(null);

    const req = {
      params: { id: 'nonexistent' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await markAsRead(req, res);

    expect(Notification.findOne).toHaveBeenCalledWith({
      _id: 'nonexistent',
      user_id: 'user123'
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy thông báo' });
  });

  it('đánh dấu notification là đã đọc thành công', async () => {
    const mockNotification = {
      _id: 'notif123',
      message: 'Test notification',
      status: 'Unread',
      user_id: 'user123',
      save: jest.fn().mockResolvedValue({
        _id: 'notif123',
        status: 'Read'
      })
    };

    Notification.findOne.mockResolvedValue(mockNotification);
    Notification.countDocuments.mockResolvedValue(2);

    const mockIO = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn()
      })
    };
    getIO.mockReturnValue(mockIO);

    const req = {
      params: { id: 'notif123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await markAsRead(req, res);

    expect(Notification.findOne).toHaveBeenCalledWith({
      _id: 'notif123',
      user_id: 'user123'
    });
    expect(mockNotification.status).toBe('Read');
    expect(mockNotification.save).toHaveBeenCalled();
    expect(Notification.countDocuments).toHaveBeenCalledWith({
      user_id: 'user123',
      status: 'Unread'
    });
    expect(res.json).toHaveBeenCalledWith({
      message: 'Đánh dấu đã đọc thành công',
      notification: expect.objectContaining({ status: 'Read' })
    });
  });

  it('xử lý socket.io error gracefully', async () => {
    const mockNotification = {
      _id: 'notif123',
      message: 'Test notification',
      status: 'Unread',
      user_id: 'user123',
      save: jest.fn().mockResolvedValue({
        _id: 'notif123',
        status: 'Read'
      })
    };

    Notification.findOne.mockResolvedValue(mockNotification);
    Notification.countDocuments.mockResolvedValue(2);
    getIO.mockImplementation(() => {
      throw new Error('Socket not initialized');
    });

    const req = {
      params: { id: 'notif123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await markAsRead(req, res);

    expect(res.json).toHaveBeenCalledWith({
      message: 'Đánh dấu đã đọc thành công',
      notification: expect.any(Object)
    });
  });

  it('xử lý lỗi server (500)', async () => {
    Notification.findOne.mockRejectedValue(new Error('Database error'));

    const req = {
      params: { id: 'notif123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await markAsRead(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi đánh dấu đã đọc',
      error: 'Database error'
    });
  });
});

describe('notification.controller - markAllAsRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 400 khi thiếu user_id', async () => {
    const req = {
      user: null,
      body: {}
    };
    const res = mockResponse();

    await markAllAsRead(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Thiếu user_id' });
    expect(Notification.updateMany).not.toHaveBeenCalled();
  });

  it('đánh dấu tất cả notifications là đã đọc thành công', async () => {
    Notification.updateMany.mockResolvedValue({
      modifiedCount: 5
    });

    const req = {
      user: { _id: 'user123' },
      body: {}
    };
    const res = mockResponse();

    await markAllAsRead(req, res);

    expect(Notification.updateMany).toHaveBeenCalledWith(
      { user_id: 'user123', status: 'Unread' },
      { status: 'Read' }
    );
    expect(res.json).toHaveBeenCalledWith({
      message: 'Đánh dấu tất cả đã đọc thành công',
      updated_count: 5
    });
  });

  it('sử dụng user_id từ body nếu không có req.user', async () => {
    Notification.updateMany.mockResolvedValue({
      modifiedCount: 3
    });

    const req = {
      user: null,
      body: { user_id: 'user123' }
    };
    const res = mockResponse();

    await markAllAsRead(req, res);

    expect(Notification.updateMany).toHaveBeenCalledWith(
      { user_id: 'user123', status: 'Unread' },
      { status: 'Read' }
    );
    expect(res.json).toHaveBeenCalledWith({
      message: 'Đánh dấu tất cả đã đọc thành công',
      updated_count: 3
    });
  });

  it('xử lý lỗi server (500)', async () => {
    Notification.updateMany.mockRejectedValue(new Error('Database error'));

    const req = {
      user: { _id: 'user123' },
      body: {}
    };
    const res = mockResponse();

    await markAllAsRead(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi đánh dấu tất cả đã đọc',
      error: 'Database error'
    });
  });
});

describe('notification.controller - deleteNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 404 khi không tìm thấy notification', async () => {
    Notification.findOneAndDelete.mockResolvedValue(null);

    const req = {
      params: { id: 'nonexistent' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await deleteNotification(req, res);

    expect(Notification.findOneAndDelete).toHaveBeenCalledWith({
      _id: 'nonexistent',
      user_id: 'user123'
    });
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy thông báo' });
  });

  it('xóa notification thành công', async () => {
    const deletedNotification = {
      _id: 'notif123',
      message: 'Test notification',
      user_id: 'user123'
    };

    Notification.findOneAndDelete.mockResolvedValue(deletedNotification);

    const req = {
      params: { id: 'notif123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await deleteNotification(req, res);

    expect(Notification.findOneAndDelete).toHaveBeenCalledWith({
      _id: 'notif123',
      user_id: 'user123'
    });
    expect(res.json).toHaveBeenCalledWith({ message: 'Xóa thông báo thành công' });
  });

  it('xử lý lỗi server (500)', async () => {
    Notification.findOneAndDelete.mockRejectedValue(new Error('Database error'));

    const req = {
      params: { id: 'notif123' },
      user: { _id: 'user123' }
    };
    const res = mockResponse();

    await deleteNotification(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi xóa thông báo',
      error: 'Database error'
    });
  });
});

describe('notification.controller - deleteAllRead', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('trả về 400 khi thiếu user_id', async () => {
    const req = {
      user: null,
      body: {}
    };
    const res = mockResponse();

    await deleteAllRead(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Thiếu user_id' });
    expect(Notification.deleteMany).not.toHaveBeenCalled();
  });

  it('xóa tất cả notifications đã đọc thành công', async () => {
    Notification.deleteMany.mockResolvedValue({
      deletedCount: 10
    });

    const req = {
      user: { _id: 'user123' },
      body: {}
    };
    const res = mockResponse();

    await deleteAllRead(req, res);

    expect(Notification.deleteMany).toHaveBeenCalledWith({
      user_id: 'user123',
      status: 'Read'
    });
    expect(res.json).toHaveBeenCalledWith({
      message: 'Xóa tất cả thông báo đã đọc thành công',
      deleted_count: 10
    });
  });

  it('sử dụng user_id từ body nếu không có req.user', async () => {
    Notification.deleteMany.mockResolvedValue({
      deletedCount: 5
    });

    const req = {
      user: null,
      body: { user_id: 'user123' }
    };
    const res = mockResponse();

    await deleteAllRead(req, res);

    expect(Notification.deleteMany).toHaveBeenCalledWith({
      user_id: 'user123',
      status: 'Read'
    });
    expect(res.json).toHaveBeenCalledWith({
      message: 'Xóa tất cả thông báo đã đọc thành công',
      deleted_count: 5
    });
  });

  it('xử lý lỗi server (500)', async () => {
    Notification.deleteMany.mockRejectedValue(new Error('Database error'));

    const req = {
      user: { _id: 'user123' },
      body: {}
    };
    const res = mockResponse();

    await deleteAllRead(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Lỗi xóa thông báo đã đọc',
      error: 'Database error'
    });
  });
});

