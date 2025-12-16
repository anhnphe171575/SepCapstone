const Document = require('../models/document');
const DocumentHistory = require('../models/document_history');
const mongoose = require('mongoose');
const { storage, ref, uploadBytes, getDownloadURL, deleteObject } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const { sendNotificationsToUsers } = require('../services/sendNotifications');

// Upload document
async function uploadDocument(req, res) {
  try {
    const { project_id, folder_id, type, title, version } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'Không có file được upload' });
    }

    // Validate required fields (minimal schema)
    if (!project_id || !title) {
      return res.status(400).json({ message: 'Thiếu thông tin bắt buộc' });
    }

    // Validate folder_id if provided
    if (folder_id) {
      const Folder = require('../models/folder');
      const folder = await Folder.findById(folder_id);
      if (!folder) {
        return res.status(404).json({ message: 'Không tìm thấy thư mục' });
      }
      if (folder.project_id.toString() !== project_id) {
        return res.status(400).json({ message: 'Thư mục không thuộc dự án này' });
      }
    }

    // Tìm document trùng tên trong cùng project và folder
    const filter = { 
      project_id, 
      title,
      folder_id: folder_id || null
    };
    
    const existingDocs = await Document.find(filter).sort({ version: -1 });
    
    let newVersion = version || '1.0';
    
    // Nếu có document trùng tên, tự động tăng version lên 0.1
    if (existingDocs.length > 0) {
      const latestDoc = existingDocs[0];
      const currentVersion = parseFloat(latestDoc.version) || 1.0;
      newVersion = (currentVersion + 0.1).toFixed(1);
      console.log(`Document "${title}" đã tồn tại với version ${latestDoc.version}. Tạo version mới: ${newVersion}`);
    }

    // Giữ nguyên tên file gốc, thêm timestamp để tránh trùng
    const originalName = file.originalname;
    const timestamp = Date.now();
    const fileName = `${timestamp}_${originalName}`;
    const filePath = `documents/${project_id}/${fileName}`;

    // Upload to Firebase Storage (preserve contentType to satisfy rules)
    const storageRef = ref(storage, filePath);
    const snapshot = await uploadBytes(storageRef, file.buffer, { contentType: file.mimetype });
    const downloadURL = await getDownloadURL(snapshot.ref);

    // Lưu thông tin document vào database
    const document = await Document.create({
      project_id,
      folder_id: folder_id || null,
      type,
      title,
      version: newVersion,
      file_url: downloadURL,
      created_by: req.user?._id
    });

    // Lưu vào DocumentHistory
    try {
      await DocumentHistory.create({
        document_id: document._id,
        version: newVersion,
        file_url: downloadURL,
        change_note: existingDocs.length > 0 ? 'UPLOAD' : 'CREATE',
        updated_by: req.user?._id
      });
    } catch (historyError) {
      console.log('Error creating document history:', historyError);
      // Don't fail the request if history logging fails
    }

    // Populate để trả về thông tin đầy đủ (nếu có user)
    let populatedDocument = document;
    let creatorName = 'Người dùng';
    try {
      populatedDocument = await Document.findById(document._id)
        .populate('created_by', 'full_name email');
      
      if (populatedDocument.created_by) {
        creatorName = populatedDocument.created_by.full_name || populatedDocument.created_by.email || 'Người dùng';
      }
    } catch (populateError) {
      console.log('Populate error (ignored):', populateError.message);
    }

    // Gửi thông báo cho các thành viên trong project (trừ người upload)
    try {
      const Team = require('../models/team');
      const User = require('../models/user');
      
      // Lấy team của project
      const team = await Team.findOne({ project_id: project_id });
      
      if (team && team.team_member && team.team_member.length > 0) {
        // Lấy danh sách user_id từ team members (loại bỏ người upload và duplicate)
        const creatorIdStr = req.user?._id?.toString();
        const userIdSet = new Set(); // Dùng Set để loại bỏ duplicate
        
        team.team_member.forEach(member => {
          if (member.user_id) {
            const userIdStr = member.user_id.toString();
            // Loại bỏ người upload và đảm bảo không duplicate
            if (userIdStr !== creatorIdStr && !userIdSet.has(userIdStr)) {
              userIdSet.add(userIdStr);
            }
          }
        });

        // Chuyển Set thành Array với ObjectId
        const userIds = Array.from(userIdSet).map(id => {
          return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
        });

        if (userIds.length > 0) {
          console.log(`[Notification] Gửi thông báo cho ${userIds.length} thành viên (đã loại bỏ duplicate):`, userIds.map(id => id.toString()));
          // Lấy thông tin project để hiển thị trong notification
          const Project = require('../models/project');
          const project = await Project.findById(project_id).select('topic code');
          const projectName = project?.topic || project?.code || 'Dự án';

          // Tạo message cho notification
          const notificationMessage = existingDocs.length > 0
            ? `${creatorName} đã upload phiên bản mới "${newVersion}" của tài liệu "${title}" vào ${projectName}`
            : `${creatorName} đã upload tài liệu "${title}" vào ${projectName}`;

          // Gửi notification cho tất cả thành viên
          await sendNotificationsToUsers(userIds, {
            type: 'Document',
            action: 'upload',
            message: notificationMessage,
            priority: 'Medium',
            project_id: project_id,
            document_id: document._id,
            created_by: req.user?._id,
            action_url: `/projects/${project_id}/documents/${document._id}`
          });
          
          console.log(`[Notification] Đã gửi thành công ${userIds.length} thông báo`);
        } else {
          console.log('[Notification] Không có thành viên nào để gửi thông báo');
        }
      } else {
        console.log('[Notification] Không tìm thấy team hoặc team không có thành viên');
      }
    } catch (notificationError) {
      // Không block việc upload nếu gửi notification thất bại
      console.error('[Notification] Error sending notifications for document upload:', notificationError);
    }

    return res.status(201).json({
      message: existingDocs.length > 0 
        ? `Upload tài liệu thành công với version ${newVersion}` 
        : 'Upload tài liệu thành công',
      document: populatedDocument,
      isNewVersion: existingDocs.length > 0,
      previousVersion: existingDocs.length > 0 ? existingDocs[0].version : null
    });

  } catch (error) {
    console.log('Error uploading document:', error);
    return res.status(500).json({ message: 'Lỗi upload tài liệu', error: error.message });
  }
}

