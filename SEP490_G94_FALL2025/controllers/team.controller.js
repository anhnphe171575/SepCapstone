const Team = require('../models/team');
const Project = require('../models/project');
const User = require('../models/user');
const Task = require('../models/task');
const Feature = require('../models/feature');
const Comment = require('../models/comment');
const ActivityLog = require('../models/activity_log');
const { transporter } = require('../config/email');
const { ROLES } = require('../config/role');
// Lấy thông tin team của project
const getTeamByProject = async (req, res) => {
  try {
    const { projectId } = req.params;

    const team = await Team.findOne({ project_id: projectId })
      .populate('team_member.user_id', 'full_name email phone major avatar')
      .populate('project_id', 'topic code description status')
      .select('name description project_id team_member team_code createAt updateAt');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy team cho dự án này'
      });
    }

    // Lấy thông tin supervisor từ project (nếu có)
    let supervisor = null;
    if (team.project_id) {
      // Lấy project để kiểm tra supervisor_id (không populate để tránh lỗi nếu field không tồn tại)
      const project = await Project.findById(team.project_id._id || team.project_id)
        .select('supervisor_id')
        .lean(); // Dùng lean() để tránh lỗi nếu field không tồn tại
      
      // Kiểm tra supervisor_id có tồn tại và có giá trị (field có thể không tồn tại trong document cũ)
      if (project && project.supervisor_id !== null && project.supervisor_id !== undefined) {
        const supervisorId = project.supervisor_id;
        const supervisorIdString = typeof supervisorId === 'object' && supervisorId._id 
          ? supervisorId._id.toString() 
          : supervisorId.toString();
        supervisor = await User.findById(supervisorIdString)
          .select('full_name email phone major avatar');
      }
    }

    // Tạo response với supervisor
    const responseData = team.toObject();
    responseData.supervisor = supervisor;

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error getting team:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin team'
    });
  }
};





// Cập nhật vai trò thành viên
const updateMemberRole = async (req, res) => {
  try {
    const { projectId, userId } = req.params;
    const { team_leader } = req.body;

    const team = await Team.findOne({ project_id: projectId });
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy team'
      });
    }

    // Tìm thành viên được phong làm trưởng nhóm
    const memberToPromote = team.team_member.find(member => 
      member.user_id.toString() === userId
    );

    if (!memberToPromote) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thành viên trong team'
      });
    }

    // Nếu phong làm trưởng nhóm (team_leader = 1)
    if (team_leader === 1) {
      // Tìm và hạ cấp tất cả trưởng nhóm hiện tại thành thành viên thường
      team.team_member.forEach(member => {
        if (member.team_leader === 1) {
          member.team_leader = 0;
        }
      });
      
      // Phong thành viên được chọn làm trưởng nhóm
      memberToPromote.team_leader = 1;
    } else {
      // Nếu hạ cấp thành thành viên thường
      memberToPromote.team_leader = 0;
    }

    await team.save();

    // Populate để trả về thông tin đầy đủ
    await team.populate([
      { path: 'team_member.user_id', select: 'full_name email phone major avatar' },
      { path: 'project_id', select: 'topic code description status' }
    ]);

    res.json({
      success: true,
      message: team_leader === 1 ? 'Phong trưởng nhóm thành công' : 'Hạ cấp thành viên thành công',
      data: { team }
    });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi cập nhật vai trò'
    });
  }
};


// Mời thành viên bằng email
const inviteMemberByEmail = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { email } = req.body;

    // Kiểm tra team có tồn tại không
    const team = await Team.findOne({ project_id: projectId })
      .populate('project_id', 'topic code');
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy team'
      });
    }

    // Kiểm tra email đã có user trong hệ thống chưa
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      return res.status(400).json({
        success: false,
        message: `Email ${email} không tồn tại trong hệ thống`
      });
    }

    // Kiểm tra role của user được mời
    const userRole = existingUser.role;
    const isLecturer = userRole === ROLES.SUPERVISOR; // role 4
    const isStudent = userRole === ROLES.STUDENT; // role 1

    // Nếu là giảng viên (role 4), kiểm tra đã có supervisor chưa
    if (isLecturer) {
      try {
        const project = await Project.findById(projectId).lean(); // Dùng lean() để tránh lỗi nếu field không tồn tại
        
        if (!project) {
          return res.status(404).json({
            success: false,
            message: 'Không tìm thấy dự án'
          });
        }

        // Kiểm tra supervisor_id có tồn tại và có giá trị (field có thể không tồn tại trong document cũ)
        // Kiểm tra cả trường hợp field không tồn tại trong document
        const hasSupervisorId = project.hasOwnProperty('supervisor_id') && 
                                 project.supervisor_id !== null && 
                                 project.supervisor_id !== undefined;
        
        if (hasSupervisorId) {
          const existingSupervisorId = typeof project.supervisor_id === 'object' && project.supervisor_id._id
            ? project.supervisor_id._id.toString()
            : project.supervisor_id.toString();
          
          // Kiểm tra xem supervisor hiện tại có phải là user này không
          if (existingSupervisorId !== existingUser._id.toString()) {
            return res.status(400).json({
              success: false,
              message: 'Dự án đã có giảng viên hướng dẫn. Không thể mời giảng viên khác.'
            });
          } else {
            return res.status(400).json({
              success: false,
              message: 'Giảng viên này đã là giảng viên hướng dẫn của dự án.'
            });
          }
        }
        // Nếu chưa có supervisor_id (field không tồn tại hoặc null), cho phép mời
      } catch (projectError) {
        console.error('Error checking project supervisor:', projectError);
        // Nếu có lỗi khi kiểm tra, vẫn cho phép mời (có thể là project cũ chưa có field)
        // Hoặc có thể throw error nếu muốn bắt buộc phải kiểm tra được
      }
    }

    // Nếu là sinh viên (role 1 hoặc 2), kiểm tra số lượng thành viên
    if (isStudent) {
      // Đếm số thành viên hiện tại (không tính supervisor)
      const currentMemberCount = team.team_member.length;
      
      // Giới hạn tối đa 5 thành viên (sinh viên)
      if (currentMemberCount >= 5) {
        return res.status(400).json({
          success: false,
          message: 'Nhóm đã đủ 5 thành viên. Không thể mời thêm thành viên nữa.'
        });
      }
    }

    // Kiểm tra user đã trong team chưa (chỉ áp dụng cho member, không áp dụng cho supervisor)
    if (isStudent) {
      const existingMember = team.team_member.find(member => {
        if (!member || !member.user_id) return false;
        const memberUserId = typeof member.user_id === 'object' && member.user_id._id
          ? member.user_id._id.toString()
          : member.user_id.toString();
        return memberUserId === existingUser._id.toString();
      });
      
      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: `Thành viên với email ${email} đã có trong nhóm. Không thể mời lại.`
        });
      }
    }

    // Kiểm tra role không hợp lệ (không phải student hoặc lecturer)
    if (!isLecturer && !isStudent) {
      return res.status(400).json({
        success: false,
        message: `Email ${email} không hợp lệ để tham gia nhóm. Chỉ chấp nhận sinh viên hoặc giảng viên`
      });
    }

    // Kiểm tra team có đủ thông tin để gửi email
    if (!team.team_code) {
      return res.status(400).json({
        success: false,
        message: 'Team chưa có mã nhóm. Vui lòng thử lại sau.'
      });
    }

    // Lấy thông tin project nếu chưa có hoặc là string
    let projectInfo = team.project_id;
    if (!projectInfo || typeof projectInfo === 'string' || !projectInfo.code) {
      try {
        const projectIdToQuery = typeof projectInfo === 'object' && projectInfo._id 
          ? projectInfo._id 
          : (projectInfo || projectId);
        const project = await Project.findById(projectIdToQuery)
          .select('topic code')
          .lean();
        if (project) {
          projectInfo = project;
        }
      } catch (projectFetchError) {
        console.error('Error fetching project info:', projectFetchError);
        // Sử dụng giá trị mặc định nếu không lấy được
        projectInfo = { code: 'N/A', topic: 'N/A' };
      }
    }

    // Gửi email mời
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const inviteLink = `${frontendUrl}/auto-join-team/${team.team_code}?email=${encodeURIComponent(email)}`;
    
    console.log('Sending invite email:', {
      email,
      teamCode: team.team_code,
      inviteLink,
      frontendUrl
    });
    // Xác định vai trò trong email
    const roleText = isLecturer ? 'giảng viên hướng dẫn' : 'thành viên';
    const roleDescription = isLecturer 
      ? 'Bạn được mời làm giảng viên hướng dẫn cho dự án này.'
      : 'Bạn được mời tham gia nhóm với vai trò thành viên.';
    
    // Lấy thông tin project an toàn
    const projectCode = projectInfo?.code || 'N/A';
    const projectTopic = projectInfo?.topic || 'N/A';
    const teamName = team.name || 'Nhóm dự án';
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: isLecturer 
        ? `Lời mời làm giảng viên hướng dẫn - Dự án ${projectCode}`
        : `Lời mời tham gia nhóm ${teamName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="color: #2563eb; margin: 0;">Lời mời tham gia ${isLecturer ? 'với vai trò giảng viên hướng dẫn' : 'nhóm'}</h2>
          </div>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 10px 0; font-size: 16px;">${roleDescription}</p>
            ${!isLecturer ? `<h3 style="color: #1e40af; margin: 10px 0 5px 0;">${teamName}</h3>` : ''}
            <p style="margin: 0; color: #64748b;">Dự án: <strong>${projectCode} - ${projectTopic}</strong></p>
            ${isLecturer ? `<p style="margin: 10px 0 0 0; color: #64748b; font-size: 14px;">Vai trò: <strong>Giảng viên hướng dẫn</strong></p>` : ''}
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
              ${isLecturer ? 'Đồng ý làm giảng viên hướng dẫn' : 'Tham gia nhóm ngay'}
            </a>
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
            <p style="margin: 0; font-size: 14px; color: #92400e;">
              ${!isLecturer ? `<strong>Mã nhóm:</strong> <code style="background-color: #fbbf24; padding: 2px 6px; border-radius: 3px;">${team.team_code}</code><br>` : ''}
              <strong>Lưu ý:</strong> Bạn cần đăng nhập vào hệ thống để ${isLecturer ? 'xác nhận' : 'tham gia nhóm'}.
            </p>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px;">
            <p style="color: #6b7280; font-size: 14px; margin: 0; text-align: center;">
              Nếu không mong muốn nhận email này, vui lòng bỏ qua.<br>
              Liên kết này sẽ hoạt động trong 30 ngày.
            </p>
          </div>
        </div>
      `
    };

    try {
      await transporter.sendMail(mailOptions);
    } catch (emailError) {
      console.error('Error sending email:', emailError);
      // Vẫn trả về success nếu email không gửi được, nhưng log lỗi
      // Hoặc có thể throw error nếu muốn bắt buộc phải gửi email thành công
    }

    res.json({
      success: true,
      message: 'Đã gửi lời mời thành công',
      data: {
        email,
        team_code: team.team_code,
        invite_link: inviteLink,
        user_role: isLecturer ? 'lecturer' : 'student'
      }
    });
  } catch (error) {
    console.error('Error in inviteMemberByEmail:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      projectId: req.params?.projectId,
      email: req.body?.email
    });
    res.status(500).json({
      success: false,
      message: error.message || 'Lỗi server khi gửi lời mời',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Tự động tham gia nhóm bằng team code (không cần authentication)
const autoJoinTeamByCode = async (req, res) => {
  try {
    const { teamCode } = req.params;

    console.log('Auto join team request:', teamCode);

    // Tìm team theo code (case-insensitive)
    const team = await Team.findOne({ 
      team_code: { $regex: new RegExp(`^${teamCode}$`, 'i') }
    }).populate('project_id', 'topic code');
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Mã nhóm không hợp lệ'
      });
    }

    // Lấy thông tin user từ email (nếu có trong request body)
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email là bắt buộc để tham gia nhóm'
      });
    }

    // Tìm user theo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Email chưa được đăng ký trong hệ thống'
      });
    }

    // Kiểm tra role của user
    const userRole = user.role;
    const isLecturer = userRole === ROLES.SUPERVISOR; // role 4
    const isStudent = userRole === ROLES.STUDENT; // role 1

    // Xử lý theo role
    if (isLecturer) {
      // Nếu là giảng viên (role 4), cập nhật supervisor_id trong Project
      const projectIdToQuery = team.project_id._id || team.project_id;
      console.log('[autoJoinTeamByCode] Lecturer joining, projectId:', projectIdToQuery);
      
      const project = await Project.findById(projectIdToQuery);
      
      if (!project) {
        console.error('[autoJoinTeamByCode] Project not found:', projectIdToQuery);
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy dự án'
        });
      }

      // Kiểm tra đã có supervisor chưa (xử lý trường hợp field có thể không tồn tại)
      // Sử dụng get() để lấy giá trị an toàn, hoặc kiểm tra trực tiếp
      const currentSupervisorId = project.supervisor_id;
      console.log('[autoJoinTeamByCode] Current supervisor_id:', currentSupervisorId);
      console.log('[autoJoinTeamByCode] User _id:', user._id.toString());
      
      if (currentSupervisorId !== null && currentSupervisorId !== undefined) {
        let existingSupervisorIdStr;
        
        // Xử lý cả trường hợp supervisor_id là ObjectId hoặc đã được populate
        if (typeof currentSupervisorId === 'object') {
          if (currentSupervisorId._id) {
            existingSupervisorIdStr = currentSupervisorId._id.toString();
          } else if (currentSupervisorId.toString) {
            existingSupervisorIdStr = currentSupervisorId.toString();
          } else {
            existingSupervisorIdStr = String(currentSupervisorId);
          }
        } else {
          existingSupervisorIdStr = currentSupervisorId.toString();
        }
        
        const userIdStr = user._id.toString();
        
        if (existingSupervisorIdStr !== userIdStr) {
          console.log('[autoJoinTeamByCode] Project already has different supervisor');
          return res.status(400).json({
            success: false,
            message: 'Dự án đã có giảng viên hướng dẫn khác'
          });
        } else {
          // Supervisor đã là giảng viên của dự án này
          console.log('[autoJoinTeamByCode] User is already supervisor of this project');
          return res.status(400).json({
            success: false,
            message: 'Bạn đã là giảng viên hướng dẫn của dự án này'
          });
        }
      }

      // Thêm supervisor_id vào project (lần đầu tiên hoặc field chưa tồn tại)
      // Mongoose sẽ tự động thêm field mới nếu chưa có
      try {
        project.supervisor_id = user._id;
        await project.save();
        console.log(`[autoJoinTeamByCode] ✅ Đã thêm supervisor_id ${user._id} vào project ${project._id}`);
      } catch (saveError) {
        console.error('[autoJoinTeamByCode] Error saving project:', saveError);
        return res.status(500).json({
          success: false,
          message: 'Lỗi khi cập nhật thông tin dự án: ' + (saveError.message || 'Unknown error')
        });
      }

      // Populate để trả về thông tin đầy đủ
      try {
        await team.populate([
          { path: 'team_member.user_id', select: 'full_name email phone major avatar' },
          { path: 'project_id', select: 'topic code description status supervisor_id' }
        ]);
      } catch (populateError) {
        console.error('[autoJoinTeamByCode] Error populating team:', populateError);
        // Vẫn trả về success nếu populate lỗi
      }

      res.json({
        success: true,
        message: 'Tham gia nhóm với vai trò giảng viên hướng dẫn thành công',
        data: { 
          team,
          user: {
            _id: user._id,
            full_name: user.full_name,
            email: user.email,
            role: 'supervisor'
          }
        }
      });
    } else if (isStudent) {
      // Nếu là sinh viên (role 1), thêm vào team_member
      
      // Kiểm tra user đã trong team chưa
      const existingMember = team.team_member.find(member => 
        member.user_id.toString() === user._id.toString()
      );
      
      if (existingMember) {
        return res.status(400).json({
          success: false,
          message: 'Bạn đã có trong nhóm này'
        });
      }

      // Kiểm tra số lượng thành viên (tối đa 5)
      if (team.team_member.length >= 5) {
        return res.status(400).json({
          success: false,
          message: 'Nhóm đã đủ 5 thành viên. Không thể tham gia thêm.'
        });
      }

      // Thêm thành viên vào team
      team.team_member.push({
        user_id: user._id,
        team_leader: 0
      });

      await team.save();

      // Populate để trả về thông tin đầy đủ
      await team.populate([
        { path: 'team_member.user_id', select: 'full_name email phone major avatar' },
        { path: 'project_id', select: 'topic code description status' }
      ]);

      res.json({
        success: true,
        message: 'Tham gia nhóm thành công',
        data: { 
          team,
          user: {
            _id: user._id,
            full_name: user.full_name,
            email: user.email,
            role: 'member'
          }
        }
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Role không hợp lệ. Chỉ chấp nhận sinh viên (role 1) hoặc giảng viên (role 4).'
      });
    }
  } catch (error) {
    console.error('[autoJoinTeamByCode] Error:', error);
    console.error('[autoJoinTeamByCode] Error message:', error.message);
    console.error('[autoJoinTeamByCode] Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tham gia nhóm: ' + (error.message || 'Unknown error'),
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Tham gia nhóm bằng team code
const joinTeamByCode = async (req, res) => {
  try {
    const { teamCode } = req.params;
    const userId = req.user.id; // Từ middleware auth

    console.log('Join team request:', {
      teamCode,
      userId,
      teamCodeLength: teamCode.length
    });

    // Tìm team theo code (case-insensitive)
    const team = await Team.findOne({ 
      team_code: { $regex: new RegExp(`^${teamCode}$`, 'i') }
    }).populate('project_id', 'topic code');
    
    console.log('Team found:', team ? {
      id: team._id,
      name: team.name,
      team_code: team.team_code,
      memberCount: team.team_member.length
    } : 'null');
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Mã nhóm không hợp lệ'
      });
    }

    // Kiểm tra user đã trong team chưa
    const existingMember = team.team_member.find(member => 
      member.user_id.toString() === userId
    );
    
    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'Bạn đã có trong nhóm này'
      });
    }

    // Thêm thành viên vào team
    team.team_member.push({
      user_id: userId,
      team_leader: 0
    });

    await team.save();

    // Populate để trả về thông tin đầy đủ
    await team.populate([
      { path: 'team_member.user_id', select: 'full_name email phone major avatar' },
      { path: 'project_id', select: 'topic code description status' }
    ]);

    res.json({
      success: true,
      message: 'Tham gia nhóm thành công',
      data: { team }
    });
  } catch (error) {
    console.error('Error joining team:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi tham gia nhóm'
    });
  }
};

// Lấy thông tin team bằng code (public)
const getTeamByCode = async (req, res) => {
  try {
    const { teamCode } = req.params;

    console.log('Get team by code:', teamCode);

    const team = await Team.findOne({ 
      team_code: { $regex: new RegExp(`^${teamCode}$`, 'i') }
    })
      .populate('project_id', 'topic code description')
      .select('name description team_code project_id');

    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Mã nhóm không hợp lệ'
      });
    } 

    res.json({
      success: true,
      data: team
    });
  } catch (error) {
    console.error('Error getting team by code:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin nhóm'
    });
  }
};

// Lấy thông tin chi tiết giảng viên hướng dẫn
const getSupervisorDetail = async (req, res) => {
  try {
    const { projectId } = req.params;

    // Lấy project và supervisor
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy dự án'
      });
    }

    if (!project.supervisor_id) {
      return res.status(404).json({
        success: false,
        message: 'Dự án chưa có giảng viên hướng dẫn'
      });
    }

    // Lấy thông tin supervisor chi tiết
    const supervisor = await User.findById(project.supervisor_id)
      .select('full_name email phone major avatar dob address role');

    if (!supervisor) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thông tin giảng viên hướng dẫn'
      });
    }

    res.json({
      success: true,
      data: {
        supervisor: {
          _id: supervisor._id,
          full_name: supervisor.full_name,
          email: supervisor.email,
          phone: supervisor.phone,
          major: supervisor.major,
          avatar: supervisor.avatar,
          dob: supervisor.dob,
          address: supervisor.address,
          role: supervisor.role
        }
      }
    });
  } catch (error) {
    console.error('Error getting supervisor detail:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin giảng viên hướng dẫn'
    });
  }
};

