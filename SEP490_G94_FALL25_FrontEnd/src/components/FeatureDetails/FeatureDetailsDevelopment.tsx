"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Chip,
  IconButton,
  Tooltip,
  Paper,
  Divider,
  Alert,
  Avatar,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Badge,
  TextField,
  FormControlLabel,
  Switch,
} from "@mui/material";
import GitHubIcon from "@mui/icons-material/GitHub";
import CallSplitIcon from "@mui/icons-material/CallSplit";
import MergeTypeIcon from "@mui/icons-material/MergeType";
import CommitIcon from "@mui/icons-material/Commit";
import CodeIcon from "@mui/icons-material/Code";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SettingsIcon from "@mui/icons-material/Settings";
import axiosInstance from "../../../ultis/axios";

interface FeatureDetailsDevelopmentProps {
  featureId: string | null;
  projectId?: string;
}

interface GithubLink {
  _id: string;
  link_type: "commit" | "pull_request" | "branch" | "issue";
  github_url: string;
  commit_sha?: string;
  commit_message?: string;
  commit_author?: {
    name: string;
    email: string;
    username?: string;
  };
  commit_date?: string;
  pr_number?: number;
  pr_title?: string;
  pr_state?: string;
  pr_merged?: boolean;
  pr_author?: {
    username: string;
    avatar_url?: string;
  };
  branch_name?: string;
  issue_number?: number;
  issue_title?: string;
  auto_linked?: boolean;
  created_at?: string;
}

interface GroupedLinks {
  commits: GithubLink[];
  pull_requests: GithubLink[];
  branches: GithubLink[];
  issues: GithubLink[];
}

interface Repository {
  _id: string;
  repo_full_name: string;
  repo_owner: string;
  repo_name: string;
  enabled: boolean;
}