// Get documents by project
async function getDocumentsByProject(req, res) {
  try {
    const { projectId } = req.params;
    const { type, folder_id, page = 1, limit = 10 } = req.query;
    
    // Build filter
    const filter = { project_id: projectId };
    if (type) filter.type = type;
    if (folder_id) filter.folder_id = folder_id;
    
    // Pagination
    const skip = (page - 1) * limit;
    
    const documents = await Document.find(filter)
      .populate('created_by', 'full_name email')
      .populate('project_id', 'topic code')
      .populate('folder_id', 'name path')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Document.countDocuments(filter);

    return res.json({
      documents,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_documents: total,
        limit: parseInt(limit)
      },
      message: 'Lấy danh sách tài liệu thành công'
    });
  } catch (error) {
    console.log('Error getting documents:', error);
    return res.status(500).json({ message: 'Lỗi lấy danh sách tài liệu', error: error.message });
  }
}

// Get single document
async function getDocument(req, res) {
  try {
    const { id } = req.params;
    
    const document = await Document.findById(id)
      .populate('created_by', 'full_name email')
      .populate('project_id', 'topic code');

    if (!document) {
      return res.status(404).json({ message: 'Không tìm thấy tài liệu' });
    }

    return res.json(document);
  } catch (error) {
    console.log('Error getting document:', error);
    return res.status(500).json({ message: 'Lỗi lấy thông tin tài liệu', error: error.message });
  }
}

