const MeetingSchedule = require('../models/meeting_schedule');
const Project = require('../models/project');
const User = require('../models/user');
const Team = require('../models/team');
const { sendNotificationsToUsers } = require('../services/sendNotifications');

// Lấy danh sách lịch họp theo project
const getMeetingsByProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { month, year } = req.query;

    // Kiểm tra user có quyền xem project không
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dự án'
      });
    }

    // Kiểm tra user có trong team không
    const team = await Team.findOne({ project_id: projectId });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy team cho dự án này'
      });
    }

    const isMember = team.team_member.some(member => 
      member.user_id.toString() === req.user.id
    );

    if (!isMember && project.created_by.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem lịch họp của dự án này'
      });
    }

    // Tạo filter cho tháng/năm
    let dateFilter = {};
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      dateFilter = {
        meeting_date: {
          $gte: startDate,
          $lte: endDate
        }
      };
    }

    const meetings = await MeetingSchedule.find({
      project_id: projectId,
      ...dateFilter
    })
    .populate('mentor_id', 'full_name email avatar')
    .populate('requested_by', 'full_name email avatar')
    .populate('project_id', 'topic code supervisor_id')
    .sort({ meeting_date: 1, start_time: 1 });

    res.json({
      success: true,
      data: meetings
    });
  } catch (error) {
    console.error('Error getting meetings:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách lịch họp'
    });
  }
};

