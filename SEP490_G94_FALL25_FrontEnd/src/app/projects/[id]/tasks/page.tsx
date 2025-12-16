"use client";

import React, { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import axiosInstance from "../../../../../ultis/axios";
import SidebarWrapper from "@/components/SidebarWrapper";
import TaskDetailsModal from "@/components/TaskDetailsModal";
import DependencyDateConflictDialog from "@/components/DependencyDateConflictDialog";
import dynamic from 'next/dynamic';
import './tasks.module.css';
import { STATUS_OPTIONS, PRIORITY_OPTIONS, TASK_TYPE_OPTIONS, normalizeStatusValue } from "@/constants/settings";
import { toast } from "sonner";
import { GanttFilter } from "@/components/gantt-filter";
import type { GanttProject } from "@/components/gantt-chart";


const DHtmlxGanttChart = dynamic(
  () => import('@/components/DHtmlxGanttChart'),
  { ssr: false }
);

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
    Avatar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Tooltip,
  Badge,
  Popover,
  Checkbox,
  Link,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SearchIcon from "@mui/icons-material/Search";
  import FlagIcon from "@mui/icons-material/Flag";
  import TuneIcon from "@mui/icons-material/Tune";
  import ViewColumnIcon from "@mui/icons-material/ViewColumn";
  import ListIcon from "@mui/icons-material/List";
  import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
  import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
  import DashboardIcon from "@mui/icons-material/Dashboard";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PersonIcon from "@mui/icons-material/Person";
import LinkIcon from "@mui/icons-material/Link";
import BlockIcon from "@mui/icons-material/Block";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AssignmentIcon from "@mui/icons-material/Assignment";
import CloseIcon from "@mui/icons-material/Close";

type Task = {
  _id: string;
  title: string;
  description?: string;
  project_id: string;
  feature_id?: string | { _id: string; title: string };
  milestone_id?: string | { _id: string; title: string };
  status?: string | { _id: string; name: string };
  priority?: string | { _id: string; name: string };
  assignee?: string | { _id: string; name: string };
  assignee_id?: string | { _id: string; full_name?: string; name?: string; email?: string };
  assigner_id?: string | { _id: string; full_name?: string; name?: string; email?: string };
  start_date?: string;
  deadline?: string;
  estimate?: number;
  actual?: number;
  parent_task_id?: string;
  createdAt?: string;
  updatedAt?: string;
};

type TaskStats = {
  total: number;
  by_status?: Record<string, number>;
  by_priority?: Record<string, number>;
};

type ApiMilestone = {
  id: string;
  name: string;
  features: Array<{
    id: string;
    name: string;
    functions: Array<{
      id: string;
      name: string;
    }>;
  }>;
};

type ChartDependency = {
  _id: string;
  task_id: string;
  depends_on_task_id: { _id: string };
  dependency_type: "FS" | "FF" | "SS" | "SF";
};

type DependencyBucket = {
  dependencies: ChartDependency[];
  dependents: ChartDependency[];
};

export default function ProjectTasksPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = Array.isArray(params?.id) ? params?.id[0] : (params?.id as string);
  const featureIdFromUrl = searchParams.get('featureId');
  const functionIdFromUrl = searchParams.get('functionId');

  const [view, setView] = useState<"table" | "kanban" | "calendar" | "gantt">("table");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rawTasks, setRawTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dependency violation dialog
  const [dependencyViolationDialog, setDependencyViolationDialog] = useState<{
    open: boolean;
    violations: any[];
    taskId: string;
    newStatus: string;
  }>({
    open: false,
    violations: [],
    taskId: '',
    newStatus: ''
  });
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<number | null>(null);
  const isSupervisor = userRole === 4;

  // filters/sort/search
  const [search, setSearch] = useState("");
  const [filterAssignee, setFilterAssignee] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterFeature, setFilterFeature] = useState<string>("all");
  const [filterFunction, setFilterFunction] = useState<string>("all");
  const [filterMilestone, setFilterMilestone] = useState<string>("all");
  const [filterDateRange, setFilterDateRange] = useState<{ from?: string; to?: string }>({});
  const [sortBy, setSortBy] = useState<string>("deadline:asc");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterAnchorEl, setFilterAnchorEl] = useState<HTMLButtonElement | null>(null);

  // dialog state
  const [openDialog, setOpenDialog] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  
  // task details modal
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [openTaskDetails, setOpenTaskDetails] = useState(false);
  
  // inline editing
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  
  // dependencies
  const [taskDependencies, setTaskDependencies] = useState<Record<string, any>>({});
  const [openDependencyDialog, setOpenDependencyDialog] = useState(false);
  const [dependencyTaskId, setDependencyTaskId] = useState<string | null>(null);
  const [dependencyForm, setDependencyForm] = useState({
    depends_on_task_id: '',
    dependency_type: 'FS',
    lag_days: 0,
    is_mandatory: true,
    notes: ''
  });
  
  // Date conflict dialog state
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [conflictViolation, setConflictViolation] = useState<any>(null);
  const [currentTaskForDependency, setCurrentTaskForDependency] = useState<any>(null);
  const [pendingDependencyData, setPendingDependencyData] = useState<{
    taskId: string;
    dependsOnTaskId: string;
    type: string;
    lagDays: number;
    isMandatory: boolean;
    notes: string;
  } | null>(null);

  // calendar view state
  const [calendarDate, setCalendarDate] = useState(new Date());
  
  // functions for selected feature (in form)
  const [formFunctions, setFormFunctions] = useState<any[]>([]);
  
  // Filter options - fetch from backend
  const [allFeatures, setAllFeatures] = useState<any[]>([]);
  const [allMilestones, setAllMilestones] = useState<any[]>([]);
  const [allStatuses, setAllStatuses] = useState<any[]>([]);
  const [allPriorities, setAllPriorities] = useState<any[]>([]);
  const [allFunctions, setAllFunctions] = useState<any[]>([]);
  // Map feature_id -> milestone_ids[]
  const [featureMilestoneMap, setFeatureMilestoneMap] = useState<Map<string, string[]>>(new Map());

  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "",
    priority: "",
    assignee: "",
    feature_id: "",
    function_id: "",
    milestone_id: "",
    start_date: "",
    deadline: "",
    estimate: 0,
  });

  // --- Gantt chart specific state ---
  const [ganttHierarchy, setGanttHierarchy] = useState<ApiMilestone[]>([]);
  const [ganttProjectName, setGanttProjectName] = useState<string>("");
  const [ganttHierarchyLoading, setGanttHierarchyLoading] = useState(false);
  const [ganttHierarchyError, setGanttHierarchyError] = useState<string | null>(null);
  const [selectedMilestones, setSelectedMilestones] = useState<Set<string>>(new Set());
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [selectedFunctions, setSelectedFunctions] = useState<Set<string>>(new Set());
  const [ganttTasks, setGanttTasks] = useState<any[]>([]);
  const [ganttDependencies, setGanttDependencies] = useState<Record<string, DependencyBucket>>({});
  const [ganttTasksLoading, setGanttTasksLoading] = useState(false);
  const [ganttTasksError, setGanttTasksError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    
    // Load user role
    (async () => {
      try {
        const userRes = await axiosInstance.get('/api/users/me');
        setUserRole(userRes.data?.role || null);
      } catch {
        setUserRole(null);
      }
    })();
    
    loadAll();
    loadFilterOptions();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    loadTeamMembers();
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;

    const fetchHierarchy = async () => {
      try {
        setGanttHierarchyLoading(true);
        setGanttHierarchyError(null);
        const response = await axiosInstance.get(`/api/projects/${projectId}/gantt/hierarchy`);
        setGanttHierarchy(response.data || []);

        const projectResponse = await axiosInstance.get(`/api/projects/${projectId}`);
        setGanttProjectName(projectResponse.data?.topic || projectResponse.data?.code || "Project");
      } catch (err: any) {
        setGanttHierarchy([]);
        setGanttHierarchyError(err?.response?.data?.message || "Không thể tải dữ liệu Gantt");
      } finally {
        setGanttHierarchyLoading(false);
      }
    };

    fetchHierarchy();
  }, [projectId]);

  useEffect(() => {
    if (!projectId || view !== "gantt") return;

    const fetchGanttTasks = async () => {
      try {
        setGanttTasksLoading(true);
        setGanttTasksError(null);
        const params = new URLSearchParams();

        if (selectedMilestones.size > 0) {
          params.append("milestone_ids", Array.from(selectedMilestones).join(","));
        }
        if (selectedFeatures.size > 0) {
          params.append("feature_ids", Array.from(selectedFeatures).join(","));
        }
        if (selectedFunctions.size > 0) {
          params.append("function_ids", Array.from(selectedFunctions).join(","));
        }

        const response = await axiosInstance.get(`/api/projects/${projectId}/tasks/gantt?${params.toString()}`);
        setGanttTasks(response.data?.tasks || []);
        setGanttDependencies(response.data?.dependencies || {});
      } catch (err: any) {
        console.error("Error fetching gantt tasks:", err);
        setGanttTasks([]);
        setGanttDependencies({});
        setGanttTasksError(err?.response?.data?.message || "Không thể tải dữ liệu Gantt");
      } finally {
        setGanttTasksLoading(false);
      }
    };

    fetchGanttTasks();
  }, [projectId, selectedMilestones, selectedFeatures, selectedFunctions, view]);

  // Load functions when feature_id changes
  useEffect(() => {
    if (form.feature_id) {
      console.log("Feature ID changed to:", form.feature_id);
      loadFunctionsByFeature(form.feature_id);
      // Reset function_id when feature changes
      setForm(prev => ({ ...prev, function_id: "" }));
    } else {
      setFormFunctions([]);
      setForm(prev => ({ ...prev, function_id: "" }));
    }
  }, [form.feature_id]);

  // Extract team members from tasks if no team members loaded
  useEffect(() => {
    if (teamMembers.length === 0 && tasks.length > 0) {
      const uniqueUsers = new Map();
      
      tasks.forEach(task => {
        // Add assignee
        if (task.assignee_id && typeof task.assignee_id === 'object') {
          uniqueUsers.set(task.assignee_id._id, {
            user_id: task.assignee_id,
          });
        }
        // Add assigner
        if (task.assigner_id && typeof task.assigner_id === 'object') {
          uniqueUsers.set(task.assigner_id._id, {
            user_id: task.assigner_id,
          });
        }
      });
      
      const extractedMembers = Array.from(uniqueUsers.values());
      if (extractedMembers.length > 0) {
        console.log("Extracted team members from tasks:", extractedMembers);
        setTeamMembers(extractedMembers);
      }
    }
  }, [tasks, teamMembers.length]);

  // Load dependencies for visible tasks
  useEffect(() => {
    if (tasks.length > 0) {
      tasks.forEach(task => {
        if (!taskDependencies[task._id]) {
          loadTaskDependencies(task._id);
        }
      });
    }
  }, [tasks]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Auto-filter by feature when featureId is in URL
  useEffect(() => {
    if (featureIdFromUrl && allFeatures.length > 0) {
      const featureExists = allFeatures.some(f => String(f._id || '') === String(featureIdFromUrl));
      if (featureExists) {
        setFilterFeature(String(featureIdFromUrl));
      }
    }
  }, [featureIdFromUrl, allFeatures]);

  // Auto-filter by function when functionId is in URL
  useEffect(() => {
    if (functionIdFromUrl && allFunctions.length > 0) {
      const functionExists = allFunctions.some((f: any) => f._id === functionIdFromUrl);
      if (functionExists) {
        setFilterFunction(functionIdFromUrl);
      }
    }
  }, [functionIdFromUrl, allFunctions]);

  const loadTeamMembers = async () => {
    try {
      const response = await axiosInstance.get(`/api/projects/${projectId}/team-members`);
      console.log("Team members response:", response.data);
      
      // API trả về { team_members: { leaders: [], members: [] } }
      const teamData = response.data?.team_members;
      if (teamData) {
        const allMembers = [...(teamData.leaders || []), ...(teamData.members || [])];
        console.log("All team members:", allMembers);
        setTeamMembers(allMembers);
      } else {
        setTeamMembers([]);
      }
    } catch (e: any) {
      console.error("Error loading team members:", e);
      // Fallback: extract assignees from existing tasks
      const uniqueAssignees = tasks
        .filter(t => t.assignee_id)
        .map(t => ({
          user_id: typeof t.assignee_id === 'object' ? {
            _id: t.assignee_id._id,
            full_name: t.assignee_id.full_name || t.assignee_id.name,
            email: t.assignee_id.email,
          } : { _id: t.assignee_id, full_name: 'User' },
        }))
        .filter((v, i, a) => a.findIndex(t => t.user_id._id === v.user_id._id) === i);
      setTeamMembers(uniqueAssignees);
    }
  };

  const loadFunctionsByFeature = async (featureId: string) => {
    try {
      if (!featureId) {
        setFormFunctions([]);
        return;
      }
      console.log("Loading functions for feature:", featureId);
      const response = await axiosInstance.get(`/api/projects/${projectId}/features/${featureId}/functions`);
      // API 返回格式: { message: '...', functions: [...] }
      const functions = response.data?.functions || response.data;
      console.log("Functions response:", response.data, "Extracted functions:", functions);
      if (Array.isArray(functions)) {
        setFormFunctions(functions);
        console.log("Set formFunctions with", functions.length, "items");
      } else {
        console.warn("API returned non-array data for functions:", response.data);
        setFormFunctions([]);
      }
    } catch (e: any) {
      console.error("Error loading functions:", e);
      setFormFunctions([]);
    }
  };

  const loadFilterOptions = async () => {
    try {
      // Fetch all features, milestones, and functions for filters
      const [featuresRes, milestonesRes, functionsRes] = await Promise.all([
        axiosInstance.get(`/api/projects/${projectId}/features`).catch(() => ({ data: [] })),
        axiosInstance.get(`/api/projects/${projectId}/milestones`).catch(() => ({ data: [] })),
        axiosInstance.get(`/api/projects/${projectId}/functions`).catch(() => ({ data: [] })),
      ]);

      // Set features
      const featuresData = Array.isArray(featuresRes.data) ? featuresRes.data : featuresRes.data?.features || [];
      setAllFeatures(featuresData);

      // Set milestones
      const milestonesData = Array.isArray(milestonesRes.data) ? milestonesRes.data : milestonesRes.data?.milestones || [];
      setAllMilestones(milestonesData);

      // Set functions
      const functionsData = Array.isArray(functionsRes.data) ? functionsRes.data : functionsRes.data?.functions || [];
      setAllFunctions(functionsData);

      // Set statuses and priorities from constants
      setAllStatuses(STATUS_OPTIONS);
      setAllPriorities(PRIORITY_OPTIONS);

      // Load feature-milestone links
      const map = new Map<string, string[]>();
      await Promise.all(
        featuresData.map(async (feature: any) => {
          try {
            const featureId = feature._id || feature.id;
            if (!featureId) return;
            const linksRes = await axiosInstance.get(`/api/features/${featureId}/milestones`).catch(() => ({ data: [] }));
            const milestoneIds = Array.isArray(linksRes.data) ? linksRes.data : [];
            if (milestoneIds.length > 0) {
              map.set(String(featureId), milestoneIds.map((id: any) => String(id)));
            }
          } catch (err) {
            // Ignore errors for individual features
          }
        })
      );
      setFeatureMilestoneMap(map);

    } catch (e: any) {
      console.error("Error loading filter options:", e);
    }
  };

  const buildFilteredTasks = useCallback((source: Task[]) => {
    let filtered = Array.isArray(source) ? [...source] : [];
    const term = debouncedSearch.trim().toLowerCase();

    if (term) {
      filtered = filtered.filter(task => {
        const candidates = [
          task.title,
          task.description,
          typeof task.feature_id === 'object' ? (task.feature_id as any)?.title : undefined,
          typeof (task as any).function_id === 'object' ? ((task as any).function_id as any)?.title : undefined,
          typeof task.milestone_id === 'object' ? (task.milestone_id as any)?.title : undefined,
          typeof task.assignee_id === 'object'
            ? ((task.assignee_id as any)?.full_name ?? (task.assignee_id as any)?.email)
            : undefined,
        ];
        return candidates.some(value => value?.toLowerCase().includes(term));
      });
    }

    if (filterAssignee !== 'all') {
      filtered = filtered.filter(task => {
        const assignee = task.assignee_id || (task as any).assignee;
        if (!assignee) return false;
        const assigneeId = typeof assignee === 'object' ? (assignee as any)?._id : assignee;
        return String(assigneeId || '') === String(filterAssignee);
      });
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(task => {
        const statusName = typeof task.status === 'object' ? (task.status as any)?.name : task.status;
        if (!statusName) return false;
        return normalizeStatusValue(statusName) === normalizeStatusValue(filterStatus);
      });
    }

    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => {
        const priorityName = typeof task.priority === 'object' ? (task.priority as any)?.name : task.priority;
        if (!priorityName) return false;
        return String(priorityName) === String(filterPriority);
      });
    }

    if (filterFeature !== 'all') {
      filtered = filtered.filter(task => {
        // Get feature_id from task (through function_id)
        let featureId: string | null = null;
        
        // Try to get feature_id from task.feature_id (if populated)
        if (task.feature_id) {
          featureId = typeof task.feature_id === 'object' ? (task.feature_id as any)?._id : String(task.feature_id);
        }
        
        // If not found, try to get from task.function_id.feature_id
        if (!featureId && (task as any).function_id) {
          const func = (task as any).function_id;
          if (typeof func === 'object' && func.feature_id) {
            featureId = typeof func.feature_id === 'object' ? (func.feature_id as any)?._id : String(func.feature_id);
          }
        }
        
        if (!featureId) return false;
        
        return String(featureId) === String(filterFeature);
      });
    }

    if (filterFunction !== 'all') {
      filtered = filtered.filter(task => {
        const fn = (task as any).function_id;
        const fnId = typeof fn === 'object' ? (fn as any)?._id : fn;
        return String(fnId || '') === String(filterFunction);
      });
    }

    if (filterMilestone !== 'all') {
      filtered = filtered.filter(task => {
        // Get feature_id from task (through function_id or directly)
        let featureId: string | null = null;
        
        // Try to get feature_id from task.feature_id
        if (task.feature_id) {
          featureId = typeof task.feature_id === 'object' ? (task.feature_id as any)?._id : String(task.feature_id);
        }
        
        // If not found, try to get from task.function_id.feature_id
        if (!featureId && (task as any).function_id) {
          const func = (task as any).function_id;
          if (typeof func === 'object' && func.feature_id) {
            featureId = typeof func.feature_id === 'object' ? (func.feature_id as any)?._id : String(func.feature_id);
          }
        }
        
        if (!featureId) return false;
        
        // Get milestone_ids linked to this feature
        const milestoneIds = featureMilestoneMap.get(String(featureId)) || [];
        
        // Check if filterMilestone is in the list
        return milestoneIds.includes(String(filterMilestone));
      });
    }

    const fromDate = filterDateRange.from ? new Date(filterDateRange.from) : null;
    const toDate = filterDateRange.to ? new Date(filterDateRange.to) : null;

    if (fromDate && !Number.isNaN(fromDate.getTime())) {
      filtered = filtered.filter(task => {
        const start = task.start_date ? new Date(task.start_date) : null;
        const end = task.deadline ? new Date(task.deadline) : null;
        const candidate = end || start;
        if (!candidate || Number.isNaN(candidate.getTime())) return true;
        return candidate >= fromDate;
      });
    }

    if (toDate && !Number.isNaN(toDate.getTime())) {
      filtered = filtered.filter(task => {
        const start = task.start_date ? new Date(task.start_date) : null;
        const end = task.deadline ? new Date(task.deadline) : null;
        const candidate = end || start;
        if (!candidate || Number.isNaN(candidate.getTime())) return true;
        return candidate <= toDate;
      });
    }

    if (sortBy) {
      const [field, dir = 'asc'] = sortBy.split(':');
      const direction = dir === 'desc' ? -1 : 1;
      filtered.sort((a, b) => {
        const safeDateValue = (value?: string) => {
          if (!value) {
            return direction === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
          }
          const time = new Date(value).getTime();
          if (Number.isNaN(time)) {
            return direction === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
          }
          return time;
        };

        if (field === 'deadline') {
          return (safeDateValue(a.deadline) - safeDateValue(b.deadline)) * direction;
        }
        if (field === 'start_date') {
          return (safeDateValue(a.start_date) - safeDateValue(b.start_date)) * direction;
        }
        if (field === 'title') {
          return ((a.title || '').localeCompare(b.title || '')) * direction;
        }
        return 0;
      });
    }

    return filtered;
  }, [
    debouncedSearch,
    filterAssignee,
    filterStatus,
    filterPriority,
    filterFeature,
    filterFunction,
    filterMilestone,
    filterDateRange.from,
    filterDateRange.to,
    sortBy,
    featureMilestoneMap
  ]);

  useEffect(() => {
    setTasks(buildFilteredTasks(rawTasks));
  }, [rawTasks, buildFilteredTasks]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const params: any = {
        pageSize: 1000,
      };
      const [tasksRes, statsRes] = await Promise.all([
        axiosInstance.get(`/api/projects/${projectId}/tasks`, { params }),
        axiosInstance.get(`/api/projects/${projectId}/tasks/stats`).catch(() => ({ data: null })),
      ]);

      const raw = tasksRes?.data;
      const normalized: Task[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.tasks)
            ? raw.tasks
            : [];

      setRawTasks(normalized);
      setTasks(buildFilteredTasks(normalized));
      setStats(statsRes?.data || null);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể tải danh sách tasks");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      status: "",
      priority: "",
      assignee: "",
      feature_id: "",
      function_id: "",
      milestone_id: "",
      start_date: "",
      deadline: "",
      estimate: 0,
    });
    setFormFunctions([]);
    setOpenDialog(true);
  };

  const openEdit = (t: Task) => {
    setEditing(t);
    const featureId = typeof t.feature_id === "object" ? (t.feature_id as any)?._id : (t.feature_id as any) || "";
    const functionId = typeof (t as any).function_id === "object" ? ((t as any).function_id as any)?._id : ((t as any).function_id as any) || "";
    
    setForm({
      title: t.title,
      description: t.description || "",
      status: typeof t.status === "object" ? (t.status as any)?._id : (t.status as any) || "",
      priority: typeof t.priority === "object" ? (t.priority as any)?._id : (t.priority as any) || "",
      assignee: typeof t.assignee === "object" ? (t.assignee as any)?._id : (t.assignee as any) || "",
      feature_id: featureId,
      function_id: functionId,
      milestone_id: typeof t.milestone_id === "object" ? (t.milestone_id as any)?._id : (t.milestone_id as any) || "",
      start_date: t.start_date ? new Date(t.start_date).toISOString().split("T")[0] : "",
      deadline: t.deadline ? new Date(t.deadline).toISOString().split("T")[0] : "",
      estimate: t.estimate || 0,
    });
    
    // Load functions for the feature
    if (featureId) {
      loadFunctionsByFeature(featureId);
    }
    
    setOpenDialog(true);
  };
  
  const openTaskDetailsModal = (taskId: string) => {
    setSelectedTaskId(taskId);
    setOpenTaskDetails(true);
  };

  const saveTask = async () => {
    try {
      const estimateNumber = Number(form.estimate);
      if (Number.isNaN(estimateNumber) || estimateNumber <= 0) {
        toast.error("Vui lòng nhập số giờ ước tính lớn hơn 0");
        return;
      }

      const payload = {
        ...form,
        estimate: estimateNumber,
        assignee: form.assignee || undefined,
        feature_id: form.feature_id || undefined,
        function_id: form.function_id || undefined,
        milestone_id: form.milestone_id || undefined,
        start_date: form.start_date || undefined,
        deadline: form.deadline || undefined,
        status: form.status || undefined,
        priority: form.priority || undefined,
      };

      if (editing) {
        await axiosInstance.patch(`/api/tasks/${editing._id}`, payload);
      } else {
        await axiosInstance.post(`/api/projects/${projectId}/tasks`, payload);
        toast.success("Tạo task thành công");
      }
      setOpenDialog(false);
      await loadAll();
    } catch (e: any) {
      const errorData = e?.response?.data || {};
      
      // Check if it's a date validation error - show appropriate error message instead of dependency dialog
      if (e?.response?.status === 400 && errorData.type === 'date_validation') {
        // Show date validation errors in a user-friendly way
        const errorMessages = errorData.errors || [];
        if (errorMessages.length > 0) {
          const errorText = errorMessages.length === 1 
            ? errorMessages[0]
            : errorMessages.join('. ');
          toast.error(`Lỗi xác thực ngày: ${errorText}`, {
            duration: 5000
          });
        } else {
          toast.error(errorData.message || "Lỗi xác thực ngày tháng");
        }
        return;
      }
      
      // Show regular error message
      const errorMessage = errorData.message || "Không thể lưu task";
      toast.error(errorMessage);
      setError(errorMessage);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm("Xóa task này?")) return;
    try {
      await axiosInstance.delete(`/api/tasks/${id}`);
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể xóa task");
    }
  };

  const duplicateTask = async (t: Task) => {
    try {
      const payload = {
        title: `${t.title} (Copy)`,
        description: t.description,
        status: typeof t.status === "object" ? (t.status as any)?._id : t.status,
        priority: typeof t.priority === "object" ? (t.priority as any)?._id : t.priority,
        assignee: typeof t.assignee === "object" ? (t.assignee as any)?._id : t.assignee,
        feature_id: typeof t.feature_id === "object" ? (t.feature_id as any)?._id : t.feature_id,
        milestone_id: typeof t.milestone_id === "object" ? (t.milestone_id as any)?._id : t.milestone_id,
        start_date: t.start_date,
        deadline: t.deadline,
        estimate: t.estimate || 0,
      };
      await axiosInstance.post(`/api/projects/${projectId}/tasks`, payload);
      await loadAll();
    } catch (e: any) {
      setError(e?.response?.data?.message || "Không thể nhân bản task");
    }
  };

  const loadTaskDependencies = async (taskId: string) => {
    try {
      const response = await axiosInstance.get(`/api/tasks/${taskId}/dependencies`);
      setTaskDependencies(prev => ({
        ...prev,
        [taskId]: response.data
      }));
    } catch (error) {
      console.error('Error loading dependencies:', error);
    }
  };

  const loadCurrentTaskForDependency = async (taskId: string) => {
    try {
      const response = await axiosInstance.get(`/api/tasks/${taskId}`);
      setCurrentTaskForDependency(response.data);
    } catch (error: any) {
      console.error("Error loading current task:", error);
    }
  };

  const addDependency = async (taskId: string, dependsOnTaskId: string, type: string = 'FS', lagDays: number = 0, isMandatory: boolean = true, notes: string = '') => {
    try {
      const response = await axiosInstance.post(`/api/tasks/${taskId}/dependencies`, {
        depends_on_task_id: dependsOnTaskId,
        dependency_type: type,
        lag_days: lagDays,
        is_mandatory: isMandatory,
        notes: notes,
        strict_validation: isMandatory // Enable strict validation for mandatory dependencies
      });
      
      // Check for warnings (non-blocking)
      const warnings = response.data.warnings || [];
      const statusWarning = response.data.status_warning;
      const dateWarning = response.data.warning;
      
      // Check if there's a date warning that should show the conflict dialog
      const dateWarningInWarnings = warnings.find((w: any) => w.type === 'date_violation' && (w.current_start_date || w.current_deadline));
      const violationToShow = dateWarningInWarnings || (dateWarning && dateWarning.current_start_date ? dateWarning : null);
      
      if (violationToShow && (violationToShow.current_start_date || violationToShow.required_start_date)) {
        // Show conflict dialog for date violations (both mandatory and optional)
        // Load current task info
        await loadCurrentTaskForDependency(taskId);
        
        // Store pending dependency data (dependency already created for optional, but we want to show dialog)
        setPendingDependencyData({
          taskId,
          dependsOnTaskId,
          type,
          lagDays,
          isMandatory,
          notes
        });
        
        // Show conflict dialog
        setConflictViolation(violationToShow);
        setShowConflictDialog(true);
        
        // Don't clear form yet - wait for user action
        // Don't reload dependencies yet - wait for user to decide
        return;
      }
      
      // Handle other warnings (status warnings, etc.) with alert
      if (warnings.length > 0) {
        // Filter out date warnings (already handled above)
        const otherWarnings = warnings.filter((w: any) => !(w.type === 'date_violation' && (w.current_start_date || w.current_deadline)));
        
        if (otherWarnings.length > 0) {
          let warningMessage = '⚠️ Dependency created with warnings:\n\n';
          otherWarnings.forEach((w: any, index: number) => {
            warningMessage += `${index + 1}. ${w.message}\n${w.suggestion || ''}\n\n`;
          });
          toast.warning(warningMessage, { duration: 5000 });
        }
      } else if (statusWarning) {
        const confirmMessage = `${statusWarning.message}\n\n${statusWarning.suggestion}\n\n✅ Dependency was created successfully, but you may want to check task statuses.`;
        toast.info(confirmMessage, { duration: 5000 });
      }
      
      setDependencyForm({ depends_on_task_id: '', dependency_type: 'FS', lag_days: 0, is_mandatory: true, notes: '' });
      setError(null);
      await loadTaskDependencies(taskId);
    } catch (error: any) {
      const errorData = error?.response?.data;
      if (error?.response?.status === 400 && errorData?.violation) {
        // Date violation - show detailed error
        const violation = errorData.violation;
        const errorMessage = `${errorData.message}\n\n${violation.suggestion || ''}`;
        
        // Only offer auto-fix for MANDATORY dependencies
        if (isMandatory && errorData.can_auto_fix && violation.required_start_date) {
          // Store pending dependency data
          setPendingDependencyData({
            taskId,
            dependsOnTaskId,
            type,
            lagDays,
            isMandatory,
            notes
          });
          
          // Show conflict dialog instead of window.confirm
          setConflictViolation(violation);
          setShowConflictDialog(true);
        } else if (!isMandatory) {
          // For OPTIONAL dependencies, show warning and ask if user wants to proceed anyway
          const proceed = window.confirm(
            `⚠️ Cảnh báo:\n\n${errorMessage}\n\nĐây là optional dependency nên không tự động điều chỉnh ngày.\n\nBạn có muốn tiếp tục thêm dependency này không?`
          );
          if (proceed) {
            // Force add the optional dependency by disabling strict validation
            try {
              await axiosInstance.post(`/api/tasks/${taskId}/dependencies`, {
                depends_on_task_id: dependsOnTaskId,
                dependency_type: type,
                lag_days: lagDays,
                is_mandatory: isMandatory,
                notes: notes,
                strict_validation: false
              });
              await loadTaskDependencies(taskId);
            } catch (forceError: any) {
              setError(forceError?.response?.data?.message || 'Không thể thêm dependency');
            }
          }
        }
      } else {
        setError(errorData?.message || 'Không thể tạo dependency');
      }
    }
  };

  const handleAutoFixDependency = async () => {
    if (!pendingDependencyData) return;
    
    try {
      setShowConflictDialog(false);
      setError(null);
      
      // For optional dependencies, the dependency might already be created
      // For mandatory dependencies, we need to create it first (if it wasn't created due to strict validation)
      let dependencyExists = false;
      
      if (pendingDependencyData.isMandatory) {
        // STEP 1: Create dependency first (without strict validation)
        console.log('➕ Step 1: Creating dependency...');
        try {
          const retryResponse = await axiosInstance.post(`/api/tasks/${pendingDependencyData.taskId}/dependencies`, {
            depends_on_task_id: pendingDependencyData.dependsOnTaskId,
            dependency_type: pendingDependencyData.type,
            lag_days: pendingDependencyData.lagDays,
            is_mandatory: pendingDependencyData.isMandatory,
            notes: pendingDependencyData.notes,
            strict_validation: false
          });
          console.log('✅ Dependency created:', retryResponse.data);
        } catch (createError: any) {
          // If dependency already exists, that's OK
          if (createError?.response?.status === 400 && createError?.response?.data?.message?.includes('đã tồn tại')) {
            console.log('ℹ️ Dependency already exists, skipping creation');
            dependencyExists = true;
          } else {
            throw createError;
          }
        }
      } else {
        // For optional, dependency should already be created
        dependencyExists = true;
        console.log('ℹ️ Optional dependency already created, proceeding to date adjustment');
      }
      
      // STEP 2: Auto-adjust dates based on the dependency
      console.log('🔧 Step 2: Auto-adjusting dates for task:', pendingDependencyData.taskId);
      try {
        const adjustResponse = await axiosInstance.post(`/api/tasks/${pendingDependencyData.taskId}/auto-adjust-dates`, {
          preserve_duration: true
        });
        console.log('✅ Auto-adjust response:', adjustResponse.data);
        
        if (adjustResponse.data.success) {
          console.log('✅ Dates adjusted successfully!');
          console.log('Old dates:', adjustResponse.data.task?.old_dates);
          console.log('New dates:', adjustResponse.data.task?.new_dates);
        } else {
          console.warn('⚠️ No adjustments made:', adjustResponse.data.message);
          // For optional dependencies, this is OK - dependency was created without date adjustment
          if (!pendingDependencyData.isMandatory) {
            console.log('ℹ️ Optional dependency exists. Date adjustment not needed or failed, but dependency is OK.');
          }
        }
      } catch (adjustError: any) {
        // If auto-adjust fails, it's OK for optional dependencies
        if (!pendingDependencyData.isMandatory) {
          console.log('ℹ️ Optional dependency exists. Date adjustment failed but dependency is OK.');
        } else {
          throw adjustError; // Re-throw for mandatory dependencies
        }
      }
      
      setDependencyForm({ depends_on_task_id: '', dependency_type: 'FS', lag_days: 0, is_mandatory: true, notes: '' });
      setPendingDependencyData(null);
      setConflictViolation(null);
      
      // STEP 3: Reload everything to show changes
      console.log('🔄 Step 3: Reloading data...');
      await loadTaskDependencies(pendingDependencyData.taskId);
      await loadCurrentTaskForDependency(pendingDependencyData.taskId);
      await loadAll();
      console.log('✅ All done!');
    } catch (fixError: any) {
      console.error('❌ Auto-fix error:', fixError);
      console.error('Error details:', fixError?.response?.data);
      setError(fixError?.response?.data?.message || 'Không thể tự động điều chỉnh');
      setShowConflictDialog(true); // Show dialog again on error
    }
  };

  const handleManualEditDependency = () => {
    // Close conflict dialog but keep add form open so user can edit dates
    setShowConflictDialog(false);
    setError('⚠️ Vui lòng chỉnh sửa ngày tháng của task trong tab Overview trước khi thêm dependency này. Sau đó thử lại.');
    setPendingDependencyData(null);
    setConflictViolation(null);
    // For optional dependencies, dependency is already created, so reload dependencies
    if (pendingDependencyData && !pendingDependencyData.isMandatory) {
      loadTaskDependencies(pendingDependencyData.taskId);
    }
  };

  const removeDependency = async (taskId: string, dependencyId: string) => {
    try {
      await axiosInstance.delete(`/api/tasks/${taskId}/dependencies/${dependencyId}`);
      await loadTaskDependencies(taskId);
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Không thể xóa dependency');
    }
  };

  // Use fetched filter options - ensure IDs are strings
  const features = allFeatures
    .filter(f => f._id) // Only include features with valid _id
    .map(f => ({ id: String(f._id), title: f.title || 'Không có tiêu đề' }));
  const milestones = allMilestones
    .filter(m => m._id) // Only include milestones with valid _id
    .map(m => ({ id: String(m._id), title: m.title || 'Không có tiêu đề' }));
  // Keep full objects with _id and name for status/priority
  const statuses = allStatuses;
  const priorities = allPriorities;
  
  // Filter functions based on selected feature
  const functions = useMemo(() => {
    if (filterFeature === 'all') {
      return allFunctions;
    }
    return allFunctions.filter(fn => {
      const featureId = typeof fn.feature_id === 'object' 
        ? String((fn.feature_id as any)?._id || '')
        : String(fn.feature_id || '');
      return featureId === String(filterFeature);
    });
  }, [allFunctions, filterFeature]);

  const paged = tasks;

  // Build a stable global index map for STT across groups (consistent with other screens)
  const indexById = useMemo(() => {
    const map = new Map<string, number>();
    (paged || []).forEach((t, i) => {
      map.set((t as any)._id as string, i);
    });
    return map;
  }, [paged]);

  const resolveName = (value: any, fallback = "-") => {
    if (!value) return fallback;
    if (typeof value === "object") {
      // Check for User model fields (full_name, name, title)
      return value.full_name || value.name || value.title || fallback;
    }
    return String(value);
  };

  const resolveStatusName = (value: any) => normalizeStatusValue(
    typeof value === "object" ? value?.name : value
  );

  const ganttProjectData: GanttProject | null = useMemo(() => {
    if (!ganttHierarchy.length || !projectId) return null;

    return {
      id: projectId,
      name: ganttProjectName,
      milestones: ganttHierarchy.map((m) => ({
        id: m.id,
        name: m.name,
        features: m.features.map((f) => ({
          id: f.id,
          name: f.name,
          functions: f.functions.map((fn) => ({
            id: fn.id,
            name: fn.name,
            tasks: [],
          })),
        })),
      })),
    };
  }, [ganttHierarchy, projectId, ganttProjectName]);

  const handleGanttFilterChange = (filters: {
    milestones: Set<string>;
    features: Set<string>;
    functions: Set<string>;
  }) => {
    setSelectedMilestones(filters.milestones);
    setSelectedFeatures(filters.features);
    setSelectedFunctions(filters.functions);
  };

  const groupedByStatus = useMemo(() => {
    const groups: Record<string, Task[]> = {};
    (paged || []).forEach((t) => {
      const key = resolveStatusName(t.status);
      if (!groups[key]) groups[key] = [];
      groups[key].push(t);
    });
    return groups;
  }, [paged]);

  const getStatusColor = (name: string) => {
    const normalized = resolveStatusName(name);
    if (normalized === 'Done') return '#16a34a';
    if (normalized === 'Doing') return '#f59e0b';
    if (normalized === 'To Do') return '#9ca3af';
    return '#9ca3af';
  };

  const getPriorityColor = (name: string) => {
    const key = (name || '').toLowerCase();
    if (key.includes('critical')) return 'error';
    if (key.includes('high')) return 'warning';
    if (key.includes('medium')) return 'info';
    return 'default';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
        <SidebarWrapper />
        <main className="p-4 md:p-6">
          <Box sx={{ 
            display: "flex", 
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: "center", 
            py: 12 
          }}>
            <CircularProgress 
              size={60} 
              thickness={4}
              sx={{ 
                color: '#667eea',
                mb: 3
              }}
            />
            <Typography variant="h6" fontWeight={600} color="text.secondary">
              Đang tải dữ liệu công việc...
            </Typography>
          </Box>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fb]">
      <SidebarWrapper />
      <main>
        <div className="w-full">
          {/* ClickUp-style Top Bar */}
          <Box 
            sx={{ 
              bgcolor: 'white',
              borderBottom: '1px solid #e8e9eb',
              px: 3,
              py: 2,
              position: 'sticky',
              top: 64, // Below the Header component (h-16 = 64px)
              zIndex: 30, // Lower than Header dropdown but higher than content
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              {/* Title with Icon */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2.5,
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
                }}>
                  <AssignmentIcon sx={{ fontSize: 28, color: 'white' }} />
                </Box>
                <Box>
                  <Typography 
                    variant="h5" 
                    sx={{ 
                      fontWeight: 700,
                      color: '#1f2937',
                      fontSize: '24px',
                      mb: 0.5
                    }}
                  >
                    Công việc
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#6b7280' }}>
                    Quản lý các công việc trong dự án
                  </Typography>
                </Box>
              </Box>

              {/* Right Actions */}
              <Stack direction="row" spacing={1.5} alignItems="center">
                {/* Quick Navigation */}
                <Button
                  variant="outlined"
                  onClick={() => router.push(`/projects/${projectId}/milestones`)}
                  sx={{
                    textTransform: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderColor: '#e8e9eb',
                    color: '#49516f',
                    '&:hover': {
                      borderColor: '#7b68ee',
                      bgcolor: '#f3f0ff',
                    }
                  }}
                >
                  Cột Mốc
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => router.push(`/projects/${projectId}/features`)}
                  sx={{
                    textTransform: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderColor: '#e8e9eb',
                    color: '#49516f',
                    '&:hover': {
                      borderColor: '#7b68ee',
                      bgcolor: '#f3f0ff',
                    }
                  }}
                >
                  Tính năng
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => router.push(`/projects/${projectId}/functions`)}
                  sx={{
                    textTransform: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    borderColor: '#e8e9eb',
                    color: '#49516f',
                    '&:hover': {
                      borderColor: '#7b68ee',
                      bgcolor: '#f3f0ff',
                    }
                  }}
                >
                  Chức năng
                </Button>
                
                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                
                {!isSupervisor && (
                  <Button 
                    variant="contained" 
                    onClick={openCreate} 
                    startIcon={<AddIcon />} 
                    sx={{ 
                      bgcolor: '#7b68ee',
                      color: 'white',
                      textTransform: 'none',
                      fontWeight: 600,
                      fontSize: '14px',
                      px: 2.5,
                      py: 1,
                      borderRadius: 1.5,
                      boxShadow: 'none',
                      '&:hover': { 
                        bgcolor: '#6952d6',
                        boxShadow: '0 2px 8px rgba(123, 104, 238, 0.3)',
                      },
                    }}
                  >
                    Tạo công việc
                  </Button>
                )}
            </Stack>
            </Box>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

        

          {/* ClickUp-style View Toolbar */}
          
          <Box 
            sx={{ 
              bgcolor: 'white',
              borderBottom: '1px solid #e8e9eb',
              px: 3,
              py: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Stack direction="row" spacing={0.5}>
              <Button
                onClick={() => setView('table')}
                startIcon={<ListIcon fontSize="small" />}
                sx={{
                  minWidth: 'auto',
                  px: 2,
                  py: 0.75,
                  color: view === 'table' ? '#7b68ee' : '#49516f',
                  bgcolor: view === 'table' ? '#f3f0ff' : 'transparent',
                  textTransform: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: 1.5,
                  '&:hover': {
                    bgcolor: view === 'table' ? '#f3f0ff' : '#f3f4f6',
                  }
                }}
              >
                Danh sách
              </Button>
              <Button
                onClick={() => setView('kanban')}
                startIcon={<ViewKanbanIcon fontSize="small" />}
                sx={{
                  minWidth: 'auto',
                  px: 2,
                  py: 0.75,
                  color: view === 'kanban' ? '#7b68ee' : '#49516f',
                  bgcolor: view === 'kanban' ? '#f3f0ff' : 'transparent',
                  textTransform: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: 1.5,
                  '&:hover': {
                    bgcolor: view === 'kanban' ? '#f3f0ff' : '#f3f4f6',
                  }
                }}
              >
                Kanban
              </Button>
              <Button
                onClick={() => setView('calendar')}
                startIcon={<CalendarMonthIcon fontSize="small" />}
                sx={{
                  minWidth: 'auto',
                  px: 2,
                  py: 0.75,
                  color: view === 'calendar' ? '#7b68ee' : '#49516f',
                  bgcolor: view === 'calendar' ? '#f3f0ff' : 'transparent',
                  textTransform: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: 1.5,
                  '&:hover': {
                    bgcolor: view === 'calendar' ? '#f3f0ff' : '#f3f4f6',
                  }
                }}
              >
                Lịch
              </Button>
              <Button
                onClick={() => setView('gantt')}
                startIcon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
                sx={{
                  minWidth: 'auto',
                  px: 2,
                  py: 0.75,
                  color: view === 'gantt' ? '#7b68ee' : '#49516f',
                  bgcolor: view === 'gantt' ? '#f3f0ff' : 'transparent',
                  textTransform: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: 1.5,
                  '&:hover': {
                    bgcolor: view === 'gantt' ? '#f3f0ff' : '#f3f4f6',
                  }
                }}
              >
                Gantt
              </Button>
            </Stack>
            <Stack direction="row" spacing={1.5} alignItems="center">
              {/* Quick Search */}
              <TextField
                placeholder="Tìm nhanh..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                size="small"
                sx={{ 
                  width: 200,
                  '& .MuiOutlinedInput-root': { 
                    fontSize: '13px',
                    borderRadius: 2,
                    bgcolor: '#f8f9fb',
                    height: 32,
                    '& fieldset': { borderColor: 'transparent' },
                    '&:hover': { 
                      bgcolor: '#f3f4f6',
                      '& fieldset': { borderColor: '#e8e9eb' }
                    },
                    '&.Mui-focused': { 
                      bgcolor: 'white',
                      '& fieldset': { borderColor: '#7b68ee', borderWidth: '2px' }
                    }
                  } 
                }}
                InputProps={{ 
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                    </InputAdornment>
                  ) 
                }}
              />
              
              <Badge 
                badgeContent={[filterAssignee !== 'all', filterStatus !== 'all', filterPriority !== 'all', 
                  filterFeature !== 'all', filterFunction !== 'all', filterMilestone !== 'all', search].filter(Boolean).length || 0}
                color="primary"
                sx={{
                  '& .MuiBadge-badge': {
                    background: 'linear-gradient(135deg, #7b68ee, #9b59b6)',
                    color: 'white',
                    fontWeight: 700,
                    fontSize: '10px',
                    boxShadow: '0 2px 8px rgba(123, 104, 238, 0.3)',
                    border: '2px solid white',
                  }
                }}
              >
                <Button
                  variant={filterAnchorEl ? "contained" : "outlined"}
                  size="small"
                  startIcon={<TuneIcon fontSize="small" />}
                  onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    borderColor: filterAnchorEl ? 'transparent' : '#e2e8f0',
                    borderWidth: '1.5px',
                    color: filterAnchorEl ? 'white' : '#49516f',
                    background: filterAnchorEl ? 'linear-gradient(135deg, #7b68ee, #9b59b6)' : 'white',
                    height: 36,
                    px: 2,
                    borderRadius: 2.5,
                    boxShadow: filterAnchorEl ? '0 4px 12px rgba(123, 104, 238, 0.3)' : 'none',
                    '&:hover': {
                      borderColor: filterAnchorEl ? 'transparent' : '#b4a7f5',
                      background: filterAnchorEl ? 'linear-gradient(135deg, #6b5dd6, #8b49a6)' : 'linear-gradient(to bottom, white, #f9fafb)',
                      boxShadow: '0 4px 12px rgba(123, 104, 238, 0.2)',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  Bộ lọc
                </Button>
              </Badge>
            </Stack>
          </Box>
       

          {/* Active Filters Chips - Modern Enhanced Style */}
          {(filterAssignee !== 'all' || filterStatus !== 'all' || filterPriority !== 'all' || 
            filterFeature !== 'all' || filterFunction !== 'all' || filterMilestone !== 'all' || search) && (
            <Box 
              sx={{ 
                background: 'linear-gradient(to bottom, #ffffff, #fafbff)',
                px: 3,
                py: 2,
                borderBottom: '1px solid #e2e8f0',
              }}
            >
              <Stack direction="row" spacing={1.5} flexWrap="wrap" alignItems="center" useFlexGap>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 0.5,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  bgcolor: 'rgba(123, 104, 238, 0.08)',
                  border: '1px solid rgba(123, 104, 238, 0.15)',
                }}>
                  <Box sx={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: '50%', 
                    bgcolor: '#7b68ee',
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': {
                      '0%, 100%': { opacity: 1 },
                      '50%': { opacity: 0.5 },
                    }
                  }} />
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#7b68ee', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Bộ lọc đang áp dụng
                  </Typography>
                </Box>
                
                {search && (
                  <Chip
                    label={`"${search}"`}
                    size="small"
                    onDelete={() => setSearch('')}
                    icon={<SearchIcon sx={{ fontSize: 14 }} />}
                    sx={{
                      bgcolor: 'white',
                      border: '1.5px solid #e2e8f0',
                      fontWeight: 600,
                      fontSize: '12px',
                      px: 0.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#7b68ee',
                        boxShadow: '0 2px 8px rgba(123, 104, 238, 0.12)',
                      },
                      '& .MuiChip-deleteIcon': { 
                        color: '#9ca3af', 
                        fontSize: '18px',
                        transition: 'all 0.2s ease',
                        '&:hover': { 
                          color: '#ef4444',
                          transform: 'scale(1.1)'
                        } 
                      }
                    }}
                  />
                )}
                
                {filterFeature !== 'all' && (
                  <Chip
                    icon={
                      <Box sx={{ 
                        width: 18, 
                        height: 18, 
                        borderRadius: 1, 
                        background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px'
                      }}>
                        ⚡
                      </Box>
                    }
                    label={features.find(f => String(f.id) === String(filterFeature))?.title || 'Tính năng'}
                    size="small"
                    onDelete={() => {
                      setFilterFeature('all');
                      setFilterFunction('all');
                    }}
                    sx={{
                      bgcolor: 'white',
                      border: '1.5px solid #bfdbfe',
                      color: '#1e40af',
                      fontWeight: 600,
                      fontSize: '12px',
                      px: 0.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#3b82f6',
                        boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)',
                        bgcolor: '#eff6ff',
                      },
                      '& .MuiChip-icon': { ml: 0.5 },
                      '& .MuiChip-deleteIcon': { 
                        color: '#60a5fa', 
                        fontSize: '18px',
                        transition: 'all 0.2s ease',
                        '&:hover': { 
                          color: '#ef4444',
                          transform: 'scale(1.1)'
                        } 
                      }
                    }}
                  />
                )}
                
                {filterFunction !== 'all' && (
                  <Chip
                    icon={
                      <Box sx={{ 
                        width: 18, 
                        height: 18, 
                        borderRadius: 1, 
                        background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px'
                      }}>
                        🔧
                      </Box>
                    }
                    label={functions.find(fn => fn._id === filterFunction)?.title || 'Chức năng'}
                    size="small"
                    onDelete={() => setFilterFunction('all')}
                    sx={{
                      bgcolor: 'white',
                      border: '1.5px solid #ddd6fe',
                      color: '#5b21b6',
                      fontWeight: 600,
                      fontSize: '12px',
                      px: 0.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#8b5cf6',
                        boxShadow: '0 2px 8px rgba(139, 92, 246, 0.2)',
                        bgcolor: '#f5f3ff',
                      },
                      '& .MuiChip-icon': { ml: 0.5 },
                      '& .MuiChip-deleteIcon': { 
                        color: '#a78bfa', 
                        fontSize: '18px',
                        transition: 'all 0.2s ease',
                        '&:hover': { 
                          color: '#ef4444',
                          transform: 'scale(1.1)'
                        } 
                      }
                    }}
                  />
                )}
                
                {filterMilestone !== 'all' && (
                  <Chip
                    icon={
                      <Box sx={{ 
                        width: 18, 
                        height: 18, 
                        borderRadius: 1, 
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px'
                      }}>
                        🎯
                      </Box>
                    }
                    label={milestones.find(m => String(m.id) === String(filterMilestone))?.title || 'Milestone'}
                    size="small"
                    onDelete={() => setFilterMilestone('all')}
                    sx={{
                      bgcolor: 'white',
                      border: '1.5px solid #fed7aa',
                      color: '#92400e',
                      fontWeight: 600,
                      fontSize: '12px',
                      px: 0.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#f59e0b',
                        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.2)',
                        bgcolor: '#fffbeb',
                      },
                      '& .MuiChip-icon': { ml: 0.5 },
                      '& .MuiChip-deleteIcon': { 
                        color: '#fbbf24', 
                        fontSize: '18px',
                        transition: 'all 0.2s ease',
                        '&:hover': { 
                          color: '#ef4444',
                          transform: 'scale(1.1)'
                        } 
                      }
                    }}
                  />
                )}
                
                {filterAssignee !== 'all' && (
                  <Chip
                    icon={<PersonIcon sx={{ fontSize: 16, color: '#7b68ee' }} />}
                    label={teamMembers.find(m => (m.user_id?._id || m._id) === filterAssignee)?.user_id?.full_name || 
                           teamMembers.find(m => (m.user_id?._id || m._id) === filterAssignee)?.full_name || 'Người thực hiện'}
                    size="small"
                    onDelete={() => setFilterAssignee('all')}
                    sx={{
                      bgcolor: 'white',
                      border: '1.5px solid #e9d5ff',
                      color: '#6b21a8',
                      fontWeight: 600,
                      fontSize: '12px',
                      px: 0.5,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        borderColor: '#a855f7',
                        boxShadow: '0 2px 8px rgba(168, 85, 247, 0.2)',
                        bgcolor: '#faf5ff',
                      },
                      '& .MuiChip-deleteIcon': { 
                        color: '#c084fc', 
                        fontSize: '18px',
                        transition: 'all 0.2s ease',
                        '&:hover': { 
                          color: '#ef4444',
                          transform: 'scale(1.1)'
                        } 
                      }
                    }}
                  />
                )}
                
              {filterStatus !== 'all' && (() => {
                const statusName = allStatuses.find(s => s._id === filterStatus)?.name || 'Trạng thái';
                return (
                  <Chip
                  icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: getStatusColor(statusName), boxShadow: `0 0 0 2px ${getStatusColor(statusName)}20` }} />}
                  label={statusName}
                    size="small"
                    onDelete={() => setFilterStatus('all')}
                    sx={{
                    bgcolor: 'white',
                    border: '1.5px solid #ccfbf1',
                      color: '#115e59',
                      fontWeight: 600,
                      fontSize: '12px',
                    px: 0.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#14b8a6',
                      boxShadow: '0 2px 8px rgba(20, 184, 166, 0.2)',
                      bgcolor: '#f0fdfa',
                    },
                    '& .MuiChip-deleteIcon': { 
                      color: '#5eead4', 
                      fontSize: '18px',
                      transition: 'all 0.2s ease',
                      '&:hover': { 
                        color: '#ef4444',
                        transform: 'scale(1.1)'
                      } 
                    }
                  }}
                />
                );
              })()}
                
                {filterPriority !== 'all' && (() => {
                const priorityName = allPriorities.find(p => p._id === filterPriority)?.name || 'Ưu tiên';
                return (
                  <Chip
                  icon={<FlagIcon sx={{ fontSize: 16, color: getPriorityColor(priorityName) === 'error' ? '#ef4444' : '#f59e0b' }} />}
                  label={priorityName}
                    size="small"
                    onDelete={() => setFilterPriority('all')}
                    sx={{
                    bgcolor: 'white',
                    border: '1.5px solid #fecaca',
                      color: '#991b1b',
                      fontWeight: 600,
                      fontSize: '12px',
                    px: 0.5,
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      borderColor: '#ef4444',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)',
                      bgcolor: '#fef2f2',
                    },
                    '& .MuiChip-deleteIcon': { 
                      color: '#fca5a5', 
                      fontSize: '18px',
                      transition: 'all 0.2s ease',
                      '&:hover': { 
                        color: '#dc2626',
                        transform: 'scale(1.1)'
                      } 
                    }
                  }}
                />
                );
              })()}
                
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    setFilterAssignee('all');
                    setFilterStatus('all');
                    setFilterPriority('all');
                    setFilterFeature('all');
                    setFilterFunction('all');
                    setFilterMilestone('all');
                    setSearch('');
                  }}
                  sx={{
                    fontSize: '12px',
                    fontWeight: 600,
                    textTransform: 'none',
                    color: '#ef4444',
                    minWidth: 'auto',
                    px: 2,
                    py: 0.75,
                    borderRadius: 2,
                    borderColor: '#fecaca',
                    bgcolor: 'white',
                    border: '1.5px solid #fecaca',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      color: 'white',
                      bgcolor: '#ef4444',
                      borderColor: '#ef4444',
                      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.25)',
                      transform: 'translateY(-1px)',
                    }
                  }}
                  startIcon={
                    <Box sx={{ fontSize: '14px' }}>✕</Box>
                  }
                >
                  Xóa tất cả
                </Button>
              </Stack>
            </Box>
          )}

          {/* Modern Filter Popover - Enhanced Design */}
          <Popover
            open={Boolean(filterAnchorEl)}
            anchorEl={filterAnchorEl}
            onClose={() => setFilterAnchorEl(null)}
            anchorOrigin={{
              vertical: 'bottom',
              horizontal: 'right',
            }}
            transformOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            slotProps={{
              paper: {
                sx: {
                  mt: 1.5,
                  width: 450,
                  maxHeight: 600,
                  borderRadius: 4,
                  boxShadow: '0 20px 60px rgba(123, 104, 238, 0.15), 0 0 0 1px rgba(123, 104, 238, 0.1)',
                  overflow: 'hidden',
                  background: 'linear-gradient(to bottom, #ffffff, #fafbff)',
                  display: 'flex',
                  flexDirection: 'column',
                }
              }
            }}
          >
            {/* Header with Gradient */}
            <Box 
              sx={{ 
                px: 3.5,
                pt: 3,
                pb: 2.5,
                background: 'linear-gradient(135deg, #7b68ee 0%, #9b59b6 100%)',
                position: 'relative',
                overflow: 'hidden',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'radial-gradient(circle at top right, rgba(255,255,255,0.2), transparent)',
                  pointerEvents: 'none',
                }
              }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ position: 'relative', zIndex: 1 }}>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
                    <Box sx={{ 
                      width: 36, 
                      height: 36, 
                      borderRadius: 2, 
                      bgcolor: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid rgba(255,255,255,0.3)',
                    }}>
                      <TuneIcon sx={{ fontSize: 20, color: 'white' }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '18px', color: 'white', letterSpacing: '-0.02em' }}>
                      Bộ lọc nâng cao
                    </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', ml: 6 }}>
                    Tùy chỉnh cách hiển thị danh sách công việc
                  </Typography>
                </Box>
                <IconButton 
                  size="small" 
                  onClick={() => setFilterAnchorEl(null)}
                  sx={{ 
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.15)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    '&:hover': { 
                      bgcolor: 'rgba(255,255,255,0.25)',
                      transform: 'rotate(90deg)',
                      transition: 'all 0.3s ease'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  <span style={{ fontSize: '18px', fontWeight: 300 }}>×</span>
                </IconButton>
              </Stack>
            </Box>

            {/* Filter Content */}
            <Box 
              sx={{ 
                px: 3.5,
                py: 3,
                flex: 1,
                overflowY: 'auto',
                '&::-webkit-scrollbar': {
                  width: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  bgcolor: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  bgcolor: '#e0e0e0',
                  borderRadius: '10px',
                  border: '2px solid transparent',
                  backgroundClip: 'content-box',
                  '&:hover': {
                    bgcolor: '#bdbdbd',
                  }
                }
              }}
            >
              <Stack spacing={3.5}>
                {/* People Section */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <PersonIcon sx={{ fontSize: 16, color: '#7b68ee' }} />
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#2d3748', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Nhân sự
                    </Typography>
                  </Stack>
                  <FormControl fullWidth size="small">
                    <InputLabel sx={{ color: '#6b7280', '&.Mui-focused': { color: '#7b68ee' } }}>Người thực hiện</InputLabel>
                    <Select 
                      value={filterAssignee} 
                      onChange={(e) => setFilterAssignee(e.target.value)}
                      label="Người thực hiện"
                      sx={{
                        borderRadius: 2.5,
                        bgcolor: 'white',
                        '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0', borderWidth: '1.5px' },
                        '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#b4a7f5' },
                        '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7b68ee', borderWidth: '2px' },
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(123, 104, 238, 0.08)',
                        }
                      }}
                    >
                      <MenuItem value="all">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 24, height: 24, bgcolor: '#e2e8f0', color: '#6b7280', fontSize: '11px', fontWeight: 600 }}>
                            All
                          </Avatar>
                          <Box>
                            <Typography sx={{ fontSize: '14px', fontWeight: 500 }}>Tất cả</Typography>
                            <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '11px' }}>
                              {teamMembers.length} thành viên
                            </Typography>
                          </Box>
                        </Box>
                      </MenuItem>
                      {teamMembers.map((member, idx) => {
                        const userId = member.user_id?._id || member._id;
        const userName = member.user_id?.full_name || member.full_name || member.user_id?.email || member.email || 'Không rõ';
                        return (
                          <MenuItem key={userId || idx} value={userId}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Avatar sx={{ width: 24, height: 24, bgcolor: '#7b68ee', fontSize: '11px', fontWeight: 600 }}>
                                {userName.charAt(0).toUpperCase()}
                              </Avatar>
                              <Typography sx={{ fontSize: '14px' }}>{userName}</Typography>
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Box>

                <Divider sx={{ borderColor: '#e2e8f0' }} />

                {/* Status & Priority Section */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <Box sx={{ 
                      width: 16, 
                      height: 16, 
                      borderRadius: '4px', 
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '10px' }}>✓</span>
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#2d3748', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Trạng thái & Ưu tiên
                    </Typography>
                  </Stack>
                  <Stack spacing={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: '#6b7280', '&.Mui-focused': { color: '#7b68ee' } }}>Trạng thái</InputLabel>
                      <Select 
                        value={filterStatus} 
                        onChange={(e) => setFilterStatus(e.target.value)}
                        label="Trạng thái"
                        sx={{
                          borderRadius: 2.5,
                          bgcolor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0', borderWidth: '1.5px' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#b4a7f5' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7b68ee', borderWidth: '2px' },
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(123, 104, 238, 0.08)',
                          }
                        }}
                      >
                        <MenuItem value="all">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: '#cbd5e0', border: '2px solid #e2e8f0' }} />
                            <Typography sx={{ fontSize: '14px', fontWeight: 500 }}>Tất cả trạng thái</Typography>
                          </Box>
                        </MenuItem>
                        {statuses.map((s) => (
                        <MenuItem key={s._id} value={s._id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ 
                              width: 10, 
                              height: 10, 
                              borderRadius: '50%', 
                              bgcolor: getStatusColor(s.name),
                              boxShadow: `0 0 0 2px ${getStatusColor(s.name)}20`
                            }} />
                            <Typography sx={{ fontSize: '14px' }}>{s.name}</Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: '#6b7280', '&.Mui-focused': { color: '#7b68ee' } }}>Ưu tiên</InputLabel>
                      <Select 
                        value={filterPriority} 
                        onChange={(e) => setFilterPriority(e.target.value)}
                        label="Ưu tiên"
                        sx={{
                          borderRadius: 2.5,
                          bgcolor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0', borderWidth: '1.5px' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#b4a7f5' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7b68ee', borderWidth: '2px' },
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(123, 104, 238, 0.08)',
                          }
                        }}
                      >
                        <MenuItem value="all">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <FlagIcon sx={{ fontSize: 16, color: '#9ca3af' }} />
                            <Typography sx={{ fontSize: '14px', fontWeight: 500 }}>Tất cả mức ưu tiên</Typography>
                          </Box>
                        </MenuItem>
                        {priorities.map((p) => (
                        <MenuItem key={p._id} value={p._id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <FlagIcon sx={{ 
                              fontSize: 16, 
                              color: getPriorityColor(p.name) === 'error' ? '#ef4444' : getPriorityColor(p.name) === 'warning' ? '#f59e0b' : '#9ca3af' 
                            }} />
                            <Typography sx={{ fontSize: '14px' }}>{p.name}</Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                </Box>

                <Divider sx={{ borderColor: '#e2e8f0' }} />

                {/* Project Structure Section */}
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <Box sx={{ 
                      width: 16, 
                      height: 16, 
                      borderRadius: '4px', 
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <span style={{ fontSize: '10px', color: 'white' }}>⚙</span>
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#2d3748', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Cấu trúc dự án
                    </Typography>
                  </Stack>
                  <Stack spacing={2}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: '#6b7280', '&.Mui-focused': { color: '#7b68ee' } }}>Tính năng</InputLabel>
                      <Select 
                        value={filterFeature} 
                        onChange={(e) => {
                          const newFeatureId = e.target.value;
                          setFilterFeature(newFeatureId);
                          // Reset function filter if feature changes or is set to 'all'
                          if (newFeatureId === 'all') {
                            setFilterFunction('all');
                          } else {
                            // Check if current function belongs to new feature, if not reset
                            const currentFunction = allFunctions.find(fn => {
                              const fnId = typeof fn._id === 'string' ? fn._id : String(fn._id || '');
                              return fnId === String(filterFunction);
                            });
                            if (currentFunction) {
                              const fnFeatureId = typeof currentFunction.feature_id === 'object' 
                                ? String((currentFunction.feature_id as any)?._id || '')
                                : String(currentFunction.feature_id || '');
                              if (fnFeatureId !== String(newFeatureId)) {
                                setFilterFunction('all');
                              }
                            } else {
                              setFilterFunction('all');
                            }
                          }
                        }}
                        label="Tính năng"
                        sx={{
                          borderRadius: 2.5,
                          bgcolor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0', borderWidth: '1.5px' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#b4a7f5' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7b68ee', borderWidth: '2px' },
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(123, 104, 238, 0.08)',
                          }
                        }}
                      >
                        <MenuItem value="all">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ 
                              width: 22, 
                              height: 22, 
                              borderRadius: 1.5, 
                              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px'
                            }}>
                              ⚡
                            </Box>
                            <Box>
                              <Typography sx={{ fontSize: '14px', fontWeight: 500 }}>Tất cả tính năng</Typography>
                              <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '11px' }}>
                                {features.length} mục
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                        {features.map((f) => (
                          <MenuItem key={f.id} value={String(f.id)}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Box sx={{ 
                                width: 22, 
                                height: 22, 
                                borderRadius: 1.5, 
                                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px'
                              }}>
                                ⚡
                              </Box>
                              <Typography sx={{ fontSize: '14px' }}>{f.title}</Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ 
                        color: filterFeature === 'all' ? '#9ca3af' : '#6b7280', 
                        '&.Mui-focused': { color: filterFeature === 'all' ? '#9ca3af' : '#7b68ee' } 
                      }}>
                        Chức năng
                      </InputLabel>
                      <Select 
                        value={filterFunction}
                        onChange={(e) => setFilterFunction(e.target.value)}
                        disabled={filterFeature === 'all'}
                        label="Chức năng"
                        sx={{
                          borderRadius: 2.5,
                          bgcolor: filterFeature === 'all' ? '#f8f9fb' : 'white',
                          '& .MuiOutlinedInput-notchedOutline': { 
                            borderColor: filterFeature === 'all' ? '#e2e8f0' : '#e2e8f0', 
                            borderWidth: '1.5px' 
                          },
                          '&:hover .MuiOutlinedInput-notchedOutline': { 
                            borderColor: filterFeature === 'all' ? '#e2e8f0' : '#b4a7f5' 
                          },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { 
                            borderColor: filterFeature === 'all' ? '#e2e8f0' : '#7b68ee', 
                            borderWidth: '2px' 
                          },
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            boxShadow: filterFeature === 'all' ? 'none' : '0 4px 12px rgba(123, 104, 238, 0.08)',
                          },
                          opacity: filterFeature === 'all' ? 0.6 : 1,
                        }}
                      >
                        <MenuItem value="all">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ 
                              width: 22, 
                              height: 22, 
                              borderRadius: 1.5, 
                              background: filterFeature === 'all' ? '#e2e8f0' : 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px'
                            }}>
                              🔧
                            </Box>
                            <Box>
                              <Typography sx={{ fontSize: '14px', fontWeight: 500, color: filterFeature === 'all' ? '#9ca3af' : 'inherit' }}>
                                {filterFeature === 'all' ? 'Chọn tính năng trước' : 'Tất cả chức năng'}
                              </Typography>
                              {filterFeature !== 'all' && (
                                <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '11px' }}>
                                  {functions.length} mục
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </MenuItem>
                        {functions.map((fn) => (
                          <MenuItem key={fn._id} value={fn._id}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Box sx={{ 
                                width: 22, 
                                height: 22, 
                                borderRadius: 1.5, 
                                background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px'
                              }}>
                                🔧
                              </Box>
                              <Typography sx={{ fontSize: '14px' }}>{fn.title}</Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: '#6b7280', '&.Mui-focused': { color: '#7b68ee' } }}>Milestone</InputLabel>
                      <Select 
                        value={filterMilestone} 
                        onChange={(e) => setFilterMilestone(String(e.target.value))}
                        label="Milestone"
                        sx={{
                          borderRadius: 2.5,
                          bgcolor: 'white',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0', borderWidth: '1.5px' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#b4a7f5' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#7b68ee', borderWidth: '2px' },
                          transition: 'all 0.2s ease',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(123, 104, 238, 0.08)',
                          }
                        }}
                      >
                        <MenuItem value="all">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ 
                              width: 22, 
                              height: 22, 
                              borderRadius: 1.5, 
                              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '11px'
                            }}>
                              🎯
                            </Box>
                            <Box>
                              <Typography sx={{ fontSize: '14px', fontWeight: 500 }}>Tất cả milestone</Typography>
                              <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '11px' }}>
                                {milestones.length} mục
                              </Typography>
                            </Box>
                          </Box>
                        </MenuItem>
                        {milestones.map((m) => (
                          <MenuItem key={m.id} value={String(m.id)}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Box sx={{ 
                                width: 22, 
                                height: 22, 
                                borderRadius: 1.5, 
                                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px'
                              }}>
                                🎯
                              </Box>
                              <Typography sx={{ fontSize: '14px' }}>{m.title}</Typography>
                            </Box>
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>
                </Box>
              </Stack>
            </Box>

            {/* Footer Actions */}
            {(filterAssignee !== 'all' || filterStatus !== 'all' || filterPriority !== 'all' || 
              filterFeature !== 'all' || filterFunction !== 'all' || filterMilestone !== 'all' || search) && (
              <Box 
                sx={{ 
                  px: 3.5,
                  py: 2.5,
                  borderTop: '1px solid #e2e8f0',
                  background: 'linear-gradient(to bottom, #fafbff, #f8f9fb)',
                  flexShrink: 0,
                }}
              >
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => {
                    setFilterAssignee('all');
                    setFilterStatus('all');
                    setFilterPriority('all');
                    setFilterFeature('all');
                    setFilterFunction('all');
                    setFilterMilestone('all');
                    setSearch('');
                  }}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '14px',
                    color: 'white',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    borderRadius: 2.5,
                    py: 1.2,
                    boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
                      boxShadow: '0 6px 16px rgba(239, 68, 68, 0.4)',
                      transform: 'translateY(-1px)',
                    },
                    transition: 'all 0.2s ease',
                  }}
                  startIcon={
                    <Box sx={{ 
                      width: 20, 
                      height: 20, 
                      borderRadius: '50%', 
                      bgcolor: 'rgba(255,255,255,0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px'
                    }}>
                      ✕
                    </Box>
                  }
                >
                  Xóa tất cả bộ lọc
                </Button>
              </Box>
            )}
          </Popover>

          {/* Feature Filter Alert */}
          {featureIdFromUrl && filterFeature === featureIdFromUrl && (
            <Alert 
              severity="info" 
              sx={{ 
                mb: 3,
                background: 'linear-gradient(135deg, #e0f2fe, #e0e7ff)',
                border: '1px solid #7b68ee',
                '& .MuiAlert-icon': {
                  color: '#7b68ee'
                }
              }}
              onClose={() => {
                setFilterFeature("all");
                router.push(`/projects/${projectId}/tasks`);
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Đang xem công việc của tính năng: 
                </Typography>
                <Chip 
                  label={allFeatures.find(f => f._id === featureIdFromUrl)?.title || 'Không rõ'}
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, #7b68ee, #9b59b6)',
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Alert>
          )}

          {/* Function Filter Alert */}
          {functionIdFromUrl && filterFunction === functionIdFromUrl && (
            <Alert 
              severity="info" 
              sx={{ 
                mb: 3,
                background: 'linear-gradient(135deg, #f0e7ff, #e0e7ff)',
                border: '1px solid #8b5cf6',
                '& .MuiAlert-icon': {
                  color: '#8b5cf6'
                }
              }}
              onClose={() => {
                setFilterFunction("all");
                router.push(`/projects/${projectId}/tasks`);
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Đang xem công việc của chức năng: 
                </Typography>
                <Chip 
                  label={allFunctions.find(f => f._id === functionIdFromUrl)?.title || 'Không rõ'}
                  size="small"
                  sx={{
                    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                    color: 'white',
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Alert>
          )}

          {view === "table" && (
            <Box sx={{ bgcolor: 'white' }}>

              {/* ClickUp-style Column headers */}
              <Box sx={{ 
                px: 3, 
                py: 1.5, 
                display: 'grid !important', 
                gridTemplateColumns: { 
                  xs: 'minmax(200px, 1fr) 120px 110px', 
                  md: 'minmax(250px, 2fr) 140px 120px 100px 100px 80px 80px' 
                }, 
                columnGap: 2, 
                color: '#6b7280', 
                fontSize: '11px', 
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                bgcolor: '#fafbfc',
                borderBottom: '1px solid #e8e9eb',
                alignItems: 'center',
              }}>
                <Box>Tên công việc</Box>
                <Box>Người thực hiện</Box>
                <Box>Hạn chót</Box>
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>Trạng thái</Box>
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>Ưu tiên</Box>
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>Phụ thuộc</Box>
                <Box sx={{ display: { xs: 'none', md: 'block' } }}>Thao tác</Box>
              </Box>

              {/* Groups */}
              <Box>
                {Object.entries(groupedByStatus).map(([statusName, rows]) => (
                  <Box key={statusName}>
                    {/* ClickUp-style Group header */}
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      px: 3, 
                      py: 1.5, 
                      bgcolor: '#fafbfc',
                      borderBottom: '1px solid #e8e9eb',
                      '&:hover': {
                        bgcolor: '#f3f4f6'
                      }
                    }}>
                      <IconButton 
                        size="small" 
                        onClick={() => setCollapsedGroups({ ...collapsedGroups, [statusName]: !collapsedGroups[statusName] })}
                        sx={{
                          p: 0.5,
                          mr: 1,
                          color: '#6b7280',
                          '&:hover': { bgcolor: '#e5e7eb' }
                        }}
                      >
                        {collapsedGroups[statusName] ? <ChevronRightIcon sx={{ fontSize: 16 }} /> : <ExpandMoreIcon sx={{ fontSize: 16 }} />}
                      </IconButton>
                      <Box sx={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        background: getStatusColor(statusName), 
                        mr: 1.5,
                      }} />
                      <Typography fontWeight={600} sx={{ fontSize: '13px', color: '#1f2937', mr: 1 }}>
                        {statusName || 'No Status'}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '12px' }}>
                        {rows.length}
                      </Typography>
                    </Box>

                    {/* ClickUp-style compact Rows */}
                    {!collapsedGroups[statusName] && rows.map((t, index) => {
                      const assigneeName = resolveName(t.assignee_id, "");
                      // Debug: log if assignee_id exists but name is empty
                      if (t.assignee_id && !assigneeName) {
                        console.log('Assignee ID exists but name is empty:', t.assignee_id);
                      }
                      const assigneeInitials = assigneeName ? assigneeName.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase() : '';
                      const assignerName = resolveName(t.assigner_id, "");
                      const assignerInitials = assignerName ? assignerName.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase() : '';
                      const priorityName = typeof t.priority === 'object' ? (t.priority as any)?.name : (t.priority as any) || '-';
                      const normalizedTaskStatus = resolveStatusName(t.status);
                      const isOverdue = t.deadline ? new Date(t.deadline).getTime() < Date.now() && normalizedTaskStatus !== 'Done' : false;
                      
                      // Check if task is blocked by incomplete dependencies (predecessors)
                      const hasBlockingDependencies = taskDependencies[t._id]?.dependencies?.some((dep: any) => {
                        const status = resolveStatusName(dep.depends_on_task_id?.status);
                        const isCompleted = status === 'Done';
                        const isStarted = status === 'Doing' || status === 'Done';
                        
                        // FS: This task is blocked if predecessor is not completed
                        if (dep.dependency_type === 'FS' && !isCompleted) return true;
                        // FF: This task cannot finish if predecessor is not completed
                        if (dep.dependency_type === 'FF' && !isCompleted) return true;
                        // SS: This task is blocked if predecessor hasn't started
                        if (dep.dependency_type === 'SS' && !isStarted) return true;
                        // SF: This task cannot finish if predecessor hasn't started
                        if (dep.dependency_type === 'SF' && !isStarted) return true;
                        return false;
                      });
                      
                      return (
                        <Fragment key={t._id}>
                        <Box 
                          sx={{ 
                            px: 3, 
                            py: 1.25, 
                            display: 'grid !important', 
                            gridTemplateColumns: { 
                              xs: 'minmax(200px, 1fr) 120px 110px', 
                              md: 'minmax(250px, 2fr) 140px 120px 100px 100px 80px 80px' 
                            }, 
                            columnGap: 2, 
                            alignItems: 'center', 
                            borderBottom: '1px solid #f3f4f6',
                            cursor: 'pointer',
                            '&:hover': { 
                              bgcolor: '#fafbfc',
                            }, 
                            '&:hover .row-actions': { opacity: 1 },
                          }}
                          onClick={() => openTaskDetailsModal(t._id)}
                        >
                          {/* Task name - double click to edit */}
                          <Box onClick={(e) => e.stopPropagation()}>
                            {editingTaskId === t._id ? (
                              <TextField
                                autoFocus
                                value={editingTitle}
                                onChange={(e) => setEditingTitle(e.target.value)}
                                onBlur={async () => {
                                  if (editingTitle.trim() && editingTitle !== t.title) {
                                    try {
                                      await axiosInstance.patch(`/api/tasks/${t._id}`, {
                                        title: editingTitle.trim()
                                      });
                                      await loadAll();
                                      toast.success('Đã cập nhật tiêu đề thành công');
                                    } catch (error: any) {
                                      console.error('Error updating title:', error);
                                      toast.error('Không thể cập nhật tiêu đề', {
                                        description: error?.response?.data?.message || 'Vui lòng thử lại'
                                      });
                                    }
                                  }
                                  setEditingTaskId(null);
                                  setEditingTitle('');
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur();
                                  } else if (e.key === 'Escape') {
                                    setEditingTaskId(null);
                                    setEditingTitle('');
                                  }
                                }}
                                size="small"
                                fullWidth
                                sx={{
                                  '& .MuiOutlinedInput-root': {
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    '& fieldset': { border: 'none' },
                                    bgcolor: 'white',
                                    boxShadow: '0 0 0 2px #7b68ee',
                                    borderRadius: 1,
                                  }
                                }}
                              />
                            ) : (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {hasBlockingDependencies && (
                                  <Tooltip title="⚠️ This task is blocked by incomplete dependencies" placement="top">
                                    <BlockIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                                  </Tooltip>
                                )}
                                <Tooltip 
                                  title={
                                    <Box>
                                      <Typography fontSize="12px" fontWeight={600} sx={{ mb: 0.5 }}>
                                        {t.title}
                                      </Typography>
                                      <Typography fontSize="11px" color="rgba(255,255,255,0.8)">
                                        Click to open detail
                                      </Typography>
                                    </Box>
                                  } 
                                  placement="top"
                                  arrow
                                >
                                  <Link
                                    component="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openTaskDetailsModal(t._id);
                                    }}
                                    onDoubleClick={(e) => {
                                      if (!isSupervisor) {
                                        e.stopPropagation();
                                        setEditingTaskId(t._id);
                                        setEditingTitle(t.title);
                                      }
                                    }}
                                    sx={{ 
                                      fontWeight: 500, 
                                      fontSize: '14px', 
                                      color: hasBlockingDependencies ? '#f59e0b' : '#7b68ee',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      px: 1,
                                      py: 0.5,
                                      borderRadius: 1,
                                      cursor: 'pointer',
                                      maxWidth: '100%',
                                      textDecoration: 'none',
                                      display: 'block',
                                      '&:hover': {
                                        textDecoration: 'underline',
                                        color: hasBlockingDependencies ? '#d97706' : '#6952d6',
                                        bgcolor: '#f3f4f6',
                                      }
                                    }}
                                  >
                                    {t.title}
                                  </Link>
                                </Tooltip>
                                
                                {/* Hierarchy badges: Milestone → Feature → Function - Clickable with truncation */}
                                {t.milestone_id && typeof t.milestone_id === 'object' && (
                                  <Tooltip title={`Milestone: ${(t.milestone_id as any).title}`} arrow>
                                  <Chip 
                                    label={`🎯 ${(t.milestone_id as any).title}`}
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Open milestone modal instead of navigating
                                    }}
                                    sx={{ 
                                      height: 18,
                                        maxWidth: 120,
                                      fontSize: '10px',
                                      fontWeight: 600,
                                      bgcolor: '#fef3c7',
                                      color: '#92400e',
                                      cursor: 'pointer',
                                        '& .MuiChip-label': { 
                                          px: 0.75,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        },
                                      '&:hover': {
                                        bgcolor: '#fde68a',
                                        transform: 'scale(1.05)',
                                      },
                                      transition: 'all 0.2s',
                                    }}
                                  />
                                  </Tooltip>
                                )}
                                {(() => {
                                  // Try to get feature from task.feature_id first, then from function_id.feature_id
                                  let featureId: string | null = null;
                                  let featureTitle: string | null = null;
                                  
                                  if (t.feature_id) {
                                    featureId = typeof t.feature_id === 'object' ? (t.feature_id as any)?._id : t.feature_id;
                                    featureTitle = typeof t.feature_id === 'object' 
                                      ? (t.feature_id as any)?.title 
                                      : (featureId ? allFeatures.find(f => String(f._id) === String(featureId))?.title : null);
                                  } else if ((t as any).function_id && typeof (t as any).function_id === 'object') {
                                    const func = (t as any).function_id;
                                    if (func.feature_id) {
                                      featureId = typeof func.feature_id === 'object' ? func.feature_id._id : func.feature_id;
                                      featureTitle = typeof func.feature_id === 'object' 
                                        ? func.feature_id.title 
                                        : (featureId ? allFeatures.find(f => String(f._id) === String(featureId))?.title : null);
                                    }
                                  }
                                  
                                  if (!featureId || !featureTitle) return null;
                                  
                                  return (
                                    <Tooltip title={`Feature: ${featureTitle}`} arrow>
                                      <Chip 
                                        label={`⚡ ${featureTitle}`}
                                        size="small"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          router.push(`/projects/${projectId}/features`);
                                        }}
                                        sx={{ 
                                          height: 18,
                                          maxWidth: 250,
                                          fontSize: '10px',
                                          fontWeight: 600,
                                          bgcolor: '#dbeafe',
                                          color: '#1e40af',
                                          cursor: 'pointer',
                                          '& .MuiChip-label': { 
                                            px: 0.75,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                          },
                                          '&:hover': {
                                            bgcolor: '#bfdbfe',
                                            transform: 'scale(1.05)',
                                          },
                                          transition: 'all 0.2s',
                                        }}
                                      />
                                    </Tooltip>
                                  );
                                })()}
                                {(t as any).function_id && typeof (t as any).function_id === 'object' && (
                                  <Tooltip title={`Function: ${((t as any).function_id as any).title}`} arrow>
                                  <Chip 
                                    label={`🔧 ${((t as any).function_id as any).title}`}
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      router.push(`/projects/${projectId}/functions`);
                                    }}
                                    sx={{ 
                                      height: 18,
                                        maxWidth: 120,
                                      fontSize: '10px',
                                      fontWeight: 600,
                                      bgcolor: '#e0e7ff',
                                      color: '#4338ca',
                                      cursor: 'pointer',
                                        '& .MuiChip-label': { 
                                          px: 0.75,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        },
                                      '&:hover': {
                                        bgcolor: '#c7d2fe',
                                        transform: 'scale(1.05)',
                                      },
                                      transition: 'all 0.2s',
                                    }}
                                  />
                                  </Tooltip>
                                )}
                          </Box>
                            )}
                          </Box>
                          {/* Assignee - với dropdown để quick assign */}
                          <Box onClick={(e) => e.stopPropagation()}>
                            {isSupervisor ? (
                              // Hiển thị readonly cho supervisor
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0, flex: 1, maxWidth: '100%', overflow: 'hidden' }}>
                                {assigneeName ? (
                                  <>
                                    <Tooltip title={assigneeName}>
                                      <Avatar 
                                        sx={{ 
                                          width: 24, 
                                          height: 24, 
                                          fontSize: '10px',
                                          fontWeight: 600,
                                          bgcolor: '#7b68ee',
                                          flexShrink: 0
                                        }}
                                      >
                                        {assigneeInitials}
                                      </Avatar>
                                    </Tooltip>
                                    <Typography 
                                      sx={{ 
                                        fontSize: '12px', 
                                        fontWeight: 500,
                                        color: '#1f2937',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        minWidth: 0,
                                        flex: 1,
                                        maxWidth: 'calc(100% - 30px)',
                                        pr: 0.5
                                      }}
                                      title={assigneeName}
                                    >
                                      {assigneeName}
                                    </Typography>
                                  </>
                                ) : (
                                  <Stack direction="row" alignItems="center" spacing={0.75}>
                                    <Avatar sx={{ width: 24, height: 24, bgcolor: '#e5e7eb', color: '#9ca3af', flexShrink: 0 }}>
                                      <PersonIcon sx={{ fontSize: 14 }} />
                                    </Avatar>
                                    <Typography fontSize="11px" color="text.secondary" fontStyle="italic">
                                      Chưa giao
                                    </Typography>
                                  </Stack>
                                )}
                              </Box>
                            ) : (
                            <Select
                              value={typeof t.assignee_id === 'object' ? t.assignee_id?._id : t.assignee_id || ''}
                              onChange={async (e) => {
                                e.stopPropagation();
                                try {
                                  await axiosInstance.patch(`/api/tasks/${t._id}`, {
                                    assignee_id: e.target.value || null
                                  });
                                  await loadAll();
                                  toast.success('Đã cập nhật người thực hiện thành công');
                                } catch (error: any) {
                                  console.error('Error updating assignee:', error);
                                  toast.error('Không thể cập nhật người thực hiện', {
                                    description: error?.response?.data?.message || 'Vui lòng thử lại'
                                  });
                                }
                              }}
                              size="small"
                              displayEmpty
                              renderValue={(value) => {
                                if (!value) {
                                  return (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, width: '100%' }}>
                                      <Avatar sx={{ width: 24, height: 24, bgcolor: '#e5e7eb', color: '#9ca3af', flexShrink: 0 }}>
                                        <PersonIcon sx={{ fontSize: 14 }} />
                                      </Avatar>
                                      <Typography fontSize="11px" color="text.secondary" fontStyle="italic" sx={{ flex: 1, minWidth: 0 }}>
                                        Chưa giao
                                      </Typography>
                                    </Box>
                                  );
                                }
                                // Only show "Chưa giao" if assigneeName is truly empty, not if it's a valid name
                                const nameToShow = assigneeName && assigneeName.trim() !== "" ? assigneeName : 'Chưa giao';
                                return (
                                    <Box 
                                      sx={{ 
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 0.75,
                                        minWidth: 0, 
                                        width: '100%',
                                        maxWidth: '100%',
                                        overflow: 'hidden',
                                        position: 'relative'
                                      }}
                                    >
                                      <Avatar 
                                        sx={{ 
                                          width: 24, 
                                          height: 24, 
                                          fontSize: '10px',
                                          fontWeight: 600,
                                          bgcolor: '#7b68ee',
                                          flexShrink: 0
                                        }}
                                        title={nameToShow}
                                      >
                                        {assigneeInitials}
                                      </Avatar>
                                      <Typography
                                        component="span"
                                        sx={{ 
                                          fontSize: '12px', 
                                          fontWeight: 500,
                                          color: '#1f2937',
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                          flex: 1,
                                          minWidth: 0,
                                          maxWidth: 'calc(100% - 50px)',
                                          lineHeight: 1.4,
                                          display: 'block',
                                          pr: 0.5
                                        }}
                                        title={nameToShow}
                                      >
                                        {nameToShow}
                                      </Typography>
                                    </Box>
                                );
                              }}
                              sx={{
                                width: '100%',
                                minWidth: 0,
                                maxWidth: '100%',
                                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                '& .MuiSelect-select': { 
                                  p: '4px 32px 4px 8px !important',
                                  display: 'flex !important',
                                  alignItems: 'center !important',
                                  minWidth: 0,
                                  maxWidth: '100%',
                                  overflow: 'hidden !important',
                                  height: 'auto !important',
                                  '& > *': {
                                    width: '100%'
                                  }
                                },
                                '& .MuiSelect-icon': {
                                  right: '8px !important'
                                },
                                '& .MuiSelect-select .MuiBox-root': {
                                  width: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 0.75,
                                  minWidth: 0
                                },
                                '& .MuiSelect-select .MuiTypography-root': {
                                  display: 'block !important',
                                  visibility: 'visible !important',
                                  opacity: '1 !important'
                                },
                                '&:hover': { bgcolor: '#f3f4f6', borderRadius: 1 },
                                  cursor: 'pointer',
                              }}
                            >
                              <MenuItem value="">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Avatar sx={{ width: 24, height: 24, bgcolor: '#e5e7eb', color: '#9ca3af' }}>
                                    <PersonIcon sx={{ fontSize: 14 }} />
                                  </Avatar>
                                  <Typography fontSize="13px" color="text.secondary">Unassigned</Typography>
                          </Box>
                              </MenuItem>
                              {teamMembers.map((member, idx) => {
                                const userId = member.user_id?._id || member._id;
                        const userName = member.user_id?.full_name || member.full_name || member.user_id?.email || member.email || 'Không rõ';
                                return (
                                  <MenuItem key={userId || idx} value={userId}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Avatar sx={{ width: 24, height: 24, bgcolor: '#7b68ee', fontSize: '11px' }}>
                                        {userName.charAt(0).toUpperCase()}
                                      </Avatar>
                                      <Typography fontSize="13px">{userName}</Typography>
                          </Box>
                                  </MenuItem>
                                );
                              })}
                            </Select>
                            )}
                          </Box>

                          {/* Due date - inline edit */}
                          <Box onClick={(e) => e.stopPropagation()}>
                            <TextField
                              type="date"
                              size="small"
                              value={t.deadline ? new Date(t.deadline).toISOString().split('T')[0] : ''}
                              onChange={async (e) => {
                                if (!isSupervisor) {
                                  try {
                                    await axiosInstance.patch(`/api/tasks/${t._id}`, {
                                      deadline: e.target.value
                                    });
                                    await loadAll();
                                    toast.success('Đã cập nhật hạn chót thành công');
                                  } catch (error: any) {
                                    console.error('Error updating deadline:', error);
                                    toast.error('Không thể cập nhật hạn chót', {
                                      description: error?.response?.data?.message || 'Vui lòng thử lại'
                                    });
                                  }
                                }
                              }}
                              disabled={isSupervisor}
                              InputProps={{
                                sx: {
                                  fontSize: '13px',
                                  color: isOverdue ? '#ef4444' : '#6b7280',
                                  fontWeight: 500,
                                  '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                  '&:hover': { bgcolor: isSupervisor ? 'transparent' : '#f3f4f6', borderRadius: 1 },
                                  '& input': { 
                                    p: 0.5,
                                    cursor: isSupervisor ? 'default' : 'pointer',
                                  }
                                }
                              }}
                              sx={{ width: '110px' }}
                            />
                          </Box>

                          {/* Status - inline edit */}
                          <Box sx={{ display: { xs: 'none', md: 'block' } }} onClick={(e) => e.stopPropagation()}>
                            <Select
                            value={typeof t.status === 'object' ? (t.status as any)?._id : t.status || ''}
                              onChange={async (e) => {
                                if (!isSupervisor) {
                                  e.stopPropagation();
                                  const newStatusId = e.target.value;
                              // Get status name from STATUS_OPTIONS if it's an ID
                              const statusObj = allStatuses.find(s => s._id === newStatusId);
                              const statusToSend = statusObj?.name || statusObj?._id || newStatusId;
                              
                              console.log('Changing status:', { newStatusId, statusToSend, currentStatus: t.status });
                              
                                try {
                                  await axiosInstance.patch(`/api/tasks/${t._id}`, {
                                  status: statusToSend
                                  });
                                  await loadAll();
                                  toast.success('Đã cập nhật trạng thái thành công');
                                } catch (error: any) {
                                  console.error('Error updating status:', error);
                                  console.log('Error response:', error?.response);
                                  console.log('Error response data:', error?.response?.data);
                                  console.log('Error status code:', error?.response?.status);
                                  
                                  // Check if it's a dependency violation error
                                  if (error?.response?.status === 400) {
                                    const responseData = error?.response?.data || {};
                                    
                                    // Check for violations array (dependency violations)
                                    if (responseData.violations && Array.isArray(responseData.violations) && responseData.violations.length > 0) {
                                      console.log('✅ Setting dependency violation dialog with violations:', responseData.violations);
                                    setDependencyViolationDialog({
                                      open: true,
                                        violations: responseData.violations,
                                      taskId: t._id,
                                        newStatus: statusToSend
                                      });
                                      return; // Don't show error message if showing dialog
                                    }
                                    
                                    // Check for errors array that might contain dependency errors
                                    if (responseData.errors && Array.isArray(responseData.errors)) {
                                      // Check if any error mentions dependency
                                      const dependencyErrors = responseData.errors.filter((err: string) => 
                                        err.toLowerCase().includes('dependency') || 
                                        err.toLowerCase().includes('cannot complete') ||
                                        err.toLowerCase().includes('cannot start')
                                      );
                                      
                                      if (dependencyErrors.length > 0) {
                                        // Convert errors to violations format
                                        const violations = dependencyErrors.map((err: string) => ({
                                          message: err,
                                          type: 'FS', // Default type
                                          is_mandatory: true
                                        }));
                                        
                                        console.log('✅ Converting errors to violations:', violations);
                                        setDependencyViolationDialog({
                                          open: true,
                                          violations: violations,
                                          taskId: t._id,
                                          newStatus: statusToSend
                                        });
                                        return;
                                      }
                                    }
                                  }
                                  
                                  // Show regular error message
                                  console.log('❌ No violations found, showing error message');
                                  console.log('Response data keys:', Object.keys(error?.response?.data || {}));
                                  toast.error('Không thể cập nhật trạng thái', {
                                    description: error?.response?.data?.message || 'Vui lòng thử lại'
                                  });
                                }
                              }
                            }}
                              size="small"
                              displayEmpty
                              disabled={isSupervisor}
                            renderValue={(value) => {
                              const statusObj = allStatuses.find(s => s._id === value);
                      const statusName = statusObj?.name || 'Không có trạng thái';
                              return (
                                <Chip 
                                  label={statusName} 
                                  size="small"
                                  sx={{
                                    height: 22,
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    bgcolor: `${getStatusColor(statusName)}15`,
                                    color: getStatusColor(statusName),
                                    border: 'none',
                                  }}
                                />
                              );
                            }}
                              sx={{
                                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                '& .MuiSelect-select': { p: 0 },
                                '&:hover': { bgcolor: isSupervisor ? 'transparent' : '#f3f4f6', borderRadius: 1 },
                                cursor: isSupervisor ? 'default' : 'pointer',
                              }}
                            >
                            {allStatuses.map((s) => (
                              <MenuItem key={s._id} value={s._id}>
                                <Chip 
                                  label={s.name} 
                                  size="small" 
                                  sx={{ 
                                    bgcolor: `${getStatusColor(s.name)}15`, 
                                    color: getStatusColor(s.name), 
                                    fontSize: '11px', 
                                    fontWeight: 600 
                                  }} 
                                />
                              </MenuItem>
                            ))}
                            </Select>
                          </Box>

                          {/* Priority - inline edit */}
                          <Box sx={{ display: { xs: 'none', md: 'block' } }} onClick={(e) => e.stopPropagation()}>
                            <Select
                            value={typeof t.priority === 'object' ? (t.priority as any)?._id : t.priority || ''}
                              onChange={async (e) => {
                                if (!isSupervisor) {
                                e.stopPropagation();
                                try {
                                  await axiosInstance.patch(`/api/tasks/${t._id}`, {
                                  priority: e.target.value || null
                                  });
                                  await loadAll();
                                  toast.success('Đã cập nhật ưu tiên thành công');
                                } catch (error: any) {
                                  console.error('Error updating priority:', error);
                                  toast.error('Không thể cập nhật ưu tiên', {
                                    description: error?.response?.data?.message || 'Vui lòng thử lại'
                                  });
                                  }
                                }
                              }}
                              size="small"
                              displayEmpty
                              disabled={isSupervisor}
                              renderValue={(value) => {
                              if (!value) {
                                  return (
                                    <Typography sx={{ fontSize: '13px', color: '#9ca3af', px: 0.5 }}>
                                      No priority
                                    </Typography>
                                  );
                                }
                              const priorityObj = allPriorities.find(p => p._id === value);
                              const priorityName = priorityObj?.name || '-';
                              const color = priorityName.toLowerCase().includes('critical') || priorityName.toLowerCase().includes('high') ? '#ef4444'
                                : priorityName.toLowerCase().includes('medium') ? '#f59e0b'
                                  : '#3b82f6';
                                return (
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <FlagIcon sx={{ fontSize: 14, color }} />
                                    <Typography sx={{ fontSize: '13px', fontWeight: 500, color }}>
                                    {priorityName}
                                    </Typography>
                                  </Box>
                                );
                              }}
                              sx={{
                                '& .MuiOutlinedInput-notchedOutline': { border: 'none' },
                                '& .MuiSelect-select': { p: 0.5 },
                                '&:hover': { bgcolor: isSupervisor ? 'transparent' : '#f3f4f6', borderRadius: 1 },
                                cursor: isSupervisor ? 'default' : 'pointer',
                              }}
                            >
                              <MenuItem value="">
                                <Typography fontSize="13px" color="text.secondary">No Priority</Typography>
                              </MenuItem>
                            {allPriorities.map((p) => {
                              const color = p.name.toLowerCase().includes('critical') || p.name.toLowerCase().includes('high') ? '#ef4444'
                                : p.name.toLowerCase().includes('medium') ? '#f59e0b'
                                : '#3b82f6';
                              return (
                                <MenuItem key={p._id} value={p._id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <FlagIcon sx={{ fontSize: 14, color }} />
                                    <Typography fontSize="13px" color={color} fontWeight={p.name.toLowerCase().includes('critical') ? 700 : 400}>
                                      {p.name}
                                    </Typography>
                                </Box>
                              </MenuItem>
                              );
                            })}
                            </Select>
                          </Box>

                          {/* Dependencies - inline manage */}
                          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 0.5 }} onClick={(e) => e.stopPropagation()}>
                            {taskDependencies[t._id]?.dependencies?.length > 0 || taskDependencies[t._id]?.dependents?.length > 0 ? (
                              <Tooltip 
                                title={
                          <Box>
                                    {taskDependencies[t._id]?.dependencies?.length > 0 && (
                                      <Box sx={{ mb: 0.5 }}>
                                        <Typography fontSize="10px" fontWeight={700} sx={{ mb: 0.5, color: '#93c5fd' }}>
                                          Đang chờ:
                                        </Typography>
                                        {taskDependencies[t._id].dependencies.map((d: any) => (
                                          <Typography 
                                            key={d._id} 
                                            fontSize="11px" 
                                            sx={{ 
                                              pl: 1,
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap'
                                            }}
                                            title={`[${d.dependency_type}] ${d.depends_on_task_id?.title}${d.lag_days !== 0 ? ` (${d.lag_days > 0 ? '+' : ''}${d.lag_days}d)` : ''}`}
                                          >
                                            • [{d.dependency_type}] {d.depends_on_task_id?.title}
                                            {d.lag_days !== 0 && ` (${d.lag_days > 0 ? '+' : ''}${d.lag_days}d)`}
                                          </Typography>
                                        ))}
                          </Box>
                                    )}
                                    {taskDependencies[t._id]?.dependents?.length > 0 && (
                          <Box>
                                        <Typography fontSize="10px" fontWeight={700} sx={{ mb: 0.5, color: '#fcd34d' }}>
                                          Blocking:
                                        </Typography>
                                        {taskDependencies[t._id].dependents.map((d: any) => (
                                          <Typography 
                                            key={d._id} 
                                            fontSize="11px" 
                                            sx={{ 
                                              pl: 1,
                                              overflow: 'hidden',
                                              textOverflow: 'ellipsis',
                                              whiteSpace: 'nowrap'
                                            }}
                                            title={`[${d.dependency_type}] ${d.task_id?.title}${d.lag_days !== 0 ? ` (${d.lag_days > 0 ? '+' : ''}${d.lag_days}d)` : ''}`}
                                          >
                                            • [{d.dependency_type}] {d.task_id?.title}
                                            {d.lag_days !== 0 && ` (${d.lag_days > 0 ? '+' : ''}${d.lag_days}d)`}
                                          </Typography>
                                        ))}
                          </Box>
                                    )}
                                  </Box>
                                }
                              >
                                <Chip 
                                  icon={<LinkIcon sx={{ fontSize: 12 }} />}
                                  label={
                                    (taskDependencies[t._id]?.dependencies?.length || 0) + 
                                    (taskDependencies[t._id]?.dependents?.length || 0)
                                  }
                                  size="small"
                                  sx={{ 
                                    height: 20,
                                    fontSize: '11px',
                                    bgcolor: '#f0f5ff',
                                    color: '#3b82f6',
                                    fontWeight: 600,
                                    cursor: isSupervisor ? 'default' : 'pointer',
                                    '&:hover': { bgcolor: isSupervisor ? '#f0f5ff' : '#dbeafe' }
                                  }}
                                  onClick={(e) => {
                                    if (!isSupervisor) {
                                    e.stopPropagation();
                                    setDependencyTaskId(t._id);
                                    loadTaskDependencies(t._id);
                                    setOpenDependencyDialog(true);
                                    }
                                  }}
                                />
                              </Tooltip>
                            ) : (
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  if (!isSupervisor) {
                                  e.stopPropagation();
                                  setDependencyTaskId(t._id);
                                  loadTaskDependencies(t._id);
                                  setOpenDependencyDialog(true);
                                  }
                                }}
                                disabled={isSupervisor}
                                sx={{ 
                                  color: '#9ca3af',
                                  '&:hover': { 
                                    color: isSupervisor ? '#9ca3af' : '#7b68ee',
                                    bgcolor: isSupervisor ? 'transparent' : '#f3f4f6' 
                                  }
                                }}
                              >
                                <LinkIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            )}
                          </Box>

                          {/* Action buttons */}
                          <Box 
                            sx={{ 
                              display: { xs: 'none', md: 'flex' }, 
                              alignItems: 'center', 
                              gap: 0.5,
                              justifyContent: 'flex-end'
                            }} 
                            onClick={(e) => e.stopPropagation()}
                          >
                            {!isSupervisor && (
                              <Tooltip title="Xóa task">
                                <IconButton
                                  size="small"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    if (confirm(`Bạn có chắc muốn xóa task "${t.title}"?`)) {
                                      await deleteTask(t._id);
                                    }
                                  }}
                                  sx={{ 
                                    color: '#ef4444',
                                    '&:hover': { 
                                      color: '#dc2626',
                                      bgcolor: '#fef2f2' 
                                    }
                                  }}
                                >
                                  <DeleteIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>

                        </Box>

                        {/* Subtasks - rendered below parent task with indentation */}
                        {/* Only render subtasks if t is a parent task (not a subtask itself) */}                        {/* Subtasks removed */}
                      </Fragment>
                      );
                    })}

                    {/* ClickUp-style Add Task inline */}
                    {!collapsedGroups[statusName] && !isSupervisor && (
                      <Box 
                        sx={{ 
                          px: 3, 
                          py: 1.25, 
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          borderBottom: '1px solid #f3f4f6',
                          '&:hover': {
                            bgcolor: '#fafbfc'
                          }
                        }}
                      >
                        <IconButton size="small" sx={{ color: '#9ca3af' }}>
                          <AddIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                        <Button 
                          variant="text" 
                          onClick={openCreate}
                          sx={{
                            color: '#9ca3af',
                            fontSize: '13px',
                            fontWeight: 500,
                            textTransform: 'none',
                            '&:hover': {
                              color: '#7b68ee',
                              bgcolor: 'transparent'
                            },
                          }}
                        >
                          Thêm công việc
                        </Button>
                      </Box>
                    )}
                  </Box>
                ))}

                {Object.keys(groupedByStatus).length === 0 && (
                  <Box sx={{ py: 16, textAlign: 'center', bgcolor: 'white' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#6b7280' }}>
                      Chưa có công việc nào
                    </Typography>
                    {!isSupervisor && (
                      <>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                          Tạo công việc đầu tiên để bắt đầu
                        </Typography>
                        <Button 
                          variant="contained" 
                          startIcon={<AddIcon />} 
                          onClick={openCreate}
                          sx={{
                            bgcolor: '#7b68ee',
                            textTransform: 'none',
                            fontWeight: 600,
                            px: 3,
                            py: 1,
                            borderRadius: 1.5,
                            boxShadow: 'none',
                            '&:hover': {
                              bgcolor: '#6952d6',
                            },
                          }}
                        >
                          Tạo công việc
                        </Button>
                      </>
                    )}
                  </Box>
                )}
              </Box>
              </Box>
          )}

          {/* Kanban Board View */}
          {view === "kanban" && (
            <Box sx={{ 
              p: 3,
              bgcolor: '#f8f9fb',
              minHeight: 'calc(100vh - 300px)',
              overflow: 'auto'
            }}>
              {/* Kanban Columns Container */}
              <Box sx={{ 
                display: 'flex',
                gap: 2,
                pb: 3,
                minWidth: 'fit-content'
              }}>
                {Object.entries(groupedByStatus).map(([statusName, tasks]) => (
                  <Box 
                    key={statusName}
                    sx={{ 
                      minWidth: 320,
                      maxWidth: 320,
                      bgcolor: '#ffffff',
                      borderRadius: 3,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      maxHeight: 'calc(100vh - 340px)'
                    }}
                  >
                    {/* Column Header */}
                    <Box sx={{ 
                      p: 2,
                      borderBottom: '2px solid',
                      borderColor: getStatusColor(statusName),
                    }}>
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Typography fontWeight={700} fontSize="14px" color="text.primary">
                            {statusName}
                          </Typography>
                          <Chip 
                            label={tasks.length} 
                            size="small" 
                            sx={{ 
                              height: 20,
                              minWidth: 28,
                              fontSize: '11px',
                              fontWeight: 700,
                              bgcolor: `${getStatusColor(statusName)}15`,
                              color: getStatusColor(statusName),
                            }} 
                          />
                        </Stack>
                        {!isSupervisor && (
                          <IconButton size="small" onClick={openCreate} sx={{ color: '#6b7280' }}>
                            <AddIcon sx={{ fontSize: 18 }} />
                          </IconButton>
                        )}
                      </Stack>
              </Box>

                    {/* Cards Container - Scrollable */}
                    <Box sx={{ 
                      flex: 1,
                      overflow: 'auto',
                      p: 2,
                      '&::-webkit-scrollbar': {
                        width: '6px'
                      },
                      '&::-webkit-scrollbar-thumb': {
                        bgcolor: '#d1d5db',
                        borderRadius: '3px'
                      }
                    }}>
                      <Stack spacing={1.5}>
                        {tasks.map((task) => {
                          const assigneeName = typeof task.assignee_id === 'object' 
                            ? task.assignee_id?.full_name || task.assignee_id?.email 
                            : '';
                          const assigneeInitials = assigneeName 
                            ? assigneeName.split(' ').map((part: string) => part[0]).join('').slice(0, 2).toUpperCase() 
                            : '';
                          const priorityName = typeof task.priority === 'object' ? (task.priority as any)?.name : task.priority;
                          const isOverdue = task.deadline 
                            ? new Date(task.deadline).getTime() < Date.now() && String(task.status).toLowerCase() !== 'completed'
                            : false;

                          return (
                            <Box
                              key={task._id}
                              onClick={() => openTaskDetailsModal(task._id)}
                              sx={{
                                bgcolor: 'white',
                                border: '1px solid #e8e9eb',
                                borderRadius: 2,
                                p: 2,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                '&:hover': {
                                  boxShadow: '0 4px 12px rgba(123,104,238,0.15)',
                                  borderColor: '#7b68ee',
                                  transform: 'translateY(-2px)'
                                }
                              }}
                            >
                              {/* Task Title */}
                              <Typography 
                                fontSize="14px" 
                                fontWeight={600} 
                                sx={{ 
                                  mb: 1.5,
                                  color: '#1f2937',
                                  lineHeight: 1.4,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}
                              >
                                {task.title}
                              </Typography>

                              {/* Meta Info Row 1 - Priority & Due Date */}
                              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" gap={0.5}>
                                {priorityName && (
                                  <Chip
                                    icon={<FlagIcon sx={{ fontSize: 12 }} />}
                                    label={priorityName}
                                    size="small"
                                    sx={{
                                      height: 22,
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      bgcolor: `${getPriorityColor(priorityName)}15`,
                                      color: getPriorityColor(priorityName),
                                      border: `1px solid ${getPriorityColor(priorityName)}40`,
                                      '& .MuiChip-icon': {
                                        color: 'inherit'
                                      }
                                    }}
                                  />
                                )}
                                {task.deadline && (
                                  <Chip
                                    icon={<CalendarMonthIcon sx={{ fontSize: 12 }} />}
                                    label={new Date(task.deadline).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric' 
                                    })}
                                    size="small"
                                    sx={{
                                      height: 22,
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      bgcolor: isOverdue ? '#fef3c7' : '#f3f4f6',
                                      color: isOverdue ? '#92400e' : '#6b7280',
                                      border: isOverdue ? '1px solid #fbbf24' : '1px solid #e8e9eb',
                                      '& .MuiChip-icon': {
                                        color: 'inherit'
                                      }
                                    }}
                                  />
                                )}
                                {(() => {
                                  // Try to get feature from task.feature_id first, then from function_id.feature_id
                                  let featureId: string | null = null;
                                  let featureTitle: string | null = null;
                                  
                                  if (task.feature_id) {
                                    featureId = typeof task.feature_id === 'object' ? (task.feature_id as any)?._id : task.feature_id;
                                    featureTitle = typeof task.feature_id === 'object' 
                                      ? (task.feature_id as any)?.title 
                                      : (featureId ? allFeatures.find(f => String(f._id) === String(featureId))?.title : null);
                                  } else if ((task as any).function_id && typeof (task as any).function_id === 'object') {
                                    const func = (task as any).function_id;
                                    if (func.feature_id) {
                                      featureId = typeof func.feature_id === 'object' ? func.feature_id._id : func.feature_id;
                                      featureTitle = typeof func.feature_id === 'object' 
                                        ? func.feature_id.title 
                                        : (featureId ? allFeatures.find(f => String(f._id) === String(featureId))?.title : null);
                                    }
                                  }
                                  
                                  if (!featureId || !featureTitle) return null;
                                  
                                  return (
                                    <Chip
                                      label={`⚡ ${featureTitle}`}
                                      size="small"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        router.push(`/projects/${projectId}/features`);
                                      }}
                                      sx={{
                                        height: 22,
                                        maxWidth: 200,
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        bgcolor: '#dbeafe',
                                        color: '#1e40af',
                                        border: '1px solid #93c5fd',
                                        cursor: 'pointer',
                                        '& .MuiChip-label': {
                                          px: 0.75,
                                          overflow: 'hidden',
                                          textOverflow: 'ellipsis',
                                          whiteSpace: 'nowrap',
                                        },
                                        '&:hover': {
                                          bgcolor: '#bfdbfe',
                                          transform: 'scale(1.05)',
                                        },
                                        transition: 'all 0.2s',
                                      }}
                                    />
                                  );
                                })()}
                              </Stack>


                              {/* Bottom Row - Assignee & Indicators */}
                              <Stack direction="row" alignItems="center" justifyContent="space-between">
                                {/* Assignee Avatar & Name */}
                                {assigneeName ? (
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <Tooltip title={assigneeName}>
                                      <Avatar 
                                        sx={{ 
                                          width: 28, 
                                          height: 28, 
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          bgcolor: '#7b68ee',
                                          flexShrink: 0
                                        }}
                                      >
                                        {assigneeInitials}
                                      </Avatar>
                                    </Tooltip>
                                    <Typography 
                                      fontSize="12px" 
                                      fontWeight={500}
                                      color="text.secondary"
                                      sx={{
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                        maxWidth: '120px'
                                      }}
                                      title={assigneeName}
                                    >
                                      {assigneeName}
                                    </Typography>
                                  </Stack>
                                ) : (
                                  <Stack direction="row" alignItems="center" spacing={1}>
                                    <Avatar 
                                      sx={{ 
                                        width: 28, 
                                        height: 28, 
                                        bgcolor: '#e5e7eb',
                                        color: '#9ca3af',
                                        flexShrink: 0
                                      }}
                                    >
                                      <PersonIcon sx={{ fontSize: 16 }} />
                                    </Avatar>
                                    <Typography fontSize="12px" color="text.secondary" fontStyle="italic">
                                      Chưa giao
                                    </Typography>
                                  </Stack>
                                )}

                                {/* Indicators */}
                                <Stack direction="row" spacing={0.5} alignItems="center">
                                  {/* Dependencies indicator */}
                                  {(taskDependencies[task._id]?.dependencies?.length > 0 || 
                                    taskDependencies[task._id]?.dependents?.length > 0) && (
                                    <Tooltip title="Có ràng buộc phụ thuộc">
                                      <IconButton size="small" sx={{ color: '#3b82f6', p: 0.25 }}>
                                        <LinkIcon sx={{ fontSize: 14 }} />
                                      </IconButton>
                                    </Tooltip>
                                  )}

                                  {/* Time estimate */}
                                  {task.estimate && (
                                    <Tooltip title={`${task.estimate}h ước tính`}>
                                      <IconButton size="small" sx={{ color: '#6b7280', p: 0.25 }}>
                                        <AccessTimeIcon sx={{ fontSize: 14 }} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </Stack>
                              </Stack>
                            </Box>
                          );
                        })}

                        {/* Add Card Button */}
                        <Button
                          fullWidth
                          startIcon={<AddIcon />}
                          onClick={openCreate}
                          sx={{
                            py: 1.5,
                            borderRadius: 2,
                            border: '2px dashed #e8e9eb',
                            bgcolor: 'transparent',
                            color: '#9ca3af',
                            fontSize: '13px',
                            fontWeight: 600,
                            textTransform: 'none',
                            '&:hover': {
                              borderColor: '#7b68ee',
                              bgcolor: '#f5f3ff',
                              color: '#7b68ee'
                            }
                          }}
                        >
                          Thêm công việc
                        </Button>
                      </Stack>
                    </Box>
                  </Box>
                ))}

                {Object.keys(groupedByStatus).length === 0 && (
                  <Box sx={{ 
                    width: '100%', 
                    py: 16, 
                    textAlign: 'center',
                    bgcolor: 'white',
                    borderRadius: 3
                  }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#6b7280' }}>
                      Chưa có công việc nào
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Hãy tạo công việc đầu tiên để bắt đầu
                    </Typography>
                    <Button 
                      variant="contained" 
                      startIcon={<AddIcon />}
                      onClick={openCreate}
                      sx={{
                        bgcolor: '#7b68ee',
                        '&:hover': { bgcolor: '#6952d6' }
                      }}
                    >
                      Tạo công việc
                    </Button>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Calendar View */}
          {view === "calendar" && (
            <Box sx={{ p: 3, bgcolor: 'white', minHeight: 'calc(100vh - 300px)' }}>
              {/* Calendar Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <IconButton 
                    onClick={() => {
                      const newDate = new Date(calendarDate);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setCalendarDate(newDate);
                    }}
                    sx={{ 
                      color: '#6b7280',
                      '&:hover': { bgcolor: '#f3f4f6' }
                    }}
                  >
                    <ChevronRightIcon sx={{ transform: 'rotate(180deg)' }} />
                  </IconButton>
                  <Typography variant="h6" fontWeight={700} sx={{ minWidth: 200, textAlign: 'center' }}>
                    {calendarDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                  </Typography>
                  <IconButton 
                    onClick={() => {
                      const newDate = new Date(calendarDate);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setCalendarDate(newDate);
                    }}
                    sx={{ 
                      color: '#6b7280',
                      '&:hover': { bgcolor: '#f3f4f6' }
                    }}
                  >
                    <ChevronRightIcon />
                  </IconButton>
                  <Button 
                    size="small" 
                    variant="outlined"
                    onClick={() => {
                      setCalendarDate(new Date());
                    }}
                    sx={{ 
                      textTransform: 'none', 
                      fontWeight: 600,
                      borderColor: '#7b68ee',
                      color: '#7b68ee',
                      '&:hover': {
                        borderColor: '#6952d6',
                        bgcolor: '#f5f3ff'
                      }
                    }}
                  >
                    Hôm nay
                  </Button>
                </Stack>
              </Box>

              {/* Calendar Grid */}
              <Box sx={{ border: '1px solid #e8e9eb', borderRadius: 2, overflow: 'hidden' }}>
                {/* Weekday Headers */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  bgcolor: '#f8f9fb',
                  borderBottom: '2px solid #e8e9eb'
                }}>
                  {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map((day) => (
                    <Box 
                      key={day}
                      sx={{ 
                        p: 1.5, 
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '13px',
                        color: '#6b7280'
                      }}
                    >
                      {day}
                    </Box>
                  ))}
                </Box>

                {/* Calendar Days Grid */}
                <Box sx={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  gridTemplateRows: 'repeat(5, 1fr)'
                }}>
                  {Array.from({ length: 35 }, (_, i) => {
                    const today = new Date();
                    const firstDay = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
                    const startingDayOfWeek = firstDay.getDay();
                    const currentDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), i - startingDayOfWeek + 1);
                    const isCurrentMonth = currentDate.getMonth() === calendarDate.getMonth();
                    const isToday = currentDate.toDateString() === today.toDateString();
                    
                    // Get tasks for this date
                    const dayTasks = tasks.filter(task => {
                      if (!task.deadline) return false;
                      const taskDate = new Date(task.deadline);
                      return taskDate.toDateString() === currentDate.toDateString();
                    });

                    return (
                      <Box
                        key={i}
                        sx={{
                          minHeight: 120,
                          p: 1,
                          borderRight: '1px solid #e8e9eb',
                          borderBottom: '1px solid #e8e9eb',
                          bgcolor: !isCurrentMonth ? '#fafbfc' : 'white',
                          '&:hover': { bgcolor: '#f9fafb' },
                          cursor: 'pointer'
                        }}
                      >
                        {/* Date Number */}
                        <Box sx={{ mb: 1 }}>
                          <Typography
                            sx={{
                              fontSize: '13px',
                              fontWeight: isToday ? 700 : 600,
                              color: !isCurrentMonth ? '#9ca3af' : isToday ? 'white' : '#374151',
                              width: 24,
                              height: 24,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              borderRadius: '50%',
                              bgcolor: isToday ? '#7b68ee' : 'transparent'
                            }}
                          >
                            {currentDate.getDate()}
                          </Typography>
                        </Box>

                        {/* Task Pills */}
                        <Stack spacing={0.5}>
                          {dayTasks.slice(0, 3).map((task) => (
                            <Box
                              key={task._id}
                              onClick={(e) => {
                                e.stopPropagation();
                                openTaskDetailsModal(task._id);
                              }}
                              sx={{
                                px: 1,
                                py: 0.5,
                                bgcolor: `${getStatusColor(typeof task.status === 'object' ? (task.status as any)?.name : task.status)}15`,
                                borderLeft: `3px solid ${getStatusColor(typeof task.status === 'object' ? (task.status as any)?.name : task.status)}`,
                                borderRadius: 1,
                                cursor: 'pointer',
                                '&:hover': {
                                  bgcolor: `${getStatusColor(typeof task.status === 'object' ? (task.status as any)?.name : task.status)}25`,
                                }
                              }}
                            >
                              <Typography
                                fontSize="11px"
                                fontWeight={600}
                                sx={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  color: '#1f2937'
                                }}
                              >
                                {task.title}
                              </Typography>
                            </Box>
                          ))}
                          {dayTasks.length > 3 && (
                            <Typography fontSize="10px" color="text.secondary" sx={{ pl: 1 }}>
                              +{dayTasks.length - 3} more
                            </Typography>
                          )}
                        </Stack>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          )}

          {/* ClickUp Gantt Chart View */}
          {view === "gantt" && (
            <Box sx={{ height: 'calc(100vh - 250px)', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {ganttHierarchyLoading ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'white', borderRadius: 2 }}>
                  <CircularProgress />
                </Box>
              ) : ganttHierarchyError ? (
                <Alert severity="error">{ganttHierarchyError}</Alert>
              ) : !ganttProjectData ? (
                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'white', borderRadius: 2, color: '#94a3b8' }}>
                  Không có dữ liệu milestone/feature/function cho dự án này.
                </Box>
              ) : (
                <>
                  <Box sx={{ bgcolor: 'white', p: 2, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                    <GanttFilter milestones={ganttProjectData.milestones} onFilterChange={handleGanttFilterChange} />
                  </Box>
                  {ganttTasksLoading ? (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'white', borderRadius: 2 }}>
                      Đang tải dữ liệu Gantt...
                    </Box>
                  ) : ganttTasksError ? (
                    <Alert severity="error">{ganttTasksError}</Alert>
                  ) : ganttTasks.length > 0 ? (
                    <Box sx={{ flex: 1 }}>
                      <DHtmlxGanttChart
                        tasks={ganttTasks}
                        dependencies={ganttDependencies}
                        onTaskClick={openTaskDetailsModal}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'white', borderRadius: 2, color: '#94a3b8' }}>
                      Không có task phù hợp với bộ lọc hiện tại.
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}

          {/* Dialog - Tạo/Sửa Task */}
          <Dialog 
            open={openDialog} 
            onClose={() => setOpenDialog(false)} 
            maxWidth="lg" 
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3,
                boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                bgcolor: '#fafbfc'
              }
            }}
          >
            <DialogTitle sx={{ fontWeight: 'bold' }}>
              {editing ? 'Cập nhật Task - Lên Kế Hoạch' : 'Tạo Task Mới - Lên Kế Hoạch'}
              <Box component="span" sx={{ display: 'block', fontSize: '0.75rem', color: 'text.secondary', fontWeight: 'normal', mt: 0.5 }}>
                {editing ? 'Cập nhật thông tin task trong dự án' : 'Thêm task mới vào dự án'}
              </Box>
            </DialogTitle>
            <DialogContent sx={{ p: 4 }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 4 }}>
                {/* Left Column - Main Info */}
              <Stack spacing={3}>
                  {/* Section: Basic Info */}
                  <Box>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 2, 
                        fontWeight: 700, 
                        color: '#374151',
                        fontSize: '13px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <Box sx={{ width: 4, height: 16, bgcolor: '#667eea', borderRadius: 1 }} />
                      Thông tin cơ bản
                    </Typography>
                    <Stack spacing={2.5}>
                <TextField 
                        label="Tên công việc *" 
                  value={form.title} 
                  onChange={(e) => setForm({ ...form, title: e.target.value })} 
                  fullWidth 
                        required
                        placeholder="Nhập tên công việc..."
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                            bgcolor: 'white',
                            borderRadius: 2,
                      '&:hover': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: '#667eea'
                        }
                            },
                            '&.Mui-focused': {
                              '& .MuiOutlinedInput-notchedOutline': {
                                borderColor: '#667eea',
                                borderWidth: 2
                        }
                      }
                    } 
                  }}
                />
                <TextField 
                        label="Mô tả" 
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  fullWidth 
                  multiline 
                  rows={4} 
                        placeholder="Nhập mô tả chi tiết..."
                  sx={{ 
                    '& .MuiOutlinedInput-root': { 
                            bgcolor: 'white',
                            borderRadius: 2
                    } 
                  }}
                />
                    </Stack>
                  </Box>
                
                  {/* Section: Timeline */}
                <Box>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 2, 
                        fontWeight: 700, 
                        color: '#374151',
                        fontSize: '13px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <Box sx={{ width: 4, height: 16, bgcolor: '#10b981', borderRadius: 1 }} />
                      Thời gian & Effort
                  </Typography>
                    <Stack spacing={2.5}>
                    <TextField 
                      type="date" 
                      label="Ngày bắt đầu" 
                      InputLabelProps={{ shrink: true }} 
                      value={form.start_date} 
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })} 
                      fullWidth 
                        sx={{ 
                          '& .MuiOutlinedInput-root': { 
                            bgcolor: 'white',
                            borderRadius: 2 
                          } 
                        }}
                    />
                    <TextField 
                      type="date" 
                        label="Deadline *" 
                      InputLabelProps={{ shrink: true }} 
                      value={form.deadline} 
                      onChange={(e) => setForm({ ...form, deadline: e.target.value })} 
                      fullWidth 
                        sx={{ 
                          '& .MuiOutlinedInput-root': { 
                            bgcolor: 'white',
                            borderRadius: 2 
                          } 
                        }}
                    />
                    <TextField 
                      type="number" 
                      label="Estimate (giờ) *" 
                      value={form.estimate} 
                      onChange={(e) => setForm({ ...form, estimate: Number(e.target.value) })} 
                      fullWidth 
                        placeholder="0"
                        InputProps={{
                          startAdornment: (
                            <Box sx={{ mr: 1, color: '#9ca3af' }}>
                              <AccessTimeIcon sx={{ fontSize: 20 }} />
                            </Box>
                          )
                        }}
                        inputProps={{ min: 0, step: 0.5 }}
                        required
                        sx={{ 
                          '& .MuiOutlinedInput-root': { 
                            bgcolor: 'white',
                            borderRadius: 2 
                          } 
                        }}
                    />
                </Stack>
                </Box>
                </Stack>

                {/* Right Column - Settings & Links */}
                <Stack spacing={3}>
                  {/* Section: Status & Assignment */}
                <Box>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 2, 
                        fontWeight: 700, 
                        color: '#374151',
                        fontSize: '13px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <Box sx={{ width: 4, height: 16, bgcolor: '#f59e0b', borderRadius: 1 }} />
                      Trạng thái & Phân công
                  </Typography>
                    <Stack spacing={2.5}>
                      <FormControl fullWidth>
                        <InputLabel>Trạng thái</InputLabel>
                        <Select 
                          value={form.status} 
                          label="Trạng thái" 
                          onChange={(e) => setForm({ ...form, status: e.target.value })}
                          sx={{ 
                            bgcolor: 'white',
                            borderRadius: 2,
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#e5e7eb'
                            }
                          }}
                        >
                          <MenuItem value=""><em>Chọn trạng thái</em></MenuItem>
                        {statuses.map((s) => (
                            <MenuItem key={s._id} value={s._id}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ 
                                  width: 10, 
                                  height: 10, 
                                  borderRadius: '50%', 
                                  bgcolor: getStatusColor(s.name),
                                  boxShadow: `0 0 0 2px ${getStatusColor(s.name)}20`
                                }} />
                                <Typography fontSize="14px" fontWeight={500}>{s.name}</Typography>
                            </Box>
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                      
                      <FormControl fullWidth>
                        <InputLabel>Ưu tiên</InputLabel>
                        <Select 
                          value={form.priority} 
                          label="Ưu tiên" 
                          onChange={(e) => setForm({ ...form, priority: e.target.value })}
                          sx={{ 
                            bgcolor: 'white',
                            borderRadius: 2 
                          }}
                        >
                          <MenuItem value=""><em>Chọn mức ưu tiên</em></MenuItem>
                        {priorities.map((p) => (
                            <MenuItem key={p._id} value={p._id}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <FlagIcon sx={{ 
                                  fontSize: 16, 
                                  color: p.name.toLowerCase().includes('critical') || p.name.toLowerCase().includes('high') 
                                    ? '#ef4444' 
                                    : p.name.toLowerCase().includes('medium')
                                    ? '#f59e0b'
                                    : '#6b7280'
                                }} />
                                <Typography fontSize="14px" fontWeight={500}>{p.name}</Typography>
                            </Box>
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                      
                      <FormControl fullWidth>
                        <InputLabel>Người thực hiện</InputLabel>
                        <Select 
                          value={form.assignee} 
                          label="Người thực hiện" 
                          onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                          sx={{ 
                            bgcolor: 'white',
                            borderRadius: 2 
                          }}
                        >
                      <MenuItem value=""><em>Chưa gán</em></MenuItem>
                      {teamMembers.map((member, idx) => {
                        const userId = member.user_id?._id || member._id;
                        const userName = member.user_id?.full_name || member.full_name || member.user_id?.email || member.email || 'Không rõ';
                        return (
                          <MenuItem key={userId || idx} value={userId}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                  <Avatar sx={{ 
                                    width: 28, 
                                    height: 28, 
                                    bgcolor: '#667eea', 
                                    fontSize: '12px',
                                    fontWeight: 600
                                  }}>
                                {userName.charAt(0).toUpperCase()}
                              </Avatar>
                                  <Typography fontSize="14px" fontWeight={500}>{userName}</Typography>
                            </Box>
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>
                </Stack>
                </Box>

                  {/* Section: Links */}
                <Box>
                    <Typography 
                      variant="subtitle2" 
                      sx={{ 
                        mb: 2, 
                        fontWeight: 700, 
                        color: '#374151',
                        fontSize: '13px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1
                      }}
                    >
                      <Box sx={{ width: 4, height: 16, bgcolor: '#8b5cf6', borderRadius: 1 }} />
                      Liên kết Project
                  </Typography>
                    <Stack spacing={2.5}>
                      <FormControl fullWidth required>
                        <InputLabel>Tính năng *</InputLabel>
                        <Select 
                          value={form.feature_id} 
                          label="Tính năng *" 
                          onChange={(e) => setForm({ ...form, feature_id: e.target.value })}
                          sx={{ 
                            bgcolor: 'white',
                            borderRadius: 2 
                          }}
                        >
                          <MenuItem value=""><em>Chọn tính năng</em></MenuItem>
                          {features.map((f) => (
                            <MenuItem key={f.id} value={f.id}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ 
                                  width: 8, 
                                  height: 8, 
                                  borderRadius: '50%', 
                                  bgcolor: '#3b82f6' 
                                }} />
                                <Typography fontSize="14px" fontWeight={500}>{f.title}</Typography>
                              </Box>
                            </MenuItem>
                          ))}
                    </Select>
                  </FormControl>
                      
                      <FormControl fullWidth>
                        <InputLabel>Chức năng</InputLabel>
                  <Select 
                    value={form.function_id} 
                          label="Chức năng" 
                    onChange={(e) => setForm({ ...form, function_id: e.target.value })}
                    disabled={!form.feature_id}
                          sx={{ 
                            bgcolor: form.feature_id ? 'white' : '#f9fafb',
                            borderRadius: 2 
                          }}
                  >
                    <MenuItem value=""><em>Không chọn</em></MenuItem>
                          {(Array.isArray(formFunctions) ? formFunctions : []).map((fn) => (
                            <MenuItem key={fn._id} value={fn._id}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box sx={{ 
                                  width: 8, 
                                  height: 8, 
                                  borderRadius: '50%', 
                                  bgcolor: '#8b5cf6' 
                                }} />
                                <Typography fontSize="14px" fontWeight={500}>{fn.title}</Typography>
                              </Box>
                            </MenuItem>
                          ))}
                  </Select>
                
                </FormControl>
                    </Stack>
                </Box>
              </Stack>
              </Box>
            </DialogContent>
            <DialogActions sx={{ 
              px: 3, 
              py: 2.5, 
              borderTop: '1px solid #e8e9eb',
              background: '#fafbff',
              gap: 1.5,
              justifyContent: 'space-between'
            }}>
              <Typography variant="caption" sx={{ color: '#9ca3af', fontSize: '12px' }}>
                * Trường bắt buộc
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button 
                  onClick={() => setOpenDialog(false)}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    color: '#6b7280',
                    px: 3,
                    py: 1,
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#f3f4f6' }
                  }}
                >
                  Hủy
                </Button>
                <Button 
                  variant="contained" 
                  onClick={saveTask}
                  disabled={!form.title || !form.feature_id}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    background: 'linear-gradient(135deg, #7b68ee, #9b59b6)',
                    px: 3,
                    py: 1,
                    borderRadius: 2,
                    boxShadow: '0 4px 12px rgba(123, 104, 238, 0.3)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #6b5dd6, #8b49a6)',
                      boxShadow: '0 6px 16px rgba(123, 104, 238, 0.4)',
                      transform: 'translateY(-1px)',
                    },
                    '&:disabled': {
                      background: '#e5e7eb',
                      color: '#9ca3af',
                      boxShadow: 'none',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  {editing ? "💾 Cập nhật" : "✨ Tạo Task"}
                </Button>
              </Box>
            </DialogActions>
          </Dialog>

          {/* Task Details Modal */}
          <TaskDetailsModal 
            open={openTaskDetails}
            taskId={selectedTaskId}
            projectId={projectId}
            readonly={isSupervisor}
            onClose={() => {
              setOpenTaskDetails(false);
              setSelectedTaskId(null);
            }}
            onUpdate={loadAll}
          />

          {/* Dependency Date Conflict Dialog */}
          {showConflictDialog && conflictViolation && (
            <DependencyDateConflictDialog
              open={showConflictDialog}
              onClose={() => {
                setShowConflictDialog(false);
                setConflictViolation(null);
                setPendingDependencyData(null);
              }}
              onAutoFix={handleAutoFixDependency}
              onManualEdit={handleManualEditDependency}
              violation={conflictViolation}
              taskTitle={currentTaskForDependency?.title}
              predecessorTitle={tasks.find(t => t._id === pendingDependencyData?.dependsOnTaskId)?.title}
            />
          )}

          {/* Dependency Violation Warning Dialog */}
          <Dialog
            open={dependencyViolationDialog.open}
            onClose={() => setDependencyViolationDialog({ open: false, violations: [], taskId: '', newStatus: '' })}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: { borderRadius: 3 }
            }}
          >
            <DialogTitle sx={{ fontWeight: 700, pb: 2, bgcolor: '#fef3c7', color: '#92400e' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ 
                  width: 40, 
                  height: 40, 
                  borderRadius: '50%', 
                  bgcolor: '#fbbf24', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  color: 'white',
                  fontSize: '20px'
                }}>
                  ⚠️
                </Box>
                <Typography variant="h6" fontWeight={700}>Xung đột phụ thuộc</Typography>
              </Box>
            </DialogTitle>
            <DialogContent sx={{ pt: 3 }}>
              <Typography variant="body1" sx={{ mb: 2, fontWeight: 500 }}>
                Không thể đổi trạng thái vì các ràng buộc phụ thuộc sau:
              </Typography>
              
              <Stack spacing={1.5}>
                {dependencyViolationDialog.violations.map((violation, index) => (
                  <Box 
                    key={index}
                    sx={{ 
                      p: 2, 
                      bgcolor: '#fffbeb',
                      border: '1px solid #fcd34d',
                      borderRadius: 2,
                      borderLeft: '4px solid #f59e0b'
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Chip 
                        label={violation.type || violation.dependency_type || 'FS'}
                        size="small"
                        sx={{ 
                          height: 20,
                          fontSize: '10px',
                          fontWeight: 700,
                          bgcolor: '#fbbf24',
                          color: 'white'
                        }}
                      />
                      <Typography variant="caption" fontWeight={600} color="text.secondary">
                        {(violation.type || violation.dependency_type || 'FS') === 'FS' && 'Hoàn thành trước - Bắt đầu (FS)'}
                        {(violation.type || violation.dependency_type || 'FS') === 'FF' && 'Hoàn thành đồng thời (FF)'}
                        {(violation.type || violation.dependency_type || 'FS') === 'SS' && 'Bắt đầu song song (SS)'}
                        {(violation.type || violation.dependency_type || 'FS') === 'SF' && 'Bắt đầu - Hoàn thành (SF)'}
                      </Typography>
                    </Box>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {violation.message}
                    </Typography>
                  </Box>
                ))}
              </Stack>

              <Box sx={{ mt: 3, p: 2, bgcolor: '#f3f4f6', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'start', gap: 1 }}>
                  <span style={{ fontSize: '16px' }}>💡</span>
                  <span>
                    <strong>Lựa chọn:</strong><br/>
                    • Hoàn thành các công việc đang chặn trước
                    {dependencyViolationDialog.violations.some((v: any) => !v.is_mandatory) && (
                      <><br/>• Chọn "Vẫn cập nhật cưỡng bức" để bỏ qua các phụ thuộc tùy chọn (không khuyến khích)</>
                    )}
                    {dependencyViolationDialog.violations.every((v: any) => v.is_mandatory) && (
                      <><br/>• ❌ Không thể cập nhật cưỡng bức - tất cả phụ thuộc đều <strong>bắt buộc</strong></>
                    )}
                  </span>
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 2 }}>
              <Button 
                onClick={() => setDependencyViolationDialog({ open: false, violations: [], taskId: '', newStatus: '' })}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 600,
                  color: 'text.secondary'
                }}
              >
                Hủy
              </Button>
              {/* Only show Force Update button if there are non-mandatory violations */}
              {dependencyViolationDialog.violations.some((v: any) => !v.is_mandatory) && (
                <Button
                  variant="contained"
                  color="warning"
                  onClick={async () => {
                    try {
                      // Force update with force_update flag
                      await axiosInstance.patch(`/api/tasks/${dependencyViolationDialog.taskId}`, {
                        status: dependencyViolationDialog.newStatus,
                        force_update: true
                      });
                      await loadAll();
                      setDependencyViolationDialog({ open: false, violations: [], taskId: '', newStatus: '' });
                    } catch (error: any) {
                      setError(error?.response?.data?.message || 'Không thể cập nhật status');
                      setDependencyViolationDialog({ open: false, violations: [], taskId: '', newStatus: '' });
                    }
                  }}
                  sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    bgcolor: '#f59e0b',
                    '&:hover': { bgcolor: '#d97706' }
                  }}
                >
                  ⚡ Vẫn cập nhật cưỡng bức
                </Button>
              )}
            </DialogActions>
          </Dialog>

          {/* Dependencies Dialog */}
          <Dialog 
            open={openDependencyDialog} 
            onClose={() => {
              setOpenDependencyDialog(false);
              setDependencyTaskId(null);
            }}
            maxWidth="md" 
            fullWidth
            PaperProps={{
              sx: { borderRadius: 3 }
            }}
          >
            <DialogTitle sx={{ fontWeight: 700, pb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinkIcon sx={{ color: '#7b68ee' }} />
                Phụ thuộc công việc
              </Box>
            </DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 1 }}>
                {/* Current Task Info */}
                {dependencyTaskId && (
                  <Box sx={{ p: 2, bgcolor: '#f8f9fb', borderRadius: 2 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      Đang quản lý phụ thuộc cho:
                    </Typography>
                    <Typography 
                      variant="h6" 
                      fontWeight={600}
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                      title={tasks.find(t => t._id === dependencyTaskId)?.title}
                    >
                      {tasks.find(t => t._id === dependencyTaskId)?.title}
                    </Typography>
                  </Box>
                )}

                {/* Dependencies (tasks this task depends on) */}
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BlockIcon sx={{ fontSize: 18, color: '#ef4444' }} />
                      Đang chờ (bị chặn bởi)
                    </Typography>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setDependencyForm({ depends_on_task_id: '', dependency_type: 'FS', lag_days: 0, is_mandatory: true, notes: '' });
                      }}
                      sx={{ 
                        textTransform: 'none',
                        fontSize: '13px',
                        fontWeight: 600,
                      }}
                    >
                      Thêm
                    </Button>
                  </Box>

                  {taskDependencies[dependencyTaskId || '']?.dependencies?.length > 0 ? (
                    <Stack spacing={1}>
                      {taskDependencies[dependencyTaskId || ''].dependencies.map((dep: any) => {
                        const depTypeLabels: Record<string, { label: string; color: string; icon: string }> = {
                          'FS': { label: 'FS', color: '#3b82f6', icon: '→' },
                          'FF': { label: 'FF', color: '#8b5cf6', icon: '⟹' },
                          'SS': { label: 'SS', color: '#10b981', icon: '⇉' },
                          'SF': { label: 'SF', color: '#f59e0b', icon: '↷' },
                          'relates_to': { label: 'Link', color: '#6b7280', icon: '⟷' }
                        };
                        const depInfo = depTypeLabels[dep.dependency_type] || depTypeLabels['FS'];
                        
                        return (
                          <Box 
                            key={dep._id}
                            sx={{ 
                              p: 1.5,
                              border: '1px solid #e8e9eb',
                              borderRadius: 2,
                              '&:hover': { bgcolor: '#fafbfc' }
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1 }}>
                                {/* Dependency Type Badge */}
                                <Tooltip title={`${dep.dependency_type} dependency`}>
                                  <Chip 
                                    label={depInfo.label}
                                    size="small"
                                    sx={{ 
                                      height: 22,
                                      minWidth: 40,
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      bgcolor: `${depInfo.color}15`,
                                      color: depInfo.color,
                                      border: `1px solid ${depInfo.color}40`
                                    }}
                                  />
                                </Tooltip>
                                
                                {/* Arrow Icon */}
                                <ArrowForwardIcon sx={{ fontSize: 14, color: '#d1d5db' }} />
                                
                                {/* Task Title */}
                                <Typography 
                                  fontSize="14px" 
                                  fontWeight={500} 
                                  sx={{ 
                                    flex: 1,
                                    minWidth: 0,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                  }}
                                  title={dep.depends_on_task_id?.title}
                                >
                                  {dep.depends_on_task_id?.title}
                                </Typography>
                                
                                {/* Status */}
                                <Chip 
                                  label={dep.depends_on_task_id?.status} 
                                  size="small" 
                                  sx={{ height: 20, fontSize: '11px' }}
                                />
                                
                                {/* Lag indicator */}
                                {dep.lag_days !== 0 && (
                                  <Tooltip title={dep.lag_days > 0 ? `${dep.lag_days} ngày trễ` : `${Math.abs(dep.lag_days)} ngày sớm`}>
                                    <Chip 
                                      label={dep.lag_days > 0 ? `+${dep.lag_days}d` : `${dep.lag_days}d`}
                                      size="small"
                                      sx={{ 
                                        height: 20, 
                                        fontSize: '10px',
                                        bgcolor: dep.lag_days > 0 ? '#fef3c7' : '#dbeafe',
                                        color: dep.lag_days > 0 ? '#92400e' : '#1e40af',
                                        fontWeight: 600
                                      }}
                                    />
                                  </Tooltip>
                                )}
                                
                                {/* Optional indicator */}
                                {!dep.is_mandatory && (
                                  <Tooltip title="Tùy chọn - ràng buộc mềm">
                                    <Chip
                                      label="✏️ Tùy chọn"
                                      size="small"
                                      sx={{
                                        height: 18,
                                        fontSize: '10px',
                                        fontWeight: 600,
                                        bgcolor: '#e0e7ff',
                                        color: '#4338ca'
                                      }}
                                    />
                                  </Tooltip>
                                )}
                              </Box>
                              
                              {/* Delete Button */}
                              <IconButton
                                size="small"
                                onClick={() => removeDependency(dependencyTaskId || '', dep._id)}
                                sx={{ 
                                  color: '#9ca3af',
                                  '&:hover': { 
                                    color: '#ef4444',
                                    bgcolor: '#fee2e2'
                                  }
                                }}
                              >
                                <DeleteIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Box>
                            
                            {/* Notes Display */}
                            {dep.notes && (
                              <Box sx={{ mt: 1, p: 1, bgcolor: '#f5f3ff', borderRadius: 1, border: '1px dashed #c4b5fd' }}>
                                <Typography fontSize="11px" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                  💡 {dep.notes}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      Không có phụ thuộc chặn
                    </Typography>
                  )}

                  {/* Add new dependency form */}
                  <Box sx={{ mt: 2, p: 3, bgcolor: '#f8f9fb', borderRadius: 2, border: '2px dashed #7b68ee' }}>
                    <Typography fontSize="14px" fontWeight={700} sx={{ mb: 2, color: '#7b68ee' }}>
                      Thêm Phụ thuộc (Công việc này phụ thuộc vào)
                    </Typography>
                    <Stack spacing={2}>
                      {/* Task Selection */}
                      <FormControl fullWidth size="small">
                        <InputLabel>Công việc phụ thuộc</InputLabel>
                        <Select
                          value={dependencyForm.depends_on_task_id}
                          label="Công việc phụ thuộc"
                          onChange={(e) => setDependencyForm({ ...dependencyForm, depends_on_task_id: e.target.value })}
                        >
                          {tasks
                            .filter(task => task._id !== dependencyTaskId)
                            .map(task => (
                              <MenuItem key={task._id} value={task._id}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography fontSize="13px">{task.title}</Typography>
                                  <Chip 
                                    label={typeof task.status === 'object' ? (task.status as any)?.name : task.status} 
                                    size="small"
                                    sx={{ height: 18, fontSize: '10px' }}
                                  />
                                </Box>
                              </MenuItem>
                            ))}
                        </Select>
                      </FormControl>

                      {/* Dependency Type & Lag */}
                      <Stack direction="row" spacing={2}>
                        <FormControl fullWidth size="small">
                          <InputLabel>Loại</InputLabel>
                          <Select
                            value={dependencyForm.dependency_type}
                            label="Loại"
                            onChange={(e) => setDependencyForm({ ...dependencyForm, dependency_type: e.target.value })}
                          >
                            <MenuItem value="FS">
                              <Box>
                                <Typography fontSize="13px" fontWeight={600}>FS - Hoàn thành - Bắt đầu</Typography>
                                <Typography fontSize="10px" color="text.secondary">
                                  Công việc trước phải hoàn thành trước
                                </Typography>
                              </Box>
                            </MenuItem>
                            <MenuItem value="FF">
                              <Box>
                                <Typography fontSize="13px" fontWeight={600}>FF - Hoàn thành - Hoàn thành</Typography>
                                <Typography fontSize="10px" color="text.secondary">
                                  Cả hai phải hoàn thành cùng lúc
                                </Typography>
                              </Box>
                            </MenuItem>
                            <MenuItem value="SS">
                              <Box>
                                <Typography fontSize="13px" fontWeight={600}>SS - Bắt đầu - Bắt đầu</Typography>
                                <Typography fontSize="10px" color="text.secondary">
                                  Cả hai phải bắt đầu cùng lúc
                                </Typography>
                              </Box>
                            </MenuItem>
                            <MenuItem value="SF">
                              <Box>
                                <Typography fontSize="13px" fontWeight={600}>SF - Bắt đầu - Hoàn thành</Typography>
                                <Typography fontSize="10px" color="text.secondary">
                                  Công việc trước phải bắt đầu trước
                                </Typography>
                              </Box>
                            </MenuItem>
                            <MenuItem value="relates_to">
                              <Box>
                                <Typography fontSize="13px" fontWeight={600}>Liên quan đến</Typography>
                                <Typography fontSize="10px" color="text.secondary">
                                  Chỉ tham chiếu (không ràng buộc)
                                </Typography>
                              </Box>
                            </MenuItem>
                          </Select>
                        </FormControl>

                        <Box sx={{ width: 200 }}>
                          <TextField
                            label="Lag/Lead (ngày)"
                            type="number"
                            size="small"
                            value={dependencyForm.lag_days}
                            onChange={(e) => setDependencyForm({ ...dependencyForm, lag_days: parseInt(e.target.value) || 0 })}
                            fullWidth
                            inputProps={{ min: -30, max: 30 }}
                            helperText={
                              dependencyForm.lag_days > 0 
                                ? `⏱️ Lag: +${dependencyForm.lag_days} ngày (công việc sau sẽ bắt đầu SAU ${dependencyForm.lag_days} ngày)` 
                                : dependencyForm.lag_days < 0 
                                  ? `⚡ Lead: ${Math.abs(dependencyForm.lag_days)} ngày (công việc sau có thể bắt đầu TRƯỚC ${Math.abs(dependencyForm.lag_days)} ngày)` 
                                  : 'Không có lag/lead (bắt đầu ngay sau khi điều kiện đáp ứng)'
                            }
                            sx={{
                              '& .MuiFormHelperText-root': {
                                fontSize: '10px',
                                mt: 0.5,
                                lineHeight: 1.3
                              }
                            }}
                          />
                          <Box sx={{ mt: 1, p: 1.5, bgcolor: '#f0f9ff', borderRadius: 1, border: '1px solid #bae6fd' }}>
                            <Typography fontSize="10px" fontWeight={600} color="#0284c7" sx={{ mb: 0.5 }}>
                              💡 Giải thích:
                            </Typography>
                            <Typography fontSize="10px" color="#0369a1" component="div">
                              <Box component="span" sx={{ display: 'block', mb: 0.5 }}>
                                • <strong>Lag (số dương):</strong> Độ trễ - công việc sau phải đợi thêm X ngày sau khi điều kiện đáp ứng
                              </Box>
                              <Box component="span" sx={{ display: 'block' }}>
                                • <strong>Lead (số âm):</strong> Độ sớm - công việc sau có thể bắt đầu sớm X ngày trước khi điều kiện đáp ứng
                              </Box>
                            </Typography>
                          </Box>
                        </Box>
                      </Stack>

                      {/* Is Mandatory Toggle Switch */}
                      <FormControl fullWidth size="small">
                        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ p: 1.5, bgcolor: '#f8f9fb', borderRadius: 1.5, border: '1px solid #e8e9eb' }}>
                          <Box
                            onClick={() => setDependencyForm({ ...dependencyForm, is_mandatory: !dependencyForm.is_mandatory })}
                            sx={{
                              width: 40,
                              height: 22,
                              borderRadius: 11,
                              bgcolor: dependencyForm.is_mandatory ? '#7b68ee' : '#d1d5db',
                              position: 'relative',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              '&:hover': { opacity: 0.8 }
                            }}
                          >
                            <Box
                              sx={{
                                width: 18,
                                height: 18,
                                borderRadius: '50%',
                                bgcolor: 'white',
                                position: 'absolute',
                                top: 2,
                                left: dependencyForm.is_mandatory ? 20 : 2,
                                transition: 'all 0.2s',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                              }}
                            />
                          </Box>
                          <Box sx={{ flex: 1 }}>
                            <Typography fontSize="13px" fontWeight={600} color={dependencyForm.is_mandatory ? '#7b68ee' : '#6b7280'}>
                              {dependencyForm.is_mandatory ? '🔒 Bắt buộc' : '✏️ Tùy chọn'}
                            </Typography>
                            <Typography fontSize="10px" color="text.secondary">
                              {dependencyForm.is_mandatory 
                                ? 'Ràng buộc cứng - phải được thực thi'
                                : 'Ràng buộc mềm - có thể thay đổi nếu cần'}
                            </Typography>
                          </Box>
                        </Stack>
                      </FormControl>

                      {/* Notes */}
                      <TextField
                        label="Ghi chú (Tùy chọn)"
                        size="small"
                        multiline
                        rows={2}
                        value={dependencyForm.notes}
                        onChange={(e) => setDependencyForm({ ...dependencyForm, notes: e.target.value })}
                        placeholder="Giải thích lý do phụ thuộc này tồn tại..."
                        helperText="Cung cấp ngữ cảnh cho các thành viên trong nhóm"
                      />

                      {/* Action Buttons */}
                      <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                          size="small"
                          onClick={() => {
                            setDependencyForm({ depends_on_task_id: '', dependency_type: 'FS', lag_days: 0, is_mandatory: true, notes: '' });
                          }}
                          sx={{ textTransform: 'none', fontWeight: 600, color: '#6b7280' }}
                        >
                          Hủy
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          disabled={!dependencyForm.depends_on_task_id}
                          onClick={async () => {
                            if (dependencyTaskId && dependencyForm.depends_on_task_id) {
                              await addDependency(
                                dependencyTaskId, 
                                dependencyForm.depends_on_task_id, 
                                dependencyForm.dependency_type,
                                dependencyForm.lag_days,
                                dependencyForm.is_mandatory,
                                dependencyForm.notes
                              );
                              setDependencyForm({ depends_on_task_id: '', dependency_type: 'FS', lag_days: 0, is_mandatory: true, notes: '' });
                            }
                          }}
                          sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            bgcolor: '#7b68ee',
                            '&:hover': { bgcolor: '#6952d6' }
                          }}
                        >
                          Thêm Phụ thuộc
                        </Button>
                      </Stack>
                    </Stack>
                  </Box>
                </Box>

                <Divider />

                {/* Blocking (tasks that depend on this task) */}
                <Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
                    Blocking
                  </Typography>

                  {taskDependencies[dependencyTaskId || '']?.dependents?.length > 0 ? (
                    <Stack spacing={1}>
                      {taskDependencies[dependencyTaskId || ''].dependents.map((dep: any) => {
                        const depTypeLabels: Record<string, { label: string; color: string }> = {
                          'FS': { label: 'FS', color: '#3b82f6' },
                          'FF': { label: 'FF', color: '#8b5cf6' },
                          'SS': { label: 'SS', color: '#10b981' },
                          'SF': { label: 'SF', color: '#f59e0b' },
                          'relates_to': { label: 'Link', color: '#6b7280' }
                        };
                        const depInfo = depTypeLabels[dep.dependency_type] || depTypeLabels['FS'];
                        
                        return (
                          <Box 
                            key={dep._id}
                            sx={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: 1.5,
                              p: 1.5,
                              border: '1px solid #fed7aa',
                              borderRadius: 2,
                              bgcolor: '#fffbeb'
                            }}
                          >
                            {/* Dependency Type Badge */}
                            <Tooltip title={`${dep.dependency_type} dependency`}>
                              <Chip 
                                label={depInfo.label}
                                size="small"
                                sx={{ 
                                  height: 22,
                                  minWidth: 40,
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  bgcolor: `${depInfo.color}15`,
                                  color: depInfo.color,
                                  border: `1px solid ${depInfo.color}40`
                                }}
                              />
                            </Tooltip>
                            
                            {/* Block Icon */}
                            <BlockIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                            
                            {/* Task Title */}
                            <Typography 
                              fontSize="14px" 
                              fontWeight={500} 
                              sx={{ 
                                flex: 1,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }}
                              title={dep.task_id?.title}
                            >
                              {dep.task_id?.title}
                            </Typography>
                            
                            {/* Status */}
                            <Chip 
                              label={dep.task_id?.status} 
                              size="small" 
                              sx={{ height: 20, fontSize: '11px' }}
                            />
                            
                            {/* Lag indicator */}
                            {dep.lag_days !== 0 && (
                              <Tooltip title={dep.lag_days > 0 ? `${dep.lag_days} days delay` : `${Math.abs(dep.lag_days)} days lead time`}>
                                <Chip 
                                  label={dep.lag_days > 0 ? `+${dep.lag_days}d` : `${dep.lag_days}d`}
                                  size="small"
                                  sx={{ 
                                    height: 20, 
                                    fontSize: '10px',
                                    bgcolor: dep.lag_days > 0 ? '#fef3c7' : '#dbeafe',
                                    color: dep.lag_days > 0 ? '#92400e' : '#1e40af',
                                    fontWeight: 600
                                  }}
                                />
                              </Tooltip>
                            )}
                          </Box>
                        );
                      })}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                      This task is not blocked by any other tasks
                    </Typography>
                  )}
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 3, pt: 2 }}>
              <Button 
                onClick={() => {
                  setOpenDependencyDialog(false);
                  setDependencyTaskId(null);
                }}
                sx={{ 
                  textTransform: 'none',
                  fontWeight: 600,
                  color: 'text.secondary'
                }}
              >
                Close
              </Button>
            </DialogActions>
          </Dialog>

        </div>
      </main>
    </div>
  );
}