export default function FeatureDetailsDevelopment({ featureId, projectId }: FeatureDetailsDevelopmentProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<GroupedLinks>({
    commits: [],
    pull_requests: [],
    branches: [],
    issues: [],
  });
  const [summary, setSummary] = useState({ total: 0, commits: 0, pull_requests: 0, branches: 0, issues: 0 });
  const [repositories, setRepositories] = useState<Repository[]>([]);
  
  // Dialog states
  const [createBranchDialog, setCreateBranchDialog] = useState(false);
  const [addRepoDialog, setAddRepoDialog] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [branchName, setBranchName] = useState("");
  const [creating, setCreating] = useState(false);
  const [addingRepo, setAddingRepo] = useState(false);
  const [tokenVerified, setTokenVerified] = useState(false);
  const [removingLinkId, setRemovingLinkId] = useState<string | null>(null);
  
  // Add repo form
  const [repoForm, setRepoForm] = useState({
    repo_owner: "",
    repo_name: "",
    access_token: "",
    auto_link_commits: true,
    auto_link_prs: true,
  });

  useEffect(() => {
    if (featureId && projectId) {
      loadGithubLinks();
      loadRepositories();
    }
  }, [featureId, projectId]);

  const loadGithubLinks = async () => {
    if (!featureId) return;
    
    try {
      setLoading(true);
      const response = await axiosInstance.get(`/api/features/${featureId}/github/links`);
      setLinks(response.data.grouped || {
        commits: [],
        pull_requests: [],
        branches: [],
        issues: [],
      });
      setSummary(response.data.summary || { total: 0, commits: 0, pull_requests: 0, branches: 0, issues: 0 });
      setError(null);
    } catch (error: any) {
      console.error("Error loading GitHub links:", error);
      if (error?.response?.status !== 404) {
        setError("Failed to load GitHub links");
      }
    } finally {
      setLoading(false);
    }
  };

  const loadRepositories = async () => {
    if (!projectId) return;
    
    try {
      const response = await axiosInstance.get(`/api/projects/${projectId}/github/repositories`);
      setRepositories(response.data || []);
    } catch (error) {
      console.error("Error loading repositories:", error);
    }
  };

  const createBranch = async () => {
    if (!featureId || !selectedRepo || !branchName.trim()) {
      setError("Please select repository and enter branch name");
      return;
    }
    
    try {
      setCreating(true);
      setError(null);
      
      const response = await axiosInstance.post(`/api/features/${featureId}/github/create-branch`, {
        repo_id: selectedRepo,
        branch_name: branchName.trim(),
        from_branch: "main"
      });
      
      setCreateBranchDialog(false);
      setSelectedRepo("");
      setBranchName("");
      await loadGithubLinks();
      
      // Show success message with link
      alert(`✅ Branch created: ${response.data.branch_name}\n\nView on GitHub: ${response.data.branch_url}`);
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Failed to create branch');
      alert(`❌ Error: ${error?.response?.data?.message || 'Failed to create branch'}`);
    } finally {
      setCreating(false);
    }
  };

  const removeLink = async (linkId: string, linkType: string, isBranch: boolean = false) => {
    if (!featureId) return;
    
    let deleteOnGithub = false;
    
    // Special handling for branches - ask if user wants to delete on GitHub too
    if (isBranch) {
      console.log('🔍 Branch deletion - asking user for confirmation...');
      
      const choice = window.confirm(
        `Do you want to DELETE this branch on GitHub?\n\n` +
        `⚠️ OK = Delete branch on GitHub (permanent)\n` +
        `❌ Cancel = Only unlink from feature (branch stays on GitHub)\n\n` +
        `Click OK to DELETE on GitHub, Cancel to just unlink.`
      );
      
      console.log('User choice:', choice ? 'DELETE on GitHub' : 'Just unlink');
      
      deleteOnGithub = choice;
      
    } else {
      // For commits/PRs, just confirm unlink
      const confirmMessage = `Remove this ${linkType} from the feature? This will only unlink it, the ${linkType} will still exist on GitHub.`;
      if (!confirm(confirmMessage)) return;
    }
    
    try {
      setError(null);
      setRemovingLinkId(linkId);
      
      const url = `/api/features/${featureId}/github/links/${linkId}${deleteOnGithub ? '?deleteOnGithub=true' : ''}`;
      console.log('🌐 Sending DELETE request:', {
        url,
        deleteOnGithub,
        linkType
      });
      
      const response = await axiosInstance.delete(url);
      console.log('✅ Remove link response:', response.data);
      
      // Show success message
      if (deleteOnGithub && response.data.deletedOnGithub) {
        alert('✅ Branch deleted on GitHub and unlinked from feature!');
      }
      
      // Reload links to reflect changes
      await loadGithubLinks();
      
    } catch (error: any) {
      console.error('❌ Error removing link:', error);
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to remove link';
      setError(errorMsg);
      alert(`❌ Error: ${errorMsg}`);
    } finally {
      setRemovingLinkId(null);
    }
  };

  const verifyToken = async () => {
    if (!repoForm.repo_owner || !repoForm.repo_name || !repoForm.access_token) {
      setError("Please fill all fields to verify");
      return false;
    }

    try {
      setAddingRepo(true);
      setError(null);

      // Test token by calling GitHub API directly
      const testUrl = `https://api.github.com/repos/${repoForm.repo_owner}/${repoForm.repo_name}`;
      const response = await fetch(testUrl, {
        headers: {
          'Authorization': `token ${repoForm.access_token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (response.status === 404) {
        setError(`Repository "${repoForm.repo_owner}/${repoForm.repo_name}" not found. Check owner and name.`);
        return false;
      }

      if (response.status === 401) {
        setError("Invalid token. Please check your Personal Access Token.");
        return false;
      }

      if (response.status === 403) {
        setError("Token doesn't have permission to access this repository. Make sure token has 'repo' scope.");
        return false;
      }

      if (!response.ok) {
        setError(`Failed to verify: ${response.statusText}`);
        return false;
      }

      // Check if token has write permission by checking scopes
      const scopes = response.headers.get('X-OAuth-Scopes');
      if (scopes && !scopes.includes('repo')) {
        setError("⚠️ Warning: Token may not have 'repo' scope. You might not be able to create branches.");
        setTokenVerified(false);
      } else {
        setTokenVerified(true);
        setError(null);
      }

      return true;
    } catch (error: any) {
      setError(`Network error: ${error.message}`);
      return false;
    } finally {
      setAddingRepo(false);
    }
  };

  const addRepository = async () => {
    if (!projectId || !repoForm.repo_owner || !repoForm.repo_name || !repoForm.access_token) {
      setError("Please fill all required fields");
      return;
    }

    // Verify token first
    const isValid = await verifyToken();
    if (!isValid) {
      return;
    }

    try {
      setAddingRepo(true);
      await axiosInstance.post(`/api/projects/${projectId}/github/repositories`, {
        repo_owner: repoForm.repo_owner,
        repo_name: repoForm.repo_name,
        access_token: repoForm.access_token,
        sync_settings: {
          auto_link_commits: repoForm.auto_link_commits,
          auto_link_prs: repoForm.auto_link_prs,
          auto_link_issues: false,
          auto_create_branches: true,
          branch_naming_pattern: "feature/{feature-key}-{feature-title}",
        },
      });

      setAddRepoDialog(false);
      setRepoForm({
        repo_owner: "",
        repo_name: "",
        access_token: "",
        auto_link_commits: true,
        auto_link_prs: true,
      });
      await loadRepositories();
      setError(null);
    } catch (error: any) {
      setError(error?.response?.data?.message || "Failed to add repository");
    } finally {
      setAddingRepo(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 7) {
      return date.toLocaleDateString();
    } else if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    } else if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return "Just now";
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress size={24} />
        <Typography sx={{ mt: 2 }}>Loading GitHub links...</Typography>
      </Box>
    );
  }

  const hasAnyLinks = summary.total > 0;
  const hasRepositories = repositories.length > 0;

  return (
    <Box sx={{ bgcolor: '#ffffff' }}>
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Jira-style Action Bar */}
      <Box sx={{ 
        p: 2,
        bgcolor: '#f4f5f7',
        borderBottom: '2px solid #dfe1e6',
        mb: 0
      }}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" flexWrap="wrap">
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip 
              icon={<GitHubIcon />}
              label={`${summary.total} linked items`}
              size="small"
              sx={{ 
                bgcolor: '#ffffff',
                fontWeight: 500,
                fontSize: '13px'
              }}
            />
            
            {summary.commits > 0 && (
              <Chip 
                label={`${summary.commits} commits`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '12px' }}
              />
            )}
            
            {summary.pull_requests > 0 && (
              <Chip 
                label={`${summary.pull_requests} PRs`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '12px' }}
              />
            )}
            
            {summary.branches > 0 && (
              <Chip 
                label={`${summary.branches} branches`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '12px' }}
              />
            )}
          </Stack>
          
          <Stack direction="row" spacing={1}>
            <IconButton size="small" onClick={loadGithubLinks} sx={{ bgcolor: '#ffffff' }}>
              <RefreshIcon sx={{ fontSize: 18 }} />
            </IconButton>
            
            {hasRepositories && (
              <>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setAddRepoDialog(true)}
                  sx={{
                    textTransform: 'none',
                    fontSize: '13px',
                    bgcolor: '#ffffff'
                  }}
                >
                  Add Repo
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<CallSplitIcon />}
                  onClick={() => setCreateBranchDialog(true)}
                  sx={{
                    textTransform: 'none',
                    fontSize: '13px',
                    bgcolor: '#0052cc',
                    '&:hover': { bgcolor: '#0065ff' }
                  }}
                >
                  Create Branch
                </Button>
              </>
            )}
          </Stack>
        </Stack>
      </Box>

      {!hasRepositories && (
        <Paper sx={{ 
          p: 4, 
          textAlign: 'center',
          bgcolor: '#f6f8fa',
          border: '2px dashed #d0d7de',
          mb: 3
        }}>
          <GitHubIcon sx={{ fontSize: 48, color: '#d0d7de', mb: 2 }} />
          <Typography fontSize="14px" fontWeight={600} color="#24292f" sx={{ mb: 1 }}>
            No GitHub repository connected
          </Typography>
          <Typography fontSize="12px" color="#57606a" sx={{ mb: 3 }}>
            Connect a GitHub repository to track development progress
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddRepoDialog(true)}
            sx={{
              textTransform: 'none',
              bgcolor: '#238636',
              '&:hover': { bgcolor: '#2ea043' }
            }}
          >
            Connect GitHub Repository
          </Button>
        </Paper>
      )}

      {/* Connected Repositories */}
      {hasRepositories && hasAnyLinks && (
        <Box sx={{ mt: 4, mb: 3 }}>
          <Box sx={{ 
            p: 2, 
            bgcolor: '#f4f5f7', 
            borderBottom: '1px solid #dfe1e6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <SettingsIcon sx={{ fontSize: 18, color: '#42526e' }} />
              <Typography fontSize="14px" fontWeight={600} color="#172b4d">
                Connected Repositories
              </Typography>
              <Chip 
                label={repositories.length} 
                size="small"
                sx={{ 
                  height: 20,
                  fontSize: '11px',
                  bgcolor: '#dfe1e6',
                  color: '#172b4d'
                }}
              />
            </Stack>
          </Box>
          
          <Box sx={{ bgcolor: '#ffffff' }}>
            {repositories.map((repo, index) => (
              <Box
                key={repo._id}
                sx={{
                  p: 2,
                  borderBottom: index < repositories.length - 1 ? '1px solid #dfe1e6' : 'none',
                  '&:hover': { bgcolor: '#f4f5f7' },
                  transition: 'background-color 0.2s'
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <GitHubIcon sx={{ fontSize: 20, color: '#42526e' }} />
                    <Box>
                      <Typography fontSize="14px" fontWeight={500} color="#172b4d">
                        {repo.repo_full_name}
                      </Typography>
                      <Typography fontSize="12px" color="#6b778c">
                        {(repo as any).sync_settings?.auto_link_commits && 'Auto-link commits'} 
                        {(repo as any).sync_settings?.auto_link_prs && ' · Auto-link PRs'}
                      </Typography>
                    </Box>
                  </Stack>
                  
                  <Chip 
                    label={repo.enabled ? 'ACTIVE' : 'DISABLED'}
                    size="small"
                    sx={{ 
                      height: 20,
                      fontSize: '11px',
                      fontWeight: 600,
                      bgcolor: repo.enabled ? '#e3fcef' : '#ffebe6',
                      color: repo.enabled ? '#00875a' : '#de350b'
                    }}
                  />
                </Stack>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Branches */}
      {links.branches.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ 
            p: 2, 
            bgcolor: '#f4f5f7', 
            borderBottom: '1px solid #dfe1e6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <CallSplitIcon sx={{ fontSize: 18, color: '#42526e' }} />
              <Typography fontSize="14px" fontWeight={600} color="#172b4d">
                Branches
              </Typography>
              <Chip 
                label={links.branches.length} 
                size="small"
                sx={{ 
                  height: 20,
                  fontSize: '11px',
                  bgcolor: '#dfe1e6',
                  color: '#172b4d'
                }}
              />
            </Stack>
          </Box>
          
          <Box sx={{ bgcolor: '#ffffff' }}>
            {links.branches.map((branch, index) => (
              <Box
                key={branch._id}
                sx={{
                  p: 2,
                  borderBottom: index < links.branches.length - 1 ? '1px solid #dfe1e6' : 'none',
                  '&:hover': { bgcolor: '#f4f5f7' },
                  transition: 'background-color 0.2s'
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Box sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: '#0052cc'
                    }} />
                    <Typography fontSize="13px" fontWeight={500} fontFamily="monospace" color="#172b4d">
                      {branch.branch_name}
                    </Typography>
                    {branch.auto_linked && (
                      <Chip 
                        label="AUTO" 
                        size="small" 
                        sx={{ 
                          height: 18, 
                          fontSize: '10px',
                          bgcolor: '#deebff',
                          color: '#0052cc',
                          fontWeight: 600
                        }} 
                      />
                    )}
                  </Stack>
                  
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="View on GitHub">
                      <IconButton 
                        size="small" 
                        component="a" 
                        href={branch.github_url} 
                        target="_blank"
                        sx={{ color: '#42526e' }}
                      >
                        <OpenInNewIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove link (option to delete on GitHub)">
                      <IconButton 
                        size="small" 
                        onClick={() => removeLink(branch._id, 'branch', true)}
                        disabled={removingLinkId === branch._id}
                        sx={{ color: '#42526e', '&:hover': { color: '#de350b' } }}
                      >
                        {removingLinkId === branch._id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Pull Requests */}
      {links.pull_requests.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ 
            p: 2, 
            bgcolor: '#f4f5f7', 
            borderBottom: '1px solid #dfe1e6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <MergeTypeIcon sx={{ fontSize: 18, color: '#42526e' }} />
              <Typography fontSize="14px" fontWeight={600} color="#172b4d">
                Pull Requests
              </Typography>
              <Chip 
                label={links.pull_requests.length} 
                size="small"
                sx={{ 
                  height: 20,
                  fontSize: '11px',
                  bgcolor: '#dfe1e6',
                  color: '#172b4d'
                }}
              />
            </Stack>
          </Box>
          
          <Box sx={{ bgcolor: '#ffffff' }}>
            {links.pull_requests.map((pr, index) => (
              <Box
                key={pr._id}
                sx={{
                  p: 2.5,
                  borderBottom: index < links.pull_requests.length - 1 ? '1px solid #dfe1e6' : 'none',
                  '&:hover': { bgcolor: '#f4f5f7' },
                  transition: 'background-color 0.2s'
                }}
              >
                <Stack direction="row" spacing={2}>
                  {/* PR Status Icon */}
                  <Box sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '4px',
                    bgcolor: pr.pr_merged ? '#00875a' : pr.pr_state === 'open' ? '#0052cc' : '#de350b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {pr.pr_merged ? (
                      <CheckCircleIcon sx={{ fontSize: 18, color: 'white' }} />
                    ) : pr.pr_state === 'open' ? (
                      <MergeTypeIcon sx={{ fontSize: 18, color: 'white' }} />
                    ) : (
                      <ErrorIcon sx={{ fontSize: 18, color: 'white' }} />
                    )}
                  </Box>

                  {/* PR Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Link 
                      href={pr.github_url} 
                      target="_blank" 
                      sx={{ 
                        fontSize: '14px', 
                        fontWeight: 500,
                        color: '#0052cc',
                        textDecoration: 'none',
                        '&:hover': { textDecoration: 'underline' },
                        display: 'block',
                        mb: 0.5
                      }}
                    >
                      {pr.pr_title}
                    </Link>
                    
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Chip 
                        label={`#${pr.pr_number}`} 
                        size="small"
                        sx={{ 
                          height: 20,
                          fontSize: '11px',
                          fontWeight: 600,
                          bgcolor: '#dfe1e6',
                          color: '#42526e'
                        }}
                      />
                      
                      <Chip 
                        label={pr.pr_merged ? 'MERGED' : (pr.pr_state || 'UNKNOWN').toUpperCase()} 
                        size="small"
                        sx={{ 
                          height: 20,
                          fontSize: '11px',
                          fontWeight: 700,
                          bgcolor: pr.pr_merged ? '#e3fcef' : pr.pr_state === 'open' ? '#deebff' : '#ffebe6',
                          color: pr.pr_merged ? '#00875a' : pr.pr_state === 'open' ? '#0052cc' : '#de350b'
                        }}
                      />

                      
                      {pr.pr_author && (
                        <Typography fontSize="11px" color="#6b778c">
                          by {pr.pr_author.username}
                        </Typography>
                      )}
                      
                      <Typography fontSize="11px" color="#6b778c">
                        · {formatDate(pr.created_at)}
                      </Typography>

                      {pr.auto_linked && (
                        <Chip 
                          label="AUTO" 
                          size="small" 
                          sx={{ 
                            height: 18, 
                            fontSize: '10px',
                            bgcolor: '#deebff',
                            color: '#0052cc',
                            fontWeight: 600
                          }} 
                        />
                      )}
                    </Stack>
                  </Box>

                  {/* Actions */}
                  <Stack direction="row" spacing={0.5}>
                    <Tooltip title="View on GitHub">
                      <IconButton 
                        size="small"
                        component="a"
                        href={pr.github_url}
                        target="_blank"
                        sx={{ color: '#42526e' }}
                      >
                        <OpenInNewIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Remove link">
                      <IconButton 
                        size="small" 
                        onClick={() => removeLink(pr._id, 'pull request')}
                        disabled={removingLinkId === pr._id}
                        sx={{ color: '#42526e', '&:hover': { color: '#de350b' } }}
                      >
                        {removingLinkId === pr._id ? (
                          <CircularProgress size={16} />
                        ) : (
                          <DeleteIcon sx={{ fontSize: 16 }} />
                        )}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Commits */}
      {links.commits.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ 
            p: 2, 
            bgcolor: '#f4f5f7', 
            borderBottom: '1px solid #dfe1e6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <CommitIcon sx={{ fontSize: 18, color: '#42526e' }} />
              <Typography fontSize="14px" fontWeight={600} color="#172b4d">
                Commits
              </Typography>
              <Chip 
                label={links.commits.length} 
                size="small"
                sx={{ 
                  height: 20,
                  fontSize: '11px',
                  bgcolor: '#dfe1e6',
                  color: '#172b4d'
                }}
              />
            </Stack>
          </Box>
          
          <Box sx={{ bgcolor: '#ffffff' }}>
            {links.commits.map((commit, index) => (
              <Box
                key={commit._id}
                sx={{
                  p: 2,
                  borderBottom: index < links.commits.length - 1 ? '1px solid #dfe1e6' : 'none',
                  '&:hover': { bgcolor: '#f4f5f7' },
                  transition: 'background-color 0.2s'
                }}
              >
                <Stack direction="row" spacing={2}>
                  {/* Commit Avatar */}
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32, 
                      bgcolor: '#6554c0',
                      fontSize: '13px',
                      fontWeight: 600,
                      flexShrink: 0
                    }}
                  >
                    {commit.commit_author?.name?.[0]?.toUpperCase() || 'C'}
                  </Avatar>

                  {/* Commit Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography 
                      fontSize="13px" 
                      fontWeight={500} 
                      color="#172b4d"
                      sx={{ 
                        mb: 0.5,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {commit.commit_message?.split('\n')[0] || 'Untitled commit'}
                    </Typography>
                    
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                      <Link 
                        href={commit.github_url} 
                        target="_blank"
                        sx={{ 
                          fontSize: '12px', 
                          fontFamily: 'monospace',
                          color: '#0052cc',
                          textDecoration: 'none',
                          fontWeight: 600,
                          '&:hover': { textDecoration: 'underline' }
                        }}
                      >
                        {commit.commit_sha?.slice(0, 7)}
                      </Link>
                      
                      <Typography fontSize="11px" color="#6b778c">
                        · {commit.commit_author?.name || commit.commit_author?.email}
                      </Typography>
                      
                      <Typography fontSize="11px" color="#6b778c">
                        · {formatDate(commit.commit_date)}
                      </Typography>
                      
                      {commit.auto_linked && (
                        <Chip 
                          label="AUTO" 
                          size="small" 
                          sx={{ 
                            height: 18, 
                            fontSize: '10px',
                            bgcolor: '#deebff',
                            color: '#0052cc',
                            fontWeight: 600
                          }} 
                        />
                      )}
                    </Stack>
                  </Box>

                  {/* Actions */}
                  <Tooltip title="Remove link">
                    <IconButton 
                      size="small" 
                      onClick={() => removeLink(commit._id, 'commit')}
                      disabled={removingLinkId === commit._id}
                      sx={{ 
                        color: '#42526e', 
                        '&:hover': { color: '#de350b' },
                        flexShrink: 0
                      }}
                    >
                      {removingLinkId === commit._id ? (
                        <CircularProgress size={16} />
                      ) : (
                        <DeleteIcon sx={{ fontSize: 16 }} />
                      )}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* Empty State */}
      {!hasAnyLinks && hasRepositories && (
        <Box sx={{ 
          p: 6, 
          textAlign: 'center',
          bgcolor: '#ffffff',
          border: '2px dashed #dfe1e6',
          m: 3
        }}>
          <Box sx={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            bgcolor: '#f4f5f7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            mb: 2
          }}>
            <GitHubIcon sx={{ fontSize: 32, color: '#6b778c' }} />
          </Box>
          <Typography fontSize="16px" fontWeight={600} color="#172b4d" sx={{ mb: 1 }}>
            No development work yet
          </Typography>
          <Typography fontSize="13px" color="#6b778c" sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}>
            Create a branch to start development, or link existing commits and pull requests
          </Typography>
          <Button
            variant="contained"
            startIcon={<CallSplitIcon />}
            onClick={() => setCreateBranchDialog(true)}
            sx={{
              textTransform: 'none',
              bgcolor: '#0052cc',
              '&:hover': { bgcolor: '#0065ff' },
              fontSize: '14px',
              fontWeight: 500
            }}
          >
            Create Branch
          </Button>
        </Box>
      )}

      {/* Create Branch Dialog */}
      <Dialog 
        open={createBranchDialog} 
        onClose={() => !creating && setCreateBranchDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CallSplitIcon />
            <Typography fontWeight={700}>Create Branch</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 2 }}>
            {/* Repository Selection */}
            <FormControl fullWidth>
              <InputLabel>Repository</InputLabel>
              <Select
                value={selectedRepo}
                label="Repository"
                onChange={(e) => setSelectedRepo(e.target.value)}
                disabled={creating}
              >
                {repositories.map((repo) => (
                  <MenuItem key={repo._id} value={repo._id}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <GitHubIcon sx={{ fontSize: 16 }} />
                      <Typography fontSize="14px">{repo.repo_full_name}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {/* Branch Name Input */}
            <Box>
              <TextField
                fullWidth
                label="Branch Name"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                disabled={creating}
                placeholder="feature/my-feature-name"
                helperText="Enter branch name. Example: feature/add-login, fix/bug-123"
                sx={{
                  '& .MuiInputBase-root': {
                    fontFamily: 'monospace',
                    fontSize: '14px'
                  }
                }}
              />
              
              {/* Quick Suggestions */}
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" gap={1}>
                <Typography fontSize="11px" color="text.secondary" sx={{ width: '100%', mb: 0.5 }}>
                  Quick suggestions:
                </Typography>
                {[
                  { label: 'feature/', value: 'feature/' },
                  { label: 'fix/', value: 'fix/' },
                  { label: 'hotfix/', value: 'hotfix/' },
                  { label: 'dev/', value: 'dev/' }
                ].map((suggestion) => (
                  <Chip
                    key={suggestion.value}
                    label={suggestion.label}
                    size="small"
                    onClick={() => {
                      if (!branchName.includes('/')) {
                        setBranchName(suggestion.value);
                      }
                    }}
                    sx={{
                      fontSize: '11px',
                      height: 24,
                      cursor: 'pointer',
                      fontFamily: 'monospace',
                      '&:hover': { bgcolor: '#e3f2fd' }
                    }}
                  />
                ))}
              </Stack>
            </Box>
            
            <Alert severity="info" icon={<InfoOutlinedIcon />}>
              <Typography fontSize="12px">
                Branch will be created from <strong>main</strong> branch.
                {branchName && (
                  <>
                    <br/>
                    <code style={{ fontSize: '11px', background: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>
                      {branchName}
                    </code>
                  </>
                )}
              </Typography>
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button 
            onClick={() => setCreateBranchDialog(false)}
            disabled={creating}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={createBranch}
            disabled={!selectedRepo || !branchName.trim() || creating}
            startIcon={creating ? null : <CallSplitIcon />}
            sx={{
              textTransform: 'none',
              bgcolor: '#238636',
              '&:hover': { bgcolor: '#2ea043' }
            }}
          >
            {creating ? <CircularProgress size={20} /> : 'Create Branch'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Info Footer */}
      <Box sx={{ 
        mt: 4,
        p: 2,
        bgcolor: '#fff8c5',
        borderRadius: 2,
        border: '1px solid #d4a72c'
      }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <InfoOutlinedIcon sx={{ fontSize: 16, color: '#9a6700', mt: 0.2 }} />
          <Box>
            <Typography fontSize="11px" fontWeight={600} color="#9a6700" sx={{ mb: 0.5 }}>
              How to auto-link commits & PRs
            </Typography>
            <Typography fontSize="11px" color="#9a6700">
              Include the feature ID in your commit message or PR title/description, and they'll be automatically linked!
              <br />
              Example: <code style={{ padding: '2px 4px', background: '#fff', borderRadius: 3 }}>
                git commit -m "Fix login bug (Feature: {featureId})"
              </code>
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Add Repository Dialog */}
      <Dialog 
        open={addRepoDialog} 
        onClose={() => !addingRepo && setAddRepoDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <GitHubIcon />
            <Typography fontWeight={700}>Connect GitHub Repository</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 2 }}>
            <Alert severity="info" sx={{ fontSize: '12px' }}>
              You'll need a GitHub Personal Access Token. 
              Create one at <Link href="https://github.com/settings/tokens" target="_blank">github.com/settings/tokens</Link> with <code>repo</code> scope.
            </Alert>

            <TextField
              label="Repository Owner"
              fullWidth
              value={repoForm.repo_owner}
              onChange={(e) => setRepoForm({ ...repoForm, repo_owner: e.target.value })}
              placeholder="facebook"
              helperText="GitHub username or organization name"
              disabled={addingRepo}
            />
            
            <TextField
              label="Repository Name"
              fullWidth
              value={repoForm.repo_name}
              onChange={(e) => setRepoForm({ ...repoForm, repo_name: e.target.value })}
              placeholder="react"
              helperText="Repository name (not the full URL)"
              disabled={addingRepo}
            />
            
            <TextField
              label="Personal Access Token"
              fullWidth
              type="password"
              value={repoForm.access_token}
              onChange={(e) => {
                setRepoForm({ ...repoForm, access_token: e.target.value });
                setError(null);
                setTokenVerified(false);
              }}
              placeholder="ghp_xxxxxxxxxxxx"
              helperText="Your GitHub Personal Access Token with 'repo' scope"
              disabled={addingRepo}
            />

            {/* Test Connection Button */}
            <Button
              fullWidth
              variant="outlined"
              onClick={verifyToken}
              disabled={!repoForm.repo_owner || !repoForm.repo_name || !repoForm.access_token || addingRepo}
              sx={{
                textTransform: 'none',
                borderColor: tokenVerified ? '#1a7f37' : '#0969da',
                color: tokenVerified ? '#1a7f37' : '#0969da',
                '&:hover': {
                  borderColor: tokenVerified ? '#1a7f37' : '#0969da',
                  bgcolor: tokenVerified ? '#dafbe1' : '#ddf4ff'
                }
              }}
            >
              {addingRepo ? (
                <CircularProgress size={20} />
              ) : tokenVerified ? (
                '✅ Connection Verified'
              ) : (
                '🔍 Test Connection'
              )}
            </Button>

            {tokenVerified && (
              <Alert severity="success" sx={{ fontSize: '12px' }}>
                <strong>✅ Token verified successfully!</strong>
                <br />
                Repository: <code>{repoForm.repo_owner}/{repoForm.repo_name}</code>
                <br />
                Token has proper permissions. You can create branches.
              </Alert>
            )}

            <Divider />

            <Typography fontWeight={600} fontSize="14px">Auto-linking Settings</Typography>

            <FormControlLabel
              control={
                <Switch
                  checked={repoForm.auto_link_commits}
                  onChange={(e) => setRepoForm({ ...repoForm, auto_link_commits: e.target.checked })}
                  disabled={addingRepo}
                />
              }
              label={
                <Box>
                  <Typography fontSize="14px">Auto-link commits</Typography>
                  <Typography fontSize="12px" color="text.secondary">
                    Automatically link commits that mention feature IDs in their messages
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              control={
                <Switch
                  checked={repoForm.auto_link_prs}
                  onChange={(e) => setRepoForm({ ...repoForm, auto_link_prs: e.target.checked })}
                  disabled={addingRepo}
                />
              }
              label={
                <Box>
                  <Typography fontSize="14px">Auto-link pull requests</Typography>
                  <Typography fontSize="12px" color="text.secondary">
                    Automatically link PRs that mention feature IDs in title or description
                  </Typography>
                </Box>
              }
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button 
            onClick={() => setAddRepoDialog(false)} 
            disabled={addingRepo}
            sx={{ textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={addRepository}
            disabled={!repoForm.repo_owner || !repoForm.repo_name || !repoForm.access_token || addingRepo}
            sx={{
              textTransform: 'none',
              bgcolor: '#238636',
              '&:hover': { bgcolor: '#2ea043' }
            }}
          >
            {addingRepo ? <CircularProgress size={20} color="inherit" /> : 'Connect Repository'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