// Tạo lịch họp mới (trưởng nhóm yêu cầu hoặc giảng viên tạo)
const createMeeting = async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      topic,
      description,
      meeting_date,
      start_time,
      end_time,
      meeting_type = 'regular',
      location = 'Online',
      google_meet_link
    } = req.body;

    // Kiểm tra project tồn tại và populate lec_id
    const project = await Project.findById(projectId).populate('supervisor_id', 'full_name email');
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dự án'
      });
    }

    // Kiểm tra quyền tạo lịch họp - Tất cả thành viên đều có thể tạo lịch họp
    const team = await Team.findOne({ project_id: projectId });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy team cho dự án này'
      });
    }

    // Validate required fields
    if (!topic || !topic.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập chủ đề cuộc họp'
      });
    }

    if (!meeting_date || !start_time || !end_time) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng chọn ngày họp, thời gian bắt đầu và kết thúc'
      });
    }


    // Parse local date safely (YYYY-MM-DD)
    const parseLocalDate = (s) => {
      if (s instanceof Date) return s;
      if (!s || typeof s !== 'string') return new Date();
      const [yy, mm, dd] = s.split('-').map(n => parseInt(n, 10));
      if (isNaN(yy) || isNaN(mm) || isNaN(dd)) {
        return new Date();
      }
      return new Date(yy, (mm || 1) - 1, dd || 1, 0, 0, 0, 0);
    };

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return res.status(400).json({
        success: false,
        message: 'Định dạng thời gian không hợp lệ. Vui lòng sử dụng định dạng HH:mm'
      });
    }

    // Tính duration
    const start = new Date(`2000-01-01T${start_time}`);
    const end = new Date(`2000-01-01T${end_time}`);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Thời gian không hợp lệ'
      });
    }

    const duration = Math.round((end - start) / (1000 * 60));

    if (duration <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Thời gian kết thúc phải sau thời gian bắt đầu'
      });
    }

    // Kiểm tra xung đột lịch (so sánh theo ngày và khoảng giờ trong ngày)
    const baseDay = parseLocalDate(meeting_date);
    const dayStart = new Date(baseDay);
    dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(baseDay);
    dayEnd.setHours(23,59,59,999);

    const normalizedStart = (start_time || '').slice(0,5);
    const normalizedEnd = (end_time || '').slice(0,5);

    const conflictMeeting = await MeetingSchedule.findOne({
      project_id: projectId,
      meeting_date: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['pending', 'approved'] },
      // overlap if: existing.start < newEnd && existing.end > newStart
      start_time: { $lt: normalizedEnd },
      end_time: { $gt: normalizedStart }
    }).select('_id topic start_time end_time');

    if (conflictMeeting) {
      return res.status(400).json({
        success: false,
        message: 'Đã có lịch họp trong khoảng thời gian này. Vui lòng chọn thời gian khác',
        conflict: conflictMeeting
      });
    }

    // Xác định mentor_id từ project
    let mentorId = req.user.id; // Mặc định là người tạo
    if (project.supervisor_id) {
      // Nếu supervisor_id đã được populate (là object), lấy _id
      // Nếu chưa populate (là string/ObjectId), dùng trực tiếp
      if (typeof project.supervisor_id === 'object' && project.supervisor_id._id) {
        mentorId = project.supervisor_id._id;
      } else if (typeof project.supervisor_id === 'object' && project.supervisor_id.toString) {
        mentorId = project.supervisor_id;
      } else {
        mentorId = project.supervisor_id;
      }
      const mentorName = (typeof project.supervisor_id === 'object' && project.supervisor_id.full_name) 
        ? project.supervisor_id.full_name 
        : 'Unknown';
      console.log(`Mentor được xác định từ project: ${mentorName}`);
    } else {
      console.log('Project không có giảng viên hướng dẫn, sử dụng người tạo làm mentor');
    }

    // Kiểm tra xem người tạo có phải là mentor (supervisor) không
    const sup = project.supervisor_id;
    const isMentor = !!(sup && (
      (sup._id && sup._id.toString() === req.user.id) ||
      (typeof sup === 'string' && sup === req.user.id) ||
      (typeof sup === 'object' && sup.toString && sup.toString() === req.user.id)
    ));

    // Tạo meeting
    const meeting = new MeetingSchedule({
      mentor_id: mentorId,
      project_id: projectId,
      requested_by: req.user.id,
      topic: topic.trim(),
      description: description ? description.trim() : undefined,
      meeting_date: baseDay,
      start_time: start_time.trim(),
      end_time: end_time.trim(),
      duration,
      meeting_type: meeting_type || 'regular',
      location: location ? location.trim() : 'Online',
      google_meet_link: google_meet_link ? google_meet_link.trim() : undefined,
      status: isMentor ? 'approved' : 'pending' // Chỉ giảng viên mới có thể tạo lịch họp đã được duyệt
    });

    await meeting.save();

    // Populate để trả về thông tin đầy đủ
    await meeting.populate([
      { path: 'mentor_id', select: 'full_name email avatar' },
      { path: 'requested_by', select: 'full_name email avatar' }
    ]);

    // Notify team when mentor/supervisor directly creates a meeting for the team
    if (isMentor) {
      try {
        const memberIds = Array.from(
          new Set((team?.team_member || []).map(m => m.user_id?.toString()).filter(Boolean))
        );
        if (memberIds.length > 0) {
          await sendNotificationsToUsers(memberIds, {
            message: `Giảng viên đã tạo lịch họp: ${topic.trim()}`,
            type: 'Meeting',
            action: 'create',
            priority: 'Medium',
            project_id: projectId,
            meeting_id: meeting._id,
            created_by: req.user.id,
            action_url: `/calendar`,
            metadata: {
              meeting_date: baseDay,
              start_time: meeting.start_time,
              end_time: meeting.end_time,
            },
          });
        }
      } catch (notifErr) {
        console.error('Notification error (createMeeting):', notifErr.message);
      }
    }

    res.status(201).json({
      success: true,
      message: isMentor ? 'Tạo lịch họp thành công' : 'Yêu cầu lịch họp đã được gửi, chờ giảng viên xác nhận',
      data: meeting,
      mentor_info: {
        id: mentorId,
        name: project.supervisor_id?.full_name || 'Người tạo',
        email: project.supervisor_id?.email || 'N/A'
      }
    });
  } catch (error) {   
    console.error('Error creating meeting:', error);
    return res.status(500).json({ message: 'Lỗi server khi tạo lịch họp' });
  }
};