// Update document
async function updateDocument(req, res) {
  try {
    const { id } = req.params;
    const { title, version, type, folder_id, file_url } = req.body;

    // Lấy document hiện tại để kiểm tra và lấy ngữ cảnh project/folder
    const currentDocument = await Document.findById(id);
    if (!currentDocument) {
      return res.status(404).json({ message: 'Không tìm thấy tài liệu' });
    }

    const updateData = {};
    const changes = [];
    
    if (title && title !== currentDocument.title) {
      updateData.title = title;
      changes.push({ field: 'title', old: currentDocument.title, new: title, action: 'RENAME' });
    }
    if (version && version !== currentDocument.version) {
      updateData.version = version;
      changes.push({ field: 'version', old: currentDocument.version, new: version, action: 'UPDATE' });
    }
    if (type && type !== currentDocument.type) {
      updateData.type = type;
      changes.push({ field: 'type', old: currentDocument.type, new: type, action: 'UPDATE' });
    }
    if (folder_id !== undefined && folder_id !== currentDocument.folder_id?.toString()) {
      updateData.folder_id = folder_id;
      changes.push({ field: 'folder_id', old: currentDocument.folder_id?.toString() || null, new: folder_id || null, action: 'MOVE' });
    }
    if (file_url && file_url !== currentDocument.file_url) {
      updateData.file_url = file_url;
      changes.push({ field: 'file_url', old: currentDocument.file_url, new: file_url, action: 'UPDATE' });
    }

    if (Object.keys(updateData).length === 0) {
      const doc = await Document.findById(id)
        .populate('created_by', 'full_name email')
        .populate('project_id', 'topic code');
      return res.json({
        message: 'Không có thay đổi nào',
        document: doc
      });
    }

    const document = await Document.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('created_by', 'full_name email')
     .populate('project_id', 'topic code');

    // Lưu vào DocumentHistory cho mỗi thay đổi
    try {
      for (const change of changes) {
        await DocumentHistory.create({
          document_id: id,
          version: document.version,
          file_url: document.file_url,
          change_note: `${change.action}: ${change.field} từ "${change.old}" thành "${change.new}"`,
          updated_by: req.user._id
        });
      }
    } catch (historyError) {
      console.log('Error creating document history:', historyError);
      // Don't fail the request if history logging fails
    }

    return res.json({
      message: 'Cập nhật tài liệu thành công',
      document
    });
  } catch (error) {
    console.log('Error updating document:', error);
    return res.status(500).json({ message: 'Lỗi cập nhật tài liệu', error: error.message });
  }
}

// Update document status
async function updateDocumentStatus(req, res) {
  return res.status(400).json({ message: 'Trường status không còn được hỗ trợ' });
}

// Mark/Unmark document as final release
async function updateFinalRelease(req, res) {
  try {
    const { id } = req.params;
    const { is_final_release } = req.body;

    if (typeof is_final_release !== 'boolean') {
      return res.status(400).json({ message: 'is_final_release phải là boolean (true/false)' });
    }

    // Lấy document hiện tại
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: 'Không tìm thấy tài liệu' });
    }

    // Nếu đang đánh dấu là final release
    if (is_final_release === true) {
      // Tìm tất cả documents cùng title, project, folder và unmark chúng
      const filter = {
        title: document.title,
        project_id: document.project_id,
        folder_id: document.folder_id || null,
        _id: { $ne: id } // Loại bỏ document hiện tại
      };

      await Document.updateMany(
        filter,
        { is_final_release: false }
      );
      console.log(`[Final Release] Đã unmark các version khác của "${document.title}"`);
    }

    // Cập nhật document hiện tại
    document.is_final_release = is_final_release;
    await document.save();

    // Lưu vào DocumentHistory
    try {
      await DocumentHistory.create({
        document_id: id,
        version: document.version,
        file_url: document.file_url,
        change_note: is_final_release ? 'MARK_FINAL_RELEASE' : 'UNMARK_FINAL_RELEASE',
        updated_by: req.user._id
      });
    } catch (historyError) {
      console.log('Error creating document history:', historyError);
      // Don't fail the request if history logging fails
    }

    // Populate để trả về thông tin đầy đủ
    await document.populate([
      { path: 'created_by', select: 'full_name email' },
      { path: 'project_id', select: 'topic code' },
      { path: 'folder_id', select: 'name path' }
    ]);

    // Gửi thông báo cho các thành viên trong project
    try {
      const Team = require('../models/team');
      const Project = require('../models/project');
      
      const team = await Team.findOne({ project_id: document.project_id });
      const project = await Project.findById(document.project_id).select('topic code');
      const projectName = project?.topic || project?.code || 'Dự án';
      const creatorName = req.user?.full_name || req.user?.email || 'Người dùng';

      if (team && team.team_member && team.team_member.length > 0) {
        const creatorIdStr = req.user?._id?.toString();
        const userIdSet = new Set();
        
        team.team_member.forEach(member => {
          if (member.user_id) {
            const userIdStr = member.user_id.toString();
            if (userIdStr !== creatorIdStr && !userIdSet.has(userIdStr)) {
              userIdSet.add(userIdStr);
            }
          }
        });

        const userIds = Array.from(userIdSet).map(id => {
          return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : id;
        });

        if (userIds.length > 0) {
          const notificationMessage = is_final_release
            ? `${creatorName} đã đánh dấu version "${document.version}" của tài liệu "${document.title}" là Final Release trong ${projectName}`
            : `${creatorName} đã bỏ đánh dấu Final Release cho version "${document.version}" của tài liệu "${document.title}" trong ${projectName}`;

          await sendNotificationsToUsers(userIds, {
            type: 'Document',
            action: is_final_release ? 'status_change' : 'update',
            message: notificationMessage,
            priority: 'High',
            project_id: document.project_id,
            document_id: document._id,
            created_by: req.user?._id,
            action_url: `/projects/${document.project_id}/documents/${document._id}`
          });

          console.log(`[Final Release] Đã gửi thông báo cho ${userIds.length} thành viên`);
        }
      }
    } catch (notificationError) {
      console.error('[Final Release] Error sending notifications:', notificationError);
    }

    return res.json({
      message: is_final_release
        ? `Đã đánh dấu version "${document.version}" là Final Release`
        : `Đã bỏ đánh dấu Final Release cho version "${document.version}"`,
      document
    });
  } catch (error) {
    console.log('Error updating final release status:', error);
    return res.status(500).json({ message: 'Lỗi cập nhật trạng thái Final Release', error: error.message });
  }
}

