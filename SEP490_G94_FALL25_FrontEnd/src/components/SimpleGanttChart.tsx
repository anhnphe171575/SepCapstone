"use client";

import React from 'react';
import { Box, Typography, Paper, Chip, Stack } from '@mui/material';

type GanttData = {
  name: string;
  start: number;
  end: number;
  duration: number;
  status: 'completed' | 'in-progress' | 'planned' | 'overdue';
  progress: number;
  feature_id: string;
  feature_title: string;
  startDate?: string;
  endDate?: string;
};

type SimpleGanttChartProps = {
  data: GanttData[];
  title?: string;
  height?: number;
};

const SimpleGanttChart: React.FC<SimpleGanttChartProps> = ({ 
  data, 
  title = "Gantt Chart", 
  height = 400 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'in-progress': return '#f59e0b';
      case 'overdue': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Hoàn thành';
      case 'in-progress': return 'Đang thực hiện';
      case 'overdue': return 'Quá hạn';
      default: return 'Kế hoạch';
    }
  };

  if (!data || data.length === 0) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        <Paper variant="outlined" sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Không có dữ liệu để hiển thị Gantt Chart
          </Typography>
        </Paper>
      </Box>
    );
  }

  // Calculate max duration for scaling
  const maxDuration = Math.max(...data.map(item => item.end));
  const minStart = Math.min(...data.map(item => item.start));
  
  // Get actual dates for timeline scale
  const firstItem = data[0];
  const lastItem = data[data.length - 1];

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ height: height, overflow: 'auto' }}>
          <Stack spacing={2}>
            {data.map((item, index) => {
              const width = ((item.end - item.start) / (maxDuration - minStart)) * 100;
              const left = ((item.start - minStart) / (maxDuration - minStart)) * 100;
              
              return (
                <Box key={item.feature_id || index} sx={{ position: 'relative' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body2" sx={{ minWidth: 200, fontWeight: 600 }}>
                      {item.name}
                    </Typography>
                    <Chip 
                      label={getStatusText(item.status)} 
                      size="small" 
                      sx={{ 
                        bgcolor: getStatusColor(item.status),
                        color: 'white',
                        fontSize: '0.75rem',
                        ml: 1
                      }} 
                    />
                    <Typography variant="caption" sx={{ ml: 1 }}>
                      {item.progress}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                      {item.startDate && item.endDate ? `${item.startDate} - ${item.endDate}` : `Ngày ${item.start} - ${item.end}`}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ position: 'relative', height: 24, bgcolor: 'grey.100', borderRadius: 1, overflow: 'hidden' }}>
                    <Box
                      sx={{
                        position: 'absolute',
                        left: `${left}%`,
                        width: `${width}%`,
                        height: '100%',
                        bgcolor: getStatusColor(item.status),
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <Typography variant="caption" sx={{ color: 'white', fontWeight: 600, fontSize: '0.7rem' }}>
                        {item.duration} ngày
                      </Typography>
                    </Box>
                  </Box>
                  
                </Box>
              );
            })}
          </Stack>
        </Box>
        
        {/* Timeline scale */}
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Timeline: {firstItem?.startDate && lastItem?.endDate ? 
              `${firstItem.startDate} - ${lastItem.endDate}` : 
              `Ngày ${minStart} - ${maxDuration}`}
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default SimpleGanttChart;
