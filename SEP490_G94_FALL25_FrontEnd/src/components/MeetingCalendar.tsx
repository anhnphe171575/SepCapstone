"use client";

import { useState, useEffect } from "react";
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Fab,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
} from "@mui/material";
import { toast } from "sonner";
import {
  Add as AddIcon,
  CalendarToday as CalendarIcon,
  VideoCall as VideoCallIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  AccessTime as AccessTimeIcon,
  Group as GroupIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { DatePicker, TimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { vi } from "date-fns/locale";
import axiosInstance from "../../ultis/axios";

type Meeting = {
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
  project_id?: {
    _id: string;
    topic: string;
    code: string;
  };
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
  attendees: Array<{
    _id: string;
    user_id: {
      _id: string;
      full_name: string;
      email: string;
      avatar: string;
    } | null;
    status: "invited" | "accepted" | "declined" | "tentative";
    response_date?: string;
  }>;
  created_by: {
    _id: string;
    full_name: string;
    email: string;
    avatar: string;
  };
  createAt: string;
  updateAt: string;
};

interface MeetingCalendarProps {
  projectId: string;
  currentUserId: string;
  userRole: string;
  isTeamLeader: boolean;
  isMentor: boolean;
}

export default function MeetingCalendar({
  projectId,
  currentUserId,
  userRole,
  isTeamLeader,
  isMentor,
}: MeetingCalendarProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    topic: "",
    description: "",
    meeting_date: new Date(),
    start_time: "",
    end_time: "",
    meeting_type: "regular" as const,
    location: "Online",
    google_meet_link: "",
    attendees: [] as string[],
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  // Calendar UI helpers
  const SLOT_HEIGHT = 48; // px per hour row
  const HOURS = Array.from({ length: 24 }, (_, i) => i);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay(); // 0..6 (Sun..Sat)
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const startOfWeek = getStartOfWeek(currentMonth);
  const weekDays: Date[] = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return d;
  });

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const parseMeetingDate = (m: Meeting) => {
    const md: any = (m as any).meeting_date;
    let base: Date;
    if (md instanceof Date) {
      base = md;
    } else if (typeof md === 'string' && md.includes('T')) {
      const iso = new Date(md);
      base = new Date(iso.getFullYear(), iso.getMonth(), iso.getDate());
    } else if (typeof md === 'string') {
      const [y, mo, da] = md.split('-').map((n) => parseInt(n, 10));
      base = new Date(y, (mo || 1) - 1, da || 1);
    } else {
      base = new Date();
    }
    const [sh, sm] = m.start_time.split(':').map((n) => parseInt(n, 10));
    const [eh, em] = m.end_time.split(':').map((n) => parseInt(n, 10));
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

  // Load meetings
  const loadMeetings = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/meetings/project/${projectId}`, {
        params: {
          month: currentMonth.getMonth() + 1,
          year: currentMonth.getFullYear(),
        },
      });
      setMeetings(response.data.data);
    } catch (error: any) {
      setError(error?.response?.data?.message || "Không thể tải danh sách lịch họp");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMeetings();
  }, [projectId, currentMonth]);

  // Create meeting
  const handleCreateMeeting = async () => {
    try {
      setSubmitting(true);
      const formatLocalDate = (d: Date) => {
        const y = d.getFullYear();
        const m = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        return `${y}-${m}-${day}`;
      };
      const response = await axiosInstance.post(`/api/meetings/project/${projectId}`, {
        ...formData,
        meeting_date: formatLocalDate(formData.meeting_date),
      });
      
      setMeetings([...meetings, response.data.data]);
      setOpenCreateDialog(false);
      toast.success(response.data.message || "Tạo lịch họp thành công!");
      resetForm();
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || "Không thể tạo lịch họp";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Update meeting status
  const handleUpdateStatus = async (meetingId: string, status: string, rejectReason?: string) => {
    try {
      const response = await axiosInstance.put(`/api/meetings/${meetingId}/status`, {
        status,
        reject_reason: rejectReason,
      });
      
      setMeetings(meetings.map(m => 
        m._id === meetingId ? response.data.data : m
      ));
      toast.success(`Lịch họp đã được ${status === 'approved' ? 'xác nhận' : 'từ chối'}`);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || "Không thể cập nhật trạng thái";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Delete meeting
  const handleDeleteMeeting = async (meetingId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa lịch họp này?")) return;
    
    try {
      await axiosInstance.delete(`/api/meetings/${meetingId}`);
      setMeetings(meetings.filter(m => m._id !== meetingId));
      toast.success("Lịch họp đã được xóa");
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || "Không thể xóa lịch họp";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      topic: "",
      description: "",
      meeting_date: new Date(),
      start_time: "",
      end_time: "",
      meeting_type: "regular",
      location: "Online",
      google_meet_link: "",
      attendees: [],
    });
  };

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
      case "completed": return "Đã hoàn thành";
      case "cancelled": return "Đã hủy";
      default: return status;
    }
  };

  // Get meeting type text
  const getMeetingTypeText = (type: string) => {
    switch (type) {
      case "regular": return "Thường";
      case "urgent": return "Khẩn cấp";
      case "review": return "Review";
      default: return type;
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

  // Check if user can create meeting - Tất cả thành viên đều có thể tạo lịch họp
  const canCreateMeeting = true; // Tất cả thành viên đều có thể tạo lịch họp

  // Check if user can manage meeting
  const canManageMeeting = (meeting: Meeting) => {
    return isMentor || 
           meeting.created_by._id === currentUserId ||
           meeting.requested_by._id === currentUserId;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <Typography variant="h4" className="font-bold">
            Lịch họp dự án
          </Typography>
          <div className="flex gap-2">
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadMeetings}
              disabled={loading}
            >
              Làm mới
            </Button>
            {canCreateMeeting && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenCreateDialog(true)}
              >
                Tạo lịch họp
              </Button>
            )}
          </div>
        </div>

        {/* Error Messages */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Calendar Navigation + Week Grid */}
        <Card>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outlined" onClick={goToPrevWeek}>‹</Button>
                <Button variant="outlined" onClick={goToToday}>Today</Button>
                <Button variant="outlined" onClick={goToNextWeek}>›</Button>
                <Typography variant="h6" className="ml-4">
                  {startOfWeek.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  {" – "}
                  {new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + 6)
                    .toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Typography>
              </div>
              <div className="flex gap-2">
                <Button variant="outlined" onClick={loadMeetings} disabled={loading}>Refresh</Button>
                {canCreateMeeting && (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreateDialog(true)}>
                    Tạo lịch họp
                </Button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8"><CircularProgress /></div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                {/* Header row */}
                <div className="grid" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
                  <div className="bg-gray-50 border-b border-r h-12" />
                  {weekDays.map((d, idx) => (
                    <div key={idx} className="bg-gray-50 border-b text-center h-12 flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs text-gray-500">{dayNames[d.getDay()]}</span>
                        <span className={`text-sm font-semibold ${isSameDay(d, new Date()) ? 'text-blue-600' : 'text-gray-900'}`}>{d.getDate()}</span>
                            </div>
                          </div>
                  ))}
                        </div>

                {/* Grid */}
                <div className="grid" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
                  {/* Time gutter */}
                  <div className="relative border-r">
                    {HOURS.map((h) => (
                      <div key={h} className="border-b text-right pr-2 text-xs text-gray-500" style={{ height: SLOT_HEIGHT }}>
                        {h === 0 ? '' : `${h}:00`}
                            </div>
                    ))}
                        </div>

                  {/* Day columns */}
                  {weekDays.map((day, idx) => (
                    <div key={idx} className="relative border-r" style={{ height: HOURS.length * SLOT_HEIGHT }}>
                      {/* Hour lines */}
                      {HOURS.map((h) => (
                        <div key={h} className="border-b border-gray-100" style={{ height: SLOT_HEIGHT }} />
                      ))}
                      {/* Events */}
                      {meetings
                        .filter((m) => {
                          const { start } = parseMeetingDate(m);
                          return isSameDay(start, day);
                        })
                        .map((m) => {
                          const { start, end } = parseMeetingDate(m);
                          const { top, height } = getTopAndHeight(start, end);
                          return (
                            <div
                              key={m._id}
                              className="absolute left-1 right-1 rounded-md shadow-sm cursor-pointer"
                              style={{ top, height, background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)', color: 'white', padding: '6px' }}
                              title={`${m.topic} — ${formatTime(m.start_time)} - ${formatTime(m.end_time)}`}
                            >
                              <div className="text-xs font-semibold truncate">{m.topic}</div>
                              <div className="text-[10px] opacity-90 truncate">{formatTime(m.start_time)} - {formatTime(m.end_time)}</div>
                              <div className="text-[10px] opacity-90 truncate">{m.project_id?.topic || ''}</div>
                          </div>
                          );
                        })}
                    </div>
                ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Meeting Dialog */}
        <Dialog open={openCreateDialog} onClose={() => setOpenCreateDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle className="text-center font-bold text-xl">
            Tạo lịch họp mới
          </DialogTitle>
          <DialogContent>
            <div className="space-y-6 pt-4">
              {/* Thông tin cơ bản */}
              <div className="space-y-4">
                <Typography variant="h6" className="font-semibold text-gray-700 border-b pb-2">
                  📋 Thông tin cuộc họp
                </Typography>
                
                <TextField
                  fullWidth
                  label="Chủ đề cuộc họp"
                  value={formData.topic}
                  onChange={(e) => setFormData({...formData, topic: e.target.value})}
                  required
                  placeholder="Ví dụ: Báo cáo tiến độ tuần 4"
                />
                
                <TextField
                  fullWidth
                  label="Mô tả chi tiết"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  multiline
                  rows={3}
                  placeholder="Mô tả nội dung và mục đích cuộc họp..."
                />
              </div>

              {/* Thời gian và địa điểm */}
              <div className="space-y-4">
                <Typography variant="h6" className="font-semibold text-gray-700 border-b pb-2">
                  📅 Thời gian & Địa điểm
                </Typography>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DatePicker
                    label="Ngày họp"
                    value={formData.meeting_date}
                    onChange={(date) => setFormData({...formData, meeting_date: date || new Date()})}
                    slotProps={{ textField: { fullWidth: true } }}
                  />
                  
                  <FormControl fullWidth>
                    <InputLabel>Loại cuộc họp</InputLabel>
                    <Select
                      value={formData.meeting_type}
                      onChange={(e) => setFormData({...formData, meeting_type: e.target.value as any})}
                    >
                      <MenuItem value="regular">Thường</MenuItem>
                      <MenuItem value="urgent">Khẩn cấp</MenuItem>
                      <MenuItem value="review">Báo cáo tiến độ</MenuItem>
                    </Select>
                  </FormControl>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TextField
                    fullWidth
                    label="Thời gian bắt đầu"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                    InputLabelProps={{ shrink: true }}
                  />
                  
                  <TextField
                    fullWidth
                    label="Thời gian kết thúc"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                    InputLabelProps={{ shrink: true }}
                  />
                </div>

                <TextField
                  fullWidth
                  label="Địa điểm"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder="Online hoặc phòng họp cụ thể"
                />
              </div>

              {/* Thông tin bổ sung */}
              <div className="space-y-4">
                <Typography variant="h6" className="font-semibold text-gray-700 border-b pb-2">
                  🔗 Thông tin bổ sung
                </Typography>
                
                <TextField
                  fullWidth
                  label="Link Google Meet (tùy chọn)"
                  value={formData.google_meet_link}
                  onChange={(e) => setFormData({...formData, google_meet_link: e.target.value})}
                  placeholder="https://meet.google.com/xxx-xxxx-xxx"
                  helperText="Có thể để trống và thêm sau"
                />
              </div>
            </div>
          </DialogContent>
          <DialogActions className="px-6 py-4 bg-gray-50">
            <Button 
              onClick={() => setOpenCreateDialog(false)}
              variant="outlined"
              fullWidth
            >
              Hủy
            </Button>
            <Button
              onClick={handleCreateMeeting}
              variant="contained"
              disabled={submitting || !formData.topic || !formData.start_time || !formData.end_time}
              fullWidth
              className="ml-2"
            >
              {submitting ? <CircularProgress size={20} /> : "Tạo lịch họp"}
            </Button>
          </DialogActions>
        </Dialog>

      </div>
    </LocalizationProvider>
  );
}