// Delete document
async function deleteDocument(req, res) {
  try {
    const { id } = req.params;
    
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: 'Không tìm thấy tài liệu' });
    }

    // Lưu vào DocumentHistory trước khi xóa
    try {
      await DocumentHistory.create({
        document_id: id,
        version: document.version,
        file_url: document.file_url,
        change_note: 'DELETE',
        updated_by: req.user._id
      });
    } catch (historyError) {
      console.log('Error creating document history:', historyError);
      // Don't fail the request if history logging fails
    }

    // Xóa file từ Firebase Storage
    try {
      // Extract path từ Firebase URL
      const url = new URL(document.file_url);
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1]);
        const fileRef = ref(storage, filePath);
        await deleteObject(fileRef);
      }
    } catch (storageError) {
      console.log('Error deleting from storage:', storageError);
      // Tiếp tục xóa document ngay cả khi không xóa được file
    }

    // Xóa document từ database
    await Document.findByIdAndDelete(id);

    return res.json({ message: 'Xóa tài liệu thành công' });
  } catch (error) {
    console.log('Error deleting document:', error);
    return res.status(500).json({ message: 'Lỗi xóa tài liệu', error: error.message });
  }
}

// Get documents by milestone
async function getDocumentsByMilestone(req, res) {
  return res.status(400).json({ message: 'Không còn hỗ trợ theo milestone' });
}

// Search documents
async function searchDocuments(req, res) {
  try {
    const { project_id, folder_id, type, version, page = 1, limit = 10 } = req.query;
    
    const filter = {};
    if (project_id) filter.project_id = project_id;
    if (folder_id) filter.folder_id = folder_id;
    if (type) filter.type = type;
    if (version) filter.version = version;
    
    const skip = (page - 1) * limit;
    
    const documents = await Document.find(filter)
      .populate('created_by', 'full_name email')
      .populate('project_id', 'topic code')
      .populate('folder_id', 'name path')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Document.countDocuments(filter);

    return res.json({
      documents,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_documents: total,
        limit: parseInt(limit)
      },
      message: 'Tìm kiếm tài liệu thành công'
    });
  } catch (error) {
    console.log('Error searching documents:', error);
    return res.status(500).json({ message: 'Lỗi tìm kiếm tài liệu', error: error.message });
  }
}

