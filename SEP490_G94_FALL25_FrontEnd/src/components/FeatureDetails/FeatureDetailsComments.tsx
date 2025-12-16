"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Avatar,
  Stack,
  IconButton,
  Paper,
  Menu,
  MenuItem,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import axiosInstance from "../../../ultis/axios";

interface FeatureDetailsCommentsProps {
  featureId: string | null;
  currentUser?: any;
  onUpdate?: () => void;
}

export default function FeatureDetailsComments({ featureId, currentUser, onUpdate }: FeatureDetailsCommentsProps) {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedComment, setSelectedComment] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (featureId) {
      loadComments();
    }
    loadCurrentUser();
  }, [featureId]);

  const loadCurrentUser = async () => {
    if (currentUser?._id) {
      setCurrentUserId(String(currentUser._id));
      return;
    }
    try {
      const res = await axiosInstance.get('/api/users/me');
      if (res?.data?._id) {
        setCurrentUserId(String(res.data._id));
      } else {
        setCurrentUserId(null);
      }
    } catch (error) {
      console.error("Error loading current user:", error);
      setCurrentUserId(null);
    }
  };

  const loadComments = async () => {
    if (!featureId) return;
    
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/features/${featureId}/comments`);
      // Ensure we always set an array
      const data = response.data;
      if (Array.isArray(data)) {
        setComments(data);
      } else if (data && Array.isArray(data.data)) {
        setComments(data.data);
      } else if (data && Array.isArray(data.comments)) {
        setComments(data.comments);
      } else {
        setComments([]);
      }
    } catch (error: any) {
      console.error("Error loading comments:", error);
      setComments([]); // Ensure comments is always an array even on error
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!featureId || !newComment.trim()) return;
    
    try {
      await axiosInstance.post(`/api/features/${featureId}/comments`, {
        content: newComment.trim()
      });
      setNewComment("");
      await loadComments();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error("Error adding comment:", error);
    }
  };

  const updateComment = async (commentId: string) => {
    if (!editText.trim()) return;
    const target = comments.find((c) => c._id === commentId);
    if (!isOwner(target)) return;
    
    try {
      await axiosInstance.patch(`/api/features/${featureId}/comments/${commentId}`, {
        content: editText.trim()
      });
      setEditingCommentId(null);
      setEditText("");
      await loadComments();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error("Error updating comment:", error);
    }
  };

  const deleteComment = async (commentId: string) => {
    const target = comments.find((c) => c._id === commentId);
    if (!isOwner(target)) return;
    if (!confirm('Xóa bình luận này?')) return;
    
    try {
      await axiosInstance.delete(`/api/features/${featureId}/comments/${commentId}`);
      await loadComments();
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error("Error deleting comment:", error);
    }
  };

  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return commentDate.toLocaleDateString('vi-VN');
  };

  const isOwner = (comment: any) => {
    if (!comment?.user_id) return false;
    const userId = currentUserId || currentUser?._id;
    if (!userId) return false;
    const ownerId =
      typeof comment.user_id === 'string'
        ? comment.user_id
        : (comment.user_id?._id || (comment.user_id as any)?.id || comment.user_id);
    return ownerId ? String(ownerId) === String(userId) : false;
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ 
          width: 36,
          height: 36,
          borderRadius: '50%',
          bgcolor: '#eff6ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <ChatBubbleOutlineIcon sx={{ fontSize: 18, color: '#3b82f6' }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Bình luận
          </Typography>
          <Typography fontSize="12px" color="text.secondary">
            {Array.isArray(comments) ? comments.length : 0} {Array.isArray(comments) && comments.length === 1 ? 'bình luận' : 'bình luận'}
          </Typography>
        </Box>
      </Box>

      {/* Add Comment Form */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          p: 2.5,
          bgcolor: '#fafbfc',
          border: '1px solid #e8e9eb',
          borderRadius: 2
        }}
      >
        <Stack direction="row" spacing={2} alignItems="flex-start">
          <Avatar sx={{ width: 36, height: 36, bgcolor: '#7b68ee', fontSize: '14px', fontWeight: 600 }}>
            {currentUser?.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Thêm bình luận..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              sx={{
                mb: 1.5,
                '& .MuiOutlinedInput-root': {
                  bgcolor: 'white',
                  fontSize: '14px',
                  borderRadius: 2,
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
                onClick={() => setNewComment("")}
                sx={{ textTransform: 'none', fontWeight: 600, color: '#6b7280' }}
              >
                Xóa
              </Button>
              <Button
                size="small"
                variant="contained"
                disabled={!newComment.trim()}
                startIcon={<SendIcon sx={{ fontSize: 16 }} />}
                onClick={addComment}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  bgcolor: '#7b68ee',
                  '&:hover': { bgcolor: '#6952d6' }
                }}
              >
                Bình luận
              </Button>
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {/* Comments List */}
      {loading ? (
        <Box sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">Đang tải bình luận...</Typography>
        </Box>
      ) : !Array.isArray(comments) || comments.length === 0 ? (
        <Box sx={{ 
          p: 6, 
          textAlign: 'center',
          bgcolor: '#fafbfc',
          borderRadius: 2,
          border: '1px dashed #e8e9eb'
        }}>
          <ChatBubbleOutlineIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
          <Typography fontSize="14px" fontWeight={600} color="text.secondary" sx={{ mb: 0.5 }}>
            Chưa có bình luận nào
          </Typography>
          <Typography fontSize="12px" color="text.secondary">
            Bắt đầu cuộc trò chuyện bằng cách thêm bình luận đầu tiên
          </Typography>
        </Box>
      ) : (
        <Stack spacing={3}>
          {Array.isArray(comments) && comments.map((comment) => (
            <Paper
              key={comment._id}
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: 'white',
                border: '1px solid #e8e9eb',
                borderRadius: 2,
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: '#d1d5db',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)'
                }
              }}
            >
              <Stack direction="row" spacing={2}>
                {/* Avatar */}
                <Avatar 
                  sx={{ 
                    width: 40, 
                    height: 40, 
                    bgcolor: '#7b68ee',
                    fontSize: '16px',
                    fontWeight: 600
                  }}
                >
                  {(comment.user_id?.full_name || comment.user_id?.email || 'U')[0].toUpperCase()}
                </Avatar>

                <Box sx={{ flex: 1 }}>
                  {/* Header */}
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Typography fontSize="14px" fontWeight={700} color="text.primary">
                        {comment.user_id?.full_name || comment.user_id?.email || 'Người dùng không xác định'}
                      </Typography>
                      <Typography fontSize="12px" color="text.secondary">
                        {formatTimeAgo(comment.createdAt)}
                      </Typography>
                      {comment.updatedAt && comment.updatedAt !== comment.createdAt && (
                        <Typography fontSize="11px" color="text.secondary" fontStyle="italic">
                          (đã chỉnh sửa)
                        </Typography>
                      )}
                    </Stack>

                    {/* Actions Menu */}
                    {isOwner(comment) && (
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedComment(comment);
                        }}
                        sx={{ color: '#9ca3af' }}
                      >
                        <MoreVertIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    )}
                  </Stack>

                  {/* Comment Content */}
                  {editingCommentId === comment._id ? (
                    <Box>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                        sx={{
                          mb: 1.5,
                          '& .MuiOutlinedInput-root': {
                            bgcolor: 'white',
                            fontSize: '14px',
                            borderRadius: 2,
                          }
                        }}
                      />
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          onClick={() => {
                            setEditingCommentId(null);
                            setEditText("");
                          }}
                          sx={{ textTransform: 'none', fontSize: '13px', color: '#6b7280' }}
                        >
                          Hủy
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={() => updateComment(comment._id)}
                          disabled={!editText.trim()}
                          sx={{
                            textTransform: 'none',
                            fontSize: '13px',
                            bgcolor: '#7b68ee',
                            '&:hover': { bgcolor: '#6952d6' }
                          }}
                        >
                          Lưu
                        </Button>
                      </Stack>
                    </Box>
                  ) : (
                    <Typography fontSize="14px" color="text.primary" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                      {comment.content}
                    </Typography>
                  )}
                </Box>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            if (selectedComment) {
              setEditingCommentId(selectedComment._id);
              setEditText(selectedComment.content);
            }
            setAnchorEl(null);
          }}
        >
          <EditIcon sx={{ fontSize: 16, mr: 1 }} />
          Chỉnh sửa
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedComment) {
              deleteComment(selectedComment._id);
            }
            setAnchorEl(null);
          }}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ fontSize: 16, mr: 1 }} />
          Xóa
        </MenuItem>
      </Menu>
    </Box>
  );
}

