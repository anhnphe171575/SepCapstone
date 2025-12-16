"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Typography,
  Alert,
  Box,
  Avatar,
  Divider,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  ArrowBack as ArrowBackIcon,
  Login as LoginIcon,
  Group as GroupIcon,
  Person as PersonIcon,
} from "@mui/icons-material";

type TeamData = {
  _id: string;
  name: string;
  team_code: string;
  project_id: {
    _id: string;
    topic: string;
    code: string;
  };
};

type UserData = {
  _id: string;
  full_name: string;
  email: string;
};

export default function TeamJoinSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [team, setTeam] = useState<TeamData | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Lấy dữ liệu từ URL params hoặc localStorage
    const teamData = searchParams.get('team');
    const userData = searchParams.get('user');
    
    if (teamData && userData) {
      try {
        setTeam(JSON.parse(decodeURIComponent(teamData)));
        setUser(JSON.parse(decodeURIComponent(userData)));
      } catch (e) {
        setError('Dữ liệu không hợp lệ');
      }
    } else {
      setError('Không tìm thấy thông tin team');
    }
    
    setLoading(false);
  }, [searchParams]);

  const handleGoToLogin = () => {
    router.push('/login');
  };

  const handleGoBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <Typography variant="body1" color="text.secondary">
            Đang xử lý...
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {error ? (
          <Card className="shadow-lg">
            <CardContent className="text-center py-12">
              <Alert severity="error" className="mb-4">
                {error}
              </Alert>
              <Button
                variant="contained"
                onClick={handleGoBack}
                startIcon={<ArrowBackIcon />}
              >
                Quay lại
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Avatar className="w-16 h-16 bg-green-500">
                  <CheckCircleIcon className="w-10 h-10" />
                </Avatar>
              </div>
              <Typography variant="h4" className="font-bold text-green-600 mb-2">
                Tham gia nhóm thành công!
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Bạn đã được thêm vào nhóm thành công
              </Typography>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Team Information */}
              {team && (
                <Box className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="bg-blue-500">
                      <GroupIcon />
                    </Avatar>
                    <div>
                      <Typography variant="h6" className="font-semibold">
                        {team.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {team.project_id.code} - {team.project_id.topic}
                      </Typography>
                    </div>
                  </div>
                  <Typography variant="body2" color="text.secondary" className="flex items-center gap-1">
                    <span className="font-medium">Mã nhóm:</span>
                    <code className="bg-blue-100 dark:bg-blue-800 px-2 py-1 rounded text-sm">
                      {team.team_code}
                    </code>
                  </Typography>
                </Box>
              )}

              {/* User Information */}
              {user && (
                <Box className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar className="bg-gray-500">
                      <PersonIcon />
                    </Avatar>
                    <div>
                      <Typography variant="h6" className="font-semibold">
                        {user.full_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
                      </Typography>
                    </div>
                  </div>
                </Box>
              )}

              <Divider />

              {/* Success Message */}
              <Alert severity="success" icon={<CheckCircleIcon />}>
                <Typography variant="body2">
                  Bạn đã được thêm vào nhóm thành công. 
                  Vui lòng đăng nhập để truy cập vào hệ thống và xem thông tin nhóm.
                </Typography>
              </Alert>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <Button
                  variant="contained"
                  size="large"
                  onClick={handleGoToLogin}
                  startIcon={<LoginIcon />}
                  className="w-full"
                >
                  Đăng nhập ngay
                </Button>
                <Button
                  variant="outlined"
                  size="large"
                  onClick={handleGoBack}
                  startIcon={<ArrowBackIcon />}
                  className="w-full"
                >
                  Quay lại
                </Button>
              </div>

              {/* Additional Info */}
              <Box className="text-center pt-4">
                <Typography variant="caption" color="text.secondary">
                  Sau khi đăng nhập, bạn có thể truy cập vào trang quản lý nhóm để xem thông tin chi tiết.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
