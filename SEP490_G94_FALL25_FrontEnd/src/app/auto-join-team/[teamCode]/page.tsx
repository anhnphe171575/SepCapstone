"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "../../../../ultis/axios";
import {
  Card,
  CardContent,
  CardHeader,
  Button,
  Typography,
  Alert,
  Box,
  Avatar,
  CircularProgress,
  TextField,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Group as GroupIcon,
  Email as EmailIcon,
  Error as ErrorIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
} from "@mui/icons-material";

export default function AutoJoinTeamPage() {
  const router = useRouter();
  const params = useParams();
  const teamCode = Array.isArray(params?.teamCode) ? params?.teamCode[0] : (params?.teamCode as string);
  
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [teamData, setTeamData] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [emailMismatch, setEmailMismatch] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [autoJoinAttempted, setAutoJoinAttempted] = useState(false);

  useEffect(() => {
    // Kiểm tra xem có email trong URL params không
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
      setInvitedEmail(emailParam);
      setEmail(emailParam);
    }
    
    // Kiểm tra user đang đăng nhập
    checkCurrentUser();
  }, []);

  // Kiểm tra lại khi currentUser hoặc email thay đổi
  useEffect(() => {
    if (currentUser && invitedEmail) {
      if (currentUser.email?.toLowerCase() !== invitedEmail.toLowerCase()) {
        setEmailMismatch(true);
        setError(`Bạn đang đăng nhập bằng tài khoản ${currentUser.email}, nhưng lời mời này dành cho ${invitedEmail}. Vui lòng đăng xuất và đăng nhập bằng tài khoản đúng.`);
      } else {
        setEmailMismatch(false);
        setError(null);
        // Tự động join nếu email khớp và đã đăng nhập (chỉ một lần)
        if (!loading && !success && !autoJoinAttempted) {
          setAutoJoinAttempted(true);
          handleAutoJoin(invitedEmail);
        }
      }
    } else if (currentUser && !invitedEmail) {
      // Nếu có user đăng nhập nhưng không có email trong URL, dùng email của user
      setEmail(currentUser.email);
    }
  }, [currentUser, invitedEmail]);

  const checkCurrentUser = async () => {
    try {
      setCheckingAuth(true);
      // Kiểm tra xem có token không
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        // Lấy thông tin user hiện tại
        const response = await axiosInstance.get('/api/users/me');
        setCurrentUser(response.data);
        
        // So sánh với email được mời sẽ được xử lý trong useEffect riêng
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      // Không có user đăng nhập hoặc token không hợp lệ
      setCurrentUser(null);
      console.log('No user logged in or invalid token');
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleRedirectToLogin = () => {
    // Lưu thông tin team code và email vào URL để redirect lại sau khi đăng nhập
    const urlParams = new URLSearchParams();
    urlParams.set('redirect', `/auto-join-team/${teamCode}`);
    if (invitedEmail) {
      urlParams.set('email', invitedEmail);
    }
    router.push(`/login?${urlParams.toString()}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    setCurrentUser(null);
    setEmailMismatch(false);
    setError(null);
    router.push('/login');
  };

  const handleAutoJoin = async (emailToUse?: string) => {
    // Kiểm tra đã đăng nhập chưa
    if (!currentUser) {
      setError('Vui lòng đăng nhập trước khi tham gia nhóm');
      return;
    }

    const emailValue = emailToUse || email;
    if (!emailValue.trim()) {
      setError('Vui lòng nhập email');
      return;
    }

    // Kiểm tra email phải khớp với tài khoản đang đăng nhập
    if (currentUser.email.toLowerCase() !== emailValue.trim().toLowerCase()) {
      setError(`Bạn đang đăng nhập bằng tài khoản ${currentUser.email}, nhưng bạn đang cố gắng tham gia nhóm bằng email ${emailValue.trim()}. Vui lòng đăng xuất và đăng nhập bằng tài khoản đúng.`);
      setEmailMismatch(true);
      return;
    }

    setLoading(true);
    setError(null);
    setEmailMismatch(false);
    
    try {
      const response = await axiosInstance.post(`/api/team/auto-join/${teamCode}`, {
        email: emailValue.trim()
      });
      
      console.log('Auto join response:', response.data);
      setSuccess(true);
      setTeamData(response.data.data.team);
      setUserData(response.data.data.user);
      
      // Redirect đến trang success sau 2 giây
      setTimeout(() => {
        const teamParam = encodeURIComponent(JSON.stringify(response.data.data.team));
        const userParam = encodeURIComponent(JSON.stringify(response.data.data.user));
        router.push(`/team-join-success?team=${teamParam}&user=${userParam}`);
      }, 2000);
      
    } catch (e: any) {
      console.error('Error auto joining team:', e);
      setError(e?.response?.data?.message || "Không thể tham gia nhóm");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAutoJoin();
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Avatar className="w-16 h-16 bg-blue-500">
                <GroupIcon className="w-10 h-10" />
              </Avatar>
            </div>
            <Typography variant="h5" className="font-semibold">
              Tham gia nhóm
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Mã nhóm: <code className="bg-gray-100 px-2 py-1 rounded">{teamCode}</code>
            </Typography>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {checkingAuth ? (
              <Box className="text-center py-8">
                <CircularProgress size={40} />
                <Typography variant="body2" color="text.secondary" className="mt-4">
                  Đang kiểm tra đăng nhập...
                </Typography>
              </Box>
            ) : success ? (
              <Box className="text-center py-8">
                <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <Typography variant="h6" className="text-green-600 mb-2">
                  Tham gia nhóm thành công!
                </Typography>
                <Typography variant="body2" color="text.secondary" className="mb-4">
                  Đang chuyển hướng...
                </Typography>
                <CircularProgress size={24} />
              </Box>
            ) : !currentUser ? (
              <>
                <Alert severity="warning" icon={<LoginIcon />} sx={{ mb: 3 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    Yêu cầu đăng nhập
                  </Typography>
                  <Typography variant="body2">
                    Bạn cần đăng nhập trước khi có thể tham gia nhóm. Vui lòng đăng nhập bằng tài khoản có email được mời.
                  </Typography>
                </Alert>

                {invitedEmail && (
                  <Box className="bg-gray-50 p-3 rounded-lg mb-3">
                    <Typography variant="body2" color="text.secondary" className="mb-1">
                      Email được mời:
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {invitedEmail}
                    </Typography>
                  </Box>
                )}

                <Button
                  variant="contained"
                  size="large"
                  fullWidth
                  onClick={handleRedirectToLogin}
                  startIcon={<LoginIcon />}
                  sx={{ mb: 2 }}
                >
                  Đăng nhập để tham gia nhóm
                </Button>

                <Box className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <Typography variant="body2" color="text.secondary">
                    <strong>Lưu ý:</strong> Sau khi đăng nhập, bạn sẽ được tự động quay lại trang này để tham gia nhóm.
                  </Typography>
                </Box>
              </>
            ) : (
              <>
                {error && (
                  <Alert 
                    severity="error" 
                    icon={<ErrorIcon />}
                    action={
                      emailMismatch ? (
                        <Button
                          color="inherit"
                          size="small"
                          onClick={handleLogout}
                          startIcon={<LogoutIcon />}
                        >
                          Đăng xuất
                        </Button>
                      ) : null
                    }
                  >
                    {error}
                  </Alert>
                )}

                {currentUser && !emailMismatch && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Bạn đang đăng nhập bằng tài khoản: <strong>{currentUser.email}</strong>
                    </Typography>
                  </Alert>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <TextField
                    fullWidth
                    label="Email của bạn"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      // Reset error khi user thay đổi email
                      if (error) {
                        setError(null);
                        setEmailMismatch(false);
                      }
                    }}
                    placeholder="Nhập email để tham gia nhóm"
                    required
                    disabled={loading || emailMismatch}
                    helperText={
                      emailMismatch 
                        ? "Email phải khớp với tài khoản đang đăng nhập"
                        : "Email phải khớp với tài khoản đang đăng nhập"
                    }
                    error={emailMismatch}
                  />
                  
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={loading || !email.trim() || emailMismatch}
                    startIcon={loading ? <CircularProgress size={20} /> : <EmailIcon />}
                  >
                    {loading ? "Đang tham gia..." : "Tham gia nhóm"}
                  </Button>
                </form>

                <Box className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <Typography variant="body2" color="text.secondary">
                    <strong>Lưu ý:</strong> Email phải khớp với tài khoản đang đăng nhập.
                  </Typography>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
