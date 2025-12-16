"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  Link as MuiLink,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import VisibilityIcon from "@mui/icons-material/Visibility";
import axiosInstance from "../../../ultis/axios";
import FunctionDetailsModal from "../FunctionDetailsModal";
import { STATUS_OPTIONS, PRIORITY_OPTIONS } from "@/constants/settings";

interface FeatureDetailsFunctionsProps {
  featureId: string | null;
  projectId?: string;
  readonly?: boolean;
}

export default function FeatureDetailsFunctions({
  featureId,
  projectId,
  readonly = false,
}: FeatureDetailsFunctionsProps) {
  const [functions, setFunctions] = useState<any[]>([]);
  const [statusTypes, setStatusTypes] = useState<any[]>([]);
  const [priorityTypes, setPriorityTypes] = useState<any[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    priority: "",
  });
  const [loading, setLoading] = useState(false);
  const [functionModal, setFunctionModal] = useState<{ open: boolean; functionId?: string | null }>({ 
    open: false, 
    functionId: null 
  });

  // Load functions and settings
  useEffect(() => {
    if (featureId && projectId) {
      loadFunctions();
      // Load constants instead of API call
      setStatusTypes(STATUS_OPTIONS);
      setPriorityTypes(PRIORITY_OPTIONS);
    }
  }, [featureId, projectId]);

  const loadFunctions = async () => {
    if (!featureId || !projectId) return;
    try {
      const response = await axiosInstance.get(`/api/projects/${projectId}/features/${featureId}/functions`);
      
      setFunctions(Array.isArray(response.data?.functions) ? response.data.functions : []);
    } catch (error) {
      console.error('Error loading functions:', error);
      setFunctions([]); 
    }
  };

  const handleCreate = async () => {
    if (!form.title) return;
    
    try {
      setLoading(true);
      await axiosInstance.post(`/api/projects/${projectId}/functions`, {
        ...form,
        feature_id: featureId,
        // Status không cho phép chỉnh sửa thủ công, chỉ tự động cập nhật từ tasks
      });
      setOpenDialog(false);
      setForm({ title: "", description: "", priority: "" });
      loadFunctions();
    } catch (error: any) {
      console.error("Error creating function:", error);
      alert(error?.response?.data?.message || "Cannot create function");
    } finally {
      setLoading(false);
    }
  };

  const resolveStatusName = (status: any) => {
    if (!status) return "-";
    if (typeof status === "object") return status?.name || "-";
    const match = statusTypes.find(s => String(s._id) === String(status));
    return match?.name || "-";
  };

  const resolvePriorityName = (priority: any) => {
    if (!priority) return "-";
    if (typeof priority === "object") return priority?.name || "-";
    const match = priorityTypes.find(p => String(p._id) === String(priority));
    return match?.name || "-";
  };

  const getStatusColor = (statusName: string) => {
    const statusLower = statusName.toLowerCase();
    if (statusLower.includes('completed') || statusLower.includes('done')) return '#16a34a';
    if (statusLower.includes('progress') || statusLower.includes('doing')) return '#f59e0b';
    if (statusLower.includes('overdue') || statusLower.includes('blocked')) return '#ef4444';
    return '#9ca3af';
  };

  const getPriorityColor = (priorityName: string) => {
    const priorityLower = priorityName.toLowerCase();
    if (priorityLower.includes('critical') || priorityLower.includes('high')) return '#ef4444';
    if (priorityLower.includes('medium')) return '#f59e0b';
    return '#3b82f6';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography fontSize="13px" fontWeight={700} color="#6b7280" textTransform="uppercase">
          Chức năng ({functions.length})
        </Typography>
        {!readonly && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
            size="small"
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              bgcolor: '#7b68ee',
              '&:hover': { bgcolor: '#6952d6' }
            }}
          >
            Thêm chức năng
          </Button>
        )}
      </Box>

      {functions.length === 0 ? (
        <Box sx={{ 
          p: 6, 
          textAlign: 'center',
          bgcolor: '#fafbfc',
          borderRadius: 2,
          border: '1px dashed #e8e9eb'
        }}>
          <Typography fontSize="14px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
            Chưa có chức năng nào
          </Typography>
          {!readonly && (
            <>
              <Typography fontSize="12px" color="text.secondary" sx={{ mb: 2 }}>
                Tạo chức năng đầu tiên để bắt đầu
              </Typography>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setOpenDialog(true)}
                sx={{
                  textTransform: 'none',
                  borderColor: '#7b68ee',
                  color: '#7b68ee',
                  '&:hover': {
                    borderColor: '#6952d6',
                    bgcolor: '#7b68ee15'
                  }
                }}
              >
                Thêm chức năng
              </Button>
            </>
          )}
        </Box>
      ) : (
        <Table sx={{ tableLayout: 'fixed' }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: '#6b7280', width: '60px' }}>STT</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: '#6b7280' }}>Chức năng</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: '#6b7280', width: '120px' }}>Ưu tiên</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: '#6b7280', width: '120px' }}>Trạng thái</TableCell>
              <TableCell sx={{ fontWeight: 600, fontSize: '13px', color: '#6b7280', width: '160px' }}>Thao tác</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {functions.map((func, index) => (
              <TableRow 
                key={func._id} 
                hover
                onClick={() => setFunctionModal({ open: true, functionId: func._id })}
                sx={{ cursor: 'pointer' }}
              >
                <TableCell>
                  <Typography 
                    sx={{ 
                      fontSize: '13px', 
                      fontWeight: 600, 
                      color: '#7b68ee',
                      cursor: 'pointer',
                      '&:hover': { 
                        textDecoration: 'underline',
                        color: '#6b5bd6'
                      }
                    }}
                  >
                    {index + 1}
                  </Typography>
                </TableCell>
                <TableCell sx={{ overflow: 'hidden' }}>
                  <Typography 
                    variant="body2" 
                    fontWeight={600} 
                    fontSize="14px" 
                    color="#1f2937"
                    sx={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'block',
                      width: '100%'
                    }}
                  >
                    {func.title}
                  </Typography>
                </TableCell>
                <TableCell>
                  {func.priority ? (
                    <Chip 
                      label={resolvePriorityName(func.priority)} 
                      size="small"
                      sx={{
                        height: 24,
                        fontSize: '12px',
                        fontWeight: 600,
                        bgcolor: `${getPriorityColor(resolvePriorityName(func.priority))}15`,
                        color: getPriorityColor(resolvePriorityName(func.priority)),
                        border: `1px solid ${getPriorityColor(resolvePriorityName(func.priority))}40`,
                      }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary" fontSize="13px">—</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip 
                    label={resolveStatusName(func.status)} 
                    size="small"
                    sx={{
                      height: 24,
                      fontSize: '12px',
                      fontWeight: 600,
                      bgcolor: `${getStatusColor(resolveStatusName(func.status))}15`,
                      color: getStatusColor(resolveStatusName(func.status)),
                      border: `1px solid ${getStatusColor(resolveStatusName(func.status))}40`,
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<VisibilityIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFunctionModal({ open: true, functionId: func._id });
                    }}
                    sx={{
                      textTransform: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#7b68ee',
                      px: 2.5,
                      py: 0.75,
                      '&:hover': { bgcolor: '#f3f4f6' }
                    }}
                  >
                    Chi tiết
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Create Function Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Tạo chức năng mới</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Tên chức năng *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Mô tả"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <FormControl fullWidth>
              <InputLabel>Ưu tiên</InputLabel>
              <Select
                value={form.priority}
                label="Ưu tiên"
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
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
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Hủy</Button>
          <Button 
            variant="contained" 
            onClick={handleCreate}
            disabled={!form.title || loading}
            sx={{ bgcolor: '#7b68ee', '&:hover': { bgcolor: '#6952d6' } }}
          >
            Tạo chức năng
          </Button>
        </DialogActions>
      </Dialog>

      {/* Function Details Modal */}
      {functionModal.open && functionModal.functionId && projectId && (
        <FunctionDetailsModal
          open={functionModal.open}
          functionId={functionModal.functionId}
          projectId={projectId}
          readonly={readonly}
          onClose={() => setFunctionModal({ open: false, functionId: null })}
          onUpdate={() => {
            loadFunctions();
          }}
        />
      )}
    </Box>
  );
}

