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
  CircularProgress,
  Alert,
  IconButton,
} from "@mui/material";
import {
  SupervisorAccount as SupervisorAccountIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  School as SchoolIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import axiosInstance from "../../ultis/axios";

interface SupervisorDetailProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  supervisorName: string;
}

interface SupervisorDetailData {
  supervisor: {
    _id: string;
    full_name: string;
    email: string;
    phone: string;
    major?: string;
    avatar: string;
    dob?: string;
    address?: Array<{
      street: string;
      city: string;
      postalCode: string;
      contry: string;
    }>;
    role?: {
      _id: string;
      name: string;
      description: string;
    };
  };
}

export default function SupervisorDetail({
  open,
  onClose,
  projectId,
  supervisorName,
}: SupervisorDetailProps) {
  const [data, setData] = useState<SupervisorDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && projectId) {
      fetchSupervisorDetail();
    }
  }, [open, projectId]);

  const fetchSupervisorDetail = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axiosInstance.get(
        `/api/team/${projectId}/supervisor`
      );
      setData(response.data.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể tải thông tin giảng viên hướng dẫn");
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("vi-VN");
  };

  const calculateAge = (dob?: string) => {
    if (!dob) return null;
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
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SupervisorAccountIcon className="text-purple-500" />
          <Typography variant="h6">
            Chi tiết giảng viên hướng dẫn: {supervisorName}
          </Typography>
        </div>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent className="p-0">
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" className="m-4">
            {error}
          </Alert>
        )}

        {data && !loading && (
          <div className="p-6">
            {/* Header Section */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-6 mb-6">
              <div className="flex items-center gap-6">
                <Avatar
                  src={data.supervisor.avatar}
                  className="w-24 h-24 border-4 border-white shadow-lg"
                  sx={{ bgcolor: '#7b68ee' }}
                >
                  {getInitials(data.supervisor.full_name)}
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <Typography variant="h4" className="font-bold text-gray-900 dark:text-white">
                      {data.supervisor.full_name}
                    </Typography>
                    <Chip
                      label="Giảng viên hướng dẫn"
                      sx={{
                        bgcolor: '#7b68ee',
                        color: 'white',
                        fontWeight: 600,
                      }}
                      icon={<SupervisorAccountIcon sx={{ color: 'white !important' }} />}
                      className="shadow-sm"
                    />
                  </div>
                  <Typography variant="h6" className="text-gray-600 dark:text-gray-300 mb-2">
                    {data.supervisor.role?.name || "Giảng viên"}
                  </Typography>
                  {data.supervisor.major && (
                    <Typography variant="body1" className="text-gray-500 dark:text-gray-400">
                      {data.supervisor.major}
                    </Typography>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <Card className="mb-6 shadow-sm">
              <CardContent className="p-6">
                <Typography variant="h6" className="mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-200">
                  <EmailIcon className="text-purple-500" />
                  Thông tin liên hệ
                </Typography>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <EmailIcon className="w-5 h-5 text-purple-500" />
                    <div>
                      <Typography variant="body2" className="text-gray-500 dark:text-gray-400">
                        Email
                      </Typography>
                      <Typography variant="body1" className="font-medium">
                        {data.supervisor.email}
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
                        {data.supervisor.phone || "N/A"}
                      </Typography>
                    </div>
                  </div>
                  {data.supervisor.dob && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <CalendarIcon className="w-5 h-5 text-purple-500" />
                      <div>
                        <Typography variant="body2" className="text-gray-500 dark:text-gray-400">
                          Tuổi
                        </Typography>
                        <Typography variant="body1" className="font-medium">
                          {calculateAge(data.supervisor.dob)} tuổi
                        </Typography>
                      </div>
                    </div>
                  )}
                  {data.supervisor.address && data.supervisor.address.length > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg md:col-span-2 lg:col-span-1">
                      <LocationIcon className="w-5 h-5 text-orange-500" />
                      <div>
                        <Typography variant="body2" className="text-gray-500 dark:text-gray-400">
                          Địa chỉ
                        </Typography>
                        <Typography variant="body1" className="font-medium">
                          {data.supervisor.address[0].city}, {data.supervisor.address[0].contry}
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

