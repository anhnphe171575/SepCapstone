"use client";

import React from "react";
import {
  Box,
  Card,
  CardContent,
  CardActionArea,
  Radio,
  RadioGroup,
  FormControlLabel,
  Typography,
  Divider,
} from "@mui/material";
import {
  TrendingFlat as TrendingFlatIcon,
  CallMade as CallMadeIcon,
  CallReceived as CallReceivedIcon,
  SyncAlt as SyncAltIcon,
} from "@mui/icons-material";

interface DependencyType {
  value: "FS" | "SS" | "FF" | "SF";
  label: string;
  icon: React.ReactNode;
  description: string;
  example: string;
  color: string;
}

interface DependencyTypeSelectorProps {
  value: "FS" | "SS" | "FF" | "SF";
  onChange: (value: "FS" | "SS" | "FF" | "SF") => void;
}

const DependencyTypeSelector: React.FC<DependencyTypeSelectorProps> = ({
  value,
  onChange,
}) => {
  const types: DependencyType[] = [
    {
      value: "FS",
      label: "Finish-to-Start (FS)",
      icon: <TrendingFlatIcon sx={{ fontSize: 28 }} />,
      description: "This task can START after dependency FINISHES",
      example: "Design UI → Develop Frontend",
      color: "#3b82f6", // blue
    },
    {
      value: "SS",
      label: "Start-to-Start (SS)",
      icon: <CallMadeIcon sx={{ fontSize: 28 }} />,
      description: "This task can START after dependency STARTS",
      example: "Research ⇉ Write Documentation",
      color: "#8b5cf6", // purple
    },
    {
      value: "FF",
      label: "Finish-to-Finish (FF)",
      icon: <CallReceivedIcon sx={{ fontSize: 28 }} />,
      description: "This task can FINISH after dependency FINISHES",
      example: "Backend Testing ⇶ Full Integration",
      color: "#10b981", // green
    },
    {
      value: "SF",
      label: "Start-to-Finish (SF)",
      icon: <SyncAltIcon sx={{ fontSize: 28 }} />,
      description: "This task can FINISH after dependency STARTS",
      example: "Old System Monitoring ↱ New System Launch",
      color: "#f59e0b", // amber
    },
  ];

  return (
    <Box>
      <Typography
        variant="subtitle2"
        sx={{ mb: 2, fontWeight: 600, color: "#374151" }}
      >
        Select Dependency Type
      </Typography>

      <RadioGroup value={value} onChange={(e) => onChange(e.target.value as any)}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {types.map((type) => {
            const isSelected = value === type.value;
            
            return (
              <Card
                key={type.value}
                sx={{
                  border: isSelected ? `2px solid ${type.color}` : "1px solid #e5e7eb",
                  boxShadow: isSelected ? `0 0 0 3px ${type.color}20` : "none",
                  transition: "all 0.2s",
                  "&:hover": {
                    borderColor: type.color,
                    boxShadow: `0 0 0 3px ${type.color}10`,
                  },
                }}
              >
                <CardActionArea onClick={() => onChange(type.value)}>
                  <CardContent sx={{ py: 2 }}>
                    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
                      {/* Radio Button */}
                      <Radio
                        checked={isSelected}
                        value={type.value}
                        sx={{
                          color: type.color,
                          "&.Mui-checked": {
                            color: type.color,
                          },
                          mt: -0.5,
                        }}
                      />

                      {/* Icon */}
                      <Box
                        sx={{
                          color: isSelected ? type.color : "#9ca3af",
                          mt: 0.5,
                          transition: "color 0.2s",
                        }}
                      >
                        {type.icon}
                      </Box>

                      {/* Content */}
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 600,
                            color: isSelected ? type.color : "#1f2937",
                            mb: 0.5,
                          }}
                        >
                          {type.label}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{
                            color: "#6b7280",
                            mb: 1,
                            lineHeight: 1.5,
                          }}
                        >
                          {type.description}
                        </Typography>

                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 1,
                            bgcolor: isSelected ? `${type.color}10` : "#f3f4f6",
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            transition: "background-color 0.2s",
                          }}
                        >
                          <Typography
                            variant="caption"
                            sx={{
                              fontStyle: "italic",
                              color: isSelected ? type.color : "#6b7280",
                              fontWeight: 500,
                            }}
                          >
                            Example: {type.example}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            );
          })}
        </Box>
      </RadioGroup>

      {/* Help Text */}
      <Box
        sx={{
          mt: 3,
          p: 2,
          bgcolor: "#f0f9ff",
          borderRadius: 2,
          borderLeft: "4px solid #3b82f6",
        }}
      >
        <Typography variant="caption" sx={{ fontWeight: 600, color: "#1e40af" }}>
          💡 Pro Tip:
        </Typography>
        <Typography variant="caption" sx={{ display: "block", color: "#1e40af", mt: 0.5 }}>
          <strong>Finish-to-Start (FS)</strong> is the most common dependency type, used in 80% of cases.
          Use it when one task must be completed before another can begin.
        </Typography>
      </Box>
    </Box>
  );
};

export default DependencyTypeSelector;

