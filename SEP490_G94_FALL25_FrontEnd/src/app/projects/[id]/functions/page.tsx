"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "../../../../../ultis/axios";
import SidebarWrapper from "@/components/SidebarWrapper";
import FunctionDetailsModal from "@/components/FunctionDetailsModal";
import { PRIORITY_OPTIONS } from "@/constants/settings";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  Paper,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Card,
  CardContent,
  InputAdornment,
  Tooltip,
  Alert,
  Link,
  Pagination,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import FunctionsIcon from "@mui/icons-material/Functions";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TuneIcon from "@mui/icons-material/Tune";
import AssignmentIcon from "@mui/icons-material/Assignment";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";
import PauseCircleIcon from "@mui/icons-material/PauseCircle";
import BugReportIcon from "@mui/icons-material/BugReport";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import Badge from "@mui/material/Badge";
import Popover from "@mui/material/Popover";
import { toast } from "sonner";

type Setting = {
  _id: string;
  name: string;
  value?: string;
};

type Feature = {
  _id: string;
  title: string;
  project_id: string;
};

type FunctionType = {
  _id: string;
  title: string;
  feature_id?: Feature | string;
  priority?: Setting | string;
  complexity_id?: Setting | string;
  status?: Setting | string;
  description?: string;
  createAt?: string;
  updateAt?: string;
};

type FunctionStats = {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  overdue: number;
  completion_rate: number;
};

