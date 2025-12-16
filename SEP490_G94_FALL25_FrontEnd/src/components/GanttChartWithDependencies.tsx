"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Typography, Tooltip, Chip, Paper } from "@mui/material";
import { ArrowForward, ArrowBack, SwapHoriz } from "@mui/icons-material";

interface Task {
  _id: string;
  title: string;
  start_date?: string;
  deadline?: string;
  status?: string;
  assignee_id?: any;
  progress?: number;
}

interface Dependency {
  _id: string;
  task_id: string;
  depends_on_task_id: any;
  dependency_type: 'FS' | 'FF' | 'SS' | 'SF';
}

interface GanttChartWithDependenciesProps {
  tasks: Task[];
  dependencies: Record<string, { dependencies: Dependency[]; dependents: Dependency[] }>;
  onTaskClick?: (taskId: string) => void;
}

export default function GanttChartWithDependencies({ 
  tasks, 
  dependencies,
  onTaskClick 
}: GanttChartWithDependenciesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);

  // Calculate date range
  const getDateRange = () => {
    if (tasks.length === 0) return { start: new Date(), end: new Date() };
    
    const dates = tasks
      .filter(t => t.start_date || t.deadline)
      .flatMap(t => [
        t.start_date ? new Date(t.start_date) : null,
        t.deadline ? new Date(t.deadline) : null
      ])
      .filter(Boolean) as Date[];
    
    if (dates.length === 0) return { start: new Date(), end: new Date() };
    
    const start = new Date(Math.min(...dates.map(d => d.getTime())));
    const end = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add padding
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() + 7);
    
    return { start, end };
  };

  const { start: startDate, end: endDate } = getDateRange();
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate task position and width
  const getTaskPosition = (task: Task) => {
    if (!task.start_date || !task.deadline) return null;
    
    const taskStart = new Date(task.start_date);
    const taskEnd = new Date(task.deadline);
    
    const startOffset = Math.ceil((taskStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const duration = Math.ceil((taskEnd.getTime() - taskStart.getTime()) / (1000 * 60 * 60 * 24));
    
    return {
      left: (startOffset / totalDays) * 100,
      width: Math.max((duration / totalDays) * 100, 2), // Minimum 2%
    };
  };

  // Get task color based on status
  const getTaskColor = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('done') || s.includes('completed')) return '#22c55e';
    if (s.includes('progress') || s.includes('doing')) return '#3b82f6';
    if (s.includes('review') || s.includes('testing')) return '#f59e0b';
    if (s.includes('blocked')) return '#ef4444';
    return '#94a3b8';
  };

  // Draw dependency arrows on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas size
    const container = canvas.parentElement;
    if (container) {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
    }
    
    // Draw dependency lines
    tasks.forEach((task, taskIndex) => {
      const taskDeps = dependencies[task._id];
      if (!taskDeps || !taskDeps.dependencies) return;
      
      taskDeps.dependencies.forEach(dep => {
        const dependsOnTask = tasks.find(t => t._id === dep.depends_on_task_id?._id);
        if (!dependsOnTask) return;
        
        const dependsOnIndex = tasks.findIndex(t => t._id === dependsOnTask._id);
        if (dependsOnIndex === -1) return;
        
        const fromPos = getTaskPosition(dependsOnTask);
        const toPos = getTaskPosition(task);
        
        if (!fromPos || !toPos) return;
        
        const rowHeight = 60;
        const barHeight = 32;
        const chartWidth = canvas.width - 250; // Assuming 250px for task names
        
        // Calculate connection points based on dependency type
        let fromX, fromY, toX, toY;
        
        const fromRowY = dependsOnIndex * rowHeight + rowHeight / 2;
        const toRowY = taskIndex * rowHeight + rowHeight / 2;
        
        switch (dep.dependency_type) {
          case 'FS': // Finish to Start
            fromX = 250 + (fromPos.left + fromPos.width) * chartWidth / 100;
            fromY = fromRowY;
            toX = 250 + toPos.left * chartWidth / 100;
            toY = toRowY;
            break;
          case 'SS': // Start to Start
            fromX = 250 + fromPos.left * chartWidth / 100;
            fromY = fromRowY;
            toX = 250 + toPos.left * chartWidth / 100;
            toY = toRowY;
            break;
          case 'FF': // Finish to Finish
            fromX = 250 + (fromPos.left + fromPos.width) * chartWidth / 100;
            fromY = fromRowY;
            toX = 250 + (toPos.left + toPos.width) * chartWidth / 100;
            toY = toRowY;
            break;
          case 'SF': // Start to Finish
            fromX = 250 + fromPos.left * chartWidth / 100;
            fromY = fromRowY;
            toX = 250 + (toPos.left + toPos.width) * chartWidth / 100;
            toY = toRowY;
            break;
          default:
            return;
        }
        
        // Highlight if hovered or selected
        const isHighlighted = hoveredTask === task._id || 
                             hoveredTask === dependsOnTask._id ||
                             selectedTask === task._id ||
                             selectedTask === dependsOnTask._id;
        
        // Draw curved arrow
        ctx.beginPath();
        ctx.strokeStyle = isHighlighted ? '#7b68ee' : '#cbd5e1';
        ctx.lineWidth = isHighlighted ? 3 : 2;
        
        // Draw S-curve
        const midX = (fromX + toX) / 2;
        ctx.moveTo(fromX, fromY);
        ctx.bezierCurveTo(midX, fromY, midX, toY, toX, toY);
        ctx.stroke();
        
        // Draw arrowhead
        const arrowSize = 8;
        const angle = Math.atan2(toY - fromY, toX - fromX);
        
        ctx.beginPath();
        ctx.moveTo(toX, toY);
        ctx.lineTo(
          toX - arrowSize * Math.cos(angle - Math.PI / 6),
          toY - arrowSize * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          toX - arrowSize * Math.cos(angle + Math.PI / 6),
          toY - arrowSize * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fillStyle = isHighlighted ? '#7b68ee' : '#cbd5e1';
        ctx.fill();
        
        // Draw dependency type label
        if (isHighlighted) {
          ctx.font = '10px Inter, sans-serif';
          ctx.fillStyle = '#7b68ee';
          ctx.fillText(dep.dependency_type, midX - 10, (fromY + toY) / 2 - 5);
        }
      });
    });
  }, [tasks, dependencies, hoveredTask, selectedTask, startDate, endDate, totalDays]);

  // Generate timeline header (months/weeks)
  const generateTimelineHeader = () => {
    const headers: { label: string; span: number }[] = [];
    const current = new Date(startDate);
    let currentMonth = current.getMonth();
    let dayCount = 0;
    
    while (current <= endDate) {
      if (current.getMonth() !== currentMonth) {
        headers.push({
          label: new Date(current.getFullYear(), currentMonth).toLocaleDateString('vi-VN', { 
            month: 'short', 
            year: 'numeric' 
          }),
          span: dayCount
        });
        currentMonth = current.getMonth();
        dayCount = 0;
      }
      dayCount++;
      current.setDate(current.getDate() + 1);
    }
    
    // Add last month
    if (dayCount > 0) {
      headers.push({
        label: new Date(endDate.getFullYear(), currentMonth).toLocaleDateString('vi-VN', { 
          month: 'short', 
          year: 'numeric' 
        }),
        span: dayCount
      });
    }
    
    return headers;
  };

  const timelineHeaders = generateTimelineHeader();

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', bgcolor: 'white' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '600px' }}>
        {/* Timeline Header */}
        <Box sx={{ 
          display: 'flex', 
          borderBottom: '2px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          bgcolor: 'white',
          zIndex: 10
        }}>
          <Box sx={{ width: 250, p: 2, borderRight: '1px solid #e5e7eb', fontWeight: 700 }}>
            Task Name
          </Box>
          <Box sx={{ 
            flex: 1, 
            display: 'flex',
            borderLeft: '1px solid #e5e7eb'
          }}>
            {timelineHeaders.map((header, idx) => (
              <Box 
                key={idx}
                sx={{ 
                  width: `${(header.span / totalDays) * 100}%`,
                  p: 1,
                  textAlign: 'center',
                  borderRight: '1px solid #e5e7eb',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#6b7280'
                }}
              >
                {header.label}
              </Box>
            ))}
          </Box>
        </Box>

        {/* Chart Area with Canvas Overlay */}
        <Box sx={{ flex: 1, position: 'relative', overflow: 'auto' }}>
          {/* Canvas for dependency lines */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
              zIndex: 1
            }}
          />
          
          {/* Task Rows */}
          <Box sx={{ position: 'relative', zIndex: 2 }}>
            {tasks.map((task, index) => {
              const position = getTaskPosition(task);
              const hasDependencies = dependencies[task._id]?.dependencies?.length > 0;
              const isDependedOn = dependencies[task._id]?.dependents?.length > 0;
              
              return (
                <Box 
                  key={task._id}
                  sx={{ 
                    display: 'flex',
                    minHeight: 60,
                    borderBottom: '1px solid #f3f4f6',
                    '&:hover': { bgcolor: '#fafbfc' }
                  }}
                  onMouseEnter={() => setHoveredTask(task._id)}
                  onMouseLeave={() => setHoveredTask(null)}
                  onClick={() => {
                    setSelectedTask(task._id === selectedTask ? null : task._id);
                    onTaskClick?.(task._id);
                  }}
                >
                  {/* Task Name Column */}
                  <Box sx={{ 
                    width: 250, 
                    p: 2, 
                    borderRight: '1px solid #e5e7eb',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 0.5
                  }}>
                    <Typography sx={{ 
                      fontSize: '13px', 
                      fontWeight: 600,
                      color: '#1f2937',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {task.title}
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {hasDependencies && (
                        <Chip 
                          icon={<ArrowBack sx={{ fontSize: 10 }} />}
                          label={dependencies[task._id].dependencies.length}
                          size="small"
                          sx={{ height: 18, fontSize: '10px', bgcolor: '#fee2e2', color: '#dc2626' }}
                        />
                      )}
                      {isDependedOn && (
                        <Chip 
                          icon={<ArrowForward sx={{ fontSize: 10 }} />}
                          label={dependencies[task._id].dependents.length}
                          size="small"
                          sx={{ height: 18, fontSize: '10px', bgcolor: '#dbeafe', color: '#2563eb' }}
                        />
                      )}
                    </Box>
                  </Box>

                  {/* Timeline Column */}
                  <Box sx={{ 
                    flex: 1, 
                    position: 'relative',
                    p: 2,
                    borderLeft: '1px solid #e5e7eb'
                  }}>
                    {position && (
                      <Tooltip 
                        title={
                          <Box>
                            <Typography fontSize="11px">{task.title}</Typography>
                            <Typography fontSize="10px" color="#d1d5db">
                              {new Date(task.start_date!).toLocaleDateString()} - {new Date(task.deadline!).toLocaleDateString()}
                            </Typography>
                            {task.progress !== undefined && (
                              <Typography fontSize="10px">Progress: {task.progress}%</Typography>
                            )}
                          </Box>
                        }
                        placement="top"
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `${position.left}%`,
                            width: `${position.width}%`,
                            height: 32,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            bgcolor: getTaskColor(task.status),
                            borderRadius: 1,
                            cursor: 'pointer',
                            boxShadow: hoveredTask === task._id || selectedTask === task._id
                              ? '0 4px 12px rgba(123, 104, 238, 0.4)'
                              : '0 1px 3px rgba(0,0,0,0.1)',
                            border: selectedTask === task._id ? '2px solid #7b68ee' : 'none',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              transform: 'translateY(-50%) scale(1.02)',
                            },
                            overflow: 'hidden'
                          }}
                        >
                          {/* Progress bar */}
                          {task.progress !== undefined && task.progress > 0 && (
                            <Box sx={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: `${task.progress}%`,
                              bgcolor: 'rgba(255,255,255,0.3)',
                            }} />
                          )}
                          
                          {/* Task label */}
                          <Typography sx={{
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'white',
                            textAlign: 'center',
                            px: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {task.progress !== undefined ? `${task.progress}%` : ''}
                          </Typography>
                        </Box>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Legend */}
        <Box sx={{ 
          display: 'flex', 
          gap: 3, 
          p: 2, 
          borderTop: '1px solid #e5e7eb',
          bgcolor: '#fafbfc',
          fontSize: '11px'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 8, bgcolor: '#cbd5e1', borderRadius: 0.5 }} />
            <Typography fontSize="11px">FS: Finish-to-Start</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 8, bgcolor: '#cbd5e1', borderRadius: 0.5 }} />
            <Typography fontSize="11px">SS: Start-to-Start</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 8, bgcolor: '#cbd5e1', borderRadius: 0.5 }} />
            <Typography fontSize="11px">FF: Finish-to-Finish</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ width: 16, height: 8, bgcolor: '#cbd5e1', borderRadius: 0.5 }} />
            <Typography fontSize="11px">SF: Start-to-Finish</Typography>
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

