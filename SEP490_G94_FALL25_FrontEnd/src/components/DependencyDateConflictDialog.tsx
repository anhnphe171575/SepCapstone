import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Stack,
  Divider,
  Chip,
} from '@mui/material';
import { 
  WarningAmber as WarningIcon,
  AutoFixHigh as AutoFixIcon,
  Edit as EditIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

interface DependencyDateConflictDialogProps {
  open: boolean;
  onClose: () => void;
  onAutoFix: () => void;
  onManualEdit: () => void;
  violation: {
    message: string;
    suggestion?: string;
    current_start_date?: string;
    current_deadline?: string;
    required_start_date?: string;
    required_deadline?: string;
    predecessor_deadline?: string;
    predecessor_start_date?: string;
    lag_days?: number;
  };
  taskTitle?: string;
  predecessorTitle?: string;
}

export default function DependencyDateConflictDialog({
  open,
  onClose,
  onAutoFix,
  onManualEdit,
  violation,
  taskTitle = 'Current Task',
  predecessorTitle = 'Predecessor Task',
}: DependencyDateConflictDialogProps) {
  
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const calculateNewEndDate = () => {
    if (!violation.current_start_date || !violation.current_deadline || !violation.required_start_date) {
      return 'N/A';
    }
    
    const currentStart = new Date(violation.current_start_date);
    const currentEnd = new Date(violation.current_deadline);
    const newStart = new Date(violation.required_start_date);
    
    const duration = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));
    const newEnd = new Date(newStart);
    newEnd.setDate(newEnd.getDate() + duration);
    
    return newEnd.toLocaleDateString('vi-VN');
  };

  const calculateDuration = () => {
    if (!violation.current_start_date || !violation.current_deadline) {
      return 0;
    }
    
    const currentStart = new Date(violation.current_start_date);
    const currentEnd = new Date(violation.current_deadline);
    return Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));
  };

  const duration = calculateDuration();
  const newEndDate = calculateNewEndDate();

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }
      }}
    >
      <DialogTitle sx={{ 
        pb: 2, 
        pt: 3,
        px: 3,
      }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              bgcolor: '#fff3cd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <WarningIcon sx={{ fontSize: 24, color: '#ff9800' }} />
          </Box>
          <Box>
            <Typography fontSize="18px" fontWeight={700} color="text.primary">
              Xung Đột Ngày Tháng
            </Typography>
            <Typography fontSize="13px" color="text.secondary" sx={{ mt: 0.5 }}>
              Dependency Mandatory vi phạm quy tắc ngày tháng
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2 }}>
        <Stack spacing={2.5}>
          {/* Error Message */}
          <Alert 
            severity="warning" 
            icon={false}
            sx={{ 
              bgcolor: '#fff8e1',
              border: '1px solid #ffe082',
              borderRadius: 2,
            }}
          >
            <Typography fontSize="13px" fontWeight={600} color="#f57c00" sx={{ mb: 0.5 }}>
              ⚠️ Vấn Đề
            </Typography>
            <Typography fontSize="13px" color="text.primary">
              {violation.message}
            </Typography>
            {violation.suggestion && (
              <Typography fontSize="12px" color="text.secondary" sx={{ mt: 1 }}>
                💡 {violation.suggestion}
              </Typography>
            )}
          </Alert>

          <Divider />
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2.5, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{ 
            color: 'text.secondary',
            textTransform: 'none',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          Hủy
        </Button>

        <Box sx={{ flex: 1 }} />

       

        
      </DialogActions>
    </Dialog>
  );
}