// Get documents by folder
async function getDocumentsByFolder(req, res) {
  try {
    const { folderId } = req.params;
    const { type, page = 1, limit = 10 } = req.query;
    
    // Build filter
    const filter = { folder_id: folderId };
    if (type) filter.type = type;
    
    // Pagination
    const skip = (page - 1) * limit;
    
    const documents = await Document.find(filter)
      .populate('created_by', 'full_name email')
      .populate('project_id', 'topic code')
      .populate('folder_id', 'name path')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Document.countDocuments(filter);

    return res.json({
      documents,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_documents: total,
        limit: parseInt(limit)
      },
      message: 'Lấy danh sách tài liệu trong thư mục thành công'
    });
  } catch (error) {
    console.log('Error getting documents by folder:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

// Get document dashboard (comprehensive stats)
async function getDocumentDashboard(req, res) {
  try {
    const { projectId } = req.params;
    const { folder_id, days = 30, type } = req.query;

    if (!projectId) {
      return res.status(400).json({ message: 'Thiếu projectId trong đường dẫn' });
    }

    const filter = { project_id: projectId };
    if (folder_id) filter.folder_id = folder_id;
    if (type) filter.type = type;

  // Cast to ObjectId for accurate $match in aggregation pipelines
  const aggFilter = { ...filter };
  if (aggFilter.project_id) aggFilter.project_id = new mongoose.Types.ObjectId(String(aggFilter.project_id));
  if (aggFilter.folder_id) aggFilter.folder_id = new mongoose.Types.ObjectId(String(aggFilter.folder_id));

    // Total documents
    const total = await Document.countDocuments(filter);

    // By type
  const byTypeAgg = await Document.aggregate([
    { $match: aggFilter },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    const by_type = {};
    byTypeAgg.forEach(r => { by_type[r._id || 'unknown'] = r.count; });
    const by_type_array = byTypeAgg.map(r => ({ type: r._id || 'unknown', count: r.count }));

    // By version
  const byVersionAgg = await Document.aggregate([
    { $match: aggFilter },
      { $group: { _id: '$version', count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);
    const by_version = {};
    byVersionAgg.forEach(r => { by_version[r._id || 'unknown'] = r.count; });
    const by_version_array = byVersionAgg.map(r => ({ version: r._id || 'unknown', count: r.count }));

    // By folder (only when filtering by project and not pinned to one folder)
    let by_folder = {};
  if (!folder_id) {
    const byFolderAgg = await Document.aggregate([
      { $match: aggFilter },
        {
          $lookup: {
            from: 'folders',
            localField: 'folder_id',
            foreignField: '_id',
            as: 'folder_info'
          }
        },
        {
          $group: {
            _id: '$folder_id',
            count: { $sum: 1 },
            folder_name: { $first: { $arrayElemAt: ['$folder_info.name', 0] } }
          }
        }
      ]);
      byFolderAgg.forEach(r => {
        const folderKey = r.folder_name || (r._id ? r._id.toString() : 'no_folder');
        by_folder[folderKey] = r.count;
      });
    }

    // By user (top uploaders)
    const byUserAgg = await Document.aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'created_by',
          foreignField: '_id',
          as: 'user_info'
        }
      },
      {
        $group: {
          _id: '$created_by',
          count: { $sum: 1 },
          user_name: { $first: { $arrayElemAt: ['$user_info.full_name', 0] } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const by_user = byUserAgg.map(r => ({
      user_id: r._id,
      user_name: r.user_name || 'Unknown',
      count: r.count
    }));

  // All contributors (no limit) with email
  const contributorsAllAgg = await Document.aggregate([
    { $match: aggFilter },
    {
      $lookup: {
        from: 'users',
        localField: 'created_by',
        foreignField: '_id',
        as: 'user_info'
      }
    },
    {
      $group: {
        _id: '$created_by',
        count: { $sum: 1 },
        user_name: { $first: { $arrayElemAt: ['$user_info.full_name', 0] } },
        user_email: { $first: { $arrayElemAt: ['$user_info.email', 0] } }
      }
    },
    { $sort: { count: -1 } }
  ]);
  const contributors_all = contributorsAllAgg.map(r => ({
    user_id: r._id,
    user_name: r.user_name || 'Unknown',
    user_email: r.user_email || '',
    count: r.count
  }));

    // Distinct counts for KPI cards
    const distinctFolders = await Document.distinct('folder_id', filter);
    const distinctContributors = await Document.distinct('created_by', filter);
    const distinctTypes = await Document.distinct('type', filter);

    // Upload trend (last N days)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
  const trendFilter = { ...filter, createdAt: { $gte: cutoffDate } };
  const trendAggFilter = { ...aggFilter, createdAt: { $gte: cutoffDate } };

  const uploadTrendAgg = await Document.aggregate([
    { $match: trendAggFilter },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    const upload_trend = uploadTrendAgg.map(r => ({
      date: r._id,
      count: r.count
    }));

  // Distribution by day of week (1=Sun .. 7=Sat)
  const byWeekdayAgg = await Document.aggregate([
    { $match: aggFilter },
    { $group: { _id: { $dayOfWeek: '$createdAt' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  const weekdayLabels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const by_weekday_chart = {
    labels: weekdayLabels,
    data: [1,2,3,4,5,6,7].map(d => byWeekdayAgg.find(x => x._id === d)?.count || 0)
  };

  // Distribution by hour of day (0-23)
  const byHourAgg = await Document.aggregate([
    { $match: aggFilter },
    { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  const by_hour_chart = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    data: Array.from({ length: 24 }, (_, i) => byHourAgg.find(x => x._id === i)?.count || 0)
  };

    // Recent uploads (last 5)
    const recent = await Document.find(filter)
      .populate('created_by', 'full_name email')
      .populate('folder_id', 'name')
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title version type createdAt created_by folder_id');

    return res.json({
      summary: {
        total_documents: total,
        total_folders: distinctFolders.filter(f => f !== null).length,
        total_contributors: distinctContributors.length,
        total_types: distinctTypes.length,
        by_type,
        by_type_array,
        by_version,
        by_version_array,
        by_folder,
        top_uploaders: by_user
      },
      upload_trend,
    charts: {
      by_type: { labels: by_type_array.map(x => x.type), data: by_type_array.map(x => x.count) },
      by_version: { labels: by_version_array.map(x => x.version), data: by_version_array.map(x => x.count) },
      by_weekday: by_weekday_chart,
      by_hour: by_hour_chart
    },
    contributors_all,
      recent_uploads: recent,
      message: 'Lấy dashboard tài liệu thành công'
    });
  } catch (error) {
    console.log('Error getting document dashboard:', error);
    return res.status(500).json({ message: 'Lỗi lấy dashboard tài liệu', error: error.message });
  }
}

// GET /api/documents/:id/activity-logs
async function getDocumentActivityLogs(req, res) {
  try {
    const { id } = req.params;
    const { limit = 50, skip = 0 } = req.query;
    
    // Verify document exists
    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ message: 'Không tìm thấy tài liệu' });
    }
    
    // Query DocumentHistory
    const historyLogs = await DocumentHistory.find({ document_id: id })
      .populate('updated_by', 'full_name email avatar')
      .sort({ created_at: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    
    // Transform logs to match frontend format
    const transformedLogs = historyLogs.map(log => {
      // Parse action from change_note
      let action = 'UPDATE';
      if (log.change_note) {
        const note = log.change_note.toUpperCase();
        if (note.includes('CREATE')) action = 'CREATE';
        else if (note.includes('UPLOAD')) action = 'UPLOAD';
        else if (note.includes('RENAME')) action = 'RENAME';
        else if (note.includes('MOVE')) action = 'MOVE';
        else if (note.includes('DELETE')) action = 'DELETE';
        else if (note.includes('MARK_FINAL_RELEASE')) action = 'MARK_FINAL_RELEASE';
        else if (note.includes('UNMARK_FINAL_RELEASE')) action = 'UNMARK_FINAL_RELEASE';
        else if (note.includes('UPDATE')) action = 'UPDATE';
      }
      
      return {
        _id: log._id,
        action: action,
        user: log.updated_by ? {
          _id: log.updated_by._id,
          full_name: log.updated_by.full_name,
          email: log.updated_by.email
        } : null,
        created_at: log.created_at || log.updated_at,
        metadata: {
          version: log.version,
          file_url: log.file_url,
          change_note: log.change_note
        },
        description: log.change_note || null
      };
    });
    
    return res.json(transformedLogs);
  } catch (error) {
    console.log('Error getting document activity logs:', error);
    return res.status(500).json({ message: 'Lỗi máy chủ', error: error.message });
  }
}

module.exports = {
  uploadDocument,
  getDocumentsByProject,
  getDocumentsByFolder,
  getDocument,
  updateDocument,
  updateDocumentStatus,
  updateFinalRelease,
  deleteDocument,
  getDocumentsByMilestone,
  searchDocuments,
  getDocumentDashboard,
  getDocumentActivityLogs
};