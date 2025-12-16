"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  Chip,
  IconButton,
  Box,
  Typography,
  Divider,
  Alert,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Add as AddIcon,
  Person as PersonIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
  SupervisorAccount as SupervisorAccountIcon,
  Group as GroupIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  ExitToApp as ExitToAppIcon,
  Visibility as VisibilityIcon,
  Delete as DeleteIcon,
  PersonAdd as PersonAddIcon,
} from "@mui/icons-material";
import axiosInstance from "../../ultis/axios";
import MemberDetail from "./MemberDetail";
import SupervisorDetail from "./SupervisorDetail";

type TeamMember = {
  _id: string;
  user_id: {
    _id: string;
    full_name: string;
    email: string;
    phone: string;
    major?: string;
    avatar: string;
  };
  team_leader: number;
};

type Supervisor = {
  _id: string;
  full_name: string;
  email: string;
  phone: string;
  major?: string;
  avatar: string;
};

type Team = {
  _id: string;
  name: string;
  project_id: string;
  team_member: TeamMember[];
  description?: string;
  team_code?: string;
  createAt: string;
  updateAt: string;
  supervisor?: Supervisor | null;
};

type User = {
  _id: string;
  full_name: string;
  email: string;
  phone: string;
  major?: string;
  avatar: string;
};

interface TeamManagementProps {
  team: Team;
  projectId: string;
  currentUserId?: string;
  onTeamUpdate: (team: Team) => void;
}

