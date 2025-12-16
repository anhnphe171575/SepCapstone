"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert,
  CircularProgress,
  Box,
  Card,
  CardContent,
  Divider,
  Stepper,
  Step,
  StepLabel,
  IconButton,
} from "@mui/material";
import {
  CalendarToday as CalendarIcon,
  AccessTime as TimeIcon,
  LocationOn as LocationIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Event as EventIcon,
  Description as DescriptionIcon,
  Settings as SettingsIcon,
  Link as LinkIcon,
  School as SchoolIcon,
} from "@mui/icons-material";
import { DatePicker, TimePicker } from "@mui/x-date-pickers";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { vi } from "date-fns/locale";
import axiosInstance from "../../ultis/axios";
import { toast } from "sonner";

interface Project {
  _id: string;
  topic: string;
  code: string;
  created_by?: {
    _id: string;
    full_name: string;
  };
  supervisor_id?: {
    _id: string;
    full_name: string;
    email?: string;
  };
  semester?: string;
}


interface CreateMeetingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateMeetingModal({
  open,
  onClose,
  onSuccess,
}: CreateMeetingModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [meetingDate, setMeetingDate] = useState<Date | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [meetingType, setMeetingType] = useState("regular");
  const [location, setLocation] = useState("Online");
  const [googleMeetLink, setGoogleMeetLink] = useState("");

  // Data
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentSemester, setCurrentSemester] = useState<string>("");

  // Load user projects
  useEffect(() => {
    if (open) {
      loadUserProjects();
    }
  }, [open]);


  const loadUserProjects = async () => {
    try {
      setLoadingProjects(true);
      
      // Load user info from API and current semester in parallel
      const [userResponse, semesterResponse] = await Promise.all([
        axiosInstance.get('/api/users/me'),
        axiosInstance.get('/api/projects/semester/current')
      ]);

      const userData = userResponse.data;
      setCurrentUser(userData);

      const semesterFromApi = semesterResponse?.data?.currentSemester || semesterResponse?.data?.semesterInfo?.semester;
      if (semesterFromApi) {
        setCurrentSemester(semesterFromApi);
      }
      
      let apiEndpoint = "/api/projects";
      
      // Nếu là giảng viên hướng dẫn (role 4), lấy projects mà user là supervisor
      if (userData?.role === 4) {
        apiEndpoint = `/api/projects/supervisor/${userData._id}`;
      }
      
      const response = await axiosInstance.get(apiEndpoint);
      console.log("Projects response:", response.data);
      
      // Chuẩn hóa danh sách projects từ các cấu trúc trả về khác nhau
      const rawProjects: Project[] = (response.data?.data || response.data?.projects || []) as Project[];

      // Lọc theo học kì hiện tại nếu có thông tin (so sánh không phân biệt hoa/thường)
      const normalizeSemester = (s?: string) => (s || '').toUpperCase().replace(/\s+/g, '');
      const filteredProjects = semesterFromApi
        ? rawProjects.filter((p) => normalizeSemester(p?.semester) === normalizeSemester(semesterFromApi))
        : rawProjects;

      setProjects(filteredProjects);

      // Nếu là sinh viên (khác role 4), cố định project (sinh viên chỉ có 1 đồ án/kì)
      if (userData?.role !== 4) {
        if (filteredProjects.length === 1) {
          setSelectedProject(filteredProjects[0]);
        } else if (filteredProjects.length > 1) {
          // Phòng hờ dữ liệu không chuẩn, chọn project đầu tiên trong kì
          setSelectedProject(filteredProjects[0]);
        } else {
          setSelectedProject(null);
        }
      }

      console.log(`✅ Loaded ${filteredProjects.length} current-semester projects for user (role: ${userData?.role})`);
    } catch (error: any) {
      console.error("Error loading projects:", error);
      setError("Không thể tải danh sách dự án");
    } finally {
      setLoadingProjects(false);
    }
  };


  const handleSubmit = async () => {
    if (!selectedProject) {
      setError("Vui lòng chọn dự án");
      return;
    }

    if (!topic.trim()) {
      setError("Vui lòng nhập chủ đề cuộc họp");
      return;
    }

    if (!meetingDate) {
      setError("Vui lòng chọn ngày họp");
      return;
    }

    if (!startTime || !endTime) {
      setError("Vui lòng chọn thời gian bắt đầu và kết thúc");
      return;
    }

    if (startTime >= endTime) {
      setError("Thời gian kết thúc phải sau thời gian bắt đầu");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const formatLocalDate = (d: Date) => {
        const y = d.getFullYear();
        const m = `${d.getMonth() + 1}`.padStart(2, '0');
        const day = `${d.getDate()}`.padStart(2, '0');
        return `${y}-${m}-${day}`; // local date, tránh lệch múi giờ
      };

      const meetingData = {
        topic: topic.trim(),
        description: description.trim(),
        meeting_date: formatLocalDate(meetingDate),
        start_time: startTime.toTimeString().slice(0, 5),
        end_time: endTime.toTimeString().slice(0, 5),
        meeting_type: meetingType,
        location: location.trim(),
        google_meet_link: googleMeetLink.trim(),
      };

      const response = await axiosInstance.post(
        `/api/meetings/project/${selectedProject._id}`,
        meetingData
      );

      const mentorName = response.data.mentor_info?.name || 'Người tạo';
      
      // Hiển thị message khác nhau tùy theo role
      let statusMessage = "";
      if (currentUser?.role === 4) {
        statusMessage = " (Trạng thái: Đã xác nhận)";
      } else {
        statusMessage = " (Trạng thái: Chờ xác nhận)";
      }
      
      toast.success(`${response.data.message || "Tạo lịch họp thành công!"} Mentor: ${mentorName}${statusMessage}`);
      
      // Reset form
      resetForm();
      
      // Call success callback
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);

    } catch (error: any) {
      console.error("Error creating meeting:", error);
      const errorMessage = error?.response?.data?.message || "Có lỗi xảy ra khi tạo lịch họp";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedProject(null);
    setTopic("");
    setDescription("");
    setMeetingDate(null);
    setStartTime(null);
    setEndTime(null);
    setMeetingType("regular");
    setLocation("Online");
    setGoogleMeetLink("");
    setError(null);
    setActiveStep(0);
  };

  const steps = [
    { label: "Thông tin cơ bản", icon: <EventIcon /> },
    { label: "Thời gian & Địa điểm", icon: <TimeIcon /> },
  ];

  const handleNext = () => {
    if (activeStep === 0) {
      if (!selectedProject) {
        setError("Vui lòng chọn dự án");
        return;
      }
      if (!topic.trim()) {
        setError("Vui lòng nhập chủ đề cuộc họp");
        return;
      }
    } else if (activeStep === 1) {
      if (!meetingDate) {
        setError("Vui lòng chọn ngày họp");
        return;
      }
      if (!startTime || !endTime) {
        setError("Vui lòng chọn thời gian bắt đầu và kết thúc");
        return;
      }
      if (startTime >= endTime) {
        setError("Thời gian kết thúc phải sau thời gian bắt đầu");
        return;
      }
    }
    setError(null);
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Project Selection */}
            <Card elevation={2} sx={{ p: 2, backgroundColor: '#f8fafc' }}>
              <Box display="flex" alignItems="center" mb={2}>
                <SchoolIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight="bold" color="primary">
                  Dự án
                </Typography>
              </Box>
              <FormControl fullWidth required>
                <Select
                  value={selectedProject?._id || ""}
                  onChange={(e) => {
                    const project = projects.find(p => p._id === e.target.value);
                    setSelectedProject(project || null);
                  }}
                  disabled={loadingProjects || (!!currentUser && currentUser.role !== 4)}
                  sx={{ backgroundColor: 'white' }}
                  displayEmpty
                >
                  {projects.length === 0 ? (
                    <MenuItem disabled>
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        {loadingProjects ? "Đang tải dự án..." : (currentSemester ? `Không có dự án trong học kì ${currentSemester}` : "Bạn chưa tham gia dự án nào")}
                      </Typography>
                    </MenuItem>
                  ) : (
                    projects.map((project) => {
                      // Xác định vai trò của user trong dự án
                      const currentUserId = currentUser?._id;
                      
                      let userRole = "Thành viên";
                      if (project.created_by?._id === currentUserId) {
                        userRole = "Chủ dự án";
                      } else if (project.supervisor_id?._id === currentUserId) {
                        userRole = "Giảng viên hướng dẫn";
                      }
                      
                      return (
                        <MenuItem key={project._id} value={project._id}>
                          <Box sx={{ width: '100%' }}>
                            <Typography variant="body1" fontWeight="medium">
                              {project.topic}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Typography variant="caption" color="text.secondary">
                                {project.code}{project.semester ? ` • ${project.semester}` : ''}
                              </Typography>
                              <Typography variant="caption" color="primary" fontWeight="medium">
                                {userRole}
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                      );
                    })
                  )}
                </Select>
              </FormControl>
              {currentUser && currentUser.role !== 4 && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  Sinh viên chỉ có 1 đồ án trong học kì hiện tại{currentSemester ? ` (${currentSemester})` : ''}. Dự án đã được cố định.
                </Typography>
              )}
            
            </Card>

            {/* Topic */}
            <Card elevation={2} sx={{ p: 2, backgroundColor: '#f8fafc' }}>
              <Box display="flex" alignItems="center" mb={2}>
                <EventIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight="bold" color="primary">
                  Thông tin cuộc họp
                </Typography>
              </Box>
              <TextField
                fullWidth
                required
                label="Chủ đề cuộc họp"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Nhập chủ đề cuộc họp..."
                disabled={loading}
                sx={{ backgroundColor: 'white', mb: 2 }}
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Mô tả"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả chi tiết về cuộc họp..."
                disabled={loading}
                sx={{ backgroundColor: 'white' }}
              />
            </Card>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Date and Time */}
            <Card elevation={2} sx={{ p: 2, backgroundColor: '#f8fafc' }}>
              <Box display="flex" alignItems="center" mb={2}>
                <TimeIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight="bold" color="primary">
                  Thời gian & Địa điểm
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <DatePicker
                    label="Ngày họp"
                    value={meetingDate}
                    onChange={(newValue) => setMeetingDate(newValue)}
                    minDate={new Date()}
                    disabled={loading}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        sx: { backgroundColor: 'white' }
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TimePicker
                    label="Bắt đầu"
                    value={startTime}
                    onChange={(newValue) => setStartTime(newValue)}
                    disabled={loading}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        sx: { backgroundColor: 'white' }
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <TimePicker
                    label="Kết thúc"
                    value={endTime}
                    onChange={(newValue) => setEndTime(newValue)}
                    disabled={loading}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        sx: { backgroundColor: 'white' }
                      },
                    }}
                  />
                </Box>
              </Box>
            </Card>

            {/* Meeting Settings */}
            <Card elevation={2} sx={{ p: 2, backgroundColor: '#f8fafc' }}>
              <Box display="flex" alignItems="center" mb={2}>
                <SettingsIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h6" fontWeight="bold" color="primary">
                  Cài đặt cuộc họp
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <FormControl fullWidth>
                      <InputLabel>Loại cuộc họp</InputLabel>
                      <Select
                        value={meetingType}
                        onChange={(e) => setMeetingType(e.target.value)}
                        disabled={loading}
                        sx={{ backgroundColor: 'white' }}
                      >
                        <MenuItem value="regular">Thường</MenuItem>
                        <MenuItem value="urgent">Khẩn cấp</MenuItem>
                        <MenuItem value="review">Báo cáo</MenuItem>

                      </Select>
                    </FormControl>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label="Địa điểm"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Online, Phòng họp A1, ..."
                      disabled={loading}
                      sx={{ backgroundColor: 'white' }}
                    />
                  </Box>
                </Box>
                <TextField
                  fullWidth
                  label="Google Meet Link"
                  value={googleMeetLink}
                  onChange={(e) => setGoogleMeetLink(e.target.value)}
                  placeholder="https://meet.google.com/..."
                  disabled={loading}
                  sx={{ backgroundColor: 'white' }}
                  InputProps={{
                    startAdornment: <LinkIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  }}
                />
              </Box>
            </Card>
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={vi}>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: { 
            minHeight: "700px",
            borderRadius: 3,
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }
        }}
      >
        <DialogTitle sx={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          p: 3,
          position: 'relative'
        }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <CalendarIcon sx={{ mr: 2, fontSize: 28 }} />
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  Tạo lịch họp mới
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Thiết lập cuộc họp cho dự án của bạn
                </Typography>
              </Box>
            </Box>
            <IconButton 
              onClick={handleClose} 
              disabled={loading}
              sx={{ 
                color: 'white',
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 0 }}>
          {/* Stepper */}
          <Box sx={{ px: 3, pt: 3, pb: 2 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((step, index) => (
                <Step key={step.label}>
                  <StepLabel
                    StepIconComponent={() => (
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: '50%',
                          backgroundColor: index <= activeStep ? 'primary.main' : 'grey.300',
                          color: index <= activeStep ? 'white' : 'grey.600',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem'
                        }}
                      >
                        {index < activeStep ? <CheckIcon /> : step.icon}
                      </Box>
                    )}
                  >
                    <Typography variant="body2" fontWeight="medium">
                      {step.label}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>

          <Divider />

          {/* Content */}
          <Box sx={{ p: 3 }}>
            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 3, borderRadius: 2 }}
                action={
                  <IconButton
                    size="small"
                    onClick={() => setError(null)}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                }
              >
                {error}
              </Alert>
            )}

            {renderStepContent(activeStep)}
          </Box>
        </DialogContent>

        <DialogActions sx={{ 
          p: 3, 
          backgroundColor: '#f8fafc',
          borderTop: '1px solid #e2e8f0'
        }}>
          <Box display="flex" justifyContent="space-between" width="100%">
            <Button
              onClick={handleBack}
              disabled={activeStep === 0 || loading}
              variant="outlined"
              sx={{ borderRadius: 2 }}
            >
              Quay lại
            </Button>
            
            <Box display="flex" gap={2}>
              <Button
                onClick={handleClose}
                disabled={loading}
                variant="outlined"
                sx={{ borderRadius: 2 }}
              >
                Hủy
              </Button>
              
              {activeStep === steps.length - 1 ? (
                <Button
                  onClick={handleSubmit}
                  disabled={loading || !selectedProject || !topic.trim() || !meetingDate || !startTime || !endTime}
                  variant="contained"
                  sx={{ 
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    }
                  }}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CalendarIcon />}
                >
                  {loading ? "Đang tạo..." : "Tạo lịch họp"}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  variant="contained"
                  sx={{ 
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
                    }
                  }}
                >
                  Tiếp theo
                </Button>
              )}
            </Box>
          </Box>
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
}
