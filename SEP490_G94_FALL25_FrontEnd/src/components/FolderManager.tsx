"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Box,
  Typography,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Menu as MUIMenu
} from '@mui/material';
import {
  Folder as FolderIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CreateNewFolder as CreateFolderIcon
} from '@mui/icons-material';
import { toast } from 'sonner';
import axiosInstance from '../../ultis/axios';

type Folder = {
  _id: string;
  name: string;
  description?: string;
  parentId?: string;
  createdAt: string;
  createdBy?: {
    _id: string;
    full_name: string;
  };
  created_by?: {
    _id: string;
    full_name: string;
    email?: string;
    avatar?: string;
  };
  documentCount: number;
  subfolderCount: number;
};

type FolderManagerProps = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  folders: Folder[];
  currentFolderId?: string;
  onFolderCreated?: (folder: Folder) => void;
  onFolderUpdated?: (folder: Folder) => void;
  onFolderDeleted?: (folderId: string) => void;
};

export default function FolderManager({
  open,
  onClose,
  projectId,
  folders,
  currentFolderId,
  onFolderCreated,
  onFolderUpdated,
  onFolderDeleted
}: FolderManagerProps) {
  const [activeTab, setActiveTab] = useState<'create' | 'manage' | 'search' | 'tree' | 'permissions'>('create');
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());
  
  // Create folder form
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [newFolderParent, setNewFolderParent] = useState('');
  
  // Edit folder form
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderDescription, setEditFolderDescription] = useState('');
  const [editFolderParent, setEditFolderParent] = useState('');
  
  // Bulk operations
  const [bulkAction, setBulkAction] = useState<'delete'>('delete');
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number } | null>(null);
  const [contextFolder, setContextFolder] = useState<Folder | null>(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveTargetId, setMoveTargetId] = useState<string>('');

  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTags, setSearchTags] = useState('');
  const [searchMilestoneId, setSearchMilestoneId] = useState('');
  const [searchResults, setSearchResults] = useState<Folder[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Tree states
  const [treeFolderId, setTreeFolderId] = useState('');
  type TreeNode = { _id: string; name: string; children?: TreeNode[] };
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [treeLoading, setTreeLoading] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);

  // Permissions states
  const [permFolderId, setPermFolderId] = useState('');
  const [permissions, setPermissions] = useState<Array<{ user_id: string; role: string; user?: { full_name?: string; email?: string } }>>([]);
  const [permLoading, setPermLoading] = useState(false);
  const [permUserId, setPermUserId] = useState('');
  const [permRole, setPermRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
  const [removeUserId, setRemoveUserId] = useState('');

  // Current user (for permission: only creator can delete)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data } = await axiosInstance.get('/api/folders/user/current');
        setCurrentUserId(data?.user?._id || null);
      } catch (e) {
        console.error('Error fetching current user in FolderManager:', e);
        setCurrentUserId(null);
      }
    };

    if (open) {
      fetchCurrentUser();
    }
  }, [open]);

  const canDeleteFolder = (folder: Folder): boolean => {
    const creatorId = folder.createdBy?._id || folder.created_by?._id;
    if (!creatorId || !currentUserId) return false;
    return creatorId === currentUserId;
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('Vui lòng nhập tên thư mục');
      return;
    }

    try {
      const parentId = newFolderParent || currentFolderId || '';
      let data: { folder?: Folder } | Folder | Record<string, unknown>;
      if (parentId) {
        // Create under a parent folder
        const payload: Record<string, unknown> = {
          name: newFolderName,
          description: newFolderDescription,
          project_id: projectId,
          parent_folder_id: parentId,
        };
        ({ data } = await axiosInstance.post('/api/folders', payload));
      } else {
        // Create root folder using dedicated endpoint
        const payloadRoot: Record<string, unknown> = {
          name: newFolderName,
          description: newFolderDescription,
          project_id: projectId,
        };
        ({ data } = await axiosInstance.post('/api/folders/root', payloadRoot));
      }
      let createdFolder: Folder;
      if (typeof data === 'object' && data !== null && 'folder' in (data as Record<string, unknown>)) {
        createdFolder = (data as { folder: Folder }).folder as Folder;
      } else {
        createdFolder = data as Folder;
      }
      toast.success('Đã tạo thư mục thành công');
      
      if (onFolderCreated) {
        onFolderCreated(createdFolder);
      }
      
      // Reset form
      setNewFolderName('');
      setNewFolderDescription('');
      setNewFolderParent('');
      
    } catch (error) {
      console.error('Create folder error:', error);
      toast.error('Lỗi tạo thư mục');
    }
  };

  const handleEditFolder = async () => {
    if (!editingFolder || !editFolderName.trim()) {
      toast.error('Vui lòng nhập tên thư mục');
      return;
    }

    try {
      const payload: Record<string, unknown> = {
        name: editFolderName,
        description: editFolderDescription,
      };
      if (editFolderParent !== undefined) {
        payload.parent_folder_id = editFolderParent || null;
      }
      const { data } = await axiosInstance.put(`/api/folders/${editingFolder._id}`, payload);
      const folder = data.folder || data;
      toast.success('Đã cập nhật thư mục');
      
      if (onFolderUpdated) {
        onFolderUpdated(folder);
      }
      
      setEditingFolder(null);
      setEditFolderName('');
      setEditFolderDescription('');
      setEditFolderParent('');
      
    } catch (error) {
      console.error('Update folder error:', error);
      toast.error('Lỗi cập nhật thư mục');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!window.confirm('Bạn có chắc muốn xóa thư mục này?')) {
      return;
    }

    try {
      await axiosInstance.delete(`/api/folders/${folderId}`);

      toast.success('Đã xóa thư mục');
      
      if (onFolderDeleted) {
        onFolderDeleted(folderId);
      }
      
    } catch (error) {
      console.error('Delete folder error:', error);
      toast.error('Lỗi xóa thư mục');
    }
  };

  const handleBulkAction = async () => {
    if (selectedFolders.size === 0) {
      toast.error('Vui lòng chọn thư mục');
      return;
    }

    try {
      const folderIds = Array.from(selectedFolders);
      
      if (bulkAction === 'delete') {
        if (!window.confirm(`Bạn có chắc muốn xóa ${folderIds.length} thư mục?`)) {
          return;
        }
        
        for (const folderId of folderIds) {
          await handleDeleteFolder(folderId);
        }
      }
      
      setSelectedFolders(new Set());
      
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error('Lỗi thực hiện thao tác');
    }
  };

  // no-op placeholder; selection is toggled in UI via checkboxes if added later

  const handleSelectAll = () => {
    if (selectedFolders.size === folders.length) {
      setSelectedFolders(new Set());
    } else {
      setSelectedFolders(new Set(folders.map(f => f._id)));
    }
  };

  const startEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setEditFolderName(folder.name);
    setEditFolderDescription(folder.description || '');
    setEditFolderParent(folder.parentId || '');
  };

  const handleFolderContextMenu = (e: React.MouseEvent, folder: Folder) => {
    e.preventDefault();
    setContextFolder(folder);
    setContextMenu(
      contextMenu === null
        ? { mouseX: e.clientX + 2, mouseY: e.clientY - 6 }
        : null,
    );
  };

  const closeContextMenu = () => {
    setContextMenu(null);
    setContextFolder(null);
  };

  const openMoveDialog = () => {
    setMoveTargetId('');
    setMoveDialogOpen(true);
    closeContextMenu();
  };

  const submitMoveFolder = async () => {
    if (!contextFolder || !moveTargetId || moveTargetId === contextFolder._id) {
      toast.error('Vui lòng chọn thư mục đích hợp lệ');
      return;
    }
    try {
      const { data } = await axiosInstance.put(`/api/folders/${contextFolder._id}`, { parent_folder_id: moveTargetId });
      const updated = data.folder || data;
      toast.success('Đã di chuyển thư mục');
      if (onFolderUpdated) onFolderUpdated(updated);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Lỗi di chuyển thư mục');
    } finally {
      setMoveDialogOpen(false);
      setMoveTargetId('');
    }
  };

  const openSharePermissions = async () => {
    if (!contextFolder) return;
    setActiveTab('permissions');
    setPermFolderId(contextFolder._id);
    try {
      await loadPermissions(contextFolder._id);
    } catch {}
    closeContextMenu();
  };

  const getFolderPath = (folder: Folder): string => {
    // This would need to be implemented based on your folder structure
    return folder.name;
  };

  // Search folders
  const handleSearchFolders = async () => {
    try {
      setSearchLoading(true);
      setSearchError(null);
      const params: Record<string, string> = { project_id: projectId };
      if (searchQuery) params.q = searchQuery;
      if (searchMilestoneId) params.milestone_id = searchMilestoneId;
      if (searchTags) params.tags = searchTags;
      const { data } = await axiosInstance.get('/api/folders/search', { params });
      setSearchResults(data.folders || []);
  } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      console.error('Search folders error:', e);
      setSearchError(err?.response?.data?.message || 'Lỗi tìm kiếm');
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Load tree
  const handleLoadTree = async () => {
    if (!treeFolderId) {
      toast.error('Vui lòng chọn thư mục gốc');
      return;
    }
    try {
      setTreeLoading(true);
      setTreeError(null);
      const { data } = await axiosInstance.get(`/api/folders/${treeFolderId}/tree`);
      setTreeData(data.tree || []);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      console.error('Load tree error:', e);
      setTreeError(err?.response?.data?.message || 'Lỗi tải cây thư mục');
      setTreeData([]);
    } finally {
      setTreeLoading(false);
    }
  };

  const renderTree = (nodes: TreeNode[]): React.ReactNode => {
    return (
      <List>
        {nodes.map((n) => (
          <Box key={n._id} sx={{ ml: 2, borderLeft: '1px dashed', borderColor: 'divider', pl: 1, mb: 1 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <FolderIcon fontSize="small" />
              <Typography variant="body2">{n.name}</Typography>
            </Stack>
            {n.children && n.children.length > 0 && renderTree(n.children)}
          </Box>
        ))}
      </List>
    );
  };

  // Load permissions list for a folder
  const loadPermissions = async (folderId: string) => {
    if (!folderId) return;
    try {
      setPermLoading(true);
      const { data } = await axiosInstance.get(`/api/folders/${folderId}`);
      const folder = data.folder || data;
      setPermissions(folder.permissions || []);
    } catch (e) {
      console.error('Load permissions error:', e);
      setPermissions([]);
    } finally {
      setPermLoading(false);
    }
  };

  const handleAddPermission = async () => {
    if (!permFolderId || !permUserId) {
      toast.error('Chọn thư mục và nhập user_id');
      return;
    }
    try {
      setPermLoading(true);
      await axiosInstance.post(`/api/folders/${permFolderId}/permissions`, { user_id: permUserId, role: permRole });
      toast.success('Đã thêm quyền');
      setPermUserId('');
      await loadPermissions(permFolderId);
  } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Lỗi thêm quyền');
    } finally {
      setPermLoading(false);
    }
  };

  const handleRemovePermission = async () => {
    if (!permFolderId || !removeUserId) {
      toast.error('Chọn thư mục và nhập userId cần xóa');
      return;
    }
    try {
      setPermLoading(true);
      await axiosInstance.delete(`/api/folders/${permFolderId}/permissions/${removeUserId}`);
      toast.success('Đã xóa quyền');
      setRemoveUserId('');
      await loadPermissions(permFolderId);
  } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      toast.error(err?.response?.data?.message || 'Lỗi xóa quyền');
    } finally {
      setPermLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">Quản lý thư mục</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant={activeTab === 'create' ? 'contained' : 'outlined'} onClick={() => setActiveTab('create')} startIcon={<CreateFolderIcon />}>Tạo mới</Button>
            <Button size="small" variant={activeTab === 'manage' ? 'contained' : 'outlined'} onClick={() => setActiveTab('manage')} startIcon={<EditIcon />}>Quản lý</Button>
            <Button size="small" variant={activeTab === 'search' ? 'contained' : 'outlined'} onClick={() => setActiveTab('search')}>Tìm kiếm</Button>
            <Button size="small" variant={activeTab === 'tree' ? 'contained' : 'outlined'} onClick={() => setActiveTab('tree')}>Cây thư mục</Button>
            <Button size="small" variant={activeTab === 'permissions' ? 'contained' : 'outlined'} onClick={() => setActiveTab('permissions')}>Quyền</Button>
          </Stack>
        </Stack>
      </DialogTitle>

      <DialogContent>
        {activeTab === 'create' ? (
          <Stack spacing={3}>
            <Typography variant="subtitle1">Tạo thư mục mới</Typography>
            
            <TextField
              label="Tên thư mục"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              fullWidth
              required
            />
            
            <TextField
              label="Mô tả"
              value={newFolderDescription}
              onChange={(e) => setNewFolderDescription(e.target.value)}
              fullWidth
              multiline
              rows={3}
            />
            
            <FormControl fullWidth>
              <InputLabel>Thư mục cha</InputLabel>
              <Select
                value={newFolderParent}
                onChange={(e) => setNewFolderParent(e.target.value)}
                label="Thư mục cha"
              >
                <MenuItem value="">Thư mục gốc</MenuItem>
                {folders.map((folder) => (
                  <MenuItem key={folder._id} value={folder._id}>
                    {getFolderPath(folder)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        ) : activeTab === 'manage' ? (
          <Stack spacing={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle1">
                Quản lý thư mục ({folders.length})
              </Typography>
              <Button
                size="small"
                onClick={handleSelectAll}
              >
                {selectedFolders.size === folders.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
              </Button>
            </Box>

            {selectedFolders.size > 0 && (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle2">
                    Thao tác hàng loạt ({selectedFolders.size} thư mục)
                  </Typography>
                  <Stack direction="row" spacing={2} alignItems="center">
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <InputLabel>Thao tác</InputLabel>
                      <Select
                        value={bulkAction}
                        onChange={(e) => setBulkAction(e.target.value as 'delete')}
                        label="Thao tác"
                      >
                        <MenuItem value="delete">Xóa</MenuItem>
                      </Select>
                    </FormControl>
                    
                    <Button
                      variant="contained"
                      size="small"
                      onClick={handleBulkAction}
                    >
                      Thực hiện
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            )}

            <List>
              {folders.map((folder) => (
                <ListItem
                  key={folder._id}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1,
                    mb: 1,
                    bgcolor: selectedFolders.has(folder._id) ? 'action.selected' : 'transparent'
                  }}
                  onContextMenu={(e) => handleFolderContextMenu(e, folder)}
                >
                  <ListItemIcon>
                    <FolderIcon />
                  </ListItemIcon>
                  <ListItemText
                    disableTypography
                    primary={
                      <Typography variant="body2" fontWeight={600}>
                        {folder.name}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {folder.description}
                        </Typography>
                        <Stack direction="row" spacing={2}>
                          <Typography variant="caption">
                            {folder.documentCount} tài liệu
                          </Typography>
                          <Typography variant="caption">
                            {folder.subfolderCount} thư mục con
                          </Typography>
                          <Typography variant="caption">
                            Tạo bởi: {folder.createdBy?.full_name || folder.created_by?.full_name || '—'}
                          </Typography>
                        </Stack>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        size="small"
                        onClick={() => startEditFolder(folder)}
                      >
                        <EditIcon />
                      </IconButton>
                  {canDeleteFolder(folder) && (
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteFolder(folder._id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  )}
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            {/* Context menu */}
            <MUIMenu
              open={contextMenu !== null}
              onClose={closeContextMenu}
              anchorReference="anchorPosition"
              anchorPosition={contextMenu !== null ? { top: contextMenu.mouseY, left: contextMenu.mouseX } : undefined}
            >
              <MenuItem onClick={() => { if (contextFolder) { startEditFolder(contextFolder); } closeContextMenu(); }}>Đổi tên</MenuItem>
              <MenuItem onClick={openMoveDialog}>Di chuyển...</MenuItem>
              <MenuItem
                disabled={!contextFolder || (contextFolder && !canDeleteFolder(contextFolder))}
                onClick={() => {
                  if (contextFolder && canDeleteFolder(contextFolder)) {
                    handleDeleteFolder(contextFolder._id);
                  }
                  closeContextMenu();
                }}
              >
                Xóa
              </MenuItem>
              <MenuItem onClick={() => { if (contextFolder) { setNewFolderParent(contextFolder._id); setActiveTab('create'); } closeContextMenu(); }}>
                Tạo thư mục con
              </MenuItem>
              <MenuItem onClick={openSharePermissions}>Chia sẻ/Quyền...</MenuItem>
            </MUIMenu>

            {/* Move dialog */}
            <Dialog open={moveDialogOpen} onClose={() => setMoveDialogOpen(false)} maxWidth="sm" fullWidth>
              <DialogTitle>Di chuyển thư mục</DialogTitle>
              <DialogContent>
                <FormControl fullWidth>
                  <InputLabel>Thư mục đích</InputLabel>
                  <Select label="Thư mục đích" value={moveTargetId} onChange={(e) => setMoveTargetId(e.target.value)}>
                    {folders
                      .filter(f => f._id !== contextFolder?._id)
                      .map(f => (
                        <MenuItem key={f._id} value={f._id}>{getFolderPath(f)}</MenuItem>
                      ))}
                  </Select>
                </FormControl>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setMoveDialogOpen(false)}>Hủy</Button>
                <Button variant="contained" onClick={submitMoveFolder} disabled={!moveTargetId}>Di chuyển</Button>
              </DialogActions>
            </Dialog>
          </Stack>
        ) : activeTab === 'search' ? (
          <Stack spacing={3}>
            <Typography variant="subtitle1">Tìm kiếm thư mục</Typography>
            <TextField label="Từ khóa (q)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} fullWidth />
            <Stack direction="row" spacing={2}>
              <TextField label="Tags (phân cách dấu phẩy)" value={searchTags} onChange={(e) => setSearchTags(e.target.value)} fullWidth />
              <TextField label="Milestone ID" value={searchMilestoneId} onChange={(e) => setSearchMilestoneId(e.target.value)} fullWidth />
            </Stack>
            <Button variant="contained" onClick={handleSearchFolders} disabled={searchLoading}>{searchLoading ? 'Đang tìm...' : 'Tìm kiếm'}</Button>
            {searchError && <Typography variant="body2" color="error">{searchError}</Typography>}
            <List>
              {searchResults.map((folder) => (
                <ListItem key={folder._id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, mb: 1 }}>
                  <ListItemIcon><FolderIcon /></ListItemIcon>
                  <ListItemText primary={folder.name} secondary={folder.description} />
                </ListItem>
              ))}
            </List>
          </Stack>
        ) : activeTab === 'tree' ? (
          <Stack spacing={3}>
            <Typography variant="subtitle1">Cây thư mục</Typography>
            <FormControl fullWidth>
              <InputLabel>Thư mục gốc</InputLabel>
              <Select value={treeFolderId} onChange={(e) => setTreeFolderId(e.target.value)} label="Thư mục gốc">
                {folders.map((f) => (
                  <MenuItem key={f._id} value={f._id}>{getFolderPath(f)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" onClick={handleLoadTree} disabled={treeLoading || !treeFolderId}>{treeLoading ? 'Đang tải...' : 'Tải cây thư mục'}</Button>
            {treeError && <Typography variant="body2" color="error">{treeError}</Typography>}
            {treeData.length > 0 && (
              <Box sx={{ maxHeight: 360, overflowY: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1 }}>
                {renderTree(treeData)}
              </Box>
            )}
          </Stack>
        ) : (
          <Stack spacing={3}>
            <Typography variant="subtitle1">Quyền thư mục</Typography>
            <FormControl fullWidth>
              <InputLabel>Thư mục</InputLabel>
              <Select value={permFolderId} onChange={async (e) => { setPermFolderId(e.target.value); await loadPermissions(e.target.value); }} label="Thư mục">
                {folders.map((f) => (
                  <MenuItem key={f._id} value={f._id}>{getFolderPath(f)}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <TextField label="user_id" value={permUserId} onChange={(e) => setPermUserId(e.target.value)} fullWidth />
              <FormControl fullWidth>
                <InputLabel>Role</InputLabel>
                <Select value={permRole} label="Role" onChange={(e) => setPermRole(e.target.value as 'viewer' | 'editor' | 'admin')}>
                  <MenuItem value="viewer">viewer</MenuItem>
                  <MenuItem value="editor">editor</MenuItem>
                  <MenuItem value="admin">admin</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" onClick={handleAddPermission} disabled={permLoading || !permFolderId}>Thêm</Button>
            </Stack>
            <Stack direction="row" spacing={2}>
              <TextField label="userId cần xóa" value={removeUserId} onChange={(e) => setRemoveUserId(e.target.value)} fullWidth />
              <Button variant="outlined" color="error" onClick={handleRemovePermission} disabled={permLoading || !permFolderId}>Xóa quyền</Button>
            </Stack>
            <Typography variant="subtitle2">Danh sách quyền</Typography>
            <List>
              {permissions.map((p) => (
                <ListItem key={p.user_id}>
                  <ListItemIcon><FolderIcon /></ListItemIcon>
                  <ListItemText primary={`${p.user?.full_name || p.user_id} (${p.role})`} secondary={p.user?.email} />
                </ListItem>
              ))}
            </List>
          </Stack>
        )}

        {/* Edit Folder Dialog */}
        {editingFolder && (
          <Box sx={{ mt: 3, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Chỉnh sửa thư mục: {editingFolder.name}
            </Typography>
            <Stack spacing={2}>
              <TextField
                label="Tên thư mục"
                value={editFolderName}
                onChange={(e) => setEditFolderName(e.target.value)}
                fullWidth
                size="small"
              />
              <TextField
                label="Mô tả"
                value={editFolderDescription}
                onChange={(e) => setEditFolderDescription(e.target.value)}
                fullWidth
                multiline
                rows={2}
                size="small"
              />
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleEditFolder}
                >
                  Lưu
                </Button>
                <Button
                  size="small"
                  onClick={() => setEditingFolder(null)}
                >
                  Hủy
                </Button>
              </Stack>
            </Stack>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          Đóng
        </Button>
        {activeTab === 'create' && (
          <Button
            variant="contained"
            onClick={handleCreateFolder}
            disabled={!newFolderName.trim()}
          >
            Tạo thư mục
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