// Cập nhật thông tin lịch họp (chỉ khi pending và chỉ người tạo)
const updateMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const {
      topic,
      description,
      meeting_date,
      start_time,
      end_time,
      meeting_type,
      location,
      google_meet_link
    } = req.body;

    const meeting = await MeetingSchedule.findById(meetingId);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch họp'
      });
    }

    // Chỉ cho phép sửa khi trạng thái là pending
    if (meeting.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể sửa lịch họp khi đang ở trạng thái chờ xác nhận'
      });
    }

    // Chỉ người tạo (requested_by) mới có thể sửa
    const isCreator = meeting.requested_by.toString() === req.user.id;

    if (!isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ người tạo lịch họp mới có thể sửa'
      });
    }

    // Validate required fields nếu có thay đổi
    if (topic !== undefined) {
      if (!topic || !topic.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng nhập chủ đề cuộc họp'
        });
      }
      meeting.topic = topic.trim();
    }

    if (description !== undefined) {
      meeting.description = description ? description.trim() : undefined;
    }

    if (meeting_date !== undefined) {
      // Parse local date safely (YYYY-MM-DD)
      const parseLocalDate = (s) => {
        if (s instanceof Date) return s;
        if (!s || typeof s !== 'string') return new Date();
        const [yy, mm, dd] = s.split('-').map(n => parseInt(n, 10));
        if (isNaN(yy) || isNaN(mm) || isNaN(dd)) {
          return new Date();
        }
        return new Date(yy, (mm || 1) - 1, dd || 1, 0, 0, 0, 0);
      };
      meeting.meeting_date = parseLocalDate(meeting_date);
    }

    if (start_time !== undefined || end_time !== undefined) {
      const newStartTime = start_time !== undefined ? start_time.trim() : meeting.start_time;
      const newEndTime = end_time !== undefined ? end_time.trim() : meeting.end_time;

      // Validate time format (HH:mm)
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(newStartTime) || !timeRegex.test(newEndTime)) {
        return res.status(400).json({
          success: false,
          message: 'Định dạng thời gian không hợp lệ. Vui lòng sử dụng định dạng HH:mm'
        });
      }

      // Tính duration
      const start = new Date(`2000-01-01T${newStartTime}`);
      const end = new Date(`2000-01-01T${newEndTime}`);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Thời gian không hợp lệ'
        });
      }

      const duration = Math.round((end - start) / (1000 * 60));

      if (duration <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Thời gian kết thúc phải sau thời gian bắt đầu'
        });
      }

      if (start_time !== undefined) meeting.start_time = newStartTime;
      if (end_time !== undefined) meeting.end_time = newEndTime;
      meeting.duration = duration;

      // Kiểm tra xung đột lịch (nếu thay đổi ngày hoặc giờ)
      if (meeting_date !== undefined || start_time !== undefined || end_time !== undefined) {
        const baseDay = meeting.meeting_date;
        const dayStart = new Date(baseDay);
        dayStart.setHours(0,0,0,0);
        const dayEnd = new Date(baseDay);
        dayEnd.setHours(23,59,59,999);

        const normalizedStart = meeting.start_time.slice(0,5);
        const normalizedEnd = meeting.end_time.slice(0,5);

        const conflictMeeting = await MeetingSchedule.findOne({
          _id: { $ne: meetingId }, // Loại trừ chính meeting đang sửa
          project_id: meeting.project_id,
          meeting_date: { $gte: dayStart, $lte: dayEnd },
          status: { $in: ['pending', 'approved'] },
          start_time: { $lt: normalizedEnd },
          end_time: { $gt: normalizedStart }
        }).select('_id topic start_time end_time');

        if (conflictMeeting) {
          return res.status(400).json({
            success: false,
            message: 'Đã có lịch họp trong khoảng thời gian này. Vui lòng chọn thời gian khác',
            conflict: conflictMeeting
          });
        }
      }
    }

    if (meeting_type !== undefined) {
      meeting.meeting_type = meeting_type || 'regular';
    }

    if (location !== undefined) {
      meeting.location = location ? location.trim() : 'Online';
    }

    if (google_meet_link !== undefined) {
      meeting.google_meet_link = google_meet_link ? google_meet_link.trim() : undefined;
    }

    await meeting.save();

    // Populate để trả về thông tin đầy đủ
    await meeting.populate([
      { path: 'mentor_id', select: 'full_name email avatar' },
      { path: 'requested_by', select: 'full_name email avatar' }
    ]);

    res.json({
      success: true,
      message: 'Cập nhật lịch họp thành công',
      data: meeting
    });
  } catch (error) {
    return res.status(500).json({ message: 'Lỗi server khi cập nhật lịch họp' });
  }
};

