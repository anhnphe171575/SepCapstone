"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "../../../../../ultis/axios";
import SidebarWrapper from "@/components/SidebarWrapper";
import TeamManagement from "@/components/TeamManagement";
import ProjectBreadcrumb from "@/components/ProjectBreadcrumb";
import { 
  Button, 
  Typography, 
  Box, 
  Alert, 
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Stack
} from "@mui/material";
import { 
  ExitToApp as ExitToAppIcon,
  Close as CloseIcon,
  Group as GroupIcon
} from "@mui/icons-material";

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

type Project = {
  _id: string;
  topic: string;
  code: string;
  description?: string;
  status: string;
};

type Supervisor = {
  _id: string;
  full_name: string;
  email: string;
  phone: string;
  major?: string;
  avatar: string;
};

export default function TeamManagementPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);
  
  const [team, setTeam] = useState<Team | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Leave team dialog states
  const [openLeaveTeam, setOpenLeaveTeam] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [leaveSuccess, setLeaveSuccess] = useState<string | null>(null);

  const normalizeId = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") {
      if (value._id) {
        return typeof value._id === "string" ? value._id : value._id?.toString?.() ?? "";
      }
      if (typeof value.toString === "function") {
        return value.toString();
      }
    }
    return "";
  };

  useEffect(() => {
    if (!projectId) return;
    
    const fetchData = async () => {
      try {
        // Fetch current user profile first
        const userRes = await axiosInstance.get('/api/auth/profile');
        setCurrentUserId(userRes.data.data._id);
        
        // Fetch team data
        const teamRes = await axiosInstance.get(`/api/team/${projectId}`);
        const teamData = teamRes.data.data; // API returns { success: true, data: {...} }
        // Ensure team_member is always an array
        if (teamData && !teamData.team_member) {
          teamData.team_member = [];
        }
        setTeam(teamData);
        
        // Fetch project data
        const projectRes = await axiosInstance.get(`/api/team/${projectId}`);
        setProject(projectRes.data.data.project_id);
      } catch (e: any) {
        setError(e?.response?.data?.message || 'Không thể tải thông tin nhóm');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const handleTeamUpdate = (updatedTeam: Team) => {
    setTeam(updatedTeam);
  };

  // Handle leave team
  const handleLeaveTeam = async () => {
    if (!currentUserId) {
      setLeaveError("Không thể xác định người dùng hiện tại");
      return;
    }

    setLeaveLoading(true);
    setLeaveError(null);
    
    try {
      await axiosInstance.delete(`/api/team/${projectId}/members/${currentUserId}`);
      
      setLeaveSuccess("Rời nhóm thành công! Đang chuyển hướng...");
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
      
    } catch (e: any) {
      setLeaveError(e?.response?.data?.message || "Không thể rời nhóm");
    } finally {
      setLeaveLoading(false);
    }
  };

  const handleCloseLeaveDialog = () => {
    setOpenLeaveTeam(false);
    setLeaveError(null);
    setLeaveSuccess(null);
  };

  const currentUserIdStr = normalizeId(currentUserId);

  const isCurrentUserLeader =
    team?.team_member?.some((member) => {
      if (!member) return false;
      const memberIdStr = normalizeId(member.user_id);
      if (!memberIdStr || !currentUserIdStr) return false;
      return memberIdStr === currentUserIdStr && member.team_leader === 1;
    }) ?? false;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fb]">
        <SidebarWrapper />
        <main>
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f8f9fb]">
        <SidebarWrapper />
        <main>
          <Box sx={{ px: 3, py: 3 }}>
            <Alert severity="error">
              {error}
            </Alert>
          </Box>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <SidebarWrapper />
      <main>
        <div className="w-full">
          {/* ClickUp-style Top Bar (standardized) */}
          <Box 
            sx={{ 
              bgcolor: 'white',
              borderBottom: '1px solid #e8e9eb',
              px: 3,
              py: 2,
              position: 'sticky',
              top: 64, // Below the Header component (h-16 = 64px)
              zIndex: 30, // Lower than Header dropdown but higher than content
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Title with Icon */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #7b68ee, #9b59b6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(123, 104, 238, 0.25)',
                }}>
                  <GroupIcon sx={{ fontSize: 28, color: 'white' }} />
                </Box>
                <Box>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 700,
                      color: '#1f2937',
                      fontSize: '24px',
                      mb: 0.5
                    }}
                  >
                    Quản lý nhóm
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Quản lý thành viên và thông tin nhóm
                  </Typography>
                </Box>
              </Box>

              {/* Right Actions */}
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => setOpenLeaveTeam(true)}
                  disabled={leaveLoading}
                  startIcon={<ExitToAppIcon />}
                  sx={{
                    textTransform: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderColor: '#fee2e2',
                    color: '#dc2626',
                    '&:hover': {
                      borderColor: '#dc2626',
                      bgcolor: '#fef2f2',
                    }
                  }}
                >
                  Rời nhóm
                </Button>
              </Stack>
            </Box>
          </Box>

          {/* Team Management Component */}
          <Box sx={{ px: 3, py: 3 }}>
            {team && (
              <TeamManagement
                team={team}
                projectId={projectId}
                currentUserId={currentUserId || undefined}
                onTeamUpdate={handleTeamUpdate}
              />
            )}
          </Box>
        </div>
      </main>

      {/* Leave Team Dialog */}
      <Dialog open={openLeaveTeam} onClose={handleCloseLeaveDialog} maxWidth="sm" fullWidth>
        <DialogTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ExitToAppIcon className="text-red-500" />
            <span>Xác nhận rời nhóm</span>
          </div>
          <IconButton onClick={handleCloseLeaveDialog} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <div className="space-y-4 pt-4">
            {/* Error Message */}
            {leaveError && (
              <Alert severity="error" onClose={() => setLeaveError(null)}>
                {leaveError}
              </Alert>
            )}
            
            {/* Success Message */}
            {leaveSuccess && (
              <Alert severity="success">
                {leaveSuccess}
              </Alert>
            )}

            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
              <Typography variant="body1" className="mb-2 font-medium text-red-800 dark:text-red-200">
                Bạn có chắc chắn muốn rời khỏi nhóm "{team?.name}"?
              </Typography>
              <Typography variant="body2" color="text.secondary" className="mb-3">
                Hành động này sẽ:
              </Typography>
              <ul className="ml-4 space-y-1 text-sm text-red-700 dark:text-red-300">
                <li>• Xóa bạn khỏi danh sách thành viên nhóm</li>
                <li>• Bạn sẽ mất quyền truy cập vào dự án này</li>
                <li>• Cần được mời lại để tham gia nhóm</li>
              </ul>
            </div>

            {isCurrentUserLeader && (
              <Alert severity="warning">
                <Typography variant="body2" className="font-medium mb-1">
                  Cảnh báo: Bạn đang là trưởng nhóm!
                </Typography>
                <Typography variant="body2">
                  Nếu bạn rời nhóm, nhóm sẽ không còn trưởng nhóm. 
                  Hãy cân nhắc phong một thành viên khác làm trưởng nhóm trước khi rời.
                </Typography>
              </Alert>
            )}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseLeaveDialog} disabled={leaveLoading}>
            Hủy
          </Button>
          <Button
            onClick={handleLeaveTeam}
            variant="contained"
            color="error"
            disabled={leaveLoading}
            startIcon={leaveLoading ? <CircularProgress size={16} /> : <ExitToAppIcon />}
          >
            {leaveLoading ? "Đang xử lý..." : "Rời nhóm"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
