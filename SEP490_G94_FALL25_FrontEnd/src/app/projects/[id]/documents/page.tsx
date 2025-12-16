"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import axiosInstance from "../../../../../ultis/axios";
import SidebarWrapper from "@/components/SidebarWrapper";
import { Box, Button, Card, CardContent, Typography, Stack, Alert, Paper, Breadcrumbs, Link, List, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, IconButton, ButtonBase, Chip } from "@mui/material";
import { Folder as FolderIcon, Home as HomeIcon, NavigateNext as NavigateNextIcon, CreateNewFolder as CreateFolderIcon, DriveFileRenameOutline as RenameIcon, DriveFileMove as MoveIcon, DeleteOutline as DeleteIcon, SubdirectoryArrowRight as SubFolderIcon, Star as StarIcon, StarBorder as StarBorderIcon, Info as InfoIcon, Visibility as VisibilityIcon, ArrowBack as ArrowBackIcon, Search as SearchIcon } from "@mui/icons-material";
import { CloudUpload as CloudUploadIcon } from "@mui/icons-material";
import DocumentUpload from "@/components/DocumentUpload";
import { InsertDriveFile as FileIcon, PictureAsPdf as PdfIcon, Image as ImageIcon, TableChart as SheetIcon, Description as DocIcon, Download as DownloadIcon } from "@mui/icons-material";
import { toast } from "sonner";
 

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
  };
  documentCount: number;
  subfolderCount: number;
};

type FolderTree = Folder & { children?: FolderTree[] };

type MilestoneOption = {
  _id: string;
  title: string;
};

type DocumentItem = {
  _id: string;
  type: string;
  title: string;
  version: string;
  file_url: string;
  createdAt?: string;
  created_by?: { _id: string; full_name: string };
  project_id?: { _id: string; topic: string } | string;
  folder_id?: { _id: string; name: string } | string | null;
  is_final_release?: boolean;
};

type ActivityLog = {
  _id: string;
  action: string;
  user?: {
    _id: string;
    full_name: string;
    email?: string;
  };
  created_at: string;
  metadata?: any;
  description?: string;
};

 

const getDocIcon = (type: string) => {
  const t = (type || '').toLowerCase();
  if (t.includes('pdf')) return <PdfIcon color="error" />;
  if (t.includes('image') || t.includes('jpg') || t.includes('png')) return <ImageIcon color="primary" />;
  if (t.includes('sheet') || t.includes('excel') || t.includes('xls')) return <SheetIcon color="success" />;
  if (t.includes('doc') || t.includes('word')) return <DocIcon color="primary" />;
  return <FileIcon />;
};

const isRootDoc = (doc: DocumentItem) => {
  const f = doc.folder_id as unknown;
  if (f === null || f === undefined) return true;
  if (typeof f === 'string') return f.trim() === '';
  return false;
};

const isImageFile = (doc: DocumentItem) => {
  const type = (doc.type || '').toLowerCase();
  const title = (doc.title || '').toLowerCase();
  return type.includes('image') || 
         type.includes('jpg') || 
         type.includes('jpeg') || 
         type.includes('png') || 
         type.includes('gif') || 
         type.includes('webp') ||
         title.includes('.jpg') || 
         title.includes('.jpeg') || 
         title.includes('.png') || 
         title.includes('.gif') || 
         title.includes('.webp');
};

