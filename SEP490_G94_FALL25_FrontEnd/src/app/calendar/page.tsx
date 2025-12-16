"use client";

import { useState, useEffect } from "react";
import {
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Button,
  Chip,
  Paper,
  Box,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Divider,
  Breadcrumbs,
  Link,
  Stack,
} from "@mui/material";
import {
  CalendarToday as CalendarIcon,
  VideoCall as VideoCallIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Group as GroupIcon,
  AccessTime as AccessTimeIcon,
  Add as AddIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import axiosInstance from "../../../ultis/axios";
import SidebarWrapper from "@/components/SidebarWrapper";
import CreateMeetingModal from "@/components/CreateMeetingModal";
import EditMeetingModal from "@/components/EditMeetingModal";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Meeting {
  _id: string;
  topic: string;
  description?: string;
  meeting_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  status: "pending" | "approved" | "rejected" | "completed" | "cancelled";
  meeting_type: "regular" | "urgent" | "review" | "presentation";
  location: string;
  google_meet_link?: string;
  meeting_notes?: string;
  reject_reason?: string;
  mentor_id: {
    _id: string;
    full_name: string;
    email: string;
    avatar: string;
  };
  requested_by: {
    _id: string;
    full_name: string;
    email: string;
    avatar: string;
  };
  project_id: {
    _id: string;
    topic: string;
    code: string;
  };
  created_by: {
      _id: string;
      full_name: string;
      email: string;
    avatar: string;
  };
  createAt: string;
  updateAt: string;
}

interface MeetingsData {
  allMeetings: Meeting[];
  meetingsByRole: {
    asMentor: Meeting[];
    asLeader: Meeting[];
    asMember: Meeting[];
    asCreator: Meeting[];
  };
  statistics: {
  total: number;
    asMentor: number;
    asLeader: number;
    asMember: number;
    asCreator: number;
  };
}

export default function CalendarPage() {
  const router = useRouter();
  const [meetingsData, setMeetingsData] = useState<MeetingsData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [userRole, setUserRole] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [createMeetingOpen, setCreateMeetingOpen] = useState(false);
  const [editMeetingOpen, setEditMeetingOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [nowTick, setNowTick] = useState(Date.now());

  // Week-view helpers (Google Calendar-like)
  const SLOT_HEIGHT = 48; // px per hour row
  const HALF_SLOT = SLOT_HEIGHT / 2; // 30-minute subtle guide
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0..6, CN..T7
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const startOfWeek = getStartOfWeek(currentMonth);
  const weekDaysW: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const parseMeetingDate = (m: Meeting) => {
    // meeting_date có thể là ISO hoặc 'YYYY-MM-DD'
    const md: any = (m as any).meeting_date;
    let base: Date;
    if (md instanceof Date) {
      base = md;
    } else if (typeof md === 'string' && md.includes('T')) {
      // ISO -> tạo Date rồi lấy local Y/M/D
      const iso = new Date(md);
      base = new Date(iso.getFullYear(), iso.getMonth(), iso.getDate());
    } else if (typeof md === 'string') {
      const [y, mo, da] = md.split('-').map(n => parseInt(n, 10));
      base = new Date(y, (mo || 1) - 1, da || 1);
    } else {
      base = new Date();
    }
    const [sh, sm] = m.start_time.split(':').map(n => parseInt(n, 10));
    const [eh, em] = m.end_time.split(':').map(n => parseInt(n, 10));
    const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), sh || 0, sm || 0, 0, 0);
    const end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), eh || 0, em || 0, 0, 0);
    return { start, end };
  };

  const getTopAndHeight = (start: Date, end: Date) => {
    const top = (start.getHours() + start.getMinutes() / 60) * SLOT_HEIGHT;
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const height = Math.max(32, durationHours * SLOT_HEIGHT);
    return { top, height };
  };

  const goToPrevWeek = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), currentMonth.getDate() - 7));
  const goToNextWeek = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), currentMonth.getDate() + 7));
  const goToToday = () => setCurrentMonth(new Date());

  // Now indicator updater
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  // All-day detector (heuristic)
  const isAllDay = (m: Meeting) => {
    const dur = m.duration || 0;
    return m.start_time === '00:00' && (m.end_time === '23:59' || m.end_time === '24:00') || dur >= 8 * 60;
  };

  // Overlap layout for a day
  type Positioned = Meeting & { _posLeft: number; _posWidth: number };
  const layoutDayEvents = (events: Meeting[]): Positioned[] => {
    if (!events.length) return [] as Positioned[];
    // Sort by start time
    const withTimes = events.map(e => {
      const { start, end } = parseMeetingDate(e);
      return { e, start, end };
    }).sort((a, b) => a.start.getTime() - b.start.getTime());

    // Assign columns greedy
    const columns: { end: Date }[] = [];
    const assigned: { e: Meeting; col: number }[] = [];
    for (const item of withTimes) {
      let placed = false;
      for (let c = 0; c < columns.length; c++) {
        if (columns[c].end <= item.start) {
          columns[c].end = item.end;
          assigned.push({ e: item.e, col: c });
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push({ end: item.end });
        assigned.push({ e: item.e, col: columns.length - 1 });
      }
    }
    const maxCols = Math.max(1, columns.length);
    const width = 100 / maxCols;
    return assigned.map(a => Object.assign({}, a.e, { _posLeft: a.col * width, _posWidth: width })) as Positioned[];
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load user info from API
        const userResponse = await axiosInstance.get('/api/users/me');
        const user = userResponse.data;
        setCurrentUserId(user._id);
        setUserRole(user.role.toString());

        // Determine date range based on view (fetch by range to include cross-month days)
        const startOfWeek = getStartOfWeek(currentMonth);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);

        const fmtLocal = (d: Date) => {
          const y = d.getFullYear();
          const m = `${d.getMonth() + 1}`.padStart(2, '0');
          const day = `${d.getDate()}`.padStart(2, '0');
          return `${y}-${m}-${day}`;
        };

        const response = await axiosInstance.get('/api/meetings/user/all', {
          params: {
            from: fmtLocal(startOfWeek),
            to: fmtLocal(endOfWeek),
          },
        });
        
        setMeetingsData(response.data.data);
        
      } catch (error: any) {
        console.error('Error loading data:', error);
        setError(error?.response?.data?.message || "Không thể tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

      loadData();
  }, [currentMonth]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "warning";
      case "approved": return "success";
      case "rejected": return "error";
      case "completed": return "info";
      case "cancelled": return "default";
      default: return "default";
    }
  };

  // Get status text
  const getStatusText = (status: string) => {
    switch (status) {
      case "pending": return "Chờ xác nhận";
      case "approved": return "Đã xác nhận";
      case "rejected": return "Đã từ chối";
      default: return status;
    }
  };

  // Get meeting type text
  const getMeetingTypeText = (type: string) => {
    switch (type) {
      case "regular": return "Thường";
      case "urgent": return "Khẩn cấp";
      case "review": return "Báo cáo tiến độ";
      default: return type;
    }
  };

  // Color by status
  const getStatusGradient = (status: string) => {
    switch (status) {
      case 'approved':
        return 'linear-gradient(135deg, #10b981 0%, #059669 100%)'; // green
      case 'pending':
        return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'; // amber
      case 'rejected':
        return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'; // red
      default:
        return 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)';
    }
  };

  // Format time
  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };


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
            <Alert severity="error">{error}</Alert>
          </Box>
        </main>
      </div>
    );
  }

  // Handle meeting status update
  const handleMeetingStatusUpdate = async (meetingId: string, status: 'approved' | 'rejected', rejectReason?: string) => {
    try {
      const response = await axiosInstance.put(`/api/meetings/${meetingId}/status`, {
        status,
        reject_reason: rejectReason
      });
      
      if (response.data.success) {
        toast.success(`Lịch họp đã được ${status === 'approved' ? 'xác nhận' : 'từ chối'}`);
        // Reload data to reflect changes
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error updating meeting status:', error);
      const errorMessage = error?.response?.data?.message || 'Có lỗi xảy ra khi cập nhật trạng thái';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Check if user can manage meeting (mentor for their projects)
  const canManageMeeting = (meeting: Meeting) => {
    return userRole === "4" && meeting.mentor_id?._id === currentUserId;
  };

  // Check if user can edit/delete meeting (only creator when pending)
  const canEditDeleteMeeting = (meeting: Meeting) => {
    return meeting.status === 'pending' && meeting.requested_by?._id === currentUserId;
  };

  // Handle delete meeting
  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa lịch họp này?')) {
      return;
    }

    try {
      const response = await axiosInstance.delete(`/api/meetings/${meetingId}`);
      
      if (response.data.success) {
        toast.success("Lịch họp đã được xóa");
        // Reload data to reflect changes
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Error deleting meeting:', error);
      const errorMessage = error?.response?.data?.message || 'Có lỗi xảy ra khi xóa lịch họp';
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Handle edit meeting
  const handleEditMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setDetailDialogOpen(false);
    setEditMeetingOpen(true);
  };

  const meetingsToDisplay = meetingsData?.allMeetings || [];

  // Generate calendar grid
  const generateCalendarDays = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    const currentDate = new Date(startDate);
    
    // Generate 6 weeks (42 days) to ensure full calendar view
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  // Get meetings for a specific day
  const getMeetingsForDay = (date: Date) => {
    return meetingsToDisplay.filter(meeting => {
      const meetingDate = new Date(meeting.meeting_date);
      return meetingDate.toDateString() === date.toDateString();
    });
  };

  // Handle meeting click
  const handleMeetingClick = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setDetailDialogOpen(true);
  };

  // Check if date is today
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if date is in current month
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth();
  };

  const calendarDays = generateCalendarDays();
  const weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  
  // Generate month and year options
  const months = [
    { value: 0, label: 'Tháng 1' },
    { value: 1, label: 'Tháng 2' },
    { value: 2, label: 'Tháng 3' },
    { value: 3, label: 'Tháng 4' },
    { value: 4, label: 'Tháng 5' },
    { value: 5, label: 'Tháng 6' },
    { value: 6, label: 'Tháng 7' },
    { value: 7, label: 'Tháng 8' },
    { value: 8, label: 'Tháng 9' },
    { value: 9, label: 'Tháng 10' },
    { value: 10, label: 'Tháng 11' },
    { value: 11, label: 'Tháng 12' },
  ];
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 3 + i); // 3 years before to 6 years after
  
  const handleMonthChange = (month: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), month, 1));
  };
  
  const handleYearChange = (year: number) => {
    setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
  };

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <style>{`
        /* Custom scrollbar for calendar cells - Horizontal */
        .calendar-scroll::-webkit-scrollbar {
          height: 4px;
          width: 4px;
        }
        .calendar-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .calendar-scroll::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 2px;
        }
        .calendar-scroll::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
        /* Subtle grid lines */
        .gc-grid-line { border-bottom: 1px solid rgba(226,232,240,0.7); }
        .gc-grid-half { border-bottom: 1px dotted rgba(203,213,225,0.6); }
        .gc-day-header { box-shadow: 0 1px 0 rgba(226,232,240,0.8); }
        .gc-sticky { position: sticky; top: 0; z-index: 10; background: #fff; }
        .gc-today-col { background: linear-gradient(to bottom, rgba(59,130,246,0.06), rgba(59,130,246,0.02)); }
        .gc-weekend { background: linear-gradient(to bottom, rgba(2,6,23,0.02), rgba(2,6,23,0)); }
        .gc-event { transition: transform .06s ease, box-shadow .12s ease; }
        .gc-event:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(2,6,23,0.15); }
        .gc-all-day-chip { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      `}</style>
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
              zIndex: 90, // Lower than Header dropdown but higher than content
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
                  <CalendarIcon sx={{ fontSize: 28, color: 'white' }} />
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
                    Lịch họp
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Quản lý và theo dõi lịch họp của bạn
                  </Typography>
                </Box>
              </Box>

              {/* Right Actions */}
              <Stack direction="row" spacing={1.5} alignItems="center">
                {userRole === "4" && (
                  <Button
                    variant="outlined"
                    onClick={() => setPendingDialogOpen(true)}
                    sx={{
                      textTransform: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      borderColor: '#e8e9eb',
                      color: '#49516f',
                      '&:hover': {
                        borderColor: '#7b68ee',
                        bgcolor: '#f3f0ff',
                      }
                    }}
                  >
                    Yêu cầu chờ duyệt
                  </Button>
                )}
                {(userRole === "1" || userRole === "4") && (
                  <Button 
                    variant="contained" 
                    startIcon={<AddIcon />} 
                    onClick={() => setCreateMeetingOpen(true)}
                    sx={{
                      textTransform: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      background: 'linear-gradient(135deg, #7b68ee, #9b59b6)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #6a5acd, #8b4a9f)',
                      }
                    }}
                  >
                    Tạo lịch họp
                  </Button>
                )}
              </Stack>
            </Box>
          </Box>

          {/* Week Navigation & Controls */}
          <Box sx={{ px: 3, py: 3 }}>
            <Card className="mb-6" sx={{ boxShadow: 2 }}>
              <CardContent>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outlined" 
                      onClick={goToPrevWeek}
                      sx={{
                        textTransform: 'none',
                        minWidth: '40px',
                        borderColor: '#e8e9eb',
                        color: '#49516f',
                        '&:hover': {
                          borderColor: '#7b68ee',
                          bgcolor: '#f3f0ff',
                        }
                      }}
                    >
                      ‹
                    </Button>
                    <Button 
                      variant="outlined" 
                      onClick={goToToday}
                      sx={{
                        textTransform: 'none',
                        borderColor: '#e8e9eb',
                        color: '#49516f',
                        '&:hover': {
                          borderColor: '#7b68ee',
                          bgcolor: '#f3f0ff',
                        }
                      }}
                    >
                      Hôm nay
                    </Button>
                    <Button 
                      variant="outlined" 
                      onClick={goToNextWeek}
                      sx={{
                        textTransform: 'none',
                        minWidth: '40px',
                        borderColor: '#e8e9eb',
                        color: '#49516f',
                        '&:hover': {
                          borderColor: '#7b68ee',
                          bgcolor: '#f3f0ff',
                        }
                      }}
                    >
                      ›
                    </Button>
                    <Typography variant="h6" className="ml-2" sx={{ fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                      {startOfWeek.toLocaleDateString('vi-VN', { month: 'long', day: 'numeric' })}
                      {" – "}
                      {new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6)
                        .toLocaleDateString('vi-VN', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </Typography>
                  </div>
                  <div className="flex gap-2">
                    <div className="mr-2">
                      <div className="inline-flex rounded-md overflow-hidden border border-gray-300">
                        <button 
                          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                            viewMode === 'day' 
                              ? 'bg-[#7b68ee] text-white' 
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`} 
                          onClick={() => setViewMode('day')}
                        >
                          Day
                        </button>
                        <button 
                          className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                            viewMode === 'week' 
                              ? 'bg-[#7b68ee] text-white' 
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`} 
                          onClick={() => setViewMode('week')}
                        >
                          Week
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          {/* Week Grid (Google Calendar-like) */}
          {loading ? (
            <Card>
              <CardContent className="flex justify-center items-center py-20">
                <CircularProgress />
              </CardContent>
            </Card>
          ) : (
            <Card sx={{ overflow: 'hidden', boxShadow: 3 }}>
              <CardContent sx={{ p: 0 }}>
                {/* Scroll container to keep header sticky */}
                <div className="relative" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {viewMode === 'week' ? (
                  <>
                    {/* Header row */}
                      <div className="grid sticky top-0 z-10" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
                        <div className="bg-white gc-day-header border-r h-12 flex items-center justify-end pr-2 text-xs text-gray-500">GMT+07</div>
                        {weekDaysW.map((d, idx) => {
                          const isTodayCol = isSameDay(d, new Date());
                          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                          return (
                            <div
                              key={idx}
                              className={`gc-day-header text-center h-12 flex items-center justify-center ${isTodayCol ? 'border-b-2 border-blue-500' : ''}`}
                              style={{ background: '#fff' }}
                            >
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-500">{dayNames[d.getDay()]}</span>
                                <span className={`text-sm font-semibold ${isTodayCol ? 'text-blue-600' : 'text-gray-900'}`}>{d.getDate()}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    {/* All-day row */}
                    <div className="grid" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
                      <div className="border-r h-10 flex items-center justify-end pr-2 text-xs text-gray-500">All day</div>
                      {weekDaysW.map((day, idx) => (
                        <div key={idx} className="border-r h-10 relative">
                          {(meetingsData?.allMeetings || [])
                            .filter(m => isAllDay(m) && isSameDay(parseMeetingDate(m).start, day))
                            .map(m => (
                              <div
                                key={m._id}
                                onClick={() => handleMeetingClick(m)}
                                className="absolute left-1 right-1 top-1 bottom-1 text-white rounded px-2 text-xs flex items-center truncate"
                                style={{ background: getStatusGradient(m.status) }}
                                title={`${m.topic}${m.project_id?.topic ? ` • ${m.project_id.topic}` : ''}`}
                              >
                                <div className="gc-all-day-chip truncate">
                                  {m.topic}
                                  {m.project_id?.topic ? ` • ${m.project_id.topic}` : ''}
                                </div>
                              </div>
                            ))}
                        </div>
                      ))}
                        </div>

                    {/* Grid */}
                      <div className="grid" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
                        {/* Time gutter */}
                        <div className="relative border-r">
                          {HOURS.map((h) => (
                            <div key={h} style={{ height: SLOT_HEIGHT }} className="relative">
                              <div className="gc-grid-line text-right pr-2 text-xs text-gray-500">
                                {h === 0 ? '' : `${h}:00`}
                              </div>
                              <div className="absolute left-0 right-0" style={{ top: HALF_SLOT }}>
                                <div className="gc-grid-half" />
                              </div>
                            </div>
                          ))}
                        </div>

                      {/* Day columns */}
                      {weekDaysW.map((day, idx) => {
                        const todays = (meetingsData?.allMeetings || [])
                          .filter(m => !isAllDay(m) && isSameDay(parseMeetingDate(m).start, day));
                        const positioned = layoutDayEvents(todays);
                        const showNow = isSameDay(day, new Date());
                        const now = new Date();
                        const nowTop = (now.getHours() + now.getMinutes() / 60) * SLOT_HEIGHT;
                        return (
                          <div
                            key={idx}
                            className={`relative border-r ${showNow ? 'gc-today-col' : ''} ${(day.getDay()===0||day.getDay()===6) ? 'gc-weekend' : ''}`}
                            style={{ height: HOURS.length * SLOT_HEIGHT }}
                          >
                            {HOURS.map((h) => (
                              <div key={h} className="relative" style={{ height: SLOT_HEIGHT }}>
                                <div className="gc-grid-line" />
                                <div className="absolute left-0 right-0" style={{ top: HALF_SLOT }}>
                                  <div className="gc-grid-half" />
                                </div>
                              </div>
                            ))}
                            {showNow && (
                              <div className="absolute left-0 right-0" style={{ top: nowTop }}>
                                <div className="h-px bg-red-500" />
                                <div className="w-2 h-2 bg-red-500 rounded-full -mt-1 -ml-1" />
                                    </div>
                                  )}
                            {positioned.map((m) => {
                              const { start, end } = parseMeetingDate(m);
                              const { top, height } = getTopAndHeight(start, end);
                              return (
                                <div
                                  key={m._id}
                                  onClick={() => handleMeetingClick(m)}
                                  className="absolute rounded-md gc-event cursor-pointer border border-white/60 shadow-sm"
                                  style={{ top, height, left: `${m._posLeft}%`, width: `${m._posWidth}%`, background: getStatusGradient(m.status), color: 'white', padding: '6px' }}
                                  title={`${m.topic}${m.project_id?.topic ? ` • ${m.project_id.topic}` : ''} — ${formatTime(m.start_time)} - ${formatTime(m.end_time)}`}
                                >
                                  <div className="text-xs font-semibold truncate">{m.topic}</div>
                                  <div className="text-[10px] opacity-90 truncate">{formatTime(m.start_time)} - {formatTime(m.end_time)}</div>
                                  {m.project_id?.topic && (
                                    <div className="text-[10px] opacity-90 truncate">{m.project_id.topic}</div>
                                  )}
                                  </div>
                              );
                            })}
                                    </div>
                        );
                      })}
                                    </div>
                  </>
                ) : (
                  // Day view
                  <>
                    {/* Header row */}
                    <div className="grid sticky top-0 z-10" style={{ gridTemplateColumns: '80px 1fr' }}>
                      <div className="bg-white border-b border-r h-12" />
                      <div className="bg-white border-b h-12 flex items-center px-4">
                        <span className="text-sm font-semibold">
                          {new Date(currentMonth).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                        </span>
                                </div>
                              </div>
                    {/* All-day row */}
                    <div className="grid" style={{ gridTemplateColumns: '80px 1fr' }}>
                      <div className="border-r h-10 flex items-center justify-end pr-2 text-xs text-gray-500">All day</div>
                      <div className="border-r h-10 relative">
                        {(meetingsData?.allMeetings || [])
                          .filter(m => isAllDay(m) && isSameDay(parseMeetingDate(m).start, currentMonth))
                          .map(m => (
                            <div key={m._id} onClick={() => handleMeetingClick(m)} className="absolute left-1 right-1 top-1 bottom-1 text-white rounded px-2 text-xs flex items-center truncate" style={{ background: getStatusGradient(m.status) }} title={`${m.topic}${m.project_id?.topic ? ` • ${m.project_id.topic}` : ''}`}>
                              <div className="gc-all-day-chip truncate">
                                {m.topic}
                                {m.project_id?.topic ? ` • ${m.project_id.topic}` : ''}
                              </div>
                            </div>
                            ))}
                          </div>
                        </div>
                    {/* Grid */}
                    <div className="grid" style={{ gridTemplateColumns: '80px 1fr' }}>
                      <div className="relative border-r">
                        {HOURS.map((h) => (
                          <div key={h} style={{ height: SLOT_HEIGHT }} className="relative">
                            <div className="gc-grid-line text-right pr-2 text-xs text-gray-500">
                              {h === 0 ? '' : `${h}:00`}
                            </div>
                            <div className="absolute left-0 right-0" style={{ top: HALF_SLOT }}>
                              <div className="gc-grid-half" />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="relative border-r" style={{ height: HOURS.length * SLOT_HEIGHT }}>
                        {HOURS.map((h) => (
                          <div key={h} className="relative" style={{ height: SLOT_HEIGHT }}>
                            <div className="gc-grid-line" />
                            <div className="absolute left-0 right-0" style={{ top: HALF_SLOT }}>
                              <div className="gc-grid-half" />
                            </div>
                          </div>
                        ))}
                        {isSameDay(currentMonth, new Date()) && (
                          <div className="absolute left-0 right-0" style={{ top: (new Date().getHours() + new Date().getMinutes() / 60) * SLOT_HEIGHT }}>
                            <div className="h-px bg-red-500" />
                            <div className="w-2 h-2 bg-red-500 rounded-full -mt-1 -ml-1" />
                          </div>
                        )}
                        {layoutDayEvents((meetingsData?.allMeetings || []).filter(m => !isAllDay(m) && isSameDay(parseMeetingDate(m).start, currentMonth))).map(m => {
                          const { start, end } = parseMeetingDate(m);
                          const { top, height } = getTopAndHeight(start, end);
                          return (
                            <div key={m._id} onClick={() => handleMeetingClick(m)} className="absolute rounded-md gc-event cursor-pointer border border-white/60 shadow-sm" style={{ top, height, left: `${m._posLeft}%`, width: `${m._posWidth}%`, background: getStatusGradient(m.status), color: 'white', padding: '6px' }} title={`${m.topic}${m.project_id?.topic ? ` • ${m.project_id.topic}` : ''} — ${formatTime(m.start_time)} - ${formatTime(m.end_time)}`}>
                              <div className="text-xs font-semibold truncate">{m.topic}</div>
                              <div className="text-[10px] opacity-90 truncate">{formatTime(m.start_time)} - {formatTime(m.end_time)}</div>
                              {m.project_id?.topic && (
                                <div className="text-[10px] opacity-90 truncate">{m.project_id.topic}</div>
                              )}
                      </div>
                    );
                  })}
                      </div>
                    </div>
                  </>
                )}
                </div>
              </CardContent>
            </Card>
          )}
          </Box>
        </div>
      </main>

      {/* Create Meeting Modal */}
      <CreateMeetingModal
        open={createMeetingOpen}
        onClose={() => setCreateMeetingOpen(false)}
        onSuccess={() => {
          // Reload data after successful creation
          window.location.reload();
        }}
      />

      {/* Edit Meeting Modal */}
      <EditMeetingModal
        open={editMeetingOpen}
        onClose={() => {
          setEditMeetingOpen(false);
          setSelectedMeeting(null);
        }}
        onSuccess={() => {
          // Reload data after successful update
          window.location.reload();
        }}
        meeting={selectedMeeting}
      />

      {/* Meeting Detail Modal */}
      <Dialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
                    borderRadius: 3,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        {selectedMeeting && (
          <>
            <DialogTitle sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              p: 3,
              position: 'relative'
            }}>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box display="flex" alignItems="center" gap={2}>
                  <CalendarIcon sx={{ fontSize: 32 }} />
                  <Box>
                    <Typography variant="h5" fontWeight="bold">
                      {selectedMeeting.topic}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9 }}>
                      {selectedMeeting.project_id?.topic || 'Dự án'}
                          </Typography>
                  </Box>
                </Box>
                <IconButton
                  onClick={() => setDetailDialogOpen(false)}
                  sx={{
                    color: 'white',
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  <CloseIcon />
                </IconButton>
              </Box>
            </DialogTitle>

            <DialogContent sx={{ p: 3 }}>
              <div className="space-y-4 mt-2">
                {/* Status & Type */}
                <div className="flex gap-2">
                            <Chip
                    label={getStatusText(selectedMeeting.status)}
                    color={getStatusColor(selectedMeeting.status) as any}
                              size="medium"
                              className="font-semibold"
                            />
                            <Chip
                    label={getMeetingTypeText(selectedMeeting.meeting_type)}
                              variant="outlined"
                              size="medium"
                              color="primary"
                            />
                        </div>
                        
                <Divider />

                {/* Date & Time */}
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Typography variant="body2" color="primary" fontWeight="bold" className="mb-1">
                        📅 Ngày họp
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formatDate(selectedMeeting.meeting_date)}
                      </Typography>
                          </div>
                    <div>
                      <Typography variant="body2" color="primary" fontWeight="bold" className="mb-1">
                        ⏰ Thời gian
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {formatTime(selectedMeeting.start_time)} - {formatTime(selectedMeeting.end_time)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ({selectedMeeting.duration} phút)
                      </Typography>
                          </div>
                        </div>
                      </div>

                {/* Location */}
                <Paper elevation={1} sx={{ p: 2, backgroundColor: '#f8fafc' }}>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <LocationIcon color="success" />
                    <Typography variant="body2" fontWeight="bold" color="text.secondary">
                      Địa điểm
                    </Typography>
                  </Box>
                  <Typography variant="body1">{selectedMeeting.location}</Typography>
                </Paper>

                {/* People */}
                <Paper elevation={1} sx={{ p: 2, backgroundColor: '#f8fafc' }}>
                  <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <PersonIcon color="primary" />
                    <Typography variant="body2" fontWeight="bold" color="text.secondary">
                      Người tham gia
                    </Typography>
                  </Box>
                        <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Chip
                        icon={<PersonIcon />}
                        label={`Mentor: ${selectedMeeting.mentor_id?.full_name || 'N/A'}`}
                        color="primary"
                        variant="outlined"
                        size="small"
                      />
                          </div>
                    <div className="flex items-center gap-2">
                      <Chip
                        icon={<PersonIcon />}
                        label={`Yêu cầu bởi: ${selectedMeeting.requested_by?.full_name || 'N/A'}`}
                        color="secondary"
                        variant="outlined"
                        size="small"
                      />
                        </div>
                      </div>
                </Paper>

                      {/* Description */}
                {selectedMeeting.description && (
                  <Paper elevation={1} sx={{ p: 2, backgroundColor: '#f8fafc' }}>
                    <Typography variant="body2" fontWeight="bold" color="text.secondary" className="mb-2">
                      📝 Mô tả
                    </Typography>
                    <Typography variant="body2" className="italic">
                      {selectedMeeting.description}
                          </Typography>
                  </Paper>
                      )}

                      {/* Google Meet Link */}
                {selectedMeeting.google_meet_link && (
                          <Button
                            variant="contained"
                    fullWidth
                            startIcon={<VideoCallIcon />}
                    href={selectedMeeting.google_meet_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                              color: 'white',
                              fontWeight: 'bold',
                              py: 1.5,
                              '&:hover': {
                                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                              }
                            }}
                          >
                            🎥 Tham gia Google Meet
                          </Button>
                      )}

                      {/* Reject Reason */}
                {selectedMeeting.reject_reason && (
                  <Alert severity="error">
                    <Typography variant="body2">
                      <strong>Lý do từ chối:</strong> {selectedMeeting.reject_reason}
                    </Typography>
                        </Alert>
                      )}
                    </div>
            </DialogContent>

            <DialogActions sx={{ p: 3, backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
              <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
                <Box>
                  {/* Creator Actions - Edit & Delete (only when pending) */}
                  {canEditDeleteMeeting(selectedMeeting) && (
                    <>
                      <Button
                        variant="outlined"
                        startIcon={<EditIcon />}
                        onClick={() => handleEditMeeting(selectedMeeting)}
                        sx={{
                          mr: 1,
                          borderColor: '#7b68ee',
                          color: '#7b68ee',
                          '&:hover': {
                            borderColor: '#6a5acd',
                            backgroundColor: '#f3f0ff',
                          }
                        }}
                      >
                        Sửa
                      </Button>
                      <Button
                        variant="outlined"
                        startIcon={<DeleteIcon />}
                        onClick={() => {
                          handleDeleteMeeting(selectedMeeting._id);
                          setDetailDialogOpen(false);
                        }}
                        sx={{
                          mr: 1,
                          borderColor: '#ef4444',
                          color: '#ef4444',
                          '&:hover': {
                            borderColor: '#dc2626',
                            backgroundColor: '#fef2f2',
                          }
                        }}
                      >
                        Xóa
                      </Button>
                    </>
                  )}
                </Box>
                
                <Box display="flex" gap={1}>
                  {/* Mentor Actions */}
                  {canManageMeeting(selectedMeeting) && selectedMeeting.status === 'pending' && (
                    <>
                      <Button
                        variant="contained"
                        startIcon={<CheckIcon />}
                        onClick={() => {
                          handleMeetingStatusUpdate(selectedMeeting._id, 'approved');
                          setDetailDialogOpen(false);
                        }}
                        sx={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          }
                        }}
                      >
                        Chấp nhận
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<CancelIcon />}
                        onClick={() => {
                          const reason = prompt('Nhập lý do từ chối (tùy chọn):');
                          handleMeetingStatusUpdate(selectedMeeting._id, 'rejected', reason || 'Không có lý do cụ thể');
                          setDetailDialogOpen(false);
                        }}
                        sx={{
                          background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                          '&:hover': {
                            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                          }
                        }}
                      >
                        Từ chối
                      </Button>
                    </>
                  )}
                  <Button
                    onClick={() => setDetailDialogOpen(false)}
                    variant="outlined"
                  >
                    Đóng
                  </Button>
                </Box>
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>

  {/* Pending Requests for Mentor */}
  <Dialog
    open={pendingDialogOpen}
    onClose={() => setPendingDialogOpen(false)}
    maxWidth="md"
    fullWidth
    PaperProps={{
      sx: {
        borderRadius: 4,
        overflow: 'hidden',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }
    }}
  >
    <DialogTitle sx={{
      p: 3,
      fontWeight: 'bold',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>Yêu cầu cuộc họp chờ duyệt</DialogTitle>
    <DialogContent dividers sx={{ p: 0 }}>
      <div className="space-y-0 divide-y">
        {(meetingsData?.allMeetings || [])
          .filter(m => m.status === 'pending' && m.mentor_id?._id === currentUserId)
          .map((m) => (
            <div key={m._id} className="p-3 md:p-4 hover:bg-gray-50 transition-colors flex items-start justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Chờ duyệt</span>
                  <span className="text-xs text-gray-500">{m.project_id?.code || ''}</span>
                </div>
                <div className="font-semibold truncate text-gray-900">{m.topic}</div>
                <div className="text-sm text-gray-600 truncate">
                  {formatDate(m.meeting_date)} • {formatTime(m.start_time)} - {formatTime(m.end_time)} • {m.project_id?.topic || 'Dự án'}
                </div>
                {m.description && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">{m.description}</div>
                )}
              </div>
              <div className="flex flex-shrink-0 gap-2 ml-3">
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<CheckIcon />}
                  onClick={async () => {
                    await handleMeetingStatusUpdate(m._id, 'approved');
                    setPendingDialogOpen(false);
                  }}
                  sx={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    '&:hover': { background: 'linear-gradient(135deg, #059669 0%, #047857 100%)' }
                  }}
                >
                  Duyệt
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={async () => {
                    const reason = prompt('Lý do từ chối (tùy chọn):');
                    await handleMeetingStatusUpdate(m._id, 'rejected', reason || '');
                    setPendingDialogOpen(false);
                  }}
                >
                  Từ chối
                </Button>
              </div>
            </div>
          ))}
        {((meetingsData?.allMeetings || []).filter(m => m.status === 'pending' && m.mentor_id?._id === currentUserId).length === 0) && (
          <div className="p-6">
            <Alert severity="info">Không có yêu cầu nào đang chờ duyệt.</Alert>
          </div>
        )}
      </div>
    </DialogContent>
    <DialogActions sx={{ p: 2.5, backgroundColor: '#f8fafc' }}>
      <Button onClick={() => setPendingDialogOpen(false)} variant="outlined">Đóng</Button>
    </DialogActions>
      </Dialog>
    </div>
  );
}
