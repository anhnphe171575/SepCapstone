"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  TextField,
  Autocomplete,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Chip,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  Link as LinkIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";
import axiosInstance from "../../ultis/axios";
import DependencyTypeSelector from "./DependencyTypeSelector";
import LagLeadInput from "./LagLeadInput";

interface Task {
  _id: string;
  title: string;
  status: string;
  start_date?: string;
  deadline?: string;
}

interface AddDependencyDialogProps {
  open: boolean;
  onClose: () => void;
  taskId: string;
  currentTask?: Task;
  availableTasks: Task[];
  onAdd: () => void;
}

const AddDependencyDialog: React.FC<AddDependencyDialogProps> = ({
  open,
  onClose,
  taskId,
  currentTask,
  availableTasks,
  onAdd,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [dependencyType, setDependencyType] = useState<"FS" | "SS" | "FF" | "SF">("FS");
  const [lagDays, setLagDays] = useState(0);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);

  const steps = ["Select Task", "Choose Type", "Set Lag/Lead", "Review"];

  // Filter out current task and already dependent tasks
  const filteredTasks = availableTasks.filter((t) => t._id !== taskId);

  const handleNext = async () => {
    if (activeStep === 0 && !selectedTask) {
      setError("Please select a task");
      return;
    }

    // Validate on step 2
    if (activeStep === 2) {
      await validateDependency();
    }

    setError(null);
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setError(null);
    setActiveStep((prev) => prev - 1);
  };

  const validateDependency = async () => {
    if (!selectedTask) return;

    try {
      const response = await axiosInstance.post(
        `/api/tasks/${taskId}/dependencies/validate`,
        {
          depends_on_task_id: selectedTask._id,
          dependency_type: dependencyType,
        }
      );
      setValidationResult(response.data);
    } catch (err: any) {
      console.error("Validation error:", err);
      setValidationResult({
        valid: false,
        error: err?.response?.data?.message || "Validation failed",
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedTask) return;

    try {
      setLoading(true);
      setError(null);

      const response = await axiosInstance.post(`/api/tasks/${taskId}/dependencies`, {
        depends_on_task_id: selectedTask._id,
        dependency_type: dependencyType,
        lag_days: lagDays,
        notes: notes || undefined,
      });

      // Check for warning (non-blocking)
      if (response.data.warning) {
        const warning = response.data.warning;
        setError(`⚠️ ${warning.message}\n${warning.suggestion}`);
        // Still allow to proceed, just show warning
      }

      onAdd();
      handleClose();
    } catch (err: any) {
      console.error("Error adding dependency:", err);
      const errorData = err?.response?.data;
      
      if (err?.response?.status === 400 && errorData?.violation) {
        // Date violation - show detailed error
        const violation = errorData.violation;
        const errorMessage = `${errorData.message}\n\n${violation.suggestion || ''}`;
        setError(errorMessage);
        
        // If auto-fix available, offer it
        if (errorData.can_auto_fix && violation.required_start_date) {
          const autoFix = window.confirm(
            `${errorMessage}\n\nBạn có muốn tự động điều chỉnh ngày tháng không?`
          );
          if (autoFix) {
            try {
              await axiosInstance.post(`/api/tasks/${taskId}/auto-adjust-dates`, {
                preserve_duration: true
              });
              // Retry adding dependency
              await handleSubmit();
            } catch (fixError: any) {
              setError(fixError?.response?.data?.message || 'Không thể tự động điều chỉnh');
            }
          }
        }
      } else {
        setError(errorData?.message || "Failed to add dependency");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setSelectedTask(null);
    setDependencyType("FS");
    setLagDays(0);
    setNotes("");
    setError(null);
    setValidationResult(null);
    onClose();
  };

  const getDependencyDescription = () => {
    const typeDescriptions = {
      FS: "can START after",
      SS: "can START when",
      FF: "can FINISH after",
      SF: "can FINISH when",
    };

    const actionDescriptions = {
      FS: "FINISHES",
      SS: "STARTS",
      FF: "FINISHES",
      SF: "STARTS",
    };

    return {
      type: typeDescriptions[dependencyType],
      action: actionDescriptions[dependencyType],
    };
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return "Not set";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getLagLabel = () => {
    if (lagDays === 0) return "No delay";
    if (lagDays > 0) return `${lagDays} day${lagDays > 1 ? "s" : ""} lag (delay)`;
    return `${Math.abs(lagDays)} day${Math.abs(lagDays) > 1 ? "s" : ""} lead (advance)`;
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        // Step 1: Select Task
        return (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Select which task this task depends on. The selected task must be completed
              (or started, depending on dependency type) before this task can proceed.
            </Typography>

            <Autocomplete
              options={filteredTasks}
              getOptionLabel={(option) => option.title}
              value={selectedTask}
              onChange={(e, newValue) => setSelectedTask(newValue)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search and select task"
                  placeholder="Type to search..."
                  autoFocus
                />
              )}
              renderOption={(props, option) => (
                <li {...props}>
                  <Box sx={{ width: "100%" }}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {option.title}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                      <Chip label={option.status} size="small" variant="outlined" />
                      <Typography variant="caption" color="text.secondary">
                        Due: {formatDate(option.deadline)}
                      </Typography>
                    </Box>
                  </Box>
                </li>
              )}
              noOptionsText="No tasks available"
            />

            {selectedTask && (
              <Card sx={{ mt: 3, bgcolor: "#f9fafb" }}>
                <CardContent>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                    Selected Task Preview
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" color="text.secondary">
                        Task:
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {selectedTask.title}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" color="text.secondary">
                        Status:
                      </Typography>
                      <Chip label={selectedTask.status} size="small" />
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" color="text.secondary">
                        Start:
                      </Typography>
                      <Typography variant="caption">
                        {formatDate(selectedTask.start_date)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                      <Typography variant="caption" color="text.secondary">
                        Deadline:
                      </Typography>
                      <Typography variant="caption">
                        {formatDate(selectedTask.deadline)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            )}
          </Box>
        );

      case 1:
        // Step 2: Choose Dependency Type
        return (
          <Box>
            <DependencyTypeSelector value={dependencyType} onChange={setDependencyType} />
          </Box>
        );

      case 2:
        // Step 3: Set Lag/Lead
        return (
          <Box>
            <LagLeadInput value={lagDays} onChange={setLagDays} />

            <Divider sx={{ my: 3 }} />

            {/* Optional Notes */}
            <TextField
              label="Notes (Optional)"
              multiline
              rows={3}
              fullWidth
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this dependency..."
              helperText="Explain why this dependency exists or any special considerations"
            />
          </Box>
        );

      case 3:
        // Step 4: Review
        const desc = getDependencyDescription();
        return (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Review Dependency
            </Typography>

            {/* Visual Representation */}
            <Card sx={{ mb: 3, bgcolor: "#f0f9ff", border: "2px solid #3b82f6" }}>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Dependency Task */}
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 200,
                      p: 2,
                      bgcolor: "white",
                      borderRadius: 2,
                      border: "2px solid #10b981",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Depends on:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                      {selectedTask?.title}
                    </Typography>
                    <Chip
                      label={selectedTask?.status}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </Box>

                  {/* Arrow with type */}
                  <Box sx={{ textAlign: "center" }}>
                    <ArrowForwardIcon sx={{ fontSize: 32, color: "#3b82f6" }} />
                    <Chip
                      label={dependencyType}
                      size="small"
                      color="primary"
                      sx={{ mt: 1 }}
                    />
                    {lagDays !== 0 && (
                      <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
                        {getLagLabel()}
                      </Typography>
                    )}
                  </Box>

                  {/* Current Task */}
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 200,
                      p: 2,
                      bgcolor: "white",
                      borderRadius: 2,
                      border: "2px solid #3b82f6",
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      This task:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, mt: 0.5 }}>
                      {currentTask?.title || "Current Task"}
                    </Typography>
                    <Chip
                      label={currentTask?.status || "Unknown"}
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  </Box>
                </Box>

                {/* Description */}
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>"{currentTask?.title || "This task"}"</strong> {desc.type}{" "}
                    <strong>"{selectedTask?.title}"</strong> {desc.action}
                    {lagDays !== 0 && <>, with {getLagLabel()}</>}.
                  </Typography>
                </Alert>
              </CardContent>
            </Card>

            {/* Summary Details */}
            <Card>
              <CardContent>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                  Dependency Details
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">
                      Type:
                    </Typography>
                    <Chip label={`${dependencyType} - ${getDependencyDescription().type}`} size="small" />
                  </Box>
                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body2" color="text.secondary">
                      Lag/Lead:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {getLagLabel()}
                    </Typography>
                  </Box>
                  {notes && (
                    <>
                      <Divider />
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                          Notes:
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            fontStyle: "italic",
                            p: 1.5,
                            bgcolor: "#f9fafb",
                            borderRadius: 1,
                          }}
                        >
                          {notes}
                        </Typography>
                      </Box>
                    </>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* Validation Result */}
            {validationResult && (
              <Box sx={{ mt: 2 }}>
                {validationResult.valid ? (
                  <Alert severity="success" icon={<CheckCircleIcon />}>
                    Dependency is valid and can be added
                  </Alert>
                ) : (
                  <Alert severity="error" icon={<WarningIcon />}>
                    {validationResult.error || "Circular dependency detected"}
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <LinkIcon sx={{ color: "#3b82f6" }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Thêm phụ thuộc
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Step Content */}
        {renderStepContent()}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Box sx={{ flex: 1 }} />
        {activeStep > 0 && (
          <Button onClick={handleBack} disabled={loading}>
            Back
          </Button>
        )}
        {activeStep < steps.length - 1 ? (
          <Button
            onClick={handleNext}
            variant="contained"
            disabled={activeStep === 0 && !selectedTask}
          >
            Next
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={loading || (validationResult && !validationResult.valid)}
            startIcon={loading ? <CircularProgress size={16} /> : null}
          >
            {loading ? "Adding..." : "Add Dependency"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AddDependencyDialog;

