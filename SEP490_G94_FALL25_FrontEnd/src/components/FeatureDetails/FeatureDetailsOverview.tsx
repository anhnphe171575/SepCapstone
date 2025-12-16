"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Stack,
  Avatar,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";

interface FeatureDetailsOverviewProps {
  feature: any;
  onUpdate: (updates: any) => Promise<void>;
  projectId?: string;
  readonly?: boolean;
}

export default function FeatureDetailsOverview({ feature, onUpdate, projectId, readonly = false }: FeatureDetailsOverviewProps) {
  const [editing, setEditing] = useState(false);
  const [description, setDescription] = useState(feature?.description || '');

  // Update description when feature changes
  useEffect(() => {
    setDescription(feature?.description || '');
  }, [feature?.description]);

  const handleSave = async () => {
    try {
      await onUpdate({ description });
      setEditing(false);
    } catch (error) {
      console.error("Error saving:", error);
    }
  };

  const handleCancel = () => {
    setDescription(feature?.description || '');
    setEditing(false);
  };

  return (
    <Box>
      {/* Description Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography fontSize="13px" fontWeight={700} color="#6b7280" textTransform="uppercase">
            Mô tả
          </Typography>
          {!editing && !readonly && (
            <Button 
              size="small"
              startIcon={<EditIcon sx={{ fontSize: 16 }} />}
              onClick={() => setEditing(true)}
              sx={{ 
                textTransform: 'none', 
                fontSize: '13px',
                fontWeight: 600,
                color: '#6b7280',
                '&:hover': { bgcolor: '#f3f4f6' }
              }}
            >
              Chỉnh sửa
            </Button>
          )}
        </Box>
        
        {editing ? (
          <Box>
            <TextField 
              fullWidth
              multiline
              rows={8}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Thêm mô tả chi tiết hơn..."
              sx={{ 
                mb: 2,
                '& .MuiOutlinedInput-root': { 
                  borderRadius: 2,
                  fontSize: '14px',
                  '&:hover fieldset': {
                    borderColor: '#7b68ee',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#7b68ee',
                  }
                } 
              }}
            />
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button 
                size="small"
                onClick={handleCancel}
                sx={{ 
                  textTransform: 'none', 
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#6b7280'
                }}
              >
                Hủy
              </Button>
              <Button 
                size="small"
                variant="contained"
                onClick={handleSave}
                sx={{ 
                  textTransform: 'none', 
                  fontSize: '13px',
                  fontWeight: 600,
                  bgcolor: '#7b68ee',
                  '&:hover': { bgcolor: '#6952d6' }
                }}
              >
                Lưu thay đổi
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box 
            sx={{ 
              p: 2.5,
              bgcolor: '#fafbfc',
              borderRadius: 2,
              border: '1px solid #e8e9eb',
              minHeight: 120,
              cursor: readonly ? 'default' : 'text',
              '&:hover': {
                borderColor: readonly ? '#e8e9eb' : '#d1d5db',
                bgcolor: readonly ? '#fafbfc' : '#f9fafb'
              }
            }}
            onClick={() => {
              if (!readonly) {
                setEditing(true);
              }
            }}
          >
            {feature?.description ? (
              <Typography 
                fontSize="14px" 
                color="text.primary"
                sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
              >
                {feature.description}
              </Typography>
            ) : (
              <Typography fontSize="14px" color="text.secondary" fontStyle="italic">
                Nhấp để thêm mô tả...
              </Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Dates */}
      {(feature?.start_date || feature?.end_date) && (
        <Box>
          <Typography fontSize="13px" fontWeight={700} color="#6b7280" textTransform="uppercase" sx={{ mb: 2 }}>
            Ngày tháng
          </Typography>
          
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 2
          }}>
            {feature?.start_date && (
              <Box sx={{ 
                p: 2,
                bgcolor: '#fafbfc',
                borderRadius: 2,
                border: '1px solid #e8e9eb',
              }}>
                <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                  Ngày bắt đầu
                </Typography>
                <Typography fontSize="14px" fontWeight={600} color="text.primary">
                  {new Date(feature.start_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </Typography>
              </Box>
            )}

            {feature?.end_date && (
              <Box sx={{ 
                p: 2,
                bgcolor: feature?.end_date && new Date(feature.end_date) < new Date() ? '#fef3c7' : '#fafbfc',
                borderRadius: 2,
                border: `1px solid ${feature?.end_date && new Date(feature.end_date) < new Date() ? '#fbbf24' : '#e8e9eb'}`,
              }}>
                <Typography fontSize="12px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
                  Ngày kết thúc
                </Typography>
                <Typography 
                  fontSize="14px" 
                  fontWeight={600} 
                  color={feature?.end_date && new Date(feature.end_date) < new Date() ? '#92400e' : 'text.primary'}
                >
                  {new Date(feature.end_date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}

