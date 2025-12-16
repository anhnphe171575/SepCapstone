"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "../../../../../ultis/axios";
import SidebarWrapper from "@/components/SidebarWrapper";
import FeatureDetailsModal from "@/components/FeatureDetailsModal";
import StarIcon from "@mui/icons-material/Star";
import { PRIORITY_OPTIONS, getPriorityById } from "@/constants/settings";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Avatar,
  AvatarGroup,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  LinearProgress,
  Tooltip,
  TextField,
  Typography,
  Paper,
  Divider,
  Checkbox,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Alert,
  Tabs,
  Tab,
  Link,
  Pagination,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import FunctionsIcon from "@mui/icons-material/Functions";
import AssignmentIcon from "@mui/icons-material/Assignment";
import DeleteIcon from "@mui/icons-material/Delete";
import CreateMilestoneFromFeatures from "@/components/CreateMilestoneFromFeatures";
import TuneIcon from "@mui/icons-material/Tune";
import SearchIcon from "@mui/icons-material/Search";
import InputAdornment from "@mui/material/InputAdornment";
import Badge from "@mui/material/Badge";
import Popover from "@mui/material/Popover";
import { toast } from "sonner";

type Milestone = {
  _id: string;
  title: string;
  start_date?: string;
  deadline?: string;
  status?: string;
};

type Setting = {
  _id: string;
  name: string;
  value?: string;
};

type User = {
  _id: string;
  full_name?: string;
  email?: string;
};

type Feature = {
  _id?: string;
  title: string;
  description?: string;
  priority?: Setting | string;
  status?: Setting | string;
  created_by?: User | string;
  last_updated_by?: User | string;
  start_date?: string;
  end_date?: string;
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
  // UI-only convenience
  milestone_ids?: string[];
};

// Mock data for display  


