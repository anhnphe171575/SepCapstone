"use client";

import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Stack,
  Divider,
  Paper,
} from "@mui/material";
import {
  CheckCircleOutline,
  Assignment,
  Functions,
  Timeline,
} from "@mui/icons-material";

type MilestoneProgress = {
  overall: number;
  by_feature: Array<{
    feature_id: string;
    feature_title: string;
    task_count: number;
    function_count: number;
    completed_tasks: number;
    completed_functions: number;
    percentage: number;
  }>;
  by_task: {
    total: number;
    completed: number;
    percentage: number;
  };
  by_function: {
    total: number;
    completed: number;
    percentage: number;
  };
};

interface MilestoneProgressDetailProps {
  milestoneTitle: string;
  progress: MilestoneProgress;
}

export default function MilestoneProgressDetail({
  milestoneTitle,
  progress,
}: MilestoneProgressDetailProps) {
  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return "success";
    if (percentage >= 50) return "warning";
    return "error";
  };

  const getProgressVariant = (percentage: number) => {
    if (percentage >= 80) return "determinate";
    if (percentage >= 50) return "determinate";
    return "determinate";
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
        Tiến độ: {milestoneTitle}
      </Typography>

      {/* Overall Progress */}
      <Card sx={{ mb: 2, bgcolor: "background.paper" }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
            <Timeline color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Tổng tiến độ
            </Typography>
            <Chip
              label={`${progress.overall}%`}
              color={getProgressColor(progress.overall)}
              size="small"
              sx={{ fontWeight: 600 }}
            />
          </Stack>
          <LinearProgress
            variant="determinate"
            value={progress.overall}
            color={getProgressColor(progress.overall)}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </CardContent>
      </Card>

      {/* Task and Function Progress */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', md: 'row' } }}>
        <Box sx={{ flex: 1 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Assignment color="info" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Tasks
                </Typography>
                <Chip
                  label={`${progress.by_task.completed}/${progress.by_task.total}`}
                  color={getProgressColor(progress.by_task.percentage)}
                  size="small"
                />
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progress.by_task.percentage}
                color={getProgressColor(progress.by_task.percentage)}
                sx={{ height: 6, borderRadius: 3 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {progress.by_task.percentage}% hoàn thành
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: 1 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                <Functions color="secondary" />
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Functions
                </Typography>
                <Chip
                  label={`${progress.by_function.completed}/${progress.by_function.total}`}
                  color={getProgressColor(progress.by_function.percentage)}
                  size="small"
                />
              </Stack>
              <LinearProgress
                variant="determinate"
                value={progress.by_function.percentage}
                color={getProgressColor(progress.by_function.percentage)}
                sx={{ height: 6, borderRadius: 3 }}
              />
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {progress.by_function.percentage}% hoàn thành
              </Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Feature Details */}
      {progress.by_feature.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Chi tiết theo Feature
            </Typography>
            <Stack spacing={2}>
              {progress.by_feature.map((feature, index) => (
                <Box key={feature.feature_id}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      bgcolor: "background.default",
                      border: "1px solid",
                      borderColor: "divider",
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                      <CheckCircleOutline
                        color={feature.percentage >= 80 ? "success" : feature.percentage >= 50 ? "warning" : "error"}
                        fontSize="small"
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {feature.feature_title}
                      </Typography>
                      <Chip
                        label={`${feature.percentage}%`}
                        color={getProgressColor(feature.percentage)}
                        size="small"
                      />
                    </Stack>
                    
                    <LinearProgress
                      variant="determinate"
                      value={feature.percentage}
                      color={getProgressColor(feature.percentage)}
                      sx={{ height: 4, borderRadius: 2, mb: 1 }}
                    />
                    
                    <Stack component="span" direction="row" spacing={3} sx={{ mt: 1, display: 'flex' }}>
                      <Box component="span" sx={{ display: 'inline-block' }}>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'inline-block' }}>
                          Tasks: {feature.completed_tasks}/{feature.task_count}
                        </Typography>
                      </Box>
                      <Box component="span" sx={{ display: 'inline-block' }}>
                        <Typography component="span" variant="caption" color="text.secondary" sx={{ display: 'inline-block' }}>
                          Functions: {feature.completed_functions}/{feature.function_count}
                        </Typography>
                      </Box>
                    </Stack>
                  </Paper>
                  {index < progress.by_feature.length - 1 && <Divider sx={{ my: 1 }} />}
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}
