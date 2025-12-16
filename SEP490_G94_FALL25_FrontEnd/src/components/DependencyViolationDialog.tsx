"use client";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Alert,
  Chip,
  Stack,
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import LinkIcon from "@mui/icons-material/Link";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";

interface DependencyViolation {
  dependency_type?: string;
  predecessor_task?: {
    _id: string;
    title: string;
    status: string;
  };
  message: string;
  is_mandatory?: boolean;
  type?: string; // 'date_validation' or undefined for dependency violations
}

interface DependencyViolationDialogProps {
  open: boolean;
  onClose: () => void;
  onForceUpdate: () => void;
  violations: DependencyViolation[];
  canForce?: boolean;
}

const DEPENDENCY_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  FS: { label: "Finish-to-Start", color: "#3b82f6" },
  FF: { label: "Finish-to-Finish", color: "#8b5cf6" },
  SS: { label: "Start-to-Start", color: "#10b981" },
  SF: { label: "Start-to-Finish", color: "#f59e0b" },
  relates_to: { label: "Related To", color: "#6b7280" },
};

export default function DependencyViolationDialog({
  open,
  onClose,
  onForceUpdate,
  violations,
  canForce = false,
}: DependencyViolationDialogProps) {
  // Separate date validation errors from dependency violations
  const dateValidationErrors = violations.filter((v) => v.type === 'date_validation');
  const dependencyViolations = violations.filter((v) => v.type !== 'date_validation');
  
  const mandatoryViolations = dependencyViolations.filter((v) => v.is_mandatory);
  const optionalViolations = dependencyViolations.filter((v) => !v.is_mandatory);
  
  const isDateValidation = dateValidationErrors.length > 0;

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          bgcolor: "#fff8e1",
          borderBottom: "1px solid #ffe082",
          pb: 2,
        }}
      >
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            bgcolor: "#ffc107",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <WarningAmberIcon sx={{ fontSize: 28, color: "white" }} />
        </Box>
        <Typography variant="h6" fontWeight={700} color="#f57c00">
          {isDateValidation ? 'Validation Error' : 'Dependency Violation'}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography fontSize="14px" fontWeight={600}>
            {isDateValidation 
              ? 'Cannot update task due to the following validation errors:' 
              : 'Cannot change status due to the following dependency constraints:'}
          </Typography>
        </Alert>

        <Stack spacing={2}>
          {/* Date Validation Errors */}
          {dateValidationErrors.map((error, index) => (
            <Box
              key={`date-${index}`}
              sx={{
                p: 2,
                bgcolor: "#fff8e1",
                borderRadius: 2,
                border: "2px solid #ffe082",
              }}
            >
              <Typography fontSize="14px" color="text.primary">
                {error.message}
              </Typography>
            </Box>
          ))}
          {/* Dependency Violations */}
          {mandatoryViolations.map((violation, index) => {
            const depTypeCode = violation.dependency_type || violation.type || 'FS';
            const depType = DEPENDENCY_TYPE_LABELS[depTypeCode] || DEPENDENCY_TYPE_LABELS.FS;
            
            return (
              <Box
                key={index}
                sx={{
                  p: 2,
                  bgcolor: "#fff8e1",
                  borderRadius: 2,
                  border: "2px solid #ffe082",
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <Chip
                    label={depTypeCode}
                    size="small"
                    sx={{
                      bgcolor: `${depType.color}20`,
                      color: depType.color,
                      fontWeight: 700,
                      border: `1px solid ${depType.color}`,
                      mt: 0.5,
                    }}
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography fontSize="13px" fontWeight={600} color="#f57c00" sx={{ mb: 0.5 }}>
                      {depType.label}
                    </Typography>
                    <Typography fontSize="14px" color="text.primary">
                      {violation.message}
                    </Typography>
                  </Box>
                </Stack>
              </Box>
            );
          })}

          {optionalViolations.length > 0 && (
            <>
              <Typography fontSize="12px" color="text.secondary" sx={{ mt: 1 }}>
                Optional dependencies (can be overridden):
              </Typography>
              {optionalViolations.map((violation, index) => (
                <Box
                  key={`optional-${index}`}
                  sx={{
                    p: 1.5,
                    bgcolor: "#f5f5f5",
                    borderRadius: 1.5,
                    border: "1px dashed #d1d5db",
                  }}
                >
                  <Typography fontSize="13px" color="text.secondary">
                    {violation.message}
                  </Typography>
                </Box>
              ))}
            </>
          )}
        </Stack>

        <Box
          sx={{
            mt: 3,
            p: 2,
            bgcolor: "#f0f9ff",
            borderRadius: 2,
            border: "1px solid #bae6fd",
          }}
        >
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <LightbulbOutlinedIcon sx={{ fontSize: 20, color: "#0284c7", mt: 0.3 }} />
            <Box>
              <Typography fontSize="13px" fontWeight={600} color="#0284c7" sx={{ mb: 0.5 }}>
                💡 Options:
              </Typography>
              <Typography fontSize="12px" color="text.secondary" component="ul" sx={{ pl: 2, m: 0 }}>
                {isDateValidation ? (
                  <>
                    <li>Adjust task dates to be within project dates, or</li>
                    <li>Adjust estimate to fit within the date range</li>
                  </>
                ) : (
                  <>
                    <li>Complete the blocking tasks first</li>
                  </>
                )}
              </Typography>
            </Box>
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: "1px solid #e0e0e0" }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            textTransform: "none",
            fontWeight: 600,
            bgcolor: "#6b7280",
            "&:hover": {
              bgcolor: "#4b5563",
            },
          }}
        >
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}

