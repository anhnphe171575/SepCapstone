"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
  Chip,
  Typography,
  Alert,
  Box,
} from "@mui/material";
import axiosInstance from "../../ultis/axios";

type Feature = {
  _id: string;
  title: string;
  code: string;
  estimated_effort?: number;
  start_date?: string;
  end_date?: string;
};

interface CreateMilestoneFromFeaturesProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  selectedFeatures: Feature[];
  onSuccess?: () => void;
}

export default function CreateMilestoneFromFeatures({
  open,
  onClose,
  projectId,
  selectedFeatures,
  onSuccess,
}: CreateMilestoneFromFeaturesProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề milestone");
      return;
    }

    if (selectedFeatures.length === 0) {
      setError("Vui lòng chọn ít nhất một feature");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const feature_ids = selectedFeatures.map((f) => f._id);
      await axiosInstance.post(`/api/projects/${projectId}/milestones/from-features`, {
        title,
        description,
        feature_ids,
      });

      setTitle("");
      setDescription("");
      // Call onSuccess first, then close
      if (onSuccess) {
        await onSuccess();
      }
      onClose();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể tạo milestone");
    } finally {
      setLoading(false);
    }
  };

  // Calculate summary
  const earliestStart = selectedFeatures.reduce<string | null>((earliest, f) => {
    if (!f.start_date) return earliest;
    if (!earliest) return f.start_date;
    return new Date(f.start_date) < new Date(earliest) ? f.start_date : earliest;
  }, null);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Tạo Milestone từ Features</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <TextField
            label="Tên Milestone"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            fullWidth
            required
          />

          <TextField
            label="Mô tả"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            multiline
            rows={3}
          />

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Features được chọn ({selectedFeatures.length})
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
              {selectedFeatures.map((f) => (
                <Chip key={f._id} label={`${f.code} - ${f.title}`} size="small" />
              ))}
            </Stack>
          </Box>

          <Box sx={{ p: 2, bgcolor: "background.default", borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Thông tin tự động tính toán
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Ngày bắt đầu (sớm nhất):</strong>{" "}
                {earliestStart ? new Date(earliestStart).toLocaleDateString('vi-VN') : "Chưa có"}
              </Typography>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Hủy
        </Button>
        <Button variant="contained" onClick={handleCreate} disabled={loading}>
          {loading ? "Đang tạo..." : "Tạo Milestone"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