// Cập nhật trạng thái lịch họp (giảng viên xác nhận/từ chối)
const updateMeetingStatus = async (req, res) => {
  try {
    const { meetingId } = req.params;
    const { status, reject_reason } = req.body;

    const meeting = await MeetingSchedule.findById(meetingId)
      .populate('project_id', 'supervisor_id created_by');

    if (!meeting) {
      return res.status(404).json({
        message: 'Không tìm thấy lịch họp'
      });
    }

    // Kiểm tra quyền cập nhật (chỉ giảng viên)
    const sup = meeting.project_id?.supervisor_id;
    const isMentor = !!(sup && (
      (sup._id && sup._id.toString() === req.user.id) ||
      (typeof sup === 'string' && sup === req.user.id) ||
      (typeof sup === 'object' && sup.toString && sup.toString() === req.user.id)
    ));

    if (!isMentor) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ giảng viên mới có thể cập nhật trạng thái lịch họp'
      });
    }

    // Cập nhật trạng thái
    meeting.status = status;
    if (reject_reason) meeting.reject_reason = reject_reason;

    await meeting.save();

    // Populate để trả về thông tin đầy đủ
    await meeting.populate([
      { path: 'mentor_id', select: 'full_name email avatar' },
      { path: 'requested_by', select: 'full_name email avatar' }
    ]);

    // Notify all team members about approval/rejection
    try {
      const team = await Team.findOne({ project_id: meeting.project_id }).lean();
      const memberIds = Array.from(
        new Set((team?.team_member || []).map(m => m.user_id?.toString()).filter(Boolean))
      );
      if (memberIds.length > 0) {
        const isApproved = status === 'approved';
        await sendNotificationsToUsers(memberIds, {
          message: isApproved
            ? `Giảng viên đã chấp nhận lịch họp: ${meeting.topic}`
            : `Giảng viên đã từ chối lịch họp: ${meeting.topic}`,
          type: 'Meeting',
          action: isApproved ? 'approve' : 'reject',
          priority: 'Medium',
          project_id: meeting.project_id,
          meeting_id: meeting._id,
          created_by: req.user.id,
          action_url: `/calendar`,
          metadata: {
            meeting_date: meeting.meeting_date,
            start_time: meeting.start_time,
            end_time: meeting.end_time,
            reject_reason,
          },
        });
      }
    } catch (notifErr) {
      console.error('Notification error (updateMeetingStatus):', notifErr.message);
    }

    res.json({
      success: true,
      message: `Lịch họp đã được ${status === 'approved' ? 'xác nhận' : 'từ chối'}`,
      data: meeting
    });
  } catch (error) {
    console.error('Error updating meeting status:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật trạng thái lịch họp'
    });
  }
};

// Xóa lịch họp (chỉ khi pending và chỉ người tạo)
const deleteMeeting = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await MeetingSchedule.findById(meetingId);

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch họp'
      });
    }

    // Chỉ cho phép xóa khi trạng thái là pending
    if (meeting.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể xóa lịch họp khi đang ở trạng thái chờ xác nhận'
      });
    }

    // Chỉ người tạo (requested_by) mới có thể xóa
    const isCreator = meeting.requested_by.toString() === req.user.id;

    if (!isCreator) {
      return res.status(403).json({
        success: false,
        message: 'Chỉ người tạo lịch họp mới có thể xóa'
      });
    }

    await MeetingSchedule.findByIdAndDelete(meetingId);

    res.json({
      success: true,
      message: 'Lịch họp đã được xóa thành công'
    });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa lịch họp'
    });
  }
};

// Lấy lịch họp theo ID
const getMeetingById = async (req, res) => {
  try {
    const { meetingId } = req.params;

    const meeting = await MeetingSchedule.findById(meetingId)
      .populate('mentor_id', 'full_name email avatar')
      .populate('requested_by', 'full_name email avatar');

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy lịch họp'
      });
    }

    res.json({
      success: true,
      message: 'Lấy thông tin lịch họp thành công',
      data: meeting
    });
  } catch (error) {
    console.error('Error getting meeting:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin lịch họp'
    });
  }
};