// Lấy thông tin chi tiết thành viên
const getMemberDetail = async (req, res) => {
  try {
    const { projectId, userId } = req.params;

    // Kiểm tra user có trong team không
    const team = await Team.findOne({ project_id: projectId })
      .populate('team_member.user_id', 'full_name email phone major avatar dob address role');
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy team cho dự án này'
      });
    }

    // Find member - handle both populated and non-populated user_id
    const member = team.team_member.find(m => {
      if (!m || !m.user_id) return false;
      // If user_id is populated (object), use _id
      if (typeof m.user_id === 'object' && m.user_id._id) {
        return m.user_id._id.toString() === userId;
      }
      // If user_id is just an ObjectId (not populated), compare directly
      return m.user_id.toString() === userId;
    });
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Thành viên không tồn tại trong team này'
      });
    }

    // Lấy thông tin user chi tiết
    const user = await User.findById(userId);

    // Lấy tasks được giao cho user này
    const assignedTasks = await Task.find({ 
      assignee_id: userId,
      feature_id: { $in: await Feature.find({ project_id: projectId }).select('_id') }
    })
    .populate('assigner_id', 'full_name email')
    .populate('feature_id', 'title description')
    .populate('type_id', 'name description')
    .sort({ deadline: 1 });

    // Lấy tasks mà user này đã giao cho người khác
    const assignedByUser = await Task.find({ 
      assigner_id: userId,
      feature_id: { $in: await Feature.find({ project_id: projectId }).select('_id') }
    })
    .populate('assignee_id', 'full_name email')
    .populate('feature_id', 'title description')
    .populate('type_id', 'name description')
    .sort({ deadline: 1 });

    // Lấy comments của user
    const userComments = await Comment.find({ 
      user_id: userId,
      project_id: projectId 
    })
    .populate('task_id', 'title')
    .populate('feature_id', 'title')
    .populate('milestone_id', 'title')
    .sort({ createdAt: -1 })
    .limit(10);

    // Lấy activity logs của user
    const userActivities = await ActivityLog.find({ 
      created_by: userId,
      project_id: projectId 
    })
    .populate('milestone_id', 'title')
    .sort({ createdAt: -1 })
    .limit(10);

    // Lấy defects được giao cho user
    
  

    // Lấy defects mà user này đã giao cho người khác
 

    // Tính toán thống kê
    const now = new Date();
    const overdueTasks = assignedTasks.filter(task => 
      new Date(task.deadline) < now && task.status !== 'Completed'
    );
    
    console.log('Task statistics calculation:', {
      totalTasks: assignedTasks.length,
      now: now.toISOString(),
      overdueTasksCount: overdueTasks.length,
      overdueTasks: overdueTasks.map(t => ({
        id: t._id,
        title: t.title,
        deadline: t.deadline,
        status: t.status,
        isOverdue: new Date(t.deadline) < now
      }))
    });
    
    const taskStats = {
      total: assignedTasks.length,
      pending: assignedTasks.filter(t => t.status === 'Pending').length,
      inProgress: assignedTasks.filter(t => t.status === 'In Progress').length,
      completed: assignedTasks.filter(t => t.status === 'Completed').length,
      overdue: overdueTasks.length
    };
    // Tính độ trễ trung bình
    const avgDelay = overdueTasks.length > 0 
      ? overdueTasks.reduce((sum, task) => {
          const delay = Math.ceil((now - new Date(task.deadline)) / (1000 * 60 * 60 * 24));
          return sum + delay;
        }, 0) / overdueTasks.length 
      : 0;

    res.json({
      success: true,
      data: {
        member: {
          ...member.toObject(),
          user_details: user
        },
        statistics: {
          tasks: taskStats,
          avgDelay: Math.round(avgDelay * 10) / 10,
          totalComments: userComments.length,
          totalActivities: userActivities.length
        },
        assignedTasks,
        assignedByUser,
        recentComments: userComments,
        recentActivities: userActivities
      }
    });
  } catch (error) {
    console.error('Error getting member detail:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi lấy thông tin chi tiết thành viên'
    });
  }
};

