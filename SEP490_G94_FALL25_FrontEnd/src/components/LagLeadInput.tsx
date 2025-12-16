"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  ToggleButtonGroup,
  ToggleButton,
  Typography,
  Alert,
  Slider,
  FormControl,
  InputAdornment,
} from "@mui/material";
import {
  Add as AddIcon,
  Remove as RemoveIcon,
  Schedule as ScheduleIcon,
  FastForward as FastForwardIcon,
  FastRewind as FastRewindIcon,
} from "@mui/icons-material";

interface LagLeadInputProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
}

const LagLeadInput: React.FC<LagLeadInputProps> = ({
  value,
  onChange,
  max = 365,
}) => {
  const [lagDays, setLagDays] = useState(Math.abs(value));
  const [lagType, setLagType] = useState<"lag" | "lead">(
    value >= 0 ? "lag" : "lead"
  );

  useEffect(() => {
    const actualValue = lagType === "lead" ? -lagDays : lagDays;
    onChange(actualValue);
  }, [lagDays, lagType]);

  const handleDaysChange = (newValue: number | number[]) => {
    const days = Array.isArray(newValue) ? newValue[0] : newValue;
    setLagDays(days);
  };

  const getLagDescription = () => {
    if (lagDays === 0) {
      return "No delay - Task follows immediately after dependency";
    }

    if (lagType === "lag") {
      return `Add ${lagDays} day${lagDays > 1 ? "s" : ""} delay. Task will wait ${lagDays} day${lagDays > 1 ? "s" : ""} after dependency completes.`;
    } else {
      return `Start ${lagDays} day${lagDays > 1 ? "s" : ""} early. Task can begin ${lagDays} day${lagDays > 1 ? "s" : ""} before dependency completes, overlapping work.`;
    }
  };

  const getExampleTimeline = () => {
    if (lagDays === 0) {
      return "Dependency (finish: Jan 10) → Task (start: Jan 10)";
    }

    if (lagType === "lag") {
      return `Dependency (finish: Jan 10) → [+${lagDays}d] → Task (start: Jan ${10 + lagDays})`;
    } else {
      return `Dependency (finish: Jan 10) → [-${lagDays}d] → Task (start: Jan ${10 - lagDays})`;
    }
  };

  return (
    <Box>
      {/* Title */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <ScheduleIcon sx={{ color: "#6b7280", fontSize: 20 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#374151" }}>
          Lag/Lead Time
        </Typography>
      </Box>

      {/* Lag/Lead Type Toggle */}
      <Box sx={{ mb: 3 }}>
        <ToggleButtonGroup
          value={lagType}
          exclusive
          onChange={(e, newValue) => newValue && setLagType(newValue)}
          fullWidth
          sx={{ mb: 2 }}
        >
          <ToggleButton
            value="lag"
            sx={{
              py: 1.5,
              textTransform: "none",
              "&.Mui-selected": {
                bgcolor: "#fee2e2",
                color: "#dc2626",
                "&:hover": {
                  bgcolor: "#fecaca",
                },
              },
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
              <FastForwardIcon sx={{ fontSize: 24 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Lag (Delay)
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "10px", color: "#6b7280" }}>
                Add waiting time
              </Typography>
            </Box>
          </ToggleButton>

          <ToggleButton
            value="lead"
            sx={{
              py: 1.5,
              textTransform: "none",
              "&.Mui-selected": {
                bgcolor: "#dbeafe",
                color: "#2563eb",
                "&:hover": {
                  bgcolor: "#bfdbfe",
                },
              },
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
              <FastRewindIcon sx={{ fontSize: 24 }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                Lead (Advance)
              </Typography>
              <Typography variant="caption" sx={{ fontSize: "10px", color: "#6b7280" }}>
                Start early
              </Typography>
            </Box>
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Days Input */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", mb: 2 }}>
          {/* Number Input */}
          <TextField
            type="number"
            value={lagDays}
            onChange={(e) => setLagDays(Math.max(0, Math.min(max, parseInt(e.target.value) || 0)))}
            inputProps={{
              min: 0,
              max: max,
              step: 1,
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {lagType === "lag" ? <AddIcon fontSize="small" /> : <RemoveIcon fontSize="small" />}
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {lagDays === 1 ? "day" : "days"}
                  </Typography>
                </InputAdornment>
              ),
            }}
            sx={{
              width: 180,
              "& .MuiOutlinedInput-root": {
                fontWeight: 600,
                fontSize: "16px",
              },
            }}
            label="Number of Days"
            size="small"
          />

          {/* Quick Presets */}
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {[0, 1, 2, 3, 5, 7].map((preset) => (
              <ToggleButton
                key={preset}
                value={preset}
                selected={lagDays === preset}
                onChange={() => setLagDays(preset)}
                size="small"
                sx={{
                  px: 1.5,
                  py: 0.5,
                  fontSize: "12px",
                  minWidth: "unset",
                  "&.Mui-selected": {
                    bgcolor: lagType === "lag" ? "#fee2e2" : "#dbeafe",
                    color: lagType === "lag" ? "#dc2626" : "#2563eb",
                  },
                }}
              >
                {preset}
              </ToggleButton>
            ))}
          </Box>
        </Box>

        {/* Slider */}
        <Box sx={{ px: 1 }}>
          <Slider
            value={lagDays}
            onChange={(e, newValue) => handleDaysChange(newValue)}
            min={0}
            max={Math.min(30, max)}
            step={1}
            marks={[
              { value: 0, label: "0" },
              { value: 7, label: "1w" },
              { value: 14, label: "2w" },
              { value: 21, label: "3w" },
              { value: 30, label: "1m" },
            ]}
            sx={{
              color: lagType === "lag" ? "#dc2626" : "#2563eb",
              "& .MuiSlider-markLabel": {
                fontSize: "11px",
              },
            }}
          />
        </Box>
      </Box>

      {/* Explanation Alert */}
      <Alert
        severity={lagType === "lag" ? "warning" : "info"}
        icon={lagType === "lag" ? <FastForwardIcon /> : <FastRewindIcon />}
        sx={{ mb: 2 }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
          {lagType === "lag" ? "Lag (Delay)" : "Lead (Advance)"}: {lagDays} {lagDays === 1 ? "day" : "days"}
        </Typography>
        <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
          {getLagDescription()}
        </Typography>
        <Box
          sx={{
            mt: 1,
            p: 1,
            bgcolor: "rgba(255,255,255,0.5)",
            borderRadius: 1,
            fontFamily: "monospace",
            fontSize: "11px",
          }}
        >
          {getExampleTimeline()}
        </Box>
      </Alert>

      {/* Use Cases */}
      <Box
        sx={{
          p: 2,
          bgcolor: "#f9fafb",
          borderRadius: 2,
          border: "1px solid #e5e7eb",
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, color: "#374151", display: "block", mb: 1 }}>
          💡 Common Use Cases:
        </Typography>
        
        {lagType === "lag" ? (
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            <Typography component="li" variant="caption" sx={{ color: "#6b7280", mb: 0.5 }}>
              <strong>+1 day:</strong> Allow time for review/approval
            </Typography>
            <Typography component="li" variant="caption" sx={{ color: "#6b7280", mb: 0.5 }}>
              <strong>+2-3 days:</strong> Wait for deployment to staging
            </Typography>
            <Typography component="li" variant="caption" sx={{ color: "#6b7280", mb: 0.5 }}>
              <strong>+7 days:</strong> User acceptance testing period
            </Typography>
          </Box>
        ) : (
          <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
            <Typography component="li" variant="caption" sx={{ color: "#6b7280", mb: 0.5 }}>
              <strong>-1 day:</strong> Start QA when dev is 80% complete
            </Typography>
            <Typography component="li" variant="caption" sx={{ color: "#6b7280", mb: 0.5 }}>
              <strong>-2-3 days:</strong> Begin documentation while coding
            </Typography>
            <Typography component="li" variant="caption" sx={{ color: "#6b7280", mb: 0.5 }}>
              <strong>-5 days:</strong> Parallel work with overlap
            </Typography>
          </Box>
        )}
      </Box>

      {/* Warning for large values */}
      {lagDays > 14 && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="caption">
            ⚠️ Large {lagType === "lag" ? "lag" : "lead"} time ({lagDays} days) may indicate dependency issues. 
            Consider breaking down tasks or reviewing the dependency relationship.
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default LagLeadInput;