// Lấy tất cả lịch họp của user (từ tất cả projects mà user tham gia)
const getAllMeetingsByUser = async (req, res) => {
  try {
    const { month, year, from, to } = req.query;
    const userId = req.user.id;

    // Tạo filter cho tháng/năm
    let dateFilter = {};
    const parseLocalDate = (s) => {
      const [yy, mm, dd] = String(s).split('-').map(n => parseInt(n, 10));
      return new Date(yy, (mm || 1) - 1, dd || 1, 0, 0, 0, 0);
    };
    if (from && to) {
      const fromDate = parseLocalDate(from);
      const toDate = parseLocalDate(to);
      toDate.setHours(23,59,59,999);
      dateFilter = { meeting_date: { $gte: fromDate, $lte: toDate } };
    } else if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      dateFilter = { meeting_date: { $gte: startDate, $lte: endDate } };
    }

    let meetings;

    if (req.user.role === 4) { // Giảng viên: lấy theo mentor_id trực tiếp (đảm bảo không lệ thuộc danh sách project)
      meetings = await MeetingSchedule.find({
        mentor_id: userId,
        ...dateFilter
      })
      .populate('mentor_id', 'full_name email avatar')
      .populate('requested_by', 'full_name email avatar')
      .populate('project_id', 'topic code supervisor_id')
      .sort({ meeting_date: 1, start_time: 1 });
    } else {
        // Sinh viên: xác định project theo membership của Team
      const userTeams = await Team.find({ 'team_member.user_id': userId }).select('project_id');
      const projectIdsFromTeams = userTeams.map(t => t.project_id).filter(Boolean);

      meetings = await MeetingSchedule.find({
        project_id: { $in: projectIdsFromTeams },
        ...dateFilter
      })
      .populate('mentor_id', 'full_name email avatar')
      .populate('requested_by', 'full_name email avatar')
      .populate('project_id', 'topic code supervisor_id')
      .sort({ meeting_date: 1, start_time: 1 });
    }

    // Phân loại meetings theo vai trò của user
    const meetingsByRole = {
      asMentor: [],
      asLeader: [],
      asMember: [],
      asCreator: []
    };

    meetings.forEach(meeting => {
      // User là mentor (ưu tiên theo mentor_id của meeting)
      if (
        (meeting.mentor_id &&
          ((meeting.mentor_id._id && meeting.mentor_id._id.toString() === userId) ||
           (typeof meeting.mentor_id === 'string' && meeting.mentor_id.toString() === userId))) ||
        (meeting.project_id && meeting.project_id.supervisor_id && meeting.project_id.supervisor_id.toString() === userId)
      ) {
        meetingsByRole.asMentor.push(meeting);
      }
      // User là người tạo meeting
     
      // User là người yêu cầu meeting
      else if (meeting.requested_by._id.toString() === userId) {
        meetingsByRole.asLeader.push(meeting);
      }
      // User là thành viên tham dự
      else {
        meetingsByRole.asMember.push(meeting);
      }
    });

    // Với sinh viên, trả thêm danh sách meetings theo từng project mà user là thành viên
    let studentMeetingsByProject = undefined;
    if (req.user.role !== 4) {
      const projectIdsInMeetings = Array.from(new Set(meetings.map(m => m.project_id?._id?.toString()))).filter(Boolean);
      const teamsOfProjects = await Team.find({ project_id: { $in: projectIdsInMeetings } })
        .select('project_id team_member.user_id');

      const projectIdToMemberIdSet = new Map();
      teamsOfProjects.forEach(team => {
        const pid = team.project_id.toString();
        const memberIds = new Set((team.team_member || []).map(m => m.user_id?.toString()));
        projectIdToMemberIdSet.set(pid, memberIds);
      });

      studentMeetingsByProject = {};
      meetings.forEach(meeting => {
        const pid = meeting.project_id?._id?.toString();
        if (!pid) return;
        const memberSet = projectIdToMemberIdSet.get(pid);
        if (!memberSet) return;
        const requestedById = meeting.requested_by?._id?.toString();
        if (memberSet.has(userId)) {
          if (!studentMeetingsByProject[pid]) studentMeetingsByProject[pid] = [];
          studentMeetingsByProject[pid].push(meeting);
        } else if (requestedById && memberSet.has(requestedById)) {
          if (!studentMeetingsByProject[pid]) studentMeetingsByProject[pid] = [];
          studentMeetingsByProject[pid].push(meeting);
        }
      });
    }

    res.json({
      success: true,
      message: 'Lấy danh sách lịch họp thành công',
      data: {
        allMeetings: meetings,
        meetingsByRole,
        ...(studentMeetingsByProject ? { studentMeetingsByProject } : {}),
        statistics: {
          total: meetings.length,
          asMentor: meetingsByRole.asMentor.length,
          asLeader: meetingsByRole.asLeader.length,
          asMember: meetingsByRole.asMember.length,
          asCreator: meetingsByRole.asCreator.length
        }
      }
    });
  } catch (error) {
    console.error('Error getting all meetings by user:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy danh sách lịch họp'
    });
  }
};

module.exports = {
  getMeetingsByProject,
  createMeeting,
  updateMeeting,
  updateMeetingStatus,
  deleteMeeting,
  getMeetingById,
  getAllMeetingsByUser
};