export default function ProjectFeaturesPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Settings for dropdowns
  const [priorities, setPriorities] = useState<Setting[]>([]);
  const [statuses, setStatuses] = useState<Setting[]>([]);
  
  // Project data with man_days
  const [projectData, setProjectData] = useState<{ man_days?: number; topic?: string; start_date?: string; end_date?: string } | null>(null);
  
  // Team data for capacity calculation
  const [teamData, setTeamData] = useState<{ team_members?: { total?: number } } | null>(null);
  const [userRole, setUserRole] = useState<number | null>(null);
  const isSupervisor = userRole === 4;

  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState<Feature>({ 
    title: "", 
    description: "", 
    milestone_ids: [],
    start_date: "",
    end_date: "",
    tags: []
  });

  const [featureModal, setFeatureModal] = useState<{ open: boolean; featureId?: string | null }>({ open: false, featureId: null });
  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{
    title?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
  }>({ title: "", description: "", start_date: "", end_date: "" });

  // Feature selection for milestone creation
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);
  const [openMilestoneFromFeaturesDialog, setOpenMilestoneFromFeaturesDialog] = useState(false);
  
  // Feature detail dialog
  const [selectedFeatureDetail, setSelectedFeatureDetail] = useState<Feature | null>(null);
  const [openFeatureDetail, setOpenFeatureDetail] = useState(false);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  
  // View tab state
  const [viewTab, setViewTab] = useState<'table' | 'gantt'>('table');
  
  // Pagination state
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Note: Complexity field removed from Feature model

  const formatRelative = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const ms = Date.now() - d.getTime();
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (day > 0) return `${day} day${day>1?'s':''} ago`;
    if (hr > 0) return `${hr} hour${hr>1?'s':''} ago`;
    if (min > 0) return `${min} minute${min>1?'s':''} ago`;
    return `just now`;
  };

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
    
    (async () => {
      try {
        setLoading(true);
        const [projectRes, teamRes, milestoneRes, featureRes] = await Promise.all([
          axiosInstance.get(`/api/projects/${projectId}`).catch(() => ({ data: null })),
          axiosInstance.get(`/api/projects/${projectId}/team-members`).catch(() => ({ data: null })),
          axiosInstance.get(`/api/projects/${projectId}/milestones`).catch(() => ({ data: null })),
          axiosInstance.get(`/api/projects/${projectId}/features`).catch(() => ({ data: null })),
        ]);
        
        // Set project data
        setProjectData(projectRes.data);
        
        // Set team data
        setTeamData(teamRes.data || null);
        
        // Debug logging
        console.log('🔍 Team data:', teamRes.data);
        console.log('🔍 Project data:', projectRes.data);
        
        const milestonesList = Array.isArray(milestoneRes.data) && milestoneRes.data.length > 0 ? milestoneRes.data : [];
        setMilestones(milestonesList);

        // Set settings: priority from constants, status from Feature model enum
        setPriorities(PRIORITY_OPTIONS);
        setStatuses([
          { _id: "To Do", name: "To Do", value: "to-do" },
          { _id: "Doing", name: "Doing", value: "doing" },
          { _id: "Done", name: "Done", value: "done" },
        ] as any);

        if (Array.isArray(featureRes.data)) {
          // Enrich features with linked milestone ids
          const enriched: Feature[] = await Promise.all(
            featureRes.data.map(async (f: any) => {
              try {
                const linkRes = await axiosInstance.get(`/api/features/${f._id}/milestones`);
                // Loại bỏ duplicates
                const uniqueMilestoneIds = Array.isArray(linkRes.data) ? [...new Set(linkRes.data)] : [];
                return { ...f, milestone_ids: uniqueMilestoneIds } as Feature;
              } catch {
                return { ...f, milestone_ids: [] } as Feature;
              }
            })
          );
          console.log('Enriched features:', enriched);
          setFeatures(enriched);
        } else {
          // Fallback: localStorage or mock
          const key = `features:${projectId}`;
          const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
          if (raw) {
            setFeatures(JSON.parse(raw) as Feature[]);
          } 
        }
      } catch (e: any) {
        // Fallback to mock data
      
        setError(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [projectId]);

  // Persist features to localStorage whenever they change
  useEffect(() => {
    if (!projectId) return;
    const key = `features:${projectId}`;
    if (features && features.length > 0) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(features));
      }
    }
  }, [projectId, features]);

  const milestoneOptions = useMemo(() => milestones.map(m => ({ id: m._id, label: m.title })), [milestones]);

  // Compute progress per feature: % milestones completed
  const featureProgress = useMemo(() => {
    const statusById = new Map(milestones.map(m => [m._id, m.status] as const));
    const map = new Map<string, number>();
    features.forEach(f => {
      const ids = f.milestone_ids || [];
      if (!ids.length) { map.set(f._id as string, 0); return; }
      const total = ids.length;
      const completed = ids.reduce((acc, id) => acc + (statusById.get(id) === 'Completed' ? 1 : 0), 0);
      map.set(f._id as string, Math.round((completed / total) * 100));
    });
    return map;
  }, [features, milestones]);

  // Gantt-related derived data removed
  // Filtered list aligned with Functions page behavior
  const filteredFeatures = useMemo(() => {
    if (!features || features.length === 0) return [];
    
    const normalizedSearchTerm = (searchTerm || '').trim().toLowerCase();
    
    return features.filter((f) => {
      // Match search term
      let matchSearch = true;
      if (normalizedSearchTerm) {
        const title = (f.title || '').toLowerCase();
        const description = (f.description || '').toLowerCase();
        const tags = (f.tags || []).map(tag => (tag || '').toLowerCase()).join(' ');
        
        matchSearch = 
          title.includes(normalizedSearchTerm) 
      }
      
      // Match status filter
      const statusId = typeof f.status === 'object' 
        ? (f.status as any)?._id 
        : f.status;
      const matchStatus = filterStatus === 'all' || String(statusId) === String(filterStatus);
      
      // Match priority filter
      const priorityId = typeof f.priority === 'object' 
        ? (f.priority as any)?._id 
        : f.priority;
      const matchPriority = filterPriority === 'all' || String(priorityId) === String(filterPriority);
      
      return matchSearch && matchStatus && matchPriority;
    });
  }, [features, searchTerm, filterStatus, filterPriority]);

  // Paginated features
  const paginatedFeatures = useMemo(() => {
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredFeatures.slice(startIndex, endIndex);
  }, [filteredFeatures, page, rowsPerPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterStatus, filterPriority]);

  const handleOpenForm = () => {
    setForm({ 
      title: "", 
      description: "", 
      milestone_ids: [],
      start_date: "",
      end_date: "",
      tags: []
    });
    setOpenForm(true);
  };

  const handleCreateFeature = async () => {
    try {
      // Gọi backend Tạo tính năng
      const payload = {
        title: form.title,
        description: form.description,
        priority: form.priority,
        // Status không cho phép chỉnh sửa thủ công, chỉ tự động cập nhật từ functions
        start_date: form.start_date,
        end_date: form.end_date,
        tags: form.tags || [],
        milestone_ids: form.milestone_ids || [],
      };
      console.log('Creating feature with payload:', payload);
      const res = await axiosInstance.post(`/api/projects/${projectId}/features`, payload);
      console.log('Feature created response:', res.data);
      const created = res.data;
      
      // Link milestones nếu có
      let milestone_ids: string[] = form.milestone_ids || [];
      if (milestone_ids.length > 0) {
        try {
          await axiosInstance.post(`/api/features/${created._id}/milestones`, {
            milestone_ids: milestone_ids
          });
        } catch (err) {
          console.error('Error linking milestones:', err);
        }
      }
      
      setFeatures(prev => [{ ...created, milestone_ids }, ...prev]);
      setOpenForm(false);
      setForm({ 
        title: "", 
        description: "", 
        milestone_ids: [],
        start_date: "",
        end_date: "",
        tags: []
      });
      toast.success("Đã Tạo tính năng thành công");
    } catch (e: any) {
      const errorMessage = e?.response?.data?.message || "Không thể Tạo tính năng";
      setError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const startEditCell = (f: Feature, field: string) => {
    setEditingId(f._id as string);
    setEditingField(field);
    setEditDraft({
      title: f.title,
      description: f.description,
      start_date: f.start_date,
      end_date: f.end_date
    });
  };
  const cancelEditRow = () => {
    setEditingId(null);
    setEditingField(null);
    setEditDraft({ title: "", description: "", start_date: "", end_date: "" });
  };
  const saveEditRow = async (id: string) => {
    try {
      const all: any = {
        title: editDraft.title,
        description: editDraft.description,
        start_date: editDraft.start_date,
        end_date: editDraft.end_date
      };
      const payload: any = editingField ? { [editingField]: all[editingField] } : all;
      await axiosInstance.patch(`/api/features/${id}`, payload).catch(() => null);
      setFeatures(prev => prev.map(x => {
        if (x._id !== id) return x as Feature;
        const updated: any = { ...x, updatedAt: new Date().toISOString() };
        if (editingField) {
          (updated as any)[editingField] = (all as any)[editingField];
        } else {
          Object.assign(updated, all);
        }
        return updated;
      }));
      cancelEditRow();
      toast.success("Đã cập nhật thành công");
    } catch (e: any) {
      const errorMessage = e?.response?.data?.message || "Không thể cập nhật feature";
      toast.error(errorMessage);
    }
  };

  const handleToggleFeatureSelection = (featureId: string) => {
    setSelectedFeatureIds(prev => 
      prev.includes(featureId) 
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  const handleToggleAllFeatures = () => {
    if (selectedFeatureIds.length === features.length) {
      setSelectedFeatureIds([]);
    } else {
      setSelectedFeatureIds(features.map(f => f._id as string));
    }
  };

  const handleDeleteFeature = async (featureId: string) => {
    const feature = features.find(f => f._id === featureId);
    if (!feature) return;

    const confirmed = window.confirm(
      `Bạn có chắc muốn xóa tính năng "${feature.title}"?\n\nHành động này sẽ xóa tất cả functions và tasks liên quan. Hành động này không thể hoàn tác!`
    );
    if (!confirmed) return;

    try {
      await axiosInstance.delete(`/api/features/${featureId}`);
      setFeatures(prev => prev.filter(f => f._id !== featureId));
      toast.success("Đã xóa tính năng thành công");
    } catch (e: any) {
      const errorMessage = e?.response?.data?.message || "Không thể xóa tính năng";
      toast.error(errorMessage);
    }
  };

  const selectedFeatures = features.filter(f => selectedFeatureIds.includes(f._id as string));

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
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
                }}>
                  <StarIcon sx={{ fontSize: 28, color: 'white' }} />
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
                    Tính năng
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Quản lý các tính năng trong dự án
                  </Typography>
                </Box>
                {selectedFeatureIds.length > 0 && (
                  <Chip 
                    label={`${selectedFeatureIds.length} đã chọn`} 
                    size="small"
                    sx={{
                      background: 'linear-gradient(135deg, #7b68ee, #9b59b6)',
                      color: 'white',
                      fontWeight: 600,
                    }}
                    onDelete={() => setSelectedFeatureIds([])}
                  />
                )}
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
                  Công Việc
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => router.push(`/projects/${projectId}/functions`)}
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
                  Chức năng
                </Button>
                
                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                
                {!isSupervisor && (
                  <>
                    {selectedFeatureIds.length > 0 && (
                      <Button 
                        variant="contained" 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setOpenMilestoneFromFeaturesDialog(true);
                        }}
                        sx={{ 
                          bgcolor: '#10b981',
                          color: 'white',
                          textTransform: 'none',
                          fontWeight: 600,
                          fontSize: '14px',
                          px: 2.5,
                          py: 1,
                          borderRadius: 1.5,
                          boxShadow: 'none',
                          '&:hover': { 
                            bgcolor: '#059669',
                          },
                        }}
                      >
                        Tạo Milestone
                      </Button>
                    )}
                    <Button 
                      variant="contained" 
                      onClick={handleOpenForm}
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
                      Tạo tính năng
                    </Button>
                  </>
                )}
              </Stack>
            </Box>
          </Box>

          {/* Toolbar with Search and Filters - matched to Functions page */}
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
                placeholder="Tìm kiếm tính năng..."
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
                badgeContent={[filterStatus !== 'all', filterPriority !== 'all', searchTerm].filter(Boolean).length || 0}
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
              Hiển thị: {filteredFeatures.length} {filteredFeatures.length !== features.length && `trong ${features.length}`} tính năng
            </Typography>
          </Box>

          {/* Filters Popover - matched to Functions page */}
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
                      Bộ lọc tính năng
              </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', ml: 6 }}>
                    Tinh chỉnh danh sách tính năng của bạn
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
                    Status
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
                      {statuses.map((status) => (
                        <MenuItem key={status._id} value={status._id}>
                          {status.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                
                <Box>
                  <Typography variant="caption" sx={{ mb: 1.5, display: 'block', fontWeight: 700, color: '#2d3748', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Priority
                  </Typography>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: '#6b7280', '&.Mui-focused': { color: '#8b5cf6' } }}>Ưu tiên</InputLabel>
                    <Select
                      value={filterPriority}
                      label="Ưu tiên"
                      onChange={(e) => setFilterPriority(e.target.value)}
                      sx={{
                        borderRadius: 2.5,
                        bgcolor: 'white',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0', borderWidth: '1.5px' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#b4a7f5' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8b5cf6', borderWidth: '2px' },
                      }}
                    >
                      <MenuItem value="all">Tất cả</MenuItem>
                      {priorities.map((priority) => (
                        <MenuItem key={priority._id} value={priority._id}>
                          {priority.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Stack>
            </Box>

            {/* Footer */}
            {(filterStatus !== 'all' || filterPriority !== 'all') && (
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
                    setFilterPriority('all');
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

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          ) : error ? (
            <Box className="rounded-xl border border-red-500/40 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 p-4">
              {error}
            </Box>
          ) : (
            <Stack spacing={3}>
              {/* View Tabs */}
            

              {/* Table View Content */}
              {viewTab === 'table' && (
              <Paper variant="outlined" sx={{ p: 0 }}>
                <Box sx={{ overflowX: 'auto', width: '100%', '&::-webkit-scrollbar': { height: 8 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(0,0,0,0.3)', borderRadius: 8 } }}>
                <Table size="small" sx={{ minWidth: 1400, '& td, & th': { borderColor: 'var(--border)' } }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Tiêu đề</TableCell>
                      <TableCell sx={{ minWidth: 200 }}>Cột mốc</TableCell>
                      <TableCell>Bắt đầu - Hết hạn</TableCell>
                      <TableCell>Trạng thái</TableCell>
                      <TableCell>Ưu tiên</TableCell>
                      {!isSupervisor && <TableCell>Thao tác</TableCell>}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(paginatedFeatures || []).map((f, idx) => {
                      const pct = featureProgress.get(f._id as string) ?? 0;
                      const owners = [
                        { id: '1', name: 'A' },
                        { id: '2', name: 'B' },
                      ];
                      const due = (() => {
                        const ids = f.milestone_ids || [];
                        if (!ids.length) return undefined;
                        const ms = milestones.filter(m => ids.includes(m._id));
                        const latest = ms.reduce<string | undefined>((acc, m) => {
                          if (!m.deadline) return acc;
                          return !acc || new Date(m.deadline) > new Date(acc) ? m.deadline : acc;
                        }, undefined);
                        return latest;
                      })();
                      const dueDateText = due ? new Date(due).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
                      const statusName = typeof f.status === 'string' ? f.status : (typeof f.status === 'object' ? (f.status as any)?.name : '');
                      const priorityName = typeof f.priority === 'string' ? f.priority : (typeof f.priority
                         === 'object' ? f.priority?.name : '');
                      const statusChip = (
                        <Chip
                          size="small"
                          label={statusName || '-'}
                          sx={{
                            color: '#fff',
                            bgcolor: statusName === 'Done' ? '#22c55e' : statusName === 'Doing' ? '#f59e0b' : '#6b7280',
                            fontWeight: 600,
                          }}
                        />
                      );
                      return (
                        <TableRow key={f._id || idx} hover>
                          <TableCell sx={{ fontWeight: 600 }} onDoubleClick={() => !isSupervisor && startEditCell(f, 'title')}>
                            {editingId === f._id && editingField === 'title' ? (
                              <TextField
                                size="small"
                                value={editDraft.title}
                                onChange={(e) => setEditDraft(s => ({ ...s, title: e.target.value }))}
                                fullWidth
                                onBlur={() => saveEditRow(f._id as string)}
                              />
                            ) : (
                              <Tooltip title={f.title || ''}>
                                <Link
                                  component="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFeatureModal({ open: true, featureId: f._id });
                                  }}
                                  sx={{
                                    fontWeight: 600,
                                    color: '#7b68ee',
                                    textDecoration: 'none',
                                    cursor: 'pointer',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: 100,
                                    display: 'block',
                                    '&:hover': {
                                      textDecoration: 'underline',
                                      color: '#6952d6',
                                    }
                                  }}
                                >
                                  {f.title || '...'}
                                </Link>
                              </Tooltip>
                            )}
                          </TableCell>
                          
                         
                          
                          <TableCell onDoubleClick={() => !isSupervisor && startEditCell(f, 'milestone_ids')}>
                            {editingId === f._id && editingField === 'milestone_ids' ? (
                              <Select
                                size="small"
                                multiple
                                value={f.milestone_ids || []}
                                onChange={async (e) => {
                                  const newMilestoneIds = e.target.value as string[];
                                  try {
                                    // Xóa tất cả liên kết cũ và tạo mới
                                    await axiosInstance.delete(`/api/features/${f._id}/milestones`).catch(() => null);
                                    if (newMilestoneIds.length > 0) {
                                      await axiosInstance.post(`/api/features/${f._id}/milestones`, {
                                        milestone_ids: newMilestoneIds
                                      });
                                    }
                                    setFeatures(prev => prev.map(x => 
                                      x._id === f._id ? { ...x, milestone_ids: newMilestoneIds } : x
                                    ));
                                    setEditingId(null);
                                    setEditingField(null);
                                    toast.success("Đã cập nhật cột mốc thành công");
                                  } catch (err: any) {
                                    console.error('Error updating milestones:', err);
                                    toast.error(err?.response?.data?.message || "Không thể cập nhật cột mốc");
                                  }
                                }}
                                renderValue={(selected) => (
                                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                    {(selected as string[]).map((id) => {
                                      const m = milestones.find(m => m._id === id);
                                      return <Chip key={id} label={m?.title || id} size="small" />;
                                    })}
                                  </Box>
                                )}
                              >
                                {milestones.map((m) => (
                                  <MenuItem key={m._id} value={m._id}>
                                    <Checkbox checked={(f.milestone_ids || []).includes(m._id)} />
                                    {m.title}
                                  </MenuItem>
                                ))}
                              </Select>
                            ) : (
                              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {f.milestone_ids && f.milestone_ids.length > 0 ? (
                                  [...new Set(f.milestone_ids)].map((mid) => {
                                    const m = milestones.find(m => m._id === mid);
                                    return (
                                      <Chip
                                        key={mid}
                                        label={m?.title || mid}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                      />
                                    );
                                  })
                                ) : (
                                  <Typography variant="body2" color="text.secondary">—</Typography>
                                )}
                              </Box>
                            )}
                          </TableCell>
                          
                          
                          <TableCell>
                            <Stack direction="column" spacing={0.5}>
                              <Typography variant="caption" color="text.secondary">
                                {f.start_date ? new Date(f.start_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                              {f.end_date ? new Date(f.end_date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
                              </Typography>
                            </Stack>
                          </TableCell>
                          
                          <TableCell>
                            {statusChip}
                          
                          </TableCell>
                          
                          <TableCell onClick={() => !isSupervisor && startEditCell(f, 'priority')} sx={{ cursor: isSupervisor ? 'default' : 'pointer' }}>
                            {editingId === f._id && editingField === 'priority' ? (
                              <Select
                                size="small"
                                value={typeof f.priority === 'string' ? f.priority : (typeof f.priority === 'object' ? f.priority?._id : '')}
                                onChange={async (e) => {
                                  const newPriorityId = e.target.value;
                                  const priorityOption = getPriorityById(String(newPriorityId));
                                  const payloadPriority = priorityOption?._id || String(newPriorityId);
                                  try {
                                    await axiosInstance.patch(`/api/features/${f._id}`, { priority: payloadPriority });
                                    setFeatures(prev => prev.map(x =>       
                                      x._id === f._id ? { ...x, priority: payloadPriority } : x
                                    ));
                                    cancelEditRow();
                                    toast.success("Đã cập nhật ưu tiên thành công");
                                  } catch (err: any) {
                                    console.error('Error updating priority:', err);
                                    toast.error(err?.response?.data?.message || "Không thể cập nhật ưu tiên");
                                  }
                                }}
                                onBlur={cancelEditRow}
                                autoFocus
                                fullWidth
                              >
                                {priorities.map((p) => (
                                  <MenuItem key={p._id} value={p._id}>
                                    {p.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            ) : (
                              <Chip
                                label={priorityName || '-'}
                                size="small"
                                color={
                                  priorityName === 'Critical' ? 'error' :
                                  priorityName === 'High' ? 'warning' :
                                  priorityName === 'Medium' ? 'primary' : 'default'
                                }
                                variant="outlined"
                              />
                            )}
                          </TableCell>
                          
                          {!isSupervisor && (
                            <TableCell>
                              <Stack direction="row" spacing={0.5}>
                                <Tooltip title="Xem Functions của Feature này">
                                <IconButton
                                  size="small"
                                  color="primary"
                                    onClick={() => {
                                      router.push(`/projects/${projectId}/functions?featureId=${f._id}`);
                                    }}
                                  >
                                    <FunctionsIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Xem Tasks của Feature này">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => {
                                      router.push(`/projects/${projectId}/tasks?featureId=${f._id}`);
                                    }}
                                  >
                                    <AssignmentIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Xóa Feature">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (f._id) {
                                      handleDeleteFeature(f._id);
                                    }
                                  }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              </Stack>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </Box>
                
                {/* Pagination Controls */}
                {filteredFeatures.length > 0 && (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    px: 3,
                    py: 2,
                    borderTop: '1px solid #e8e9eb',
                    bgcolor: '#fafbfc'
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2" sx={{ color: '#6b7280', fontWeight: 500 }}>
                        Hiển thị {((page - 1) * rowsPerPage) + 1} - {Math.min(page * rowsPerPage, filteredFeatures.length)} trong tổng số {filteredFeatures.length} tính năng
                      </Typography>
                      <FormControl size="small" sx={{ minWidth: 120 }}>
                        <Select
                          value={rowsPerPage}
                          onChange={(e) => {
                            setRowsPerPage(Number(e.target.value));
                            setPage(1);
                          }}
                          sx={{
                            fontSize: '13px',
                            '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
                            '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#b4a7f5' },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#8b5cf6' },
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
                      count={Math.ceil(filteredFeatures.length / rowsPerPage)}
                      page={page}
                      onChange={(event, value) => setPage(value)}
                      color="primary"
                      shape="rounded"
                      sx={{
                        '& .MuiPaginationItem-root': {
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#49516f',
                          '&.Mui-selected': {
                            background: 'linear-gradient(135deg, #7b68ee, #9b59b6)',
                            color: 'white',
                            '&:hover': {
                              background: 'linear-gradient(135deg, #6b5dd6, #8b49a6)',
                            }
                          },
                          '&:hover': {
                            bgcolor: '#f3f0ff',
                          }
                        }
                      }}
                    />
                  </Box>
                )}
              </Paper>
              )}

              {viewTab === 'table' && features.length === 0 && (
                <Paper variant="outlined" sx={{ p: 2 }}>
                  <Typography variant="body2" sx={{ opacity: 0.7 }}>
                    Chưa có feature nào. Bấm "Tạo tính năng" để thêm.
                  </Typography>
                </Paper>
              )}
            </Stack>
          )}

          <Dialog open={openForm} onClose={() => setOpenForm(false)} fullWidth maxWidth="md">
            <DialogTitle sx={{ fontWeight: 'bold' }}>
              Tạo tính năng Mới - Lên Kế Hoạch
              <Box component="span" sx={{ display: 'block', fontSize: '0.75rem', color: 'text.secondary', fontWeight: 'normal', mt: 0.5 }}>
                Tạo tính năng và gắn vào milestone để lên kế hoạch dự án
              </Box>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 2 }}>
                <TextField
                  label="Tiêu đề *"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  fullWidth
                  placeholder="VD: User Authentication"
                />
                
                <TextField
                  label="Mô tả"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Mô tả chi tiết về feature này..."
                />
                
                {/* Note: Plan Effort field removed - doesn't exist in model */}    
                
                <Divider />
                
                <Stack direction="row" spacing={2}>
                  <FormControl fullWidth>
                    <InputLabel id="priority-label">Ưu tiên</InputLabel>
                    <Select
                      labelId="priority-label"
                      label="Ưu tiên"
                      value={form.priority || ''}
                      onChange={(e) => setForm(prev => ({ ...prev, priority: e.target.value }))}
                    >
                      {priorities.length === 0 ? (
                        <MenuItem disabled>Đang tải...</MenuItem>
                      ) : (
                        priorities.map((p) => (
                          <MenuItem key={p._id} value={p._id}>
                            {p.name}
                          </MenuItem>
                        ))
                      )}
                    </Select>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                      {priorities.length} tùy chọn
                    </Typography>
                  </FormControl>
                  
                  {/* Note: Complexity and Estimated Hours fields removed - don't exist in model */}
                </Stack>
                
                <Divider />
                
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="Ngày bắt đầu"
                    type="date"
                    value={form.start_date || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, start_date: e.target.value }))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                  <TextField
                    label="Ngày kết thúc"
                    type="date"
                    value={form.end_date || ''}
                    onChange={(e) => setForm(prev => ({ ...prev, end_date: e.target.value }))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                  />
                </Stack>
                
                <Divider>
                  <Chip label="Gắn vào Milestone" size="small" />
                </Divider>
                
                <FormControl fullWidth>
                  <InputLabel id="milestone-select-label">Chọn Milestones</InputLabel>
                  <Select
                    labelId="milestone-select-label"
                    label="Chọn Milestones"
                    multiple
                    value={form.milestone_ids || []}
                    onChange={(e) => setForm(prev => ({ ...prev, milestone_ids: e.target.value as string[] }))}
                    renderValue={(selected) => (
                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        {(selected as string[]).map((id) => {
                          const m = milestoneOptions.find(o => o.id === id);
                          return <Chip key={id} label={m?.label || id} size="small" color="primary" />;
                        })}
                      </Stack>
                    )}
                  >
                    {milestoneOptions.map((m) => (
                      <MenuItem key={m.id} value={m.id}>
                        <Checkbox checked={(form.milestone_ids || []).includes(m.id)} />
                        {m.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                {(form.milestone_ids || []).length === 0 && (
                  <Alert severity="info">
                    💡 Tip: Gắn feature vào milestone để dễ quản lý timeline và theo dõi tiến độ
                  </Alert>
                )}
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenForm(false)}>Hủy</Button>
              <Button 
                variant="contained" 
                onClick={handleCreateFeature}
                disabled={!form.title}
              >
                Tạo tính năng
              </Button>
            </DialogActions>
          </Dialog>

          <CreateMilestoneFromFeatures
            open={openMilestoneFromFeaturesDialog}
            onClose={() => setOpenMilestoneFromFeaturesDialog(false)}
            projectId={projectId}
            selectedFeatures={selectedFeatures.filter(f => f._id) as any}
            onSuccess={async () => {
              setSelectedFeatureIds([]);
              setOpenMilestoneFromFeaturesDialog(false);
              // Reload milestones and features
              try {
                const [milestoneRes, featureRes] = await Promise.all([
                  axiosInstance.get(`/api/projects/${projectId}/milestones`).catch(() => ({ data: [] })),
                  axiosInstance.get(`/api/projects/${projectId}/features`).catch(() => ({ data: [] })),
                ]);
                const milestonesList = Array.isArray(milestoneRes.data) && milestoneRes.data.length > 0 ? milestoneRes.data : [];
                setMilestones(milestonesList);
                
                if (Array.isArray(featureRes.data)) {
                  const enriched: Feature[] = await Promise.all(
                    featureRes.data.map(async (f: any) => {
                      try {
                        const linkRes = await axiosInstance.get(`/api/features/${f._id}/milestones`);
                        const uniqueMilestoneIds = Array.isArray(linkRes.data) ? [...new Set(linkRes.data)] : [];
                        return { ...f, milestone_ids: uniqueMilestoneIds } as Feature;
                      } catch {
                        return { ...f, milestone_ids: [] } as Feature;
                      }
                    })
                  );
                  setFeatures(enriched);
                }
                toast.success('Tạo milestone thành công');
              } catch (error) {
                console.error('Error reloading data:', error);
              }
            }}
          />

          {/* Feature Detail Dialog */}
          <Dialog 
            open={openFeatureDetail} 
            onClose={() => {
              setOpenFeatureDetail(false);
              setSelectedFeatureDetail(null);
            }} 
            maxWidth="md" 
            fullWidth
          >
            <DialogTitle sx={{ fontWeight: 'bold' }}>
              Chi tiết tính năng
            </DialogTitle>
            <DialogContent>
            {selectedFeatureDetail && (
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Tiêu đề
                  </Typography>
                  <Typography variant="h6" fontWeight={600}>
                    {selectedFeatureDetail.title}
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Mô tả
                  </Typography>
                  <Typography variant="body1">
                    {selectedFeatureDetail.description || '—'}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={3}>
                  <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                      Trạng thái
                    </Typography>
                    <Chip
                      label={typeof selectedFeatureDetail.status === 'string' ? selectedFeatureDetail.status : (typeof selectedFeatureDetail.status === 'object' ? selectedFeatureDetail.status?.name : '-')}
                      size="medium"
                      sx={{
                        color: '#fff',
                        bgcolor: selectedFeatureDetail.status === 'Completed' ? '#22c55e' : 
                                 selectedFeatureDetail.status === 'In Progress' ? '#f59e0b' : 
                                 selectedFeatureDetail.status === 'Testing' ? '#8b5cf6' : '#3b82f6',
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                  <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                      Ưu tiên
                    </Typography>
                    <Chip
                      label={typeof selectedFeatureDetail.priority === 'string' ? selectedFeatureDetail.priority : (typeof selectedFeatureDetail.priority === 'object' ? selectedFeatureDetail.priority?.name : '-')}
                      size="medium"
                      color={
                        selectedFeatureDetail.priority === 'Critical' ? 'error' :
                        selectedFeatureDetail.priority === 'High' ? 'warning' :
                        selectedFeatureDetail.priority === 'Medium' ? 'primary' : 'default'
                      }
                      variant="outlined"
                    />
                  </Box>
                  {/* Note: Complexity, Estimated Hours, Actual Effort fields removed */}
                </Stack>

                <Stack direction="row" spacing={3}>
                  <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                      Ngày bắt đầu
                    </Typography>
                    <Typography variant="body1">
                      {selectedFeatureDetail.start_date ? new Date(selectedFeatureDetail.start_date).toLocaleDateString('vi-VN') : '—'}
                    </Typography>
                  </Box>
                  <Box flex={1}>
                    <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                      Ngày kết thúc
                    </Typography>
                    <Typography variant="body1">
                      {selectedFeatureDetail.end_date ? new Date(selectedFeatureDetail.end_date).toLocaleDateString('vi-VN') : '—'}
                    </Typography>
                  </Box>
                </Stack>

                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                    Người tạo
                  </Typography>
                  <Typography variant="body1">
                    {typeof selectedFeatureDetail.created_by === 'object' ? selectedFeatureDetail.created_by?.full_name : '—'}
                  </Typography>
                </Box>

                  <Stack direction="row" spacing={3}>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        Ngày tạo
                      </Typography>
                      <Typography variant="body2">
                        {selectedFeatureDetail.createdAt ? new Date(selectedFeatureDetail.createdAt).toLocaleString('vi-VN') : '—'}
                      </Typography>
                    </Box>
                    <Box flex={1}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                        Ngày cập nhật
                      </Typography>
                      <Typography variant="body2">
                        {selectedFeatureDetail.updatedAt ? new Date(selectedFeatureDetail.updatedAt).toLocaleString('vi-VN') : '—'}
                      </Typography>
                    </Box>
                  </Stack>

                  {selectedFeatureDetail.milestone_ids && selectedFeatureDetail.milestone_ids.length > 0 && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                        Cột mốc liên kết
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        {[...new Set(selectedFeatureDetail.milestone_ids)].map((milestoneId) => {
                          const milestone = milestones.find(m => m._id === milestoneId);
                          return (
                            <Chip
                              key={milestoneId}
                              label={milestone?.title || milestoneId}
                              size="small"
                              variant="outlined"
                              color="primary"
                            />
                          );
                        })}
                      </Stack>
                    </Box>
                  )}
                </Stack>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => {
                setOpenFeatureDetail(false);
                setSelectedFeatureDetail(null);
              }}>
                Đóng
              </Button>
              {selectedFeatureDetail && (
              <Button
                variant="contained"
                  onClick={() => {
                    setOpenFeatureDetail(false);
                    setFeatureModal({ open: true, featureId: selectedFeatureDetail._id });
                  }}
                >
                  Chi tiết
              </Button>
              )}
            </DialogActions>
          </Dialog>

          {/* Feature Details Modal */}
          {featureModal.open && featureModal.featureId && (
            <FeatureDetailsModal
              open={featureModal.open}
              featureId={featureModal.featureId}
              projectId={projectId}
              readonly={isSupervisor}
              onClose={() => setFeatureModal({ open: false, featureId: null })}
              onUpdate={async () => {
                // Reload features
                try {
                  const featureRes = await axiosInstance.get(`/api/projects/${projectId}/features`);
                  if (Array.isArray(featureRes.data)) {
                    const enriched: Feature[] = await Promise.all(
                      featureRes.data.map(async (f: any) => {
                        try {
                          const linkRes = await axiosInstance.get(`/api/features/${f._id}/milestones`);
                          const uniqueMilestoneIds = Array.isArray(linkRes.data) ? [...new Set(linkRes.data)] : [];
                          return { ...f, milestone_ids: uniqueMilestoneIds } as Feature;
                        } catch {
                          return { ...f, milestone_ids: [] } as Feature;
                        }
                      })
                    );
                    setFeatures(enriched);
                    toast.success("Đã tạo cột mốc từ features thành công");
                  }
                } catch (error: any) {
                  console.error('Error reloading features:', error);
                  toast.error(error?.response?.data?.message || "Không thể tải lại danh sách features");
                }
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}