export default function TeamManagement({ team, projectId, currentUserId, onTeamUpdate }: TeamManagementProps) {
  // Debug logging
  console.log('Team data received:', team);
  console.log('Team members:', team?.team_member);
  
  // Ensure team_member is always an array and team has default values
  const safeTeam = {
    _id: team?._id || '',
    name: team?.name || '',
    project_id: team?.project_id || projectId,
    team_member: team?.team_member || [],
    description: team?.description || '',
    team_code: team?.team_code || '',
    createAt: team?.createAt || '',
    updateAt: team?.updateAt || ''
  };
  
  // Filter out members without proper user_id data
  const validMembers = safeTeam.team_member.filter(member => 
    member.user_id && 
    typeof member.user_id === 'object' && 
    member.user_id._id
  );
  
  // Check if current user is team leader
  const isCurrentUserTeamLeader = currentUserId ? 
    validMembers.some(member => 
      member.user_id._id === currentUserId && member.team_leader === 1
    ) : false;
  const [openEditTeam, setOpenEditTeam] = useState(false);
  const [openInviteByEmail, setOpenInviteByEmail] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [openMemberDetail, setOpenMemberDetail] = useState(false);
  const [selectedMemberForDetail, setSelectedMemberForDetail] = useState<TeamMember | null>(null);
  const [openSupervisorDetail, setOpenSupervisorDetail] = useState(false);
  
  // Edit team form
  const [teamName, setTeamName] = useState(safeTeam.name);
  const [teamDescription, setTeamDescription] = useState(safeTeam.description);
  
  // Invite by email form
  const [inviteEmail, setInviteEmail] = useState("");
  

  const handleAddMember = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axiosInstance.post(`/api/projects/${projectId}/team/members`, {
        user_id: selectedUserId,
        team_leader: 0
      });
      
      onTeamUpdate(response.data.data.team);
      setSelectedUserId("");
      setSuccess("Thêm thành viên thành công!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể thêm thành viên");
    } finally {
      setLoading(false);
    }
  };


  const handlePromoteToLeader = async (userId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axiosInstance.put(`/api/team/${projectId}/members/${userId}/role`, {
        team_leader: 1
      });
      onTeamUpdate(response.data.data.team);
      setAnchorEl(null);
      setSelectedMember(null);
      setSuccess("Cập nhật vai trò thành công!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể cập nhật vai trò");
    } finally {
      setLoading(false);
    }
  };


  const handleUpdateTeam = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axiosInstance.put(`/api/projects/${projectId}/team`, {
        name: teamName || '',
        description: teamDescription || ''
      });
      onTeamUpdate(response.data.data);
      setOpenEditTeam(false);
      setSuccess("Cập nhật thông tin nhóm thành công!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể cập nhật thông tin nhóm");
    } finally {
      setLoading(false);
    }
  };

 
  const handleInviteByEmail = async () => {
    setLoading(true);
    setInviteError(null);
    
    // Kiểm tra email có phải của thành viên hiện tại không
    const existingMemberEmail = validMembers.find(member => 
      member.user_id?.email?.toLowerCase() === inviteEmail.toLowerCase()
    );
    
    if (existingMemberEmail) {
      setInviteError(`Email ${inviteEmail} đã thuộc về thành viên ${existingMemberEmail.user_id?.full_name} trong nhóm. Không thể mời lại.`);
      setLoading(false);
      return;
    }
    
    try {
      const response = await axiosInstance.post(`/api/team/${projectId}/invite`, {
        email: inviteEmail
      });
      
      setOpenInviteByEmail(false);
      setInviteEmail("");
      setSuccess("Đã gửi lời mời thành công!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setInviteError(e?.response?.data?.message || "Không thể gửi lời mời");
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, member: TeamMember) => {
    setAnchorEl(event.currentTarget);
    setSelectedMember(member);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMember(null);
  };

  const handleViewMemberDetail = (member: TeamMember) => {
    setSelectedMemberForDetail(member);
    setOpenMemberDetail(true);
    setAnchorEl(null);
    setSelectedMember(null);
  };

  const handleCloseMemberDetail = () => {
    setOpenMemberDetail(false);
    setSelectedMemberForDetail(null);
  };

  const handleCloseInviteDialog = () => {
    setOpenInviteByEmail(false);
    setInviteError(null);
    setInviteEmail("");
  };


  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCopyTeamCode = async () => {
    try {
      await navigator.clipboard.writeText(safeTeam.team_code || '');
      setSuccess("Đã sao chép mã nhóm!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError("Không thể sao chép mã nhóm");
      setTimeout(() => setError(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Team Leader Notice */}
      {!isCurrentUserTeamLeader && currentUserId && (
        <Alert severity="info">
          Chỉ trưởng nhóm mới có thể mời thành viên, phong trưởng nhóm mới . Tất cả thành viên đều có thể xem chi tiết thành viên khác.
        </Alert>
      )}

      {/* Team Info Card */}
      <Card className="shadow-sm">
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
            <div className="flex items-center gap-1">
              <GroupIcon className="w-4 h-4" />
              <span>{validMembers.length-1} thành viên</span>
            </div>
            <div className="flex items-center gap-1">
              <SupervisorAccountIcon className="w-4 h-4" />
              <span>{validMembers.filter(m => m.team_leader === 1).length} trưởng nhóm</span>
            </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <Typography variant="body2" color="text.secondary" className="mb-1">
                  Mã nhóm
                </Typography>
                <Typography variant="h6" className="font-mono text-blue-600 dark:text-blue-400">
                  {safeTeam.team_code || 'Đang tạo...'}
                </Typography>
                <Typography variant="caption" color="text.secondary" className="mt-1 block">
                  Chia sẻ mã này để mời thành viên tham gia
                </Typography>
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleCopyTeamCode}
                >
                  Sao chép mã
                </Button>
                {isCurrentUserTeamLeader && (
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<EmailIcon />}
                    onClick={() => setOpenInviteByEmail(true)}
                  >
                    Mời bằng email
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members and Supervisor - Combined Card */}
      <Card className="shadow-sm">
        <CardContent>
          {/* Supervisor Section */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <SupervisorAccountIcon className="text-purple-600" />
              <Typography variant="h6" className="font-medium">
                Giảng viên hướng dẫn
              </Typography>
            </div>
          </div>
          
          {team?.supervisor ? (
            <>
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg mb-6 border-l-4 border-purple-500">
                <Avatar
                  src={team?.supervisor?.avatar}
                  className="w-16 h-16 border-2 border-purple-300"
                  sx={{ bgcolor: '#7b68ee' }}
                >
                  {team?.supervisor?.full_name ? getInitials(team?.supervisor?.full_name) : "?"}
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Typography variant="h6" className="font-medium">
                      {team?.supervisor?.full_name}
                    </Typography>
                    <Chip
                      label="Giảng viên hướng dẫn"
                      size="small"
                      sx={{
                        bgcolor: '#7b68ee',
                        color: 'white',
                        fontWeight: 600,
                      }}
                      icon={<SupervisorAccountIcon sx={{ color: 'white !important' }} />}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <EmailIcon className="w-4 h-4" />
                      <span>{team?.supervisor?.email}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <PhoneIcon className="w-4 h-4" />
                      <span>{team?.supervisor?.phone || "N/A"}</span>
                    </div>
                    {team?.supervisor?.major && (
                      <div className="flex items-center gap-1">
                        <SchoolIcon className="w-4 h-4" />
                        <span>{team?.supervisor?.major}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<VisibilityIcon />}
                  onClick={() => setOpenSupervisorDetail(true)}
                  sx={{
                    borderColor: '#7b68ee',
                    color: '#7b68ee',
                    '&:hover': {
                      borderColor: '#6952d6',
                      bgcolor: '#f3f0ff',
                    }
                  }}
                >
                  Xem chi tiết
                </Button>
              </div>
              <Divider className="my-4" />
            </>
          ) : (
            <>
              <Alert severity="info" className="mb-4">
                <Typography variant="body2">
                  Dự án chưa có giảng viên hướng dẫn. Trưởng nhóm có thể mời giảng viên bằng email.
                </Typography>
              </Alert>
              <Divider className="my-4" />
            </>
          )}

          {/* Team Members Section */}
          <div className="flex items-center gap-2 mb-4">
            <PersonIcon />
            <Typography variant="h6" className="font-medium">
              Thành viên nhóm
            </Typography>
          </div>
          {validMembers.length === 0 ? (
            <div className="text-center py-8">
              <GroupIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <Typography variant="h6" className="mb-2 text-gray-600">
                Chưa có thành viên nào
              </Typography>
              <Typography variant="body2" color="text.secondary" className="mb-6">
                Mời thành viên tham gia nhóm bằng email hoặc chia sẻ mã nhóm
              </Typography>
              
              {/* Team Code Display */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-6 max-w-md mx-auto">
                <Typography variant="body2" color="text.secondary" className="mb-2">
                  Mã nhóm
                </Typography>
                <div className="flex items-center justify-between">
                  <Typography variant="h5" className="font-mono text-blue-600 dark:text-blue-400">
                    {safeTeam.team_code || 'Đang tạo...'}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleCopyTeamCode}
                  >
                    Sao chép
                  </Button>
                </div>
              </div>
              
              {/* Action Buttons */}
              {isCurrentUserTeamLeader && (
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    variant="contained"
                    startIcon={<EmailIcon />}
                    onClick={() => setOpenInviteByEmail(true)}
                    className="w-full sm:w-auto"
                  >
                    Mời bằng email
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {validMembers.map((member, index) => (
                <div key={member._id || member.user_id?._id || index}>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-4">
                      <Avatar
                        src={member.user_id?.avatar}
                        className="w-12 h-12"
                      >
                        {member.user_id?.full_name ? getInitials(member.user_id.full_name) : "?"}
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Typography variant="h6" className="font-medium">
                            {member.user_id?.full_name || "Thành viên không xác định"}
                          </Typography>
                          {member.team_leader === 1 && (
                            <Chip
                              label="Trưởng nhóm"
                              size="small"
                              color="primary"
                              icon={<SupervisorAccountIcon />}
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <EmailIcon className="w-4 h-4" />
                            <span>{member.user_id?.email}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <PhoneIcon className="w-4 h-4" />
                            <span>{member.user_id?.phone}</span>
                          </div>
                          {member.user_id?.major && (
                            <div className="flex items-center gap-1">
                              <SchoolIcon className="w-4 h-4" />
                              <span>{member.user_id.major}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <IconButton
                      onClick={(e) => handleMenuClick(e, member)}
                      disabled={loading}
                    >
                      <MoreVertIcon />
                    </IconButton>
                  </div>
                  {index < validMembers.length - 1 && <Divider className="my-2" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

     
      {/* Invite by Email Dialog */}
      <Dialog open={openInviteByEmail} onClose={handleCloseInviteDialog} maxWidth="sm" fullWidth>
        <DialogTitle className="flex items-center gap-2">
          <EmailIcon className="text-blue-500" />
          Mời thành viên bằng email
        </DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-4">
            {/* Error Message */}
            {inviteError && (
              <Alert severity="error" onClose={() => setInviteError(null)}>
                {inviteError}
              </Alert>
            )}
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                // Clear error when user starts typing
                if (inviteError) setInviteError(null);
              }}
              placeholder="Nhập email của thành viên muốn mời"
              required
              helperText={
                inviteEmail && validMembers.find(member => 
                  member.user_id?.email?.toLowerCase() === inviteEmail.toLowerCase()
                ) 
                  ? "⚠️ Email này đã là thành viên hiện tại" 
                  : "Ví dụ: user@example.com"
              }
              error={
                !!(inviteEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) ||
                !!(inviteEmail && validMembers.find(member => 
                  member.user_id?.email?.toLowerCase() === inviteEmail.toLowerCase()
                ))
              }
            />
            {/* Current Members List */}
            {validMembers.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                <Typography variant="body2" color="text.secondary" className="flex items-center gap-2 mb-2">
                  <GroupIcon className="w-4 h-4" />
                  Thành viên hiện tại ({validMembers.length}):
                </Typography>
                <div className="space-y-1">
                  {validMembers.map((member, index) => (
                    <div key={member._id || index} className="flex items-center gap-2 text-sm">
                      <Avatar className="w-6 h-6 text-xs">
                        {member.user_id?.full_name ? getInitials(member.user_id.full_name) : "?"}
                      </Avatar>
                      <span className="text-gray-600 dark:text-gray-300">
                        {member.user_id?.full_name} ({member.user_id?.email})
                      </span>
                      {member.team_leader === 1 && (
                        <Chip label="Trưởng nhóm" size="small" color="primary" className="text-xs" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <Typography variant="body2" color="text.secondary" className="flex items-start gap-2">
                <EmailIcon className="w-4 h-4 mt-0.5 text-blue-500" />
                Thành viên sẽ nhận được email mời với:
              </Typography>
              <ul className="ml-6 mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <li>• Liên kết để tham gia nhóm</li>
                <li>• Mã nhóm: <span className="font-mono font-medium">{safeTeam.team_code}</span></li>
                <li>• Thông tin về dự án</li>
              </ul>
            </div>
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseInviteDialog}>Hủy</Button>
          <Button
            onClick={handleInviteByEmail}
            variant="contained"
            disabled={
              !inviteEmail.trim() || 
              loading || 
              !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail) ||
              !!(validMembers.find(member => 
                member.user_id?.email?.toLowerCase() === inviteEmail.toLowerCase()
              ))
            }
            startIcon={loading ? <CircularProgress size={16} /> : <EmailIcon />}
          >
            {loading ? "Đang gửi..." : "Gửi lời mời"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Team Dialog */}
      <Dialog open={openEditTeam} onClose={() => setOpenEditTeam(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Chỉnh sửa thông tin nhóm</DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-4">
            <TextField
              fullWidth
              label="Tên nhóm"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
            />
            <TextField
              fullWidth
              label="Mô tả"
              value={teamDescription}
              onChange={(e) => setTeamDescription(e.target.value)}
              multiline
              rows={3}
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEditTeam(false)}>Hủy</Button>
          <Button
            onClick={handleUpdateTeam}
            variant="contained"
            disabled={!teamName?.trim() || loading}
          >
            {loading ? <CircularProgress size={20} /> : "Cập nhật"}
          </Button>
        </DialogActions>
      </Dialog>


      {/* Member Detail Dialog */}
      <MemberDetail
        open={openMemberDetail}
        onClose={handleCloseMemberDetail}
        memberId={selectedMemberForDetail?.user_id._id || ""}
        projectId={projectId}
        memberName={selectedMemberForDetail?.user_id.full_name || ""}
      />

      {/* Supervisor Detail Dialog */}
      {team?.supervisor && (
        <SupervisorDetail
          open={openSupervisorDetail}
          onClose={() => setOpenSupervisorDetail(false)}
          projectId={projectId}
          supervisorName={team.supervisor.full_name}
        />
      )}

      {/* Member Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedMember && handleViewMemberDetail(selectedMember)}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Xem chi tiết</ListItemText>
        </MenuItem>
        {isCurrentUserTeamLeader && selectedMember?.team_leader === 0 && (
          <MenuItem onClick={() => selectedMember && handlePromoteToLeader(selectedMember.user_id._id)}>
            <ListItemIcon>
              <SupervisorAccountIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Phong trưởng nhóm</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </div>
  );
}

