"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Paper,
  LinearProgress,
  Badge,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  Person as PersonIcon,
  Work as WorkIcon,
  BugReport as BugIcon,
  Comment as CommentIcon,
  Timeline as TimelineIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Close as CloseIcon,
  Assignment as AssignmentIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  SupervisorAccount as SupervisorAccountIcon,
} from "@mui/icons-material";
import axiosInstance from "../../ultis/axios";

interface MemberDetailProps {
  open: boolean;
  onClose: () => void;
  memberId: string;
  projectId: string;
  memberName: string;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  status: string;
  deadline: string;
  assigner_id: {
    _id: string;
    full_name: string;
    email: string;
  };
  assignee_id: {
    _id: string;
    full_name: string;
    email: string;
  };
  feature_id: {
    _id: string;
    title: string;
    description: string;
  };
  type_id: {
    _id: string;
    name: string;
    description: string;
  };
}

interface Defect {
  _id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  deadline: string;
  assigner_id: {
    _id: string;
    full_name: string;
    email: string;
  };
  function: {
    _id: string;
    name: string;
    description: string;
  };
  severity_id: {
    _id: string;
    name: string;
    description: string;
  };
}

interface Comment {
  _id: string;
  content: string;
  createdAt: string;
  task_id?: {
    _id: string;
    title: string;
  };
  feature_id?: {
    _id: string;
    title: string;
  };
  milestone_id?: {
    _id: string;
    title: string;
  };
  defect_id?: {
    _id: string;
    title: string;
  };
}

interface Activity {
  _id: string;
  action: string;
  metadata: any;
  createdAt: string;
  milestone_id?: {
    _id: string;
    title: string;
  };
}

interface MemberDetailData {
  member: {
    _id: string;
    user_id: {
      _id: string;
      full_name: string;
      email: string;
      phone: string;
      major: string;
      avatar: string;
      dob: string;
      address: Array<{
        street: string;
        city: string;
        postalCode: string;
        contry: string;
      }>;
      role: {
        _id: string;
        name: string;
        description: string;
      };
    };
    team_leader: number;
    user_details: any;
  };
  statistics: {
    tasks: {
      total: number;
      pending: number;
      inProgress: number;
      completed: number;
      overdue: number;
    };
    defects: {
      total: number;
      open: number;
      inProgress: number;
      resolved: number;
      closed: number;
    };
    avgDelay: number;
    totalComments: number;
    totalActivities: number;
  };
  assignedTasks: Task[];
  assignedByUser: Task[];
  assignedDefects: Defect[];
  assignedDefectsByUser: Defect[];
  recentComments: Comment[];
  recentActivities: Activity[];
}

export default function MemberDetail({
  open,
  onClose,
  memberId,
  projectId,
  memberName,
}: MemberDetailProps) {
  const [data, setData] = useState<MemberDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    if (open && memberId && projectId) {
      fetchMemberDetail();
    }
  }, [open, memberId, projectId]);

  const fetchMemberDetail = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axiosInstance.get(
        `/api/team/${projectId}/members/${memberId}`
      );
      setData(response.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể tải thông tin thành viên");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(word => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
      case "Resolved":
      case "Closed":
        return "success";
      case "In Progress":
        return "warning";
      case "Pending":
      case "Open":
        return "info";
      case "Overdue":
        return "error";
      default:
        return "default";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical":
      case "High":
        return "error";
      case "Medium":
        return "warning";
      case "Low":
        return "success";
      default:
        return "default";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN");
  };

  const calculateAge = (dob: string) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  if (!open) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PersonIcon className="text-blue-500" />
          <Typography variant="h6">
            Chi tiết thành viên: {memberName}
          </Typography>
        </div>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent className="p-0">
        {loading && <LinearProgress />}
        
        {error && (
          <Alert severity="error" className="m-4">
            {error}
          </Alert>
        )}

        {data && (
          <div className="p-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-6">
                <Avatar
                  src={data.member.user_id.avatar}
                  className="w-24 h-24 border-4 border-white shadow-lg"
                >
                  {getInitials(data.member.user_id.full_name)}
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Typography variant="h4" className="font-bold text-gray-900 dark:text-white">
                      {data.member.user_id.full_name}
                    </Typography>
                    {data.member.team_leader === 1 && (
                      <Chip
                        label="Trưởng nhóm"
                        color="primary"
                        icon={<SupervisorAccountIcon />}
                        className="shadow-sm"
                      />
                    )}
                  </div>
                  <Typography variant="h6" className="text-gray-600 dark:text-gray-300 mb-2">
                    {data.member.user_id.role?.name || "Thành viên"}
                  </Typography>
                  <Typography variant="body1" className="text-gray-500 dark:text-gray-400">
                    {data.member.user_id.major || "Chưa cập nhật chuyên ngành"}
                  </Typography>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <Card className="mb-6 shadow-sm">
              <CardContent className="p-6">
                <Typography variant="h6" className="mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <EmailIcon className="text-blue-500" />
                  Thông tin liên hệ
                </Typography>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <EmailIcon className="w-5 h-5 text-blue-500" />
                    <div>
                      <Typography variant="body2" className="text-gray-500 dark:text-gray-400">
                        Email
                      </Typography>
                      <Typography variant="body1" className="font-medium">
                        {data.member.user_id.email}
                      </Typography>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <PhoneIcon className="w-5 h-5 text-green-500" />
                    <div>
                      <Typography variant="body2" className="text-gray-500 dark:text-gray-400">
                        Điện thoại
                      </Typography>
                      <Typography variant="body1" className="font-medium">
                        {data.member.user_id.phone}
                      </Typography>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-purple-500" />
                    <div>
                      <Typography variant="body2" className="text-gray-500 dark:text-gray-400">
                        Tuổi
                      </Typography>
                      <Typography variant="body1" className="font-medium">
                        {calculateAge(data.member.user_id.dob)} tuổi
                      </Typography>
                    </div>
                  </div>
                  {data.member.user_id.address && data.member.user_id.address.length > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg md:col-span-2 lg:col-span-1">
                      <LocationIcon className="w-5 h-5 text-orange-500" />
                      <div>
                        <Typography variant="body2" className="text-gray-500 dark:text-gray-400">
                          Địa chỉ
                        </Typography>
                        <Typography variant="body1" className="font-medium">
                          {data.member.user_id.address[0].city}, {data.member.user_id.address[0].contry}
                        </Typography>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

          </div>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}