// Rời nhóm
const removeMember = async (req, res) => {
  try {
    const { projectId, userId } = req.params;

    // Tìm team theo projectId
    const team = await Team.findOne({ project_id: projectId });
    
    if (!team) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy team'
      });
    }

    // Tìm thành viên cần xóa
    const memberIndex = team.team_member.findIndex(member => 
      member.user_id.toString() === userId
    );

    if (memberIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thành viên trong team'
      });
    }

    // Kiểm tra nếu là trưởng nhóm cuối cùng
    const isTeamLeader = team.team_member[memberIndex].team_leader === 1;
    const teamLeaderCount = team.team_member.filter(m => m.team_leader === 1).length;
    
    if (isTeamLeader && teamLeaderCount === 1 && team.team_member.length > 1) {
      // Tự động phong thành viên đầu tiên còn lại làm trưởng nhóm
      const nextMemberIndex = team.team_member.findIndex((m, idx) => idx !== memberIndex);
      if (nextMemberIndex !== -1) {
        team.team_member[nextMemberIndex].team_leader = 1;
      }
    }

    // Xóa thành viên khỏi team
    team.team_member.splice(memberIndex, 1);

    // Nếu sau khi xóa không còn thành viên nào: xóa team và project
    if (team.team_member.length === 0) {
      const projectIdToDelete = team.project_id;
      await Team.deleteOne({ _id: team._id });
      if (projectIdToDelete) {
        await Project.deleteOne({ _id: projectIdToDelete });
      }
      return res.json({
        success: true,
        message: 'Đã rời nhóm. Nhóm rỗng nên dự án đã bị xóa.',
        team: null,
        project_deleted: true
      });
    }

    await team.save();

    // Populate để trả về thông tin đầy đủ
    await team.populate([
      { path: 'team_member.user_id', select: 'full_name email phone major avatar' },
      { path: 'project_id', select: 'topic code description status' }
    ]);

    res.json({
      success: true,
      message: 'Đã xóa thành viên khỏi nhóm thành công',
      data: { team }
    });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server khi xóa thành viên'
    });
  }
};

module.exports = {
  getTeamByProject,
  updateMemberRole,
  inviteMemberByEmail,
  autoJoinTeamByCode,
  joinTeamByCode,
  getTeamByCode,
  getMemberDetail,
  removeMember,
  getSupervisorDetail,
};