export default function DocumentsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);
  
  // State management - chỉ thư mục
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderTree, setFolderTree] = useState<FolderTree[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState<string | null>(null);
  
  
  // Dialog states
  const [createRootOpen, setCreateRootOpen] = useState(false);
  const [createChildOpen, setCreateChildOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameName, setRenameName] = useState('');
  const [moveTargetId, setMoveTargetId] = useState('');
  const [actionFolderId, setActionFolderId] = useState<string | null>(null);
  
  // Document rename states
  const [renameDocOpen, setRenameDocOpen] = useState(false);
  const [renameDocTitle, setRenameDocTitle] = useState('');
  const [actionDocumentId, setActionDocumentId] = useState<string | null>(null);
  
  // History dialog states
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyData, setHistoryData] = useState<ActivityLog[]>([]);
  const [historyItemId, setHistoryItemId] = useState<string | null>(null);
  const [historyItemType, setHistoryItemType] = useState<'document' | 'folder' | null>(null);
  const [historyItemName, setHistoryItemName] = useState<string>('');
  
  // Current folder navigation
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);

  // Current user (for delete permission)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const { data } = await axiosInstance.get('/api/folders/user/current');
        setCurrentUserId(data?.user?._id || null);
      } catch (e) {
        console.error('Error fetching current user in DocumentsPage:', e);
        setCurrentUserId(null);
      }
    };

    fetchCurrentUser();
  }, []);

  const canDeleteFolder = (folder: Folder): boolean => {
    const creatorId = folder.createdBy?._id || folder.created_by?._id;
    if (!creatorId || !currentUserId) return false;
    return creatorId === currentUserId;
  };

  const canDeleteDocument = (doc: DocumentItem): boolean => {
    const creatorId = doc.created_by?._id;
    if (!creatorId || !currentUserId) return false;
    return creatorId === currentUserId;
  };


  const findPath = useCallback((nodes: FolderTree[], targetId: string, path: Folder[] = []): Folder[] | null => {
    for (const n of nodes) {
      const newPath = [...path, n];
      if (n._id === targetId) return newPath;
      if (n.children) {
        const found = findPath(n.children, targetId, newPath);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const loadFolders = useCallback(async () => {
    try {
      const rootsRes = await axiosInstance.get(`/api/folders/project/${projectId}`, { params: { parentId: 'null' } });
      const roots: Folder[] = rootsRes.data.folders || [];
      const trees: FolderTree[] = [];
      for (const r of roots) {
        try {
          const treeRes = await axiosInstance.get(`/api/folders/${r._id}/tree`);
          const children = (treeRes.data.tree || []) as FolderTree[];
          trees.push({ ...r, children });
        } catch {
          trees.push({ ...r, children: [] });
        }
      }
      setFolderTree(trees);
      if (currentFolderId) {
        const detailRes = await axiosInstance.get(`/api/folders/${currentFolderId}`);
        const children: Folder[] = detailRes.data.children || [];
        setFolders(
          [...children].sort((a, b) =>
            (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base', numeric: true })
          )
        );
        const path = findPath(trees, currentFolderId);
        setFolderPath(path || []);
      } else {
        setFolders(
          [...roots].sort((a, b) =>
            (a.name || '').localeCompare(b.name || '', 'vi', { sensitivity: 'base', numeric: true })
          )
        );
        setFolderPath([]);
      }
    } catch (e: unknown) {
      console.error('Error loading folders:', e);
      setFolders([]);
      setFolderTree([]);
      setError('Không thể tải thư mục');
    }
  }, [projectId, currentFolderId, findPath]);

  useEffect(() => {
    if (!projectId) return;
    loadFolders();
  }, [projectId, currentFolderId, loadFolders]);

  const loadDocuments = useCallback(async () => {
    if (!projectId) return;
    try {
      setDocsLoading(true);
      setDocsError(null);

      let list: DocumentItem[] = [];
      if (currentFolderId) {
        const res = await axiosInstance.get(`/api/documents/folder/${currentFolderId}`, { params: { limit: 100 } });
        list = res.data.documents || res.data || [];
      } else {
        const res = await axiosInstance.get(`/api/documents/project/${projectId}`, { params: { limit: 100 } });
        const all = res.data.documents || res.data || [];
        list = (all as DocumentItem[]).filter(isRootDoc);
      }
      // Sắp xếp tài liệu theo version (giảm dần)
      list.sort((a, b) => {
        const vA = parseFloat(a.version) || 0;
        const vB = parseFloat(b.version) || 0;
        return vB - vA;
      });
      setDocuments(list);
    } catch {
      setDocsError('Không thể tải danh sách tài liệu');
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  }, [projectId, currentFolderId]);

  useEffect(() => {
      loadDocuments();
  }, [loadDocuments]);

  const handleDownload = async (doc: DocumentItem) => {
    if (doc.file_url) {
      window.open(doc.file_url, '_blank');
      if (isImageFile(doc)) {
        toast.success("Đang mở ảnh", {
          description: doc.title
        });
      } else {
        toast.success("Đang tải xuống", {
          description: doc.title
        });
      }
    } else {
      toast.error("Không tìm thấy đường dẫn file");
    }
  };

  

  const handleDeleteDocument = async (doc: DocumentItem) => {
    if (!window.confirm('Xóa tài liệu này?')) return;
    try {
      await axiosInstance.delete(`/api/documents/${doc._id}`);
      loadDocuments();
      toast.success('Đã xóa tài liệu', { description: doc.title });
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Không thể xóa tài liệu';
      setDocsError(message);
      toast.error('Không thể xóa tài liệu', { description: message });
    }
  };

  const handleToggleFinalRelease = async (doc: DocumentItem) => {
    try {
      const newStatus = !doc.is_final_release;
      await axiosInstance.patch(`/api/documents/${doc._id}/final-release`, {
        is_final_release: newStatus
      });
      loadDocuments();
    } catch (err: any) {
      setDocsError(err?.response?.data?.message || 'Không thể cập nhật Final Release');
    }
  };

  const openRenameDoc = (docId: string, currentTitle: string) => {
    setActionDocumentId(docId);
    setRenameDocTitle(currentTitle);
    setRenameDocOpen(true);
  };

  const handleRenameDoc = async () => {
    if (!actionDocumentId || !renameDocTitle.trim()) return;
    try {
      await axiosInstance.put(`/api/documents/${actionDocumentId}`, { title: renameDocTitle });
      setRenameDocOpen(false);
      setRenameDocTitle('');
      setActionDocumentId(null);
      loadDocuments();
    } catch {
      setDocsError('Không thể đổi tên tài liệu');
    }
  };

  const openHistory = async (itemId: string, itemType: 'document' | 'folder', itemName: string) => {
    setHistoryItemId(itemId);
    setHistoryItemType(itemType);
    setHistoryItemName(itemName);
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryData([]);
    
    try {
      const endpoint = itemType === 'document' 
        ? `/api/documents/${itemId}/activity-logs`
        : `/api/folders/${itemId}/activity-logs`;
      
      const res = await axiosInstance.get(endpoint, {
        params: { limit: 50 }
      });
      
      const logs = Array.isArray(res.data) ? res.data : (res.data.activity_logs || res.data.logs || []);
      setHistoryData(logs);
    } catch (err: any) {
      console.error('Error loading history:', err);
      // Nếu endpoint không tồn tại (404), hiển thị empty array
      if (err.response?.status !== 404) {
        setDocsError('Không thể tải lịch sử');
      }
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getActivityDescription = (log: ActivityLog) => {
    const userName = log.user?.full_name || 'Người dùng';
    const action = log.action || '';
    
    switch (action.toUpperCase()) {
      case 'CREATE':
      case 'CREATED':
        return `${userName} đã tạo`;
      case 'UPDATE':
      case 'UPDATED':
      case 'EDIT':
      case 'EDITED':
        return `${userName} đã chỉnh sửa`;
      case 'DELETE':
      case 'DELETED':
        return `${userName} đã xóa`;
      case 'DOWNLOAD':
      case 'DOWNLOADED':
        return `${userName} đã tải xuống`;
      case 'RENAME':
      case 'RENAMED':
        return `${userName} đã đổi tên`;
      case 'MOVE':
      case 'MOVED':
        return `${userName} đã di chuyển`;
      case 'UPLOAD':
      case 'UPLOADED':
        return `${userName} đã tải lên`;
      case 'MARK_FINAL_RELEASE':
        return `${userName} đã đánh dấu Final Release`;
      default:
        // Nếu có description, lấy phần đầu (trước dấu hai chấm hoặc dấu phẩy)
        if (log.description) {
          const desc = log.description.split(':')[0].split(',')[0].trim();
          if (desc) {
            return `${userName} ${desc}`;
          }
        }
        return `${userName} đã thực hiện ${action}`;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  const openCreateChildFor = (folderId: string) => {
    setActionFolderId(folderId);
    setCreateChildOpen(true);
  };

  const openRenameFor = (folderId: string, currentName: string) => {
    setActionFolderId(folderId);
    setRenameName(currentName);
    setRenameOpen(true);
  };

  const openMoveFor = (folderId: string) => {
    setActionFolderId(folderId);
    setMoveOpen(true);
  };

  const deleteFolderById = async (folderId: string) => {
    if (!window.confirm('Xóa thư mục này?')) return;
    try {
      await axiosInstance.delete(`/api/folders/${folderId}`);
      if (currentFolderId === folderId) {
        router.push(`/projects/${projectId}/documents`);
      } else {
        loadFolders();
      }
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Không thể xóa thư mục';
      setError(message);
    }
  };

  const renderFolderTree = (nodes: FolderTree[]) => (
    <List>
      {nodes.map((node) => (
        <Box key={node._id} sx={{ ml: 1, mb: 0.5 }}>
          <Button
            size="small"
            onClick={() => navigateToFolder(node._id)}
            sx={{
              justifyContent: 'flex-start',
              textTransform: 'none',
              width: '100%',
              px: 1,
              py: 0.75,
              borderRadius: 1,
              transition: 'background-color 120ms ease, color 120ms ease',
              '&:hover': {
                bgcolor: '#000',
                color: '#fff',
                '& .folder-icon': { color: '#fff' }
              }
            }}
          >
            <FolderIcon className="folder-icon" sx={{ mr: 1, transition: 'color 120ms ease' }} />
            {node.name}
          </Button>
          {node.children && node.children.length > 0 && (
            <Box sx={{ ml: 2, mt: 0.25 }}>
              {renderFolderTree(node.children)}
            </Box>
          )}
        </Box>
      ))}
    </List>
  );

  const resetInputs = () => {
    setNewFolderName('');
    setRenameName('');
    setMoveTargetId('');
    setActionFolderId(null);
  };

  const flattenTree = (nodes: FolderTree[], acc: Folder[] = []): Folder[] => {
    for (const n of nodes) {
      acc.push(n);
      if (n.children) flattenTree(n.children, acc);
    }
    return acc;
  };

  const handleCreateRoot = async () => {
    if (!newFolderName.trim()) return;
    try {
      await axiosInstance.post('/api/folders/root', { name: newFolderName, project_id: projectId });
      setCreateRootOpen(false);
      resetInputs();
      loadFolders();
    } catch {
      setError('Không thể tạo thư mục gốc');
    }
  };

  const handleCreateChild = async () => {
    if (!actionFolderId || !newFolderName.trim()) return;
    try {
      await axiosInstance.post('/api/folders', { name: newFolderName, project_id: projectId, parent_folder_id: actionFolderId });
      setCreateChildOpen(false);
      resetInputs();
      loadFolders();
    } catch {
      setError('Không thể tạo thư mục con');
    }
  };

  const handleRename = async () => {
    if (!actionFolderId || !renameName.trim()) return;
    try {
      await axiosInstance.put(`/api/folders/${actionFolderId}`, { name: renameName });
      setRenameOpen(false);
      resetInputs();
      loadFolders();
    } catch {
      setError('Không thể đổi tên thư mục');
    }
  };

  const handleMove = async () => {
    if (!actionFolderId || !moveTargetId || moveTargetId === actionFolderId) return;
    try {
      await axiosInstance.put(`/api/folders/${actionFolderId}`, { parent_folder_id: moveTargetId });
      setMoveOpen(false);
      resetInputs();
      loadFolders();
    } catch {
      setError('Không thể di chuyển thư mục');
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-white text-black">
        <SidebarWrapper />
        <main className="p-4 md:p-6 md:ml-56">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
              <Button
                variant="outlined"
                size="medium"
                onClick={() => loadFolders()}
              >
                Thử lại
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-black">
      <SidebarWrapper />
      <main className="p-4 md:p-6 md:ml-56">
        <div className="mx-auto w-full max-w-7xl">
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '260px 1fr' }, gap: 2 }}>
            <Card sx={{ display: { xs: currentFolderId ? 'none' : 'block', md: 'block' } }}>
              <CardContent>
                <Typography variant="subtitle1" gutterBottom>
                  Thư mục
                </Typography>
                {folderTree.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Chưa có thư mục</Typography>
                ) : (
                  renderFolderTree(folderTree)
                )}
              </CardContent>
            </Card>
            <Box>
          {/* Breadcrumb Navigation */}
          {currentFolderId && folderPath.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Breadcrumbs 
                separator={<NavigateNextIcon fontSize="small" sx={{ color: '#9ca3af' }} />} 
                sx={{ 
                  '& .MuiBreadcrumbs-separator': { 
                    mx: 1 
                  } 
                }}
              >
                <Button
                  size="small"
                  startIcon={<HomeIcon sx={{ fontSize: 18 }} />}
                  onClick={() => navigateToFolder(null)}
                  sx={{
                    textTransform: 'none',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: 500,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 1,
                    bgcolor: '#f3f4f6',
                    '&:hover': {
                      bgcolor: '#e5e7eb',
                      color: '#111827'
                    }
                  }}
                >
                  Gốc
                </Button>
                {folderPath.map((folder, index) => (
                  <Button
                    key={folder._id}
                    size="small"
                    onClick={() => navigateToFolder(folder._id)}
                    sx={{
                      textTransform: 'none',
                      color: index === folderPath.length - 1 ? '#111827' : '#6b7280',
                      fontSize: '14px',
                      fontWeight: index === folderPath.length - 1 ? 600 : 500,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: index === folderPath.length - 1 ? '#f3f4f6' : 'transparent',
                      '&:hover': {
                        bgcolor: '#e5e7eb',
                        color: '#111827'
                      }
                    }}
                  >
                    {folder.name}
                  </Button>
                ))}
              </Breadcrumbs>
            </Box>
          )}

          <div className="mb-6 md:mb-8 space-y-4">
            <div className="flex items-end justify-between">
              <div className="space-y-1">
                <div className="text-[10px] md:text-xs uppercase tracking-wider text-black">Dự án</div>
                <div className="flex items-center gap-3">
                  {currentFolderId && (
                    <IconButton
                      size="small"
                      onClick={() => {
                        if (folderPath.length > 1) {
                          // Quay về folder cha
                          const parentFolder = folderPath[folderPath.length - 2];
                          navigateToFolder(parentFolder._id);
                        } else {
                          // Quay về root
                          navigateToFolder(null);
                        }
                      }}
                      sx={{
                        bgcolor: 'action.hover',
                        '&:hover': {
                          bgcolor: 'action.selected'
                        }
                      }}
                      title="Trở về"
                    >
                      <ArrowBackIcon fontSize="small" />
                    </IconButton>
                  )}
                  <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-black">
                    {currentFolderId && folderPath.length > 0 
                      ? folderPath[folderPath.length - 1].name 
                      : 'Quản lý tài liệu'}
                  </h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="contained"
                  color="primary"
                  size="medium"
                  startIcon={<CloudUploadIcon />}
                  onClick={() => setUploadOpen(true)}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    px: 2,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                    '&:hover': {
                      boxShadow: '0 4px 10px rgba(0,0,0,0.12)'
                    }
                  }}
                >
                  Tải lên
                </Button>
                <Button
                  variant="contained"
                  size="medium"
                  startIcon={<CreateFolderIcon />}
                  onClick={() => setCreateRootOpen(true)}
                  sx={{
                    borderRadius: 2,
                    textTransform: 'none',
                    px: 2,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
                    '&:hover': {
                      boxShadow: '0 4px 10px rgba(0,0,0,0.12)'
                    }
                  }}
                >
                  Tạo folder gốc
                </Button>
              </div>
            </div>
            
            {/* Search Bar */}
            <TextField
              fullWidth
              placeholder="Tìm kiếm tài liệu và thư mục..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                ),
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  bgcolor: 'background.paper',
                  '&:hover': {
                    bgcolor: 'action.hover'
                  },
                  '&.Mui-focused': {
                    bgcolor: 'background.paper'
                  }
                }
              }}
            />
          </div>


          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>Nội dung</Typography>

              {docsError && (
                <Alert severity="error" sx={{ mb: 2 }}>{docsError}</Alert>
              )}

              <Stack spacing={1}>
                {docsLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <Paper key={i} variant="outlined" sx={{ px: 2, py: 1.25, height: 52, bgcolor: 'action.hover' }} />
                  ))
                ) : folders.length === 0 && documents.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">Thư mục trống</Typography>
                ) : (
                  <>
                    {folders
                      .filter(folder => 
                        !searchQuery || 
                        folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        (folder.description && folder.description.toLowerCase().includes(searchQuery.toLowerCase()))
                      )
                      .map((folder) => (
                      <Paper key={folder._id} variant="outlined" sx={{ px: 2, py: 1.25 }}>
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'center', columnGap: 12 }}>
                          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
                            <FolderIcon color="primary" />
                            <ButtonBase
                              onClick={(e) => { e.stopPropagation(); navigateToFolder(folder._id); }}
                              sx={{ p: 0, borderRadius: 0.5, '&:hover': { backgroundColor: 'transparent' } }}
                            >
                              <Typography variant="subtitle1" noWrap sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' }, fontSize: { xs: '0.95rem', md: '1.05rem' }, fontWeight: 600 }}>
                                {folder.name}
                              </Typography>
                            </ButtonBase>
                          </Stack>
                          <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                            <IconButton size="small" disableRipple disableFocusRipple onClick={(e) => { e.stopPropagation(); openCreateChildFor(folder._id); }} sx={{ '&:hover': { backgroundColor: 'transparent' } }}>
                              <SubFolderIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" disableRipple disableFocusRipple onClick={(e) => { e.stopPropagation(); openRenameFor(folder._id, folder.name); }} sx={{ '&:hover': { backgroundColor: 'transparent' } }}>
                              <RenameIcon fontSize="small" />
                            </IconButton>
                            <IconButton size="small" disableRipple disableFocusRipple onClick={(e) => { e.stopPropagation(); openMoveFor(folder._id); }} sx={{ '&:hover': { backgroundColor: 'transparent' } }}>
                              <MoveIcon fontSize="small" />
                            </IconButton>
                            {canDeleteFolder(folder) && (
                              <IconButton size="small" color="error" disableRipple disableFocusRipple onClick={(e) => { e.stopPropagation(); deleteFolderById(folder._id); }} sx={{ '&:hover': { backgroundColor: 'transparent' } }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Stack>
                        </Box>
                      </Paper>
                    ))}
                    {documents
                      .filter(doc => 
                        !searchQuery || 
                        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        doc.version.toLowerCase().includes(searchQuery.toLowerCase())
                      )
                      .map(doc => (
                      <Paper 
                        key={doc._id} 
                        variant="outlined" 
                        sx={{ 
                          px: 2, 
                          py: 1.25,
                          backgroundColor: doc.is_final_release ? '#fff8e1' : 'white',
                          borderColor: doc.is_final_release ? '#ffc107' : undefined,
                          borderWidth: doc.is_final_release ? 2 : undefined,
                          '&:hover': {
                            backgroundColor: doc.is_final_release ? '#fff9c4' : 'action.hover'
                          }
                        }}
                      >
                        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                          <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0, flex: 1 }}>
                            {getDocIcon(doc.title)}
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Stack direction="row" alignItems="center" spacing={1}>
                                <Typography
                                  variant="subtitle1"
                                  noWrap
                                  title={`${doc.title} v${doc.version}`}
                                  sx={{ fontSize: { xs: '0.95rem', md: '1.05rem' }, fontWeight: doc.is_final_release ? 700 : 600 }}
                                >
                                  {doc.title} <Typography component="span" sx={{ color: 'text.secondary', fontSize: '0.9em' }}>v{doc.version}</Typography>
                                </Typography>
                                {doc.is_final_release && (
                                  <Chip 
                                    label="Final Release" 
                                    size="small" 
                                    color="warning"
                                    icon={<StarIcon />}
                                    sx={{ 
                                      fontWeight: 600,
                                      '& .MuiChip-icon': {
                                        color: '#ff9800'
                                      }
                                    }}
                                  />
                                )}
                              </Stack>
                            </Box>
                          </Stack>
                          <Stack direction="row" spacing={0.5} onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
                            <IconButton 
                              size="small" 
                              disableRipple 
                              disableFocusRipple 
                              onClick={(e) => { e.stopPropagation(); handleToggleFinalRelease(doc); }} 
                              sx={{ 
                                '&:hover': { backgroundColor: 'transparent' },
                                color: doc.is_final_release ? '#ff9800' : 'inherit'
                              }}
                              title={doc.is_final_release ? 'Bỏ đánh dấu Final Release' : 'Đánh dấu Final Release'}
                            >
                              {doc.is_final_release ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
                            </IconButton>
                            <IconButton size="small" disableRipple disableFocusRipple onClick={(e) => { e.stopPropagation(); openRenameDoc(doc._id, doc.title); }} sx={{ '&:hover': { backgroundColor: 'transparent' } }}>
                              <RenameIcon fontSize="small" />
                            </IconButton>
                            
                            <IconButton size="small" disableRipple disableFocusRipple onClick={(e) => { e.stopPropagation(); handleDownload(doc); }} sx={{ '&:hover': { backgroundColor: 'transparent' } }} title={isImageFile(doc) ? "Xem ảnh" : "Tải xuống"}>
                              {isImageFile(doc) ? <VisibilityIcon fontSize="small" /> : <DownloadIcon fontSize="small" />}
                            </IconButton>
                            <IconButton size="small" disableRipple disableFocusRipple onClick={(e) => { e.stopPropagation(); openHistory(doc._id, 'document', doc.title); }} sx={{ '&:hover': { backgroundColor: 'transparent' } }} title="Xem lịch sử">
                              <InfoIcon fontSize="small" />
                            </IconButton>
                            {canDeleteDocument(doc) && (
                              <IconButton size="small" color="error" disableRipple disableFocusRipple onClick={(e) => { e.stopPropagation(); handleDeleteDocument(doc); }} sx={{ '&:hover': { backgroundColor: 'transparent' } }}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            )}
                          </Stack>
                        </Stack>
                      </Paper>
                    ))}
                  </>
                )}
              </Stack>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </div>
      </main>

      
      

      <Dialog open={createRootOpen} onClose={() => setCreateRootOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Tạo folder gốc</DialogTitle>
        <DialogContent>
          <TextField label="Tên" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} fullWidth sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateRootOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreateRoot} disabled={!newFolderName.trim()}>Tạo</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={createChildOpen} onClose={() => setCreateChildOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Tạo thư mục con</DialogTitle>
        <DialogContent>
          <TextField label="Tên" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} fullWidth sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateChildOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleCreateChild} disabled={!newFolderName.trim() || !actionFolderId}>Tạo</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={renameOpen} onClose={() => setRenameOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Đổi tên thư mục</DialogTitle>
        <DialogContent>
          <TextField label="Tên mới" value={renameName} onChange={(e) => setRenameName(e.target.value)} fullWidth sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleRename} disabled={!renameName.trim() || !actionFolderId}>Lưu</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={moveOpen} onClose={() => setMoveOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Di chuyển thư mục</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>Thư mục đích</InputLabel>
            <Select label="Thư mục đích" value={moveTargetId} onChange={(e) => setMoveTargetId(e.target.value)}>
              {flattenTree(folderTree)
                .filter(f => f._id !== actionFolderId)
                .map(f => (
                  <MenuItem key={f._id} value={f._id}>{f.name}</MenuItem>
                ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMoveOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleMove} disabled={!moveTargetId || !actionFolderId}>Di chuyển</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={renameDocOpen} onClose={() => setRenameDocOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Đổi tên tài liệu</DialogTitle>
        <DialogContent>
          <TextField 
            label="Tên mới" 
            value={renameDocTitle} 
            onChange={(e) => setRenameDocTitle(e.target.value)} 
            fullWidth 
            sx={{ mt: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameDocOpen(false)}>Hủy</Button>
          <Button variant="contained" onClick={handleRenameDoc} disabled={!renameDocTitle.trim() || !actionDocumentId}>Lưu</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Lịch sử {historyItemType === 'document' ? 'tài liệu' : 'thư mục'}: {historyItemName}
        </DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <Typography>Đang tải...</Typography>
            </Box>
          ) : historyData.length === 0 ? (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Chưa có lịch sử hoạt động
              </Typography>
            </Box>
          ) : (
            <Stack spacing={1} sx={{ mt: 1 }}>
              {historyData.map((log) => (
                <Paper
                  key={log._id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    borderRadius: 1,
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                    <Typography variant="body2">
                      {getActivityDescription(log)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(log.created_at)}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Đóng</Button>
        </DialogActions>
      </Dialog>

      <DocumentUpload
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        projectId={projectId}
        onUploadComplete={() => {
          setUploadOpen(false);
          loadDocuments();
        }}
        defaultFolderId={currentFolderId || undefined}
        folderOptions={flattenTree(folderTree).map(f => ({ _id: f._id, name: f.name }))}
      />
    </div>
  );
}
