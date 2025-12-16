"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Chip,
  IconButton,
  Alert,
  Tooltip,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Link as LinkIcon,
  ArrowForward as ArrowForwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  Block as BlockIcon,
} from "@mui/icons-material";
import axiosInstance from "../../ultis/axios";
import AddDependencyDialog from "./AddDependencyDialog";
import { normalizeStatusValue } from "@/constants/settings";

interface Task {
  _id: string;
  title: string;
  status: string;
  start_date?: string;
  deadline?: string;
}

interface Dependency {
  _id: string;
  task_id?: Task;
  depends_on_task_id?: Task;
  dependency_type: "FS" | "SS" | "FF" | "SF";
  lag_days: number;
  is_mandatory?: boolean;
  notes?: string;
}

interface DependencySummary {
  dependencies: Dependency[]; // Predecessors - tasks this task waits on
  dependents: Dependency[]; // Successors - tasks waiting on this task
  summary?: {
    total_dependencies: number;
    total_dependents: number;
    blocking_count: number;
    blocked_count: number;
  };
}

interface DependencyManagerProps {
  taskId: string;
  projectId: string;
  currentTask?: Task;
  availableTasks: Task[];
  onUpdate?: () => void;
}

const DependencyManager: React.FC<DependencyManagerProps> = ({
  taskId,
  projectId,
  currentTask,
  availableTasks,
  onUpdate,
}) => {
  const [dependencies, setDependencies] = useState<Dependency[]>([]);
  const [dependents, setDependents] = useState<Dependency[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDependencies();
  }, [taskId]);

  const loadDependencies = async () => {
    try {
      setLoading(true);
      const response = await axiosInstance.get<DependencySummary>(
        `/api/tasks/${taskId}/dependencies`
      );
      setDependencies(response.data.dependencies || []);
      setDependents(response.data.dependents || []);
      setSummary(response.data.summary);
      setError(null);
    } catch (err: any) {
      console.error("Error loading dependencies:", err);
      setError("Failed to load dependencies");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDependency = async (dependencyId: string) => {
    try {
      await axiosInstance.delete(
        `/api/tasks/${taskId}/dependencies/${dependencyId}`
      );
      await loadDependencies();
      onUpdate?.();
    } catch (err: any) {
      console.error("Error removing dependency:", err);
      setError(err?.response?.data?.message || "Failed to remove dependency");
    }
  };

  const getDependencyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      FS: "Finish-to-Start",
      SS: "Start-to-Start",
      FF: "Finish-to-Finish",
      SF: "Start-to-Finish",
    };
    return labels[type] || type;
  };

  const getDependencyTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      FS: "→",
      SS: "⇉",
      FF: "⇶",
      SF: "↱",
    };
    return icons[type] || "→";
  };

  const getLagLabel = (lag: number) => {
    if (lag === 0) return "";
    if (lag > 0) return ` +${lag}d`;
    return ` ${lag}d`;
  };

  const isTaskBlocking = (dependency: Dependency, isDependent: boolean) => {
    const task = isDependent
      ? dependency.task_id
      : dependency.depends_on_task_id;
    if (!task) return false;

    const type = dependency.dependency_type;
    const rawStatus = typeof task.status === "object" ? (task.status as any)?.name : task.status;
    const status = normalizeStatusValue(rawStatus as string | undefined);

    const isCompleted = status === "Done";
    const isStarted = status === "Doing" || status === "Done";

    if (type === "FS" || type === "FF") return !isCompleted;
    if (type === "SS" || type === "SF") return !isStarted;
    return false;
  };

  const DependencyCard = ({
    dependency,
    isDependent = false,
  }: {
    dependency: Dependency;
    isDependent?: boolean;
  }) => {
    const task = isDependent
      ? dependency.task_id
      : dependency.depends_on_task_id;
    if (!task) return null;

    const isBlocking = isTaskBlocking(dependency, isDependent);
    const type = dependency.dependency_type;
    const lag = dependency.lag_days || 0;

    return (
      <Card
        sx={{
          mb: 1,
          borderLeft: isBlocking ? "4px solid #f59e0b" : "4px solid #10b981",
          "&:hover": {
            boxShadow: 2,
          },
        }}
      >
        <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* Status Icon */}
            {isBlocking ? (
              <Tooltip title="Blocking - Not completed yet">
                <WarningIcon sx={{ color: "#f59e0b", fontSize: 20 }} />
              </Tooltip>
            ) : (
              <Tooltip title="Completed">
                <CheckCircleIcon sx={{ color: "#10b981", fontSize: 20 }} />
              </Tooltip>
            )}

            {/* Task Title */}
            <Typography
              sx={{
                flex: 1,
                fontWeight: 500,
                fontSize: "14px",
                color: isBlocking ? "#f59e0b" : "#1f2937",
              }}
            >
              {task.title}
            </Typography>

            {/* Dependency Type Badge */}
            <Tooltip title={getDependencyTypeLabel(type)}>
              <Chip
                label={`${getDependencyTypeIcon(type)} ${type}${getLagLabel(lag)}`}
                size="small"
                color={isBlocking ? "warning" : "success"}
                sx={{ fontSize: "12px", fontWeight: 600 }}
              />
            </Tooltip>

            {/* Task Status */}
            <Chip
              label={task.status}
              size="small"
              variant="outlined"
              sx={{ fontSize: "11px" }}
            />

            {/* Remove Button */}
            <Tooltip title="Remove dependency">
              <IconButton
                size="small"
                onClick={() => handleRemoveDependency(dependency._id)}
                sx={{ color: "#ef4444" }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Notes */}
          {dependency.notes && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 1, display: "block", fontStyle: "italic" }}
            >
              Note: {dependency.notes}
            </Typography>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LinkIcon sx={{ color: "#3b82f6" }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Dependencies
          </Typography>
          {summary && (
            <Chip
              label={`${summary.total_dependencies} waiting | ${summary.total_dependents} blocking`}
              size="small"
              sx={{ fontSize: "11px" }}
            />
          )}
        </Box>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          size="small"
          onClick={() => setOpenDialog(true)}
          sx={{ textTransform: "none" }}
        >
          Add Dependency
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Summary Stats */}
      {summary && summary.blocked_count > 0 && (
        <Alert severity="warning" icon={<BlockIcon />} sx={{ mb: 2 }}>
          This task is blocked by {summary.blocked_count} incomplete{" "}
          {summary.blocked_count === 1 ? "dependency" : "dependencies"}
        </Alert>
      )}

      {/* Predecessors - Waiting On */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <ArrowDownwardIcon sx={{ fontSize: 18, color: "#6b7280" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Waiting On (Predecessors)
          </Typography>
          <Chip
            label={dependencies.length}
            size="small"
            sx={{ fontSize: "11px", height: 20 }}
          />
        </Box>

        {dependencies.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontStyle: "italic", pl: 3 }}
          >
            No dependencies - This task can start anytime
          </Typography>
        ) : (
          <Box sx={{ pl: 1 }}>
            {dependencies.map((dep) => (
              <DependencyCard key={dep._id} dependency={dep} />
            ))}
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Successors - Blocking */}
      <Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
          <ArrowUpwardIcon sx={{ fontSize: 18, color: "#6b7280" }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Blocking (Successors)
          </Typography>
          <Chip
            label={dependents.length}
            size="small"
            sx={{ fontSize: "11px", height: 20 }}
          />
        </Box>

        {dependents.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontStyle: "italic", pl: 3 }}
          >
            No dependent tasks - Nothing is waiting on this task
          </Typography>
        ) : (
          <Box sx={{ pl: 1 }}>
            {dependents.map((dep) => (
              <DependencyCard key={dep._id} dependency={dep} isDependent />
            ))}
          </Box>
        )}
      </Box>

      {/* Add Dependency Dialog */}
      <AddDependencyDialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        taskId={taskId}
        currentTask={currentTask}
        availableTasks={availableTasks}
        onAdd={async () => {
          await loadDependencies();
          onUpdate?.();
        }}
      />
    </Box>
  );
};

export default DependencyManager;