export default function ProjectFunctionsPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);
  const featureIdFromUrl = searchParams.get('featureId');

  const [functions, setFunctions] = useState<FunctionType[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [priorityTypes, setPriorityTypes] = useState<Setting[]>([]);
  const [statusTypes, setStatusTypes] = useState<Setting[]>([]);
  const [stats, setStats] = useState<FunctionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<number | null>(null);
  const isSupervisor = userRole === 4;

  const [openDialog, setOpenDialog] = useState(false);
  const [editingFunction, setEditingFunction] = useState<FunctionType | null>(null);
  const [functionModal, setFunctionModal] = useState<{ open: boolean; functionId?: string | null }>({ open: false, functionId: null });
  
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterFeature, setFilterFeature] = useState<string>("all");
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLButtonElement | null>(null);

  const [functionForm, setFunctionForm] = useState({
    title: "",
    description: "",
    priority: "",
    status: "",
    feature_id: "",
  });

  // Inline editing states
  const [editingCell, setEditingCell] = useState<{funcId: string, field: string} | null>(null);
  const [editValue, setEditValue] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Pagination state (same behavior as Features page)
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  
  // Note: effort validation removed as fields don't exist in models

  useEffect(() => {
    if (!projectId) return;
    
    // Load user role
    (async () => {
      try {
        const userRes = await axiosInstance.get('/api/users/me');
        setUserRole(userRes.data?.role || null);
      } catch {
        setUserRole(null);
      }
    })();
    
    loadAllData();
  }, [projectId]);

  // Auto-filter by feature when featureId is in URL
  useEffect(() => {
    if (featureIdFromUrl && features.length > 0) {
      const featureExists = features.some(f => f._id === featureIdFromUrl);
      if (featureExists) {
        setFilterFeature(featureIdFromUrl);
      }
    }
  }, [featureIdFromUrl, features]);

  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [functionsRes, featuresRes, statsRes, ] = await Promise.all([
        axiosInstance.get(`/api/projects/${projectId}/functions`).catch(err => {
          console.error('Error fetching functions:', err?.response?.data || err);
          return { data: [] };
        }),
        axiosInstance.get(`/api/projects/${projectId}/features`).catch(err => {
          console.error('Error fetching features:', err?.response?.data || err);
          return { data: [] };
        }),
        axiosInstance.get(`/api/projects/${projectId}/functions/stats`).catch(err => {
          console.error('Error fetching stats:', err?.response?.data || err);
          return { data: { total: 0, completed: 0, in_progress: 0, pending: 0, overdue: 0, completion_rate: 0 } };
        }),
      ]);
      
      console.log('Functions response:', functionsRes?.data);
      console.log('Features response:', featuresRes?.data);
      
      // Use constants for priority, derive statuses from Function model enum
      const prioritySettings = PRIORITY_OPTIONS;
      const statusSettings = [
        { _id: "To Do", name: "To Do", value: "to-do" },
        { _id: "Doing", name: "Doing", value: "doing" },
        { _id: "Done", name: "Done", value: "done" },
      ];

      const rawFunctions = functionsRes?.data;
      const normalizedFunctions = Array.isArray(rawFunctions)
        ? rawFunctions
        : Array.isArray(rawFunctions?.data)
          ? rawFunctions.data
          : Array.isArray(rawFunctions?.functions)
            ? rawFunctions.functions
            : [];

      const rawFeatures = featuresRes?.data;
      const normalizedFeatures = Array.isArray(rawFeatures)
        ? rawFeatures
        : Array.isArray(rawFeatures?.data)
          ? rawFeatures.data
          : Array.isArray(rawFeatures?.features)
            ? rawFeatures.features
            : [];

      console.log('Normalized functions:', normalizedFunctions);
      console.log('Normalized features:', normalizedFeatures);

      setFunctions(normalizedFunctions);
      setFeatures(normalizedFeatures);
      setStats(statsRes.data);
      setPriorityTypes(prioritySettings);
      setStatusTypes(statusSettings);
      
      // Note: Effort warnings removed
    } catch (e: any) {
      console.error('Error in loadAllData:', e);
      const errorMessage = e?.response?.data?.message || "Không thể tải dữ liệu";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Note: calculateEffortWarnings removed - effort fields don't exist in models

  const handleOpenDialog = (func?: FunctionType) => {
    if (func) {
      setEditingFunction(func);
      setFunctionForm({
        title: func.title,
        description: func.description || "",
        priority: typeof func.priority === "object" ? func.priority?._id : func.priority || "",
        status: typeof func.status === "object" ? func.status?._id : func.status || "",
        feature_id: typeof func.feature_id === "object" ? func.feature_id?._id : func.feature_id || "",
      });
    } else {
      setEditingFunction(null);
      setFunctionForm({
        title: "",
        description: "",
        priority: "",
        status: "",
        feature_id: "",
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingFunction(null);
  };

  const handleSaveFunction = async () => {
    try {
      const payload = {
        title: functionForm.title,
        description: functionForm.description || undefined,
        priority: functionForm.priority || undefined,
        feature_id: functionForm.feature_id,
        // Status không cho phép chỉnh sửa thủ công, chỉ tự động cập nhật từ tasks
        // status: functionForm.status || undefined,
      };

      if (editingFunction) {
        await axiosInstance.patch(`/api/functions/${editingFunction._id}`, payload);
      } else {
        await axiosInstance.post(`/api/projects/${projectId}/functions`, payload);
      }
      
      handleCloseDialog();
      await loadAllData();
      toast.success(editingFunction ? "Đã cập nhật function thành công" : "Đã Tạo chức năng thành công");
    } catch (e: any) {
      const errorData = e?.response?.data;
      const errorMessage = errorData?.message || "Không thể lưu function";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const handleDeleteFunction = async (id: string) => {
    const func = functions.find(f => f._id === id);
    if (!func) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa chức năng "${func.title}"?\n\nHành động này sẽ xóa tất cả tasks liên quan. Hành động này không thể hoàn tác!`
    );
    if (!confirmed) return;

    try {
      await axiosInstance.delete(`/api/functions/${id}`);
      await loadAllData();
      toast.success("Đã xóa chức năng thành công");
    } catch (e: any) {
      const errorMessage = e?.response?.data?.message || "Không thể xóa chức năng";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };


  // Inline editing handlers
  const startEdit = (funcId: string, field: string, currentValue: any) => {
    setEditingCell({ funcId, field });
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue(null);
  };

  const saveInlineEdit = async (funcId: string, field: string, value?: any) => {
    // Prevent double-save
    if (isSaving) return;
    
    // Không cho phép chỉnh sửa status (tự động cập nhật từ tasks)
    if (field === 'status') {
      cancelEdit();
      toast.info('Trạng thái tự động cập nhật từ công việc, không thể chỉnh sửa thủ công');
      return;
    }
    
    try {
      // Use provided value or fallback to editValue
      const valueToSave = value !== undefined ? value : editValue;
      
      // Don't save if value is empty or null (except for optional fields like description)
      if (!valueToSave && field !== 'description') {
        cancelEdit();
        return;
      }

      setIsSaving(true);
      const updateData: any = {};
      updateData[field] = valueToSave;
      
      await axiosInstance.patch(`/api/functions/${funcId}`, updateData);
      
      // Reload data to get fresh data with populated fields
      await loadAllData();
      
      cancelEdit();
      toast.success(`Đã cập nhật ${field === 'priority' ? 'ưu tiên' : field} thành công`);
    } catch (e: any) {
      const errorMessage = e?.response?.data?.message || `Không thể cập nhật ${field}`;
      setError(errorMessage);
      toast.error(errorMessage);
      cancelEdit();
    } finally {
      setIsSaving(false);
    }
  };

  // Get icon and color for status
  const getStatusIconAndColor = (statusName: string) => {
    const name = statusName?.toLowerCase() || '';
    if (name.includes('planning')) return { icon: <HourglassEmptyIcon fontSize="small" />, color: '#f59e0b', bg: '#fef3c7' };
    if (name.includes('progress') || name.includes('doing')) return { icon: <PlayArrowIcon fontSize="small" />, color: '#3b82f6', bg: '#dbeafe' };
    if (name.includes('testing') || name.includes('test')) return { icon: <BugReportIcon fontSize="small" />, color: '#8b5cf6', bg: '#ede9fe' };
    if (name.includes('completed') || name.includes('done')) return { icon: <CheckCircleIcon fontSize="small" />, color: '#10b981', bg: '#d1fae5' };
    if (name.includes('cancelled') || name.includes('cancel')) return { icon: <CancelIcon fontSize="small" />, color: '#ef4444', bg: '#fee2e2' };
    if (name.includes('hold') || name.includes('pause')) return { icon: <PauseCircleIcon fontSize="small" />, color: '#6b7280', bg: '#f3f4f6' };
    return { icon: <ArrowForwardIcon fontSize="small" />, color: '#6b7280', bg: '#f3f4f6' };
  };

  const filteredFunctions = useMemo(() => {
    return functions.filter((func) => {
      const title = (func.title || "").toLowerCase();
      const description = (func.description || "").toLowerCase();
      const normalizedSearch = (searchTerm || "").toLowerCase().trim();

      const matchSearch =
        !normalizedSearch ||
        title.includes(normalizedSearch) ||
        description.includes(normalizedSearch);

      const funcStatusId =
        typeof func.status === "object" ? func.status?._id : func.status;
      const matchStatus =
        filterStatus === "all" || funcStatusId === filterStatus;

      const funcFeatureId =
        typeof func.feature_id === "object"
          ? func.feature_id?._id
          : func.feature_id;
      const matchFeature =
        filterFeature === "all" || funcFeatureId === filterFeature;

      return matchSearch && matchStatus && matchFeature;
    });
  }, [functions, searchTerm, filterStatus, filterFeature]);

  // Paginated list like Features page
  const paginatedFunctions = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredFunctions.slice(startIndex, endIndex);
  }, [filteredFunctions, page, rowsPerPage]);

  // Reset to first page when filters/search change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterStatus, filterFeature]);

  // Resolve display names when API returns only IDs
  const resolveFeatureTitle = (func: FunctionType) => {
    if (typeof func.feature_id === "object") return func.feature_id?.title || "-";
    if (!func.feature_id) return "-";
    const match = features.find((f) => f._id === func.feature_id);
    return match?.title || "-";
  };

  const resolvePriorityName = (func: FunctionType) => {
    if (typeof func.priority === "object") return func.priority?.name || "-";
    if (!func.priority) return "-";
    const target = String(func.priority);
    const match = priorityTypes.find((p) =>
      String((p as any)?._id) === target ||
      String((p as any)?.value) === target ||
      String((p as any)?.name) === target
    );
    return (match as any)?.name || "-";
  };

  const resolveStatusName = (func: FunctionType) => {
    if (typeof func.status === "object") return func.status?.name || "-";
    if (!func.status) return "-";
    const target = String(func.status);
    const match = statusTypes.find((s) =>
      String((s as any)?._id) === target ||
      String((s as any)?.value) === target ||
      String((s as any)?.name) === target
    );
    return (match as any)?.name || "-";
  };

  const getStatusColor = (statusName: string) => {
    const colors: any = {
      'Pending': '#9ca3af',
      'In Progress': '#f59e0b',
      'Completed': '#22c55e',
      'Overdue': '#ef4444',
      'To Do': '#6b7280',
      'Done': '#10b981',
    };
    return colors[statusName] || '#3b82f6';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <SidebarWrapper />
        <main className="p-4 md:p-6 md:ml-56">
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
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
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                }}>
                  <FunctionsIcon sx={{ fontSize: 28, color: 'white' }} />
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
                    Chức năng
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Quản lý các chức năng trong dự án
                  </Typography>
                </Box>
              </Box>

              {/* Right Actions */}
              <Stack direction="row" spacing={1.5} alignItems="center">
                {/* Quick Navigation */}
                <Button
                  variant="outlined"
                  onClick={() => router.push(`/projects/${projectId}/milestones`)}
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
                  Cột mốc
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => router.push(`/projects/${projectId}/features`)}
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
                  Tính năng
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => router.push(`/projects/${projectId}/tasks`)}
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
                  Công việc
                </Button>
                
                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                
                {!isSupervisor && (
                  <Button 
                    variant="contained" 
                    onClick={() => handleOpenDialog()}
                    startIcon={<AddIcon />} 
                    sx={{ 
                      bgcolor: '#7b68ee',
                      color: 'white',
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '14px',
                      px: 2.5,
                      py: 1,
                      borderRadius: 1.5,
                      boxShadow: 'none',
                      '&:hover': { 
                        bgcolor: '#6952d6',
                      },
                    }}
                  >
                    Tạo chức năng
                  </Button>
                )}
              </Stack>
            </Box>
          </Box>

          {/* Toolbar with Search and Filters (standardized spacing/colors) */}
          <Box sx={{ 
            bgcolor: 'white',
            borderBottom: '1px solid #e8e9eb',
            px: 3, py: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ flex: 1 }}>
              <TextField
                placeholder="Tìm kiếm chức năng..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                size="small"
                sx={{ 
                  width: 250,
                  '& .MuiOutlinedInput-root': { 
                    fontSize: '13px',
                    borderRadius: 2,
                    bgcolor: '#f8f9fb',
                    height: 36,
                    '& fieldset': { borderColor: 'transparent' },
                    '&:hover': { 
                      bgcolor: '#f3f4f6',
                      '& fieldset': { borderColor: '#e8e9eb' }
                    },
                    '&.Mui-focused': { 
                      bgcolor: 'white',
                      '& fieldset': { borderColor: '#7b68ee', borderWidth: '2px' }
                    }
                  } 
                }}
                InputProps={{ 
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                    </InputAdornment>
                  ) 
                }}
              />

              <Badge 
                badgeContent={[filterStatus !== 'all', filterFeature !== 'all', searchTerm].filter(Boolean).length || 0}
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    background: 'linear-gradient(135deg, #7b68ee, #9b59b6)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '10px',
                    boxShadow: '0 2px 8px rgba(123, 104, 238, 0.3)',
                    border: '2px solid white',
                  }
                }}
              >
                <Button
                  variant={filterAnchorEl ? "contained" : "outlined"}
                  size="small"
                  startIcon={<TuneIcon fontSize="small" />}
                  onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    borderColor: filterAnchorEl ? 'transparent' : '#e2e8f0',
                    borderWidth: '1.5px',
                    color: filterAnchorEl ? 'white' : '#49516f',
                    background: filterAnchorEl ? 'linear-gradient(135deg, #7b68ee, #9b59b6)' : 'white',
                    height: 36,
                    px: 2,
                    borderRadius: 2.5,
                    boxShadow: filterAnchorEl ? '0 4px 12px rgba(123, 104, 238, 0.3)' : 'none',
                    '&:hover': {
                      borderColor: filterAnchorEl ? 'transparent' : '#b4a7f5',
                      background: filterAnchorEl ? 'linear-gradient(135deg, #6b5dd6, #8b49a6)' : 'linear-gradient(to bottom, white, #f9fafb)',
                      boxShadow: '0 4px 12px rgba(123, 104, 238, 0.2)',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  Bộ lọc
                </Button>
              </Badge>
            </Stack>

            <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
              Hiển thị: {filteredFunctions.length} {filteredFunctions.length !== functions.length && `trong ${functions.length}`} chức năng
            </Typography>
          </Box>


          {/* Feature Filter Alert */}
          {featureIdFromUrl && filterFeature === featureIdFromUrl && (
            <Alert 
              severity="info" 
              sx={{ 
                mb: 3,
                background: 'linear-gradient(135deg, #e0f2fe, #e0e7ff)',
                border: '1px solid #7b68ee',
                '& .MuiAlert-icon': {
                  color: '#7b68ee'
                }
              }}
              onClose={() => {
                setFilterFeature("all");
                router.push(`/projects/${projectId}/functions`);
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Đang xem Functions của Feature: 
                </Typography>
                <Chip 
                  label={features.find(f => f._id === featureIdFromUrl)?.title || 'Không xác định'}
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, #7b68ee, #9b59b6)',
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Alert>
          )}

          {/* Statistics Cards removed by request */}

          {/* Note: Effort validation warnings removed - effort fields don't exist */}

          {/* Modern Filter Popover */}
          <Popover
            open={Boolean(filterAnchorEl)}
            anchorEl={filterAnchorEl}
            onClose={() => setFilterAnchorEl(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1.5,
                  width: 400,
                  maxHeight: 500,
                  borderRadius: 4,
                  boxShadow: '0 20px 60px rgba(123, 104, 238, 0.15), 0 0 0 1px rgba(123, 104, 238, 0.1)',
                  overflow: 'hidden',
                  background: 'linear-gradient(to bottom, #ffffff, #fafbff)',
                  display: 'flex',
                  flexDirection: 'column',
                }
              }
            }}
          >
            {/* Header */}
            <Box sx={{ 
              px: 3.5,
              pt: 3,
              pb: 2.5,
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'radial-gradient(circle at top right, rgba(255,255,255,0.2), transparent)',
                pointerEvents: 'none',
              }
            }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                    <Box sx={{ 
                      width: 36, 
                      height: 36, 
                      borderRadius: 2, 
                      bgcolor: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}>
                      <TuneIcon sx={{ fontSize: 20, color: 'white' }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '18px', color: 'white', letterSpacing: '-0.02em' }}>
                      Bộ lọc chức năng
                    </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', ml: 6 }}>
                    Tinh chỉnh danh sách chức năng của bạn
                  </Typography>
                </Box>
                <IconButton 
                size="small"
                  onClick={() => setFilterAnchorEl(null)}
                  sx={{ 
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    '&:hover': { 
                      bgcolor: 'rgba(255,255,255,0.25)',
                      transform: 'rotate(90deg)',
                      transition: 'all 0.3s ease'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  <span style={{ fontSize: '18px', fontWeight: 300 }}>×</span>
                </IconButton>
              </Stack>
            </Box>

            {/* Filter Content */}
            <Box sx={{ 
              px: 3.5,
              py: 3,
              flex: 1,
              overflowY: 'auto',
            }}>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="caption" sx={{ mb: 1.5, display: 'block', fontWeight: 700, color: '#2d3748', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Trạng thái
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: '#6b7280', '&.Mui-focused': { color: '#8b5cf6' } }}>Trạng thái</InputLabel>
                <Select
                  value={filterStatus}
                  label="Trạng thái"
                  onChange={(e) => setFilterStatus(e.target.value)}
                      sx={{
                        borderRadius: 2.5,
                        bgcolor: 'white',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0', borderWidth: '1.5px' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#b4a7f5' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8b5cf6', borderWidth: '2px' },
                      }}
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  {statusTypes.map((status) => (
                    <MenuItem key={status._id} value={status._id}>
                      {status.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="caption" sx={{ mb: 1.5, display: 'block', fontWeight: 700, color: '#2d3748', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Tính năng
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: '#6b7280', '&.Mui-focused': { color: '#8b5cf6' } }}>Tính năng</InputLabel>
                <Select
                  value={filterFeature}
                  label="Tính năng"
                  onChange={(e) => setFilterFeature(e.target.value)}
                      sx={{
                        borderRadius: 2.5,
                        bgcolor: 'white',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0', borderWidth: '1.5px' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#b4a7f5' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8b5cf6', borderWidth: '2px' },
                      }}
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  {features.map((feature) => (
                    <MenuItem key={feature._id} value={feature._id}>
                      {feature.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
                </Box>
            </Stack>
            </Box>

            {/* Footer */}
            {(filterStatus !== 'all' || filterFeature !== 'all') && (
              <Box sx={{ 
                px: 3.5,
                py: 2.5,
                borderTop: '1px solid #e2e8f0',
                background: 'linear-gradient(to bottom, #fafbff, #f8f9fb)',
                flexShrink: 0,
              }}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    setFilterStatus('all');
                    setFilterFeature('all');
                  }}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                    color: 'white',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    borderRadius: 2.5,
                    py: 1.2,
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                      boxShadow: '0 6px 16px rgba(239, 68, 68, 0.4)',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                  startIcon={
                    <Box sx={{ 
                      width: 20, 
                      height: 20, 
                      borderRadius: '50%', 
                      bgcolor: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px'
                    }}>
                      ✕
                    </Box>
                  }
                >
                  Xóa tất cả bộ lọc
                </Button>
              </Box>
            )}
          </Popover>

          {/* Functions Table */}
          <Paper variant="outlined">
            <Box sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Tiêu đề</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Tính năng</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Ưu tiên</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Trạng thái</TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }}>Hành động</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedFunctions.map((func, index) => {
                    // Note: Progress calculation removed - effort fields don't exist
                    const featureName = resolveFeatureTitle(func);
                    const priorityName = resolvePriorityName(func);
                    const statusName = resolveStatusName(func);
                    
                    const isEditingPriority = editingCell?.funcId === func._id && editingCell?.field === 'priority';
                    const isEditingStatus = editingCell?.funcId === func._id && editingCell?.field === 'status';
                    
                    return (
                      <TableRow 
                        key={func._id} 
                        hover
                      >
                        {/* Title */}
                        <TableCell>
                          <Link
                            component="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFunctionModal({ open: true, functionId: func._id });
                            }}
                            sx={{
                              fontWeight: 'medium',
                              color: '#7b68ee',
                              textDecoration: 'none',
                              cursor: 'pointer',
                              '&:hover': {
                                textDecoration: 'underline',
                                color: '#6952d6',
                              }
                            }}
                          >
                            {func.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {featureName !== "-" ? (
                            <Chip label={featureName} size="small" variant="outlined" />
                          ) : (
                            <Typography variant="body2" color="text.secondary">—</Typography>
                          )}
                        </TableCell>
                        {/* Priority - Inline Editable */}
                        <TableCell 
                          onClick={() => {
                            if (!isSupervisor && !isEditingPriority) {
                              const currentPriorityId = typeof func.priority === 'object' 
                                ? func.priority?._id 
                                : func.priority;
                              startEdit(func._id, 'priority', currentPriorityId);
                            }
                          }}
                          sx={{ 
                            cursor: isSupervisor || isEditingPriority ? 'default' : 'pointer',
                            '&:hover': !isSupervisor && !isEditingPriority ? { bgcolor: '#f9fafb' } : {},
                          }}
                        >
                          {isEditingPriority ? (
                            <Select
                              value={editValue || ""}
                              onChange={(e) => {
                                const newValue = e.target.value;
                                setEditValue(newValue);
                                // Auto-save immediately with the new value
                                saveInlineEdit(func._id, 'priority', newValue);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                  e.stopPropagation();
                                  cancelEdit();
                                }
                              }}
                              size="small"
                              autoFocus
                              open
                              sx={{
                                fontSize: '13px',
                                minWidth: 120,
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: '#7b68ee',
                                },
                              }}
                            >
                              <MenuItem value="">
                                <em>Không có</em>
                              </MenuItem>
                              {priorityTypes.map((priority) => (
                                <MenuItem key={priority._id} value={priority._id}>
                                  {priority.name}
                                </MenuItem>
                              ))}
                            </Select>
                          ) : (
                            priorityName !== "-" ? (
                              <Chip 
                                label={priorityName} 
                                size="small" 
                                color={
                                  priorityName.toLowerCase().includes('high') ? 'error' :
                                  priorityName.toLowerCase().includes('medium') ? 'warning' :
                                  priorityName.toLowerCase().includes('low') ? 'default' : 'primary'
                                }
                              />
                            ) : (
                              <Typography variant="body2" color="text.secondary">—</Typography>
                            )
                          )}
                        </TableCell>
                        {/* Status - Read Only (tự động cập nhật từ tasks) */}
                        <TableCell>
                          <Chip
                            label={statusName}
                            size="small"
                            sx={{
                              bgcolor: getStatusColor(statusName),
                              color: "#fff",
                              fontWeight: 600,
                            }}
                          />
                         
                        </TableCell>
                        
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Xem Tasks của Function này">
                          <IconButton
                            size="small"
                                color="success"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/projects/${projectId}/tasks?functionId=${func._id}`);
                                }}
                              >
                                <AssignmentIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {!isSupervisor && (
                              <Tooltip title="Xóa Function">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFunction(func._id);
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredFunctions.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Stack spacing={2} sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">
                            {functions.length === 0 ? (
                              features.length === 0 ? (
                                <>📋 Project chưa có Features. Hãy Tạo tính năngs trước, sau đó Tạo chức năngs cho từng Feature.</>
                              ) : (
                                <>📝 Chưa có Functions nào. Bấm "Tạo chức năng" để thêm mới.</>
                              )
                            ) : (
                              <>🔍 Không tìm thấy Functions nào với bộ lọc hiện tại. Thử xóa bộ lọc hoặc Tạo chức năng mới.</>
                            )}
                        </Typography>
                          {functions.length === 0 && features.length > 0 && !isSupervisor && (
                            <Button
                              variant="contained"
                              startIcon={<AddIcon />}
                              onClick={() => handleOpenDialog()}
                              sx={{
                                textTransform: 'none',
                                borderRadius: 2,
                              }}
                            >
                              Tạo chức năng Mới
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Paper>
          
          {/* Pagination Controls - similar to Features list */}
          {filteredFunctions.length > 0 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                px: 3,
                py: 2,
                borderTop: "1px solid #e8e9eb",
                bgcolor: "#fafbfc",
                mt: 1,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Typography
                  variant="body2"
                  sx={{ color: "#6b7280", fontWeight: 500 }}
                >
                  Hiển thị {filteredFunctions.length === 0 ? 0 : (page - 1) * rowsPerPage + 1} -{" "}
                  {Math.min(page * rowsPerPage, filteredFunctions.length)} trong tổng số{" "}
                  {filteredFunctions.length} chức năng
                </Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <Select
                    value={rowsPerPage}
                    onChange={(e) => {
                      setRowsPerPage(Number(e.target.value));
                      setPage(1);
                    }}
                    sx={{
                      fontSize: "13px",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#e2e8f0",
                      },
                      "&:hover .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#b4a7f5",
                      },
                      "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                        borderColor: "#8b5cf6",
                      },
                    }}
                  >
                    <MenuItem value={5}>5 / trang</MenuItem>
                    <MenuItem value={10}>10 / trang</MenuItem>
                    <MenuItem value={25}>25 / trang</MenuItem>
                    <MenuItem value={50}>50 / trang</MenuItem>
                    <MenuItem value={100}>100 / trang</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Pagination
                count={Math.max(1, Math.ceil(filteredFunctions.length / rowsPerPage))}
                page={page}
                onChange={(_, value) => setPage(value)}
                color="primary"
                shape="rounded"
                sx={{
                  "& .MuiPaginationItem-root": {
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "#49516f",
                    "&.Mui-selected": {
                      background:
                        "linear-gradient(135deg, #7b68ee, #9b59b6)",
                      color: "white",
                      "&:hover": {
                        background:
                          "linear-gradient(135deg, #6b5dd6, #8b49a6)",
                      },
                    },
                    "&:hover": {
                      bgcolor: "#f3f0ff",
                    },
                  },
                }}
              />
            </Box>
          )}

          {/* Function Dialog - Modern Style */}
          <Dialog 
            open={openDialog} 
            onClose={handleCloseDialog} 
            maxWidth="md" 
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              }
            }}
          >
            <DialogTitle sx={{ 
              fontWeight: 700,
              fontSize: '1.5rem',
              pb: 2,
              borderBottom: '1px solid #e8e9eb',
              background: 'linear-gradient(135deg, #fafbff 0%, #f8f9fb 100%)',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}>
              <Box sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: editingFunction 
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' 
                  : 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: editingFunction 
                  ? '0 4px 12px rgba(99, 102, 241, 0.3)' 
                  : '0 4px 12px rgba(16, 185, 129, 0.3)',
              }}>
                <AddIcon sx={{ color: 'white', fontSize: 22 }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              Tạo chức năng mới
                </Typography>
                {editingFunction && (
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    Cập nhật thông tin function
                  </Typography>
                )}
              </Box>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 2 }}>
                <TextField
                  label="Tên chức năng *"
                  value={functionForm.title}
                  onChange={(e) => setFunctionForm({ ...functionForm, title: e.target.value })}
                  fullWidth
                  placeholder="VD: User Login API"
                />
                
                <TextField
                  label="Mô tả"
                  value={functionForm.description}
                  onChange={(e) => setFunctionForm({ ...functionForm, description: e.target.value })}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Mô tả chi tiết về function..."
                />

                <Stack direction="row" spacing={2}>
                  <FormControl fullWidth required>
                    <InputLabel>Tính năng *</InputLabel>
                    <Select
                      value={functionForm.feature_id}
                      label="Tính năng *"
                      onChange={(e) => setFunctionForm({ ...functionForm, feature_id: e.target.value })}
                      required
                    >
                      <MenuItem value="">
                        <em>Chọn tính năng</em>
                      </MenuItem>
                      {features.map((feature) => (
                        <MenuItem key={feature._id} value={feature._id}>
                          {feature.title}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl fullWidth>
                    <InputLabel>Ưu tiên</InputLabel>
                    <Select
                      value={functionForm.priority}
                      label="Ưu tiên"
                      onChange={(e) => setFunctionForm({ ...functionForm, priority: e.target.value })}
                    >
                      <MenuItem value="">
                        <em>Không chọn</em>
                      </MenuItem>
                      {priorityTypes.map((priority) => (
                        <MenuItem key={priority._id} value={priority._id}>
                          {priority.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Stack>

                {/* Note: Effort, Start Date, Deadline fields removed - don't exist in model */}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ 
              px: 3, 
              py: 2.5, 
              borderTop: '1px solid #e8e9eb',
              background: '#fafbff',
              gap: 1.5,
            }}>
              <Button 
                onClick={handleCloseDialog}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  color: '#6b7280',
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  '&:hover': {
                    bgcolor: '#f3f4f6',
                  }
                }}
              >
                Hủy
              </Button>
              <Button 
                variant="contained" 
                onClick={handleSaveFunction}
                disabled={!functionForm.title || !functionForm.feature_id}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '13px',
                  background: editingFunction 
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' 
                    : 'linear-gradient(135deg, #10b981, #059669)',
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  boxShadow: editingFunction 
                    ? '0 4px 12px rgba(99, 102, 241, 0.3)' 
                    : '0 4px 12px rgba(16, 185, 129, 0.3)',
                  '&:hover': {
                    background: editingFunction 
                      ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' 
                      : 'linear-gradient(135deg, #059669, #047857)',
                    boxShadow: editingFunction 
                      ? '0 6px 16px rgba(99, 102, 241, 0.4)' 
                      : '0 6px 16px rgba(16, 185, 129, 0.4)',
                    transform: 'translateY(-1px)',
                  },
                  '&:disabled': {
                    background: '#e5e7eb',
                    color: '#9ca3af',
                    boxShadow: 'none',
                  },
                  transition: 'all 0.2s ease',
                }}
              >
                {editingFunction ? "💾 Cập nhật" : "✨ Tạo chức năng"}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Function Details Modal */}
          {functionModal.open && functionModal.functionId && (
            <FunctionDetailsModal
              open={functionModal.open}
              functionId={functionModal.functionId}
              projectId={projectId}
              readonly={isSupervisor}
              onClose={() => setFunctionModal({ open: false, functionId: null })}
              onUpdate={async () => {
                await loadAllData();
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}

