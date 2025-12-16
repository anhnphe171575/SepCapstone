"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { gantt } from "dhtmlx-gantt";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import { Box, IconButton, ButtonGroup, Tooltip, Divider } from "@mui/material";
import { ZoomIn, ZoomOut, CalendarMonth, CalendarToday, CalendarViewWeek, CalendarViewMonth, FitScreen } from "@mui/icons-material";

type Task = {
  _id: string;
  title: string;
  start_date?: string;
  deadline?: string;
  status?: string | { _id: string; name: string };
  assignee_id?: any;
  progress?: number;
  priority?: string | { _id: string; name: string };
  parent_task_id?: string;
  feature_id?: any;
  function_id?: any;
  [key: string]: any;
};

type FunctionItem = {
  _id: string;
  title: string;
  start_date?: string;
  deadline?: string;
  status: string;
  feature_id?: any;
  priority?: string;
  description?: string;
};

interface Dependency {
  _id: string;
  task_id: string;
  depends_on_task_id: any;
  dependency_type: 'FS' | 'FF' | 'SS' | 'SF' | 'relates_to';
  lag_days?: number;
  is_mandatory?: boolean;
  notes?: string;
}

interface DHtmlxGanttChartProps {
  tasks: Task[];
  functions?: FunctionItem[];
  dependencies: Record<string, { dependencies: Dependency[]; dependents: Dependency[] }>;
  onTaskClick?: (taskId: string) => void;
}

// Helper function for status colors
function getStatusColor(status?: string): string {
  const s = (status || '').trim();
  // Map exact status values
  if (s === 'Done') return '#00c875'; // Green
  if (s === 'Doing') return '#579bfc'; // Blue
  if (s === 'To Do') return '#f59e0b'; // Orange
  
  // Fallback for other status formats (case-insensitive)
  const sLower = s.toLowerCase();
  if (sLower.includes('done') || sLower.includes('completed')) return '#00c875';
  if (sLower.includes('doing') || sLower.includes('progress')) return '#579bfc';
  if (sLower.includes('to do') || sLower.includes('todo')) return '#f59e0b';
  if (sLower.includes('review')) return '#a25ddc';
  if (sLower.includes('blocked')) return '#e44258';
  return '#579bfc'; // Default blue
}

export default function DHtmlxGanttChart({ 
  tasks, 
  functions = [],
  dependencies,
  onTaskClick 
}: DHtmlxGanttChartProps) {
  const ganttContainer = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const linkTooltipRef = useRef<HTMLDivElement | null>(null);

  // Apply zoom configuration (shared for init + zoom changes)
  const applyZoomLevel = useCallback((level: 'day' | 'week' | 'month' | 'year') => {
    // Build scales then assign (avoid empty array typing issues)
    const newScales: { unit: string; step: number; format: string | ((date: Date) => string) }[] = [];

    switch (level) {
      case 'day': {
        const dayFormat = gantt.date.date_to_str("%d %M") as (date: Date) => string;
        const hourFormat = gantt.date.date_to_str("%H:%i") as (date: Date) => string;
        newScales.push(
          { unit: "day", step: 1, format: dayFormat },
          { unit: "hour", step: 4, format: hourFormat },
        );
        break;
      }
      case 'week': {
        const weekStart = gantt.date.date_to_str("%d %M") as (date: Date) => string;
        const weekEnd = gantt.date.date_to_str("%d %M") as (date: Date) => string;
        newScales.push(
          {
            unit: "week",
            step: 1,
            format: (date: Date) => {
              const end = gantt.date.add(date, 6, "day");
              return `${weekStart(date)} - ${weekEnd(end)}`;
            },
          },
          { unit: "day", step: 1, format: gantt.date.date_to_str("%d %D") as (date: Date) => string },
        );
        break;
      }
      case 'month': {
        const monthFormat = gantt.date.date_to_str("%F %Y") as (date: Date) => string;
        newScales.push(
          { unit: "month", step: 1, format: monthFormat },
          { unit: "week", step: 1, format: (date: Date) => `W${gantt.date.date_to_str("%W")(date)}` },
        );
        break;
      }
      case 'year': {
        const yearFormat = gantt.date.date_to_str("%Y") as (date: Date) => string;
        newScales.push(
          { unit: "year", step: 1, format: yearFormat },
          { unit: "month", step: 1, format: gantt.date.date_to_str("%M") as (date: Date) => string },
        );
        break;
      }
    }

    // Assign scales
    if (newScales.length > 0) {
      gantt.config.scales = newScales as any;
    }

    // Keep legacy props in sync
    const topScale = (newScales as any)[0];
    if (topScale) {
      gantt.config.scale_unit = topScale.unit;
      gantt.config.date_scale = typeof topScale.format === "string" ? topScale.format : "%d %M";
    }
    gantt.config.subscales = (newScales as any).slice(1);
    gantt.config.scale_height = 60;
  }, []);

  useEffect(() => {
    if (!ganttContainer.current) return;

    // Configure Gantt
    gantt.config.date_format = "%Y-%m-%d";

    // Beautiful columns with icons
    gantt.config.columns = [
      {
        name: "text",
        label: "TÊN CÔNG VIỆC",
        tree: true,
        width: 320,
        template: function (task: any) {
          // Check if this is a function
          const isFunction = task.isFunction === true;
          
          if (isFunction || task.type === "project") {
            return `
              <div class="gantt-grid-cell gantt-grid-cell--project">
                <span class="gantt-grid-cell__icon"></span>
                <span class="gantt-grid-cell__title gantt-grid-cell__title--project">Nhóm Công việc</span>
              </div>
            `;
          }
          const color = getStatusColor(task.status_name);
          return `
            <div class="gantt-grid-cell">
              <span class="gantt-grid-status" style="background:${color}; box-shadow:0 0 0 3px ${color}22;"></span>
              <span class="gantt-grid-cell__title">${task.text} </span>
            </div>
          `;
        }
      },
      {
        name: "duration",
        label: "THỜI GIAN",
        align: "center",
        width: 110,
        template: function (task: any) {
          const duration = task.duration || 0;
          return `
            <div class="gantt-grid-tag">
              <span class="gantt-grid-tag__value">${duration}</span>
              <span class="gantt-grid-tag__unit">ngày</span>
            </div>
          `;
        }
      }
    ];

    applyZoomLevel(zoomLevel);

    // Enable features
    gantt.config.auto_scheduling = false; // Disable to prevent auto-moves
    gantt.config.details_on_dblclick = false; // Disable double click
    gantt.config.show_progress = true;
    gantt.config.order_branch = true;
    gantt.config.open_tree_initially = true;
    gantt.config.row_height = 50;
    gantt.config.bar_height = 32;
    gantt.config.drag_links = false; // Disable link creation
    gantt.config.drag_progress = false; // Disable progress drag
    gantt.config.drag_resize = false; // Disable resize
    gantt.config.drag_move = false; // Disable task drag
    gantt.config.readonly = true; // Set to readonly mode
    gantt.config.work_time = false; // Disable work time (show all days)
    gantt.config.skip_off_time = false; // Show all days including weekends
    gantt.config.auto_scheduling_strict = false;
    gantt.config.auto_scheduling = false; // Ensure auto-scheduling is disabled
    gantt.config.rtl = false; // Ensure left-to-right mode (not right-to-left)
    gantt.config.show_links = true; // Show dependency links
    
    // CRITICAL: Use numeric constants for link types (dhtmlx-gantt expects numbers)
    gantt.config.links = {
      finish_to_start: 0,  // FS
      start_to_start: 1,   // SS
      finish_to_finish: 2, // FF
      start_to_finish: 3   // SF
    };
    
    gantt.config.link_width = 2; // Link line width
    gantt.config.link_arrow_size = 8; // Arrow size
    
    // CRITICAL: Disable all auto-conversion and auto-scheduling features
    gantt.config.auto_scheduling_compatibility = false;
    gantt.config.correct_work_time = false;
    gantt.config.smart_rendering = false; // Disable smart rendering which might auto-convert links
    
    // CRITICAL: Prevent dhtmlx-gantt from auto-converting link types
    // This is essential to ensure FS links stay as FS and don't become FF
    gantt.config.auto_scheduling = false;
    gantt.config.auto_scheduling_strict = false;
    
    // Override link rendering template to add CSS classes
    gantt.templates.link_class = function(link: any) {
      // Return a class based on dependency type to help with CSS targeting
      if (link.dependency_type) {
        const depType = String(link.dependency_type).toUpperCase().trim();
        return `gantt-link-${depType.toLowerCase()}`;
      }
      return '';
    };

    // Highlight weekends
    gantt.templates.scale_cell_class = function(date) {
      if (date.getDay() === 0 || date.getDay() === 6) {
        return "weekend";
      }
      return "";
    };

    gantt.templates.timeline_cell_class = function(task, date) {
      if (date.getDay() === 0 || date.getDay() === 6) {
        return "weekend";
      }
      return "";
    };

    // Custom task styling
    gantt.templates.task_class = function(start, end, task) {
      // Check if this is an orphaned group (Nhóm Công việc)
      if (task.isOrphanedGroup === true) {
        return "gantt-task-orphaned-group"; // Special class for orphaned groups
      }
      
      // Check if this is a function
      if (task.isFunction === true) {
        return "gantt-task-function"; // Special class for functions
      }
      
      const status = (task.status_name || '').trim();
      // Map exact status values
      if (status === 'Done') return "gantt-task-completed"; // Green
      if (status === 'Doing') return "gantt-task-progress"; // Blue
      if (status === 'To Do') return "gantt-task-todo"; // Orange
      
      // Fallback for other status formats (case-insensitive)
      const statusLower = status.toLowerCase();
      if (statusLower.includes('done') || statusLower.includes('completed')) return "gantt-task-completed";
      if (statusLower.includes('doing') || statusLower.includes('progress')) return "gantt-task-progress";
      if (statusLower.includes('to do') || statusLower.includes('todo')) return "gantt-task-todo";
      if (statusLower.includes('review')) return "gantt-task-review";
      if (statusLower.includes('blocked')) return "gantt-task-blocked";
      return "gantt-task-default"; // Default blue
    };

    // Task text - always show full text
    gantt.templates.task_text = function(start, end, task) {
      // Check if this is a function
      if (task.isFunction === true) {
        return `<strong>${task.text}</strong>`;
      }
      return `<span style="display: inline-block;">${task.text}</span>`;
    };
    
    // Tooltip
    gantt.templates.tooltip_text = function(start, end, task) {
      const status = task.status_name || 'Không có trạng thái';
      const assignee = task.assignee || 'Chưa phân công';
      const progress = Math.round((task.progress || 0) * 100);
      
      return `<div style="padding: 8px; min-width: 200px;">
        <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: #1f2937;">${task.text}</div>
        <div style="font-size: 12px; color: #6b7280; line-height: 1.8;">
          <div><strong>Trạng thái:</strong> <span style="color: ${getStatusColor(status)};">●</span> ${status}</div>
          <div><strong>Người được giao:</strong> ${assignee}</div>
          <div><strong>Thời gian:</strong> ${task.duration || 0} ngày</div>
          <div><strong>Tiến độ:</strong> ${progress}%</div>
          <div><strong>Bắt đầu:</strong> ${gantt.date.date_to_str("%d %M %Y")(start)}</div>
          <div><strong>Kết thúc:</strong> ${gantt.date.date_to_str("%d %M %Y")(end)}</div>
        </div>
      </div>`;
    };
    
    // Today marker
    gantt.templates.timeline_cell_class = function(task, date) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const cellDate = new Date(date);
      cellDate.setHours(0, 0, 0, 0);
      
      if (cellDate.getTime() === today.getTime()) {
        return "today";
      }
      if (date.getDay() === 0 || date.getDay() === 6) {
        return "weekend";
      }
      return "";
    };

    // Initialize Gantt
    gantt.init(ganttContainer.current);

    // Transform data
    const ganttData = transformToGanttData(tasks, functions, dependencies);
    
    // Validate and filter links before parsing (silently filter invalid links)
    if (ganttData.links && ganttData.links.length > 0) {
      // Filter out invalid links without logging (to avoid console noise)
      const validLinks: any[] = [];
      ganttData.links.forEach((link: any) => {
      // Validate link type (must be 0, 1, 2, or 3 as number)
      let linkType: number;
      if (typeof link.type === 'string') {
        linkType = parseInt(link.type, 10);
      } else if (typeof link.type === 'number') {
        linkType = link.type;
      } else {
        return; // Skip invalid link type
      }
      
      if (![0, 1, 2, 3].includes(linkType)) {
        return; // Silently skip invalid links
      }
      
      // CRITICAL FIX: Ensure type is a number and force correct type based on dependency_type
      // This prevents dhtmlx-gantt from auto-converting FS to FF
      if (link.dependency_type) {
        const depType = link.dependency_type.toUpperCase().trim();
        if (depType === 'FS') {
          link.type = 0; // Force FS (Finish-to-Start)
        } else if (depType === 'SS') {
          link.type = 1; // Force SS (Start-to-Start)
        } else if (depType === 'FF') {
          link.type = 2; // Force FF (Finish-to-Finish)
        } else if (depType === 'SF') {
          link.type = 3; // Force SF (Start-to-Finish)
        } else {
          link.type = linkType; // Use normalized type
        }
      } else {
        link.type = linkType; // Ensure type is number
      }
        
        // Validate source and target exist
        const sourceExists = ganttData.data.some((t: any) => String(t.id) === String(link.source));
        const targetExists = ganttData.data.some((t: any) => String(t.id) === String(link.target));
        
        if (!sourceExists || !targetExists) {
          return; // Silently skip links with missing source/target
        }
        
        // Validate source and target are not the same
        if (String(link.source) === String(link.target)) {
          return; // Silently skip self-referencing links
        }
        
        validLinks.push(link);
      });
      
      ganttData.links = validLinks;
    }
    
    // Store link data with dependency types for post-render correction
    const linkDataMap = new Map<number, { dependency_type: string; correctType: number }>();
    if (ganttData.links && ganttData.links.length > 0) {
      ganttData.links.forEach((linkData: any) => {
        if (linkData.dependency_type) {
          const depType = linkData.dependency_type.toUpperCase().trim();
          let correctType = 0;
          
          if (depType === 'FS') {
            correctType = 0; // Finish-to-Start
          } else if (depType === 'SS') {
            correctType = 1; // Start-to-Start
          } else if (depType === 'FF') {
            correctType = 2; // Finish-to-Finish
          } else if (depType === 'SF') {
            correctType = 3; // Start-to-Finish
          }
          
          linkDataMap.set(linkData.id, { dependency_type: depType, correctType });
        }
      });
    }
    
    try {
      gantt.parse(ganttData);
    } catch (error) {
      // Only log errors in development mode
      if (process.env.NODE_ENV === 'development') {
        console.error('Error parsing Gantt data:', error);
      }
    }
    
    // CRITICAL FIX: Force correct link types after rendering
    // dhtmlx-gantt may auto-convert FS to FF based on task positions
    // We need to continuously monitor and correct link types
    const forceCorrectLinkTypes = () => {
      if (linkDataMap.size === 0) return;
      
      linkDataMap.forEach((linkInfo, linkId) => {
        try {
          const existingLink = gantt.getLink(linkId);
          if (!existingLink) return;
          
          // Get current type (handle both string and number)
          let currentType: number;
          if (typeof existingLink.type === 'string') {
            currentType = parseInt(existingLink.type, 10);
          } else if (typeof existingLink.type === 'number') {
            currentType = existingLink.type;
          } else {
            currentType = 0;
          }
          
          // CRITICAL: Always verify and force correct type and direction
          // Ensure arrow points FROM source (predecessor) TO target (successor)
          if (currentType !== linkInfo.correctType) {
            // Store source and target (these should be: source=predecessor, target=successor)
            const source = existingLink.source;
            const target = existingLink.target;
            
            // Delete existing link first
            try {
              gantt.deleteLink(linkId);
            } catch (e) {
              // Link might not exist, continue
            }
            
            // Wait a tiny bit for DOM to update, then add link back with correct type
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
              try {
                // Re-add link with CORRECT type (0 for FS, 1 for SS, 2 for FF, 3 for SF)
                // Source = predecessor (task 'a'), Target = successor (task 'c')
                // Arrow will point FROM source TO target (from 'a' to 'c')
                gantt.addLink({
                  id: linkId,
                  source: source, // Predecessor (task 'a')
                  target: target, // Successor (task 'c')
                  type: linkInfo.correctType // Force correct type (0=FS, 1=SS, 2=FF, 3=SF)
                });
                // Force immediate render to update link visually
                gantt.render();
              } catch (err) {
                // Silently fail - link might already exist or there's a conflict
              }
            });
          }
        } catch (err) {
          // Silently skip errors
        }
      });
      
      // Always re-render after checking to ensure changes are applied
      gantt.render();
    };
    
    // Run immediately and also after delays to catch any delayed rendering
    // dhtmlx-gantt may auto-convert link types after rendering, so we need to continuously check
    setTimeout(forceCorrectLinkTypes, 50);
    setTimeout(forceCorrectLinkTypes, 200);
    setTimeout(forceCorrectLinkTypes, 500);
    setTimeout(forceCorrectLinkTypes, 1000);
    
    // Also set up an interval to continuously check and correct link types
    // This is a workaround for dhtmlx-gantt's auto-conversion behavior
    // Check every 2 seconds to catch any auto-conversions
    const linkCorrectionInterval = setInterval(() => {
      forceCorrectLinkTypes();
    }, 2000);
    
    // Store interval ID for cleanup
    (ganttContainer.current as any)._linkCorrectionInterval = linkCorrectionInterval;

    // Remove error messages from DOM after parsing
    let messageCleanupInterval: NodeJS.Timeout | null = null;
    const removeErrorMessages = () => {
      if (ganttContainer.current) {
        const messageArea = ganttContainer.current.querySelector('.gantt_message_area');
        if (messageArea) {
          messageArea.remove();
        }
        // Also remove any error messages directly
        const errorMessages = ganttContainer.current.querySelectorAll('.gantt-error, .gantt-info.gantt-error, [role="alert"]');
        errorMessages.forEach(msg => {
          const parent = msg.parentElement;
          if (parent && parent.classList.contains('gantt_message_area')) {
            parent.remove();
          } else {
            msg.remove();
          }
        });
      }
    };

    // Remove messages immediately and also set up interval to catch any that appear later
    removeErrorMessages();
    messageCleanupInterval = setInterval(removeErrorMessages, 100);

    // Helper: safely parse start_date which may be string or Date
    const safeParseDate = (value: any): Date | null => {
      if (!value) return null;
      if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
      }
      if (typeof value === "string") {
        const parser = gantt.date.str_to_date("%Y-%m-%d");
        const d = parser(value);
        return d && !isNaN(d.getTime()) ? d : null;
      }
      // Fallback: try Date constructor
      const d = new Date(value);
      return isNaN(d.getTime()) ? null : d;
    };

    // Auto-fit timeline to show all tasks
    setTimeout(() => {
      if (ganttData.data && ganttData.data.length > 0) {
        // Find min and max dates from all tasks
        const allDates: Date[] = [];
        ganttData.data.forEach((task: any) => {
          if (task.start_date) {
            const startDate = safeParseDate(task.start_date);
            if (startDate) {
              allDates.push(startDate);
            }
          }
          if (task.duration && task.start_date) {
            const startDate = safeParseDate(task.start_date);
            if (startDate) {
              const endDate = gantt.date.add(startDate, task.duration, 'day');
              allDates.push(endDate);
            }
          }
        });

        if (allDates.length > 0) {
          const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
          const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
          
          // Set start date a bit earlier and end date a bit later for padding
          const paddingDays = 7;
          minDate.setDate(minDate.getDate() - paddingDays);
          maxDate.setDate(maxDate.getDate() + paddingDays);
          
          // Set scale to show all dates
          gantt.setSizes();
          gantt.render();
        }
      }
    }, 100);

    // Event handlers
    gantt.attachEvent("onTaskClick", function(id) {
      // Prevent click on orphaned groups (Nhóm Công việc)
      try {
        const task = gantt.getTask(id);
        if (task && task.isOrphanedGroup === true) {
          return false; // Prevent click event
        }
      } catch (err) {
        // If task not found, allow click (fallback)
      }
      
      onTaskClick?.(String(id));
      return true;
    });

    // Helper function to get dependency type name
    const getDependencyTypeName = (type: string | undefined): string => {
      if (!type) return 'FS';
      const normalized = type.toUpperCase().trim();
      const typeNames: Record<string, string> = {
        'FS': 'Finish-to-Start',
        'SS': 'Start-to-Start',
        'FF': 'Finish-to-Finish',
        'SF': 'Start-to-Finish',
        'RELATES_TO': 'Relates To'
      };
      return typeNames[normalized] || 'Finish-to-Start';
    };

    // Create tooltip element for dependency links
    let linkTooltip: HTMLDivElement | null = null;
    const createLinkTooltip = () => {
      if (!ganttContainer.current) return;
      
      linkTooltip = document.createElement('div');
      linkTooltip.className = 'gantt-link-tooltip';
      linkTooltip.style.cssText = `
        position: absolute;
        background: #1f2937;
        color: white;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        pointer-events: none;
        z-index: 10000;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        display: none;
        min-width: 200px;
        max-width: 300px;
      `;
      ganttContainer.current.appendChild(linkTooltip);
    };

    // Add mousemove event listener for dependency link tooltips
    const handleLinkMouseMove = (e: MouseEvent) => {
      if (!ganttContainer.current || !linkTooltip) return;

      const target = e.target as HTMLElement;
      const containerRect = ganttContainer.current.getBoundingClientRect();
      
      // Check if mouse is over a link element (dhtmlx-gantt uses these classes)
      const linkElement = target.closest('.gantt_task_link, .gantt_line_wrapper, .gantt_link_arrow');
      
      if (linkElement) {
        // Try to find link ID from data attribute first
        const linkWrapper = target.closest('.gantt_task_link') as HTMLElement;
        let linkId: string | null = null;
        let depType: string | null = null;
        
        if (linkWrapper) {
          // Check if link has data attribute
          linkId = linkWrapper.getAttribute('data-link-id');
          depType = linkWrapper.getAttribute('data-dependency-type');
          
          // If not found, try to find by checking link's position and task connections
          if (!linkId || !depType) {
            const allLinks = gantt.getLinks();
            const mouseY = e.clientY - containerRect.top;
            
            // Find the link that corresponds to this DOM element
            // We'll check which link's bounding box contains the mouse position
            for (let i = 0; i < allLinks.length; i++) {
              const link = allLinks[i];
              try {
                const linkData = gantt.getLink(String(link.id));
                if (!linkData) continue;
                
                // Get source and target tasks
                const sourceTask = gantt.getTask(String(linkData.source));
                const targetTask = gantt.getTask(String(linkData.target));
                
                if (!sourceTask || !targetTask) continue;
                
                // Get task row positions to identify which link this is
                const sourceRow = gantt.getTaskNode(sourceTask.id);
                const targetRow = gantt.getTaskNode(targetTask.id);
                
                if (sourceRow && targetRow) {
                  const sourceRect = sourceRow.getBoundingClientRect();
                  const targetRect = targetRow.getBoundingClientRect();
                  
                  // Check if mouse is between source and target rows (where the link would be)
                  const minY = Math.min(sourceRect.top, targetRect.top) - containerRect.top;
                  const maxY = Math.max(sourceRect.bottom, targetRect.bottom) - containerRect.top;
                  
                  // Also check if we're actually over a link element that connects these tasks
                  // Find all link elements and check if any connect source to target
                  const linkElements = ganttContainer.current.querySelectorAll('.gantt_task_link');
                  let foundMatchingLink = false;
                  
                  linkElements.forEach((linkEl: Element) => {
                    const linkElRect = linkEl.getBoundingClientRect();
                    const linkElTop = linkElRect.top - containerRect.top;
                    const linkElBottom = linkElRect.bottom - containerRect.top;
                    
                    // Check if mouse is within this link element's bounds
                    if (mouseY >= linkElTop && mouseY <= linkElBottom) {
                      // Check if this link element is between source and target rows
                      if ((linkElTop >= minY && linkElTop <= maxY) || 
                          (linkElBottom >= minY && linkElBottom <= maxY)) {
                        foundMatchingLink = true;
                      }
                    }
                  });
                  
                  if (foundMatchingLink && (linkData as any).dependency_type) {
                    linkId = String(link.id);
                    depType = (linkData as any).dependency_type;
                    break;
                  }
                }
              } catch (err) {
                continue;
              }
            }
            
            // Fallback: if still not found, try to get from linkData directly
            if (!linkId || !depType) {
              // Try to find link by checking which link element we're actually over
              const linkElements = ganttContainer.current.querySelectorAll('.gantt_task_link');
              linkElements.forEach((linkEl: Element) => {
                const linkElRect = linkEl.getBoundingClientRect();
                const linkElTop = linkElRect.top - containerRect.top;
                const linkElBottom = linkElRect.bottom - containerRect.top;
                
                // Check if mouse is within this link element
                if (mouseY >= linkElTop && mouseY <= linkElBottom) {
                  const elLinkId = (linkEl as HTMLElement).getAttribute('data-link-id');
                  const elDepType = (linkEl as HTMLElement).getAttribute('data-dependency-type');
                  
                  if (elLinkId && elDepType) {
                    linkId = elLinkId;
                    depType = elDepType;
                  }
                }
              });
            }
          }
        }

        if (linkId) {
          // Get link data to access task names - ALWAYS get dependency_type from linkData
          let linkData: any = null;
          try {
            linkData = gantt.getLink(linkId);
            // CRITICAL: Always get dependency_type from linkData, not from cached values
            if (linkData && (linkData as any).dependency_type) {
              depType = (linkData as any).dependency_type;
            } else if (linkData) {
              // If linkData exists but no dependency_type, try to find it from original data
              // This shouldn't happen, but handle it gracefully
              depType = depType || 'FS';
            }
          } catch (err) {
            // Try to find link by iterating
            const allLinks = gantt.getLinks();
            for (let i = 0; i < allLinks.length; i++) {
              const link = allLinks[i];
              if (String(link.id) === linkId) {
                try {
                  linkData = gantt.getLink(String(link.id));
                  if (linkData && (linkData as any).dependency_type) {
                    depType = (linkData as any).dependency_type;
                  } else if (linkData) {
                    depType = depType || 'FS';
                  }
                  break;
                } catch (e) {
                  continue;
                }
              }
            }
          }
          
          // Ensure depType is not null before using it
          if (!depType) return;
          
          const depTypeName = getDependencyTypeName(depType);
          
          // Get task names from link data
          let predecessorName = 'Không xác định';
          let successorName = 'Không xác định';
          
          if (linkData) {
            if (linkData.predecessor_name) {
              predecessorName = linkData.predecessor_name;
            } else {
              // Fallback: get from task data
              try {
                const sourceTask = gantt.getTask(String(linkData.source));
                if (sourceTask) predecessorName = sourceTask.text || 'Không xác định';
              } catch (err) {}
            }
            
            if (linkData.successor_name) {
              successorName = linkData.successor_name;
            } else {
              // Fallback: get from task data
              try {
                const targetTask = gantt.getTask(String(linkData.target));
                if (targetTask) successorName = targetTask.text || 'Không xác định';
              } catch (err) {}
            }
          }
          
          // Update tooltip to show task names and dependency type
          linkTooltip.innerHTML = `
            <div style="font-weight: 700; font-size: 13px; margin-bottom: 4px; color: white;">
              ${depType} - ${depTypeName}
            </div>
            <div style="font-size: 11px; color: #d1d5db; line-height: 1.6;">
              <div><strong>Từ:</strong> ${predecessorName}</div>
              <div><strong>Đến:</strong> ${successorName}</div>
            </div>
          `;
          linkTooltip.style.display = 'block';
          linkTooltip.style.left = `${e.clientX - containerRect.left + 10}px`;
          linkTooltip.style.top = `${e.clientY - containerRect.top - 30}px`;
          return;
        }
      }
      
      // Hide tooltip if not over a link
      if (linkTooltip) {
        linkTooltip.style.display = 'none';
      }
    };

    // Add mouseleave event to hide tooltip
    const handleLinkMouseLeave = () => {
      if (linkTooltip) {
        linkTooltip.style.display = 'none';
      }
    };

    // Setup link tooltip after gantt is initialized
    setTimeout(() => {
      // Check if gantt container exists and gantt is initialized
      if (!ganttContainer.current) return;
      
      try {
        // Verify gantt is initialized by checking if config exists
        if (typeof gantt.config === "undefined") return;
      } catch (e) {
        return;
      }
      
      createLinkTooltip();
      
      // Add data attributes to link elements for easier identification
      const addLinkDataAttributes = () => {
        if (!ganttContainer.current) return;
        
        try {
          const allLinks = gantt.getLinks();
          if (!allLinks || allLinks.length === 0) return;
          
          const allLinkElements = ganttContainer.current.querySelectorAll('.gantt_task_link');
          
          // Map link elements to link data by checking which tasks they connect
          allLinks.forEach((link: any) => {
            try {
              const linkData = gantt.getLink(String(link.id));
              if (!linkData || !(linkData as any).dependency_type) return;
              
              const sourceTask = gantt.getTask(String(linkData.source));
              const targetTask = gantt.getTask(String(linkData.target));
              
              if (!sourceTask || !targetTask) return;
              
              // Get task row positions to identify which link element corresponds to this link
              const sourceRow = gantt.getTaskNode(sourceTask.id);
              const targetRow = gantt.getTaskNode(targetTask.id);
              
              if (!sourceRow || !targetRow) return;
              
              const sourceRect = sourceRow.getBoundingClientRect();
              const targetRect = targetRow.getBoundingClientRect();
              const containerRect = ganttContainer.current!.getBoundingClientRect();
              
              // Calculate the vertical range where this link should be
              const minY = Math.min(sourceRect.top, targetRect.top) - containerRect.top;
              const maxY = Math.max(sourceRect.bottom, targetRect.bottom) - containerRect.top;
              
              // Find link elements that are in this vertical range
              allLinkElements.forEach((linkEl: Element) => {
                const linkElRect = linkEl.getBoundingClientRect();
                const linkElTop = linkElRect.top - containerRect.top;
                const linkElBottom = linkElRect.bottom - containerRect.top;
                const linkElCenter = (linkElTop + linkElBottom) / 2;
                
                // Check if this link element is in the vertical range between source and target
                // Allow some tolerance for links that might be slightly outside
                if (linkElCenter >= minY - 20 && linkElCenter <= maxY + 20) {
                  // Check if this element doesn't already have a link-id (to avoid overwriting)
                  const existingLinkId = (linkEl as HTMLElement).getAttribute('data-link-id');
                  if (!existingLinkId) {
                    // Add data attribute to help identify this specific link
                    (linkEl as HTMLElement).setAttribute('data-link-id', String(link.id));
                    (linkEl as HTMLElement).setAttribute('data-dependency-type', (linkData as any).dependency_type || 'FS');
                  }
                }
              });
            } catch (err) {
              // Skip invalid links
            }
          });
        } catch (err) {
          // Silently handle errors when gantt is not ready
        }
      };
      
      // Add data attributes after gantt renders
      const setupLinkAttributes = () => {
        if (!ganttContainer.current) return;
        addLinkDataAttributes();
      };
      
      // Run immediately and after delays to catch any delayed rendering
      setTimeout(setupLinkAttributes, 100);
      setTimeout(setupLinkAttributes, 300);
      setTimeout(setupLinkAttributes, 500);
      setTimeout(setupLinkAttributes, 1000);
      
      // Also set up an interval to periodically update link attributes
      // This ensures attributes stay up to date if links are re-rendered
      const linkAttributeInterval = setInterval(() => {
        if (!ganttContainer.current) {
          clearInterval(linkAttributeInterval);
          return;
        }
        setupLinkAttributes();
      }, 2000);
      
      // Store interval ID for cleanup - only if container exists
      if (ganttContainer.current) {
        (ganttContainer.current as any)._linkAttributeInterval = linkAttributeInterval;
        ganttContainer.current.addEventListener('mousemove', handleLinkMouseMove);
        ganttContainer.current.addEventListener('mouseleave', handleLinkMouseLeave);
      }
    }, 200);

    // Cleanup
    return () => {
      if (messageCleanupInterval) {
        clearInterval(messageCleanupInterval);
      }
      
      // Clear link correction interval
      if (ganttContainer.current && (ganttContainer.current as any)._linkCorrectionInterval) {
        clearInterval((ganttContainer.current as any)._linkCorrectionInterval);
      }
      
      // Clear link attribute interval
      if (ganttContainer.current && (ganttContainer.current as any)._linkAttributeInterval) {
        clearInterval((ganttContainer.current as any)._linkAttributeInterval);
      }
      
      // Remove link tooltip event listeners
      if (ganttContainer.current) {
        ganttContainer.current.removeEventListener('mousemove', handleLinkMouseMove);
        ganttContainer.current.removeEventListener('mouseleave', handleLinkMouseLeave);
        
        // Remove tooltip element
        const tooltip = ganttContainer.current.querySelector('.gantt-link-tooltip');
        if (tooltip) {
          tooltip.remove();
        }
        
        // Remove any remaining error messages
        const messageArea = ganttContainer.current.querySelector('.gantt_message_area');
        if (messageArea) {
          messageArea.remove();
        }
      }
      gantt.clearAll();
    };
  }, [tasks, functions, dependencies, onTaskClick]);

  // Handle zoom level changes without re-parsing data
  useEffect(() => {
    if (!ganttContainer.current) return;

    // Ensure gantt is initialized
    try {
      if (typeof gantt.config === "undefined") return;
    } catch (e) {
      return;
    }

    const applyZoomLevel = (level: "day" | "week" | "month" | "year") => {
      switch (level) {
        case "day":
          gantt.config.scale_unit = "day";
          gantt.config.date_scale = "%d %M";
          gantt.config.subscales = [{ unit: "hour", step: 4, date: "%H:%i" }];
          gantt.config.scale_height = 60;
          break;
        case "week":
          gantt.config.scale_unit = "week";
          gantt.config.date_scale = "Week %W";
          gantt.config.subscales = [{ unit: "day", step: 1, date: "%d %D" }];
          gantt.config.scale_height = 60;
          break;
        case "month":
          gantt.config.scale_unit = "month";
          gantt.config.date_scale = "%F %Y";
          gantt.config.subscales = [{ unit: "week", step: 1, date: "W%W" }];
          gantt.config.scale_height = 60;
          break;
        case "year":
          gantt.config.scale_unit = "year";
          gantt.config.date_scale = "%Y";
          gantt.config.subscales = [{ unit: "month", step: 1, date: "%M" }];
          gantt.config.scale_height = 60;
          break;
      }
    };

    applyZoomLevel(zoomLevel);

    // Render after config change
    setTimeout(() => {
      try {
        gantt.setSizes();
        gantt.render();
      } catch (e) {
        // ignore if not ready
      }
    }, 50);
  }, [zoomLevel, applyZoomLevel]);

  // Zoom handlers
  const handleZoomIn = () => {
    const levels: ('day' | 'week' | 'month' | 'year')[] = ['year', 'month', 'week', 'day'];
    const currentIndex = levels.indexOf(zoomLevel);
    if (currentIndex < levels.length - 1) {
      setZoomLevel(levels[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const levels: ('day' | 'week' | 'month' | 'year')[] = ['day', 'week', 'month', 'year'];
    const currentIndex = levels.indexOf(zoomLevel);
    if (currentIndex < levels.length - 1) {
      setZoomLevel(levels[currentIndex + 1]);
    }
  };

  const handleFitScreen = () => {
    if (ganttContainer.current) {
      gantt.render();
    }
  };

  return (
    <>
      {/* Toolbar */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 2, 
        p: 2, 
        bgcolor: 'white', 
        borderBottom: '1px solid #e5e7eb',
        borderRadius: '12px 12px 0 0'
      }}>
        <ButtonGroup variant="outlined" size="small">
          <Tooltip title="Phóng to">
            <IconButton 
              onClick={handleZoomIn} 
              disabled={zoomLevel === 'day'}
              sx={{ borderRadius: '8px 0 0 8px' }}
            >
              <ZoomIn fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Thu nhỏ">
            <IconButton 
              onClick={handleZoomOut} 
              disabled={zoomLevel === 'year'}
              sx={{ borderRadius: '0 8px 8px 0' }}
            >
              <ZoomOut fontSize="small" />
            </IconButton>
          </Tooltip>
        </ButtonGroup>

        <Divider orientation="vertical" flexItem />

        <ButtonGroup variant="outlined" size="small">
          <Tooltip title="Xem ngày">
            <IconButton 
              onClick={() => setZoomLevel('day')}
              color={zoomLevel === 'day' ? 'primary' : 'default'}
            >
              <CalendarToday fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xem tuần">
            <IconButton 
              onClick={() => setZoomLevel('week')}
              color={zoomLevel === 'week' ? 'primary' : 'default'}
            >
              <CalendarViewWeek fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xem tháng">
            <IconButton 
              onClick={() => setZoomLevel('month')}
              color={zoomLevel === 'month' ? 'primary' : 'default'}
            >
              <CalendarViewMonth fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Xem năm">
            <IconButton 
              onClick={() => setZoomLevel('year')}
              color={zoomLevel === 'year' ? 'primary' : 'default'}
            >
              <CalendarMonth fontSize="small" />
            </IconButton>
          </Tooltip>
        </ButtonGroup>

        <Divider orientation="vertical" flexItem />

        <Tooltip title="Vừa màn hình">
          <IconButton onClick={handleFitScreen} size="small">
            <FitScreen fontSize="small" />
          </IconButton>
        </Tooltip>

        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ 
            px: 2, 
            py: 0.5, 
            bgcolor: '#f3f4f6', 
            borderRadius: 1,
            fontSize: '12px',
            fontWeight: 600,
            color: '#6b7280',
            textTransform: 'uppercase'
          }}>
            {zoomLevel === 'day' ? 'Xem ngày' : zoomLevel === 'week' ? 'Xem tuần' : zoomLevel === 'month' ? 'Xem tháng' : 'Xem năm'}
          </Box>
        </Box>
      </Box>

      <style jsx global>{`
        .gantt_container {
          width: 100%;
          height: 100%;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
        }

        /* Header Styling */
        .gantt_grid_scale,
        .gantt_task_scale {
          background: linear-gradient(180deg, #ffffff 0%, #f9fafb 100%);
          border-bottom: 2px solid #e5e7eb;
        }

        .gantt_grid_head_cell {
          background: transparent;
          color: #6b7280;
          font-weight: 700;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          border-right: 1px solid #e5e7eb;
          padding: 14px 12px;
        }

        /* Hide expand/collapse triangle icons in task list */
        .gantt_open,
        .gantt_close,
        .gantt_grid_cell .gantt_open,
        .gantt_grid_cell .gantt_close,
        .gantt_tree_icon,
        .gantt_grid_cell .gantt_tree_icon {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
          visibility: hidden !important;
        }
        
        /* Remove indent/padding where triangle icons would be */
        .gantt_tree_indent {
          width: 0 !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        
        /* Adjust cell padding to remove space for icons */
        .gantt_grid_cell {
          padding-left: 12px !important;
        }
        
        .gantt_tree_content {
          padding-left: 0 !important;
          margin-left: 0 !important;
        }

        .gantt_scale_line {
          border-top: none;
        }

        .gantt_scale_cell {
          color: #374151;
          font-weight: 600;
          font-size: 12px;
          border-right: 1px solid #e5e7eb;
        }

        /* Row Styling */
        .gantt_row {
          background-color: white;
          border-bottom: 1px solid #f3f4f6;
        }

        .gantt_row.odd {
          background-color: #fafbfc;
        }

        .gantt_row:hover,
        .gantt_row.odd:hover {
          background-color: #f0f9ff !important;
        }

        .gantt_cell {
          border-right: 1px solid #f3f4f6;
        }

        /* Grid cell content styling */
        .gantt-grid-cell,
        .gantt-grid-cell--project {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .gantt-grid-cell__title {
          color: #111827;
          font-weight: 600;
          font-size: 13px;
        }

        .gantt-grid-cell__title--project {
          font-size: 14px;
          font-weight: 700;
        }

        .gantt-grid-cell__icon {
          font-size: 16px;
        }

        .gantt-grid-status {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .gantt-grid-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 12px;
          background-color: #f3f4f6;
          border-radius: 8px;
        }

        .gantt-grid-tag__value {
          color: #1f2937;
          font-weight: 700;
          font-size: 13px;
        }

        .gantt-grid-tag__unit {
          color: #6b7280;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }

        .gantt-grid-assignee {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 10px;
          font-weight: 600;
          color: #1f2937;
        }

        .gantt-grid-assignee__avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: 700;
        }

        .gantt-grid-assignee__name {
          font-size: 13px;
        }

        .gantt-grid-progress {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .gantt-grid-progress__bar {
          width: 64px;
          height: 6px;
          border-radius: 4px;
          background-color: #e5e7eb;
          overflow: hidden;
        }

        .gantt-grid-progress__fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .gantt-grid-progress__value {
          font-weight: 700;
          font-size: 13px;
        }

        .gantt-grid-empty {
          color: #9ca3af;
          font-weight: 500;
        }

        /* Grid Data */
        .gantt_grid_data .gantt_cell {
          padding: 14px 12px;
          vertical-align: middle;
          display: flex;
          align-items: center;
        }

        .gantt_tree_content {
          padding-left: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
        }

        .gantt_tree_indent {
          width: 20px;
          flex: 0 0 20px;
        }

        .gantt_tree_icon {
          flex: 0 0 auto;
        }

        /* Timeline Styling */
        .weekend {
          background-color: #f9fafb !important;
          background-image: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 10px,
            rgba(0, 0, 0, 0.02) 10px,
            rgba(0, 0, 0, 0.02) 20px
          );
        }

        .today {
          background-color: #dbeafe !important;
          position: relative;
        }

        .today::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          width: 2px;
          height: 100%;
          background: linear-gradient(180deg, #3b82f6 0%, #60a5fa 100%);
          transform: translateX(-50%);
          z-index: 1;
        }

        /* Task Bars - Completed */
        .gantt-task-completed .gantt_task_progress {
          background: linear-gradient(135deg, #00c875 0%, #00a560 100%);
          box-shadow: 0 2px 6px rgba(0, 200, 117, 0.3);
        }

        .gantt-task-completed .gantt_task_content {
          background: linear-gradient(135deg, #00c875 0%, #00a560 100%);
        }

        /* Task Bars - In Progress / Doing (Blue) */
        .gantt-task-progress .gantt_task_progress {
          background: linear-gradient(135deg, #579bfc 0%, #4179d6 100%);
          box-shadow: 0 2px 6px rgba(87, 155, 252, 0.3);
        }

        .gantt-task-progress .gantt_task_content {
          background: linear-gradient(135deg, #579bfc 0%, #4179d6 100%);
        }

        /* Task Bars - To Do (Orange) */
        .gantt-task-todo .gantt_task_progress {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
        }

        .gantt-task-todo .gantt_task_content {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        /* Task Bars - Review */
        .gantt-task-review .gantt_task_progress {
          background: linear-gradient(135deg, #a25ddc 0%, #8b4ec3 100%);
          box-shadow: 0 2px 6px rgba(162, 93, 220, 0.3);
        }

        .gantt-task-review .gantt_task_content {
          background: linear-gradient(135deg, #a25ddc 0%, #8b4ec3 100%);
        }

        /* Task Bars - Blocked */
        .gantt-task-blocked .gantt_task_progress {
          background: linear-gradient(135deg, #e44258 0%, #c9374a 100%);
          box-shadow: 0 2px 6px rgba(228, 66, 88, 0.3);
        }

        .gantt-task-blocked .gantt_task_content {
          background: linear-gradient(135deg, #e44258 0%, #c9374a 100%);
        }

        /* Task Bars - Default */
        .gantt-task-default .gantt_task_progress {
          background: linear-gradient(135deg, #579bfc 0%, #4179d6 100%);
          box-shadow: 0 2px 6px rgba(87, 155, 252, 0.3);
        }

        .gantt-task-default .gantt_task_content {
          background: linear-gradient(135deg, #579bfc 0%, #4179d6 100%);
        }

        /* Task Bar General */
        .gantt_task_line {
          border-radius: 6px;
          border: none;
          overflow: visible !important;
          display: flex !important;
          align-items: center !important;
        }

        .gantt_task_content {
          color: white;
          font-weight: 600;
          font-size: 13px;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
          line-height: 32px;
          padding: 0 12px;
          white-space: nowrap;
          overflow: visible;
          display: flex !important;
          align-items: center !important;
          height: 100% !important;
        }

        .gantt_task_line:hover {
          opacity: 0.95;
          transform: translateY(-1px);
          transition: all 0.2s ease;
          z-index: 10 !important;
        }

        .gantt_task_cell {
          overflow: visible !important;
        }

        .gantt_bars_area {
          overflow: visible !important;
        }

        /* Progress Bar */
        .gantt_task_progress {
          opacity: 0.3;
          border-radius: 6px;
        }

        /* Project Tasks */
        .gantt_project .gantt_task_content {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }

        /* Function Tasks - Different style to distinguish from regular tasks */
        .gantt-task-function .gantt_task_progress {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          box-shadow: 0 2px 6px rgba(245, 158, 11, 0.3);
        }

        .gantt-task-function .gantt_task_content {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          font-weight: 700;
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
        }

        /* Orphaned Group Tasks (Nhóm Công việc) - Disable click and pointer events */
        .gantt-task-orphaned-group .gantt_task_progress {
          background: linear-gradient(135deg, #579bfc 0%, #4179d6 100%);
          box-shadow: 0 2px 6px rgba(87, 155, 252, 0.3);
        }

        .gantt-task-orphaned-group .gantt_task_content {
          background: linear-gradient(135deg, #579bfc 0%, #4179d6 100%);
        }

        .gantt-task-orphaned-group .gantt_task_line {
          pointer-events: none !important;
          cursor: default !important;
        }

        .gantt-task-orphaned-group .gantt_task_line:hover {
          opacity: 1 !important;
          transform: none !important;
          cursor: default !important;
        }

        /* Dependencies - Enhanced styling */
        .gantt_link_arrow {
          border-color: #6b7280;
          border-width: 6px;
        }

        .gantt_line_wrapper div {
          background-color: #6b7280;
          height: 2px;
        }

        .gantt_link_arrow_right {
          border-left-color: #6b7280;
        }

        .gantt_link_arrow_left {
          border-right-color: #6b7280;
        }

        .gantt_task_link:hover .gantt_line_wrapper div {
          background-color: #7b68ee;
          box-shadow: 0 0 8px rgba(123, 104, 238, 0.5);
          height: 3px;
        }

        .gantt_task_link:hover .gantt_link_arrow {
          border-color: #7b68ee;
          border-width: 8px;
        }
        
        /* CRITICAL: Force correct link rendering for FS and SF types */
        /* This CSS targets links that should be FS (finish-to-start) but are being rendered as FF */
        .gantt-link-fs .gantt_line_wrapper {
          /* Ensure FS links connect to the start (left edge) of target task */
        }
        
        .gantt-link-sf .gantt_line_wrapper {
          /* Ensure SF links connect to the finish (right edge) of target task */
        }

        .gantt_link_control {
          background-color: white;
          border: 2px solid #579bfc;
          border-radius: 50%;
        }

        /* Tooltip */
        .gantt_tooltip {
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
          padding: 0;
          font-family: 'Inter', sans-serif;
        }

        /* Scrollbar */
        .gantt_layout_cell::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        .gantt_layout_cell::-webkit-scrollbar-track {
          background: #f3f4f6;
        }

        .gantt_layout_cell::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }

        .gantt_layout_cell::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }

        /* Tree Icons */
        .gantt_tree_icon.gantt_folder_open,
        .gantt_tree_icon.gantt_folder_closed {
          background: none;
          color: #6b7280;
          font-size: 14px;
        }

        .gantt_tree_icon.gantt_folder_open::before {
          content: '📂';
        }

        .gantt_tree_icon.gantt_folder_closed::before {
          content: '📁';
        }

        /* Responsive */
        @media (max-width: 768px) {
          .gantt_grid_scale .gantt_grid_head_cell {
            font-size: 10px;
          }
          
          .gantt_task_content {
            font-size: 11px;
          }
        }

        /* Hide Gantt error messages and message area */
        .gantt_message_area {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        .gantt-info.gantt-error,
        .gantt-error,
        .gantt_message_area .gantt-error,
        .gantt_message_area .gantt-info {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }

        /* Hide any alert messages from gantt */
        .gantt_container [role="alert"] {
          display: none !important;
          visibility: hidden !important;
        }
      `}</style>
      <div 
        ref={ganttContainer} 
        className="gantt_container"
        style={{ width: '100%', height: '600px', borderRadius: '0 0 12px 12px' }}
      />
    </>
  );
}

function transformToGanttData(
  tasks: Task[], 
  functions: FunctionItem[],
  dependencies: Record<string, { dependencies: Dependency[]; dependents: Dependency[] }>
) {
  const ganttTasks: any[] = [];
  const ganttLinks: any[] = [];
  let linkId = 1;
  const today = new Date();

  // Add functions as top-level items
  functions.forEach(func => {
    const hasDate = func.start_date && func.deadline;
    
    // Calculate duration from function's date range
    // If function has dates, use them; otherwise calculate from tasks
    let functionStartDate: string;
    let functionDuration: number;
    
    if (hasDate) {
      functionStartDate = formatDate(new Date(func.start_date!));
      functionDuration = Math.max(1, Math.ceil((new Date(func.deadline!).getTime() - new Date(func.start_date!).getTime()) / 86400000));
    } else {
      // Find tasks for this function to calculate date range
      const functionTasks = tasks.filter(t => {
        const taskFunctionId = typeof t.function_id === 'object' 
          ? (t.function_id as any)?._id 
          : t.function_id;
        return taskFunctionId === func._id;
      });
      
      if (functionTasks.length > 0) {
        // Get all dates from tasks (including subtasks)
        const allTaskDates: Date[] = [];
        functionTasks.forEach(task => {
          if (task.start_date) allTaskDates.push(new Date(task.start_date));
          if (task.deadline) allTaskDates.push(new Date(task.deadline));
          
          // Include subtask dates
          const subtasks = tasks.filter(t => t.parent_task_id === task._id);
          subtasks.forEach(subtask => {
            if (subtask.start_date) allTaskDates.push(new Date(subtask.start_date));
            if (subtask.deadline) allTaskDates.push(new Date(subtask.deadline));
          });
        });
        
        if (allTaskDates.length > 0) {
          const minDate = new Date(Math.min(...allTaskDates.map(d => d.getTime())));
          const maxDate = new Date(Math.max(...allTaskDates.map(d => d.getTime())));
          functionStartDate = formatDate(minDate);
          functionDuration = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000));
        } else {
          functionStartDate = formatDate(today);
          functionDuration = 7; // Default 1 week
        }
      } else {
        functionStartDate = formatDate(today);
        functionDuration = 7; // Default 1 week
      }
    }

    // Add function as a task item (not project) so it displays a bar
    // Use type "task" so it shows a bar in the timeline
    ganttTasks.push({
      id: String(func._id), // Ensure ID is string
      text: func.title,
      start_date: functionStartDate,
      duration: functionDuration,
      progress: 0, // Functions don't have progress, it's calculated from tasks
      status_name: func.status,
      type: "task", // Change to "task" so it shows a bar
      open: true,
      assignee: '',
      readonly: true,
      isFunction: true // Mark as function for styling
    });

    // Add tasks under this function
    const functionTasks = tasks.filter(t => {
      const taskFunctionId = typeof t.function_id === 'object' 
        ? (t.function_id as any)?._id 
        : t.function_id;
      return !t.parent_task_id && taskFunctionId === func._id;
    });

    functionTasks.forEach(task => {
      const taskHasDate = task.start_date && task.deadline;
      
      // Calculate task dates - use function's start date as fallback if task has no dates
      let taskStartDate: string;
      let taskDuration: number;
      
      if (taskHasDate) {
        taskStartDate = formatDate(new Date(task.start_date!));
        taskDuration = Math.max(1, Math.ceil((new Date(task.deadline!).getTime() - new Date(task.start_date!).getTime()) / 86400000));
      } else {
        // If task has no dates, use function's start date or calculate from function
        const funcTask = ganttTasks.find(t => String(t.id) === String(func._id));
        if (funcTask && funcTask.start_date) {
          taskStartDate = funcTask.start_date;
          taskDuration = 3; // Default 3 days
        } else {
          taskStartDate = formatDate(today);
          taskDuration = 3;
        }
      }
      
      ganttTasks.push({
        id: String(task._id), // Ensure ID is string
        text: task.title,
        start_date: taskStartDate,
        duration: taskDuration,
        progress: (task.progress || 0) / 100,
        parent: String(func._id), // Ensure parent ID is string
        assignee: task.assignee_id?.full_name || task.assignee_id?.email || '',
        status_name: typeof task.status === 'object' ? task.status?.name : task.status,
        type: "task",
        readonly: true
      });

      // Add subtasks
      const subtasks = tasks.filter(t => t.parent_task_id === task._id);
      subtasks.forEach(subtask => {
        const subHasDate = subtask.start_date && subtask.deadline;
        
        // Calculate subtask dates - use parent task's start date as fallback
        let subtaskStartDate: string;
        let subtaskDuration: number;
        
        if (subHasDate) {
          subtaskStartDate = formatDate(new Date(subtask.start_date!));
          subtaskDuration = Math.max(1, Math.ceil((new Date(subtask.deadline!).getTime() - new Date(subtask.start_date!).getTime()) / 86400000));
        } else {
          // Find parent task to use its date
          const parentTask = ganttTasks.find(t => String(t.id) === String(task._id));
          if (parentTask && parentTask.start_date) {
            subtaskStartDate = parentTask.start_date;
            subtaskDuration = 2; // Default 2 days
          } else {
            subtaskStartDate = formatDate(today);
            subtaskDuration = 2;
          }
        }
        
        ganttTasks.push({
          id: String(subtask._id), // Ensure ID is string
          text: subtask.title,
          start_date: subtaskStartDate,
          duration: subtaskDuration,
          progress: (subtask.progress || 0) / 100,
          parent: String(task._id), // Ensure parent ID is string
          assignee: subtask.assignee_id?.full_name || subtask.assignee_id?.email || '',
          status_name: typeof subtask.status === 'object' ? subtask.status?.name : subtask.status,
          type: "task",
          readonly: true
        });
      });
    });
  });

  // Add tasks that don't have a function (orphaned tasks)
  const orphanedTasks = tasks.filter(t => {
    const taskFunctionId = typeof t.function_id === 'object' 
      ? (t.function_id as any)?._id 
      : t.function_id;
    return !t.parent_task_id && !taskFunctionId;
  });

  if (orphanedTasks.length > 0) {
    const orphanedGroupId = 'orphaned_tasks';
    
    // Calculate date range for orphaned tasks
    const orphanedDates: Date[] = [];
    orphanedTasks.forEach(task => {
      if (task.start_date) orphanedDates.push(new Date(task.start_date));
      if (task.deadline) orphanedDates.push(new Date(task.deadline));
    });
    
    let orphanedStartDate: string;
    let orphanedDuration: number;
    
    if (orphanedDates.length > 0) {
      const minDate = new Date(Math.min(...orphanedDates.map(d => d.getTime())));
      const maxDate = new Date(Math.max(...orphanedDates.map(d => d.getTime())));
      orphanedStartDate = formatDate(minDate);
      orphanedDuration = Math.max(1, Math.ceil((maxDate.getTime() - minDate.getTime()) / 86400000));
    } else {
      orphanedStartDate = formatDate(today);
      orphanedDuration = 7;
    }
    
      ganttTasks.push({
        id: String(orphanedGroupId), // Ensure ID is string
        text: 'Nhóm Công việc',
        type: "task", // Change to task so it shows a bar
        open: true,
        start_date: orphanedStartDate,
        duration: orphanedDuration,
        readonly: true,
        isOrphanedGroup: true // Mark as orphaned group for identification
      });

    orphanedTasks.forEach(task => {
      const hasDate = task.start_date && task.deadline;
      
      let taskStartDate: string;
      let taskDuration: number;
      
      if (hasDate) {
        taskStartDate = formatDate(new Date(task.start_date!));
        taskDuration = Math.max(1, Math.ceil((new Date(task.deadline!).getTime() - new Date(task.start_date!).getTime()) / 86400000));
      } else {
        const orphanedGroup = ganttTasks.find(t => String(t.id) === String(orphanedGroupId));
        if (orphanedGroup && orphanedGroup.start_date) {
          taskStartDate = orphanedGroup.start_date;
          taskDuration = 3;
        } else {
          taskStartDate = formatDate(today);
          taskDuration = 3;
        }
      }
      
      ganttTasks.push({
        id: String(task._id), // Ensure ID is string
        text: task.title,
        start_date: taskStartDate,
        duration: taskDuration,
        progress: (task.progress || 0) / 100,
        parent: String(orphanedGroupId), // Ensure parent ID is string
        assignee: task.assignee_id?.full_name || task.assignee_id?.email || '',
        status_name: typeof task.status === 'object' ? task.status?.name : task.status,
        type: "task",
        readonly: true
      });

      // Add subtasks for orphaned tasks
      const subtasks = tasks.filter(t => t.parent_task_id === task._id);
      subtasks.forEach(subtask => {
        const subHasDate = subtask.start_date && subtask.deadline;
        
        let subtaskStartDate: string;
        let subtaskDuration: number;
        
        if (subHasDate) {
          subtaskStartDate = formatDate(new Date(subtask.start_date!));
          subtaskDuration = Math.max(1, Math.ceil((new Date(subtask.deadline!).getTime() - new Date(subtask.start_date!).getTime()) / 86400000));
        } else {
          // Find parent task
          const parentTask = ganttTasks.find(t => String(t.id) === String(task._id));
          if (parentTask && parentTask.start_date) {
            subtaskStartDate = parentTask.start_date;
            subtaskDuration = 2;
          } else {
            subtaskStartDate = formatDate(today);
            subtaskDuration = 2;
          }
        }
        
        ganttTasks.push({
          id: String(subtask._id), // Ensure ID is string
          text: subtask.title,
          start_date: subtaskStartDate,
          duration: subtaskDuration,
          progress: (subtask.progress || 0) / 100,
          parent: String(task._id), // Ensure parent ID is string
          assignee: subtask.assignee_id?.full_name || subtask.assignee_id?.email || '',
          status_name: typeof subtask.status === 'object' ? subtask.status?.name : subtask.status,
          type: "task",
          readonly: true
        });
      });
    });
  }

  // Add dependencies - create a set to track added links and avoid duplicates
  const addedLinks = new Set<string>();
  
  // Map dependency types to dhtmlx-gantt format
  // CRITICAL: Based on testing, dhtmlx-gantt uses numeric types (0, 1, 2, 3)
  // 
  // dhtmlx-gantt link type convention:
  // - source = predecessor (task being depended on)
  // - target = successor (task that depends)
  // 
  // Link type meanings (when source=predecessor, target=successor):
  // Type 0 = FS (Finish-to-Start): finish of source → start of target
  // Type 1 = SS (Start-to-Start): start of source → start of target
  // Type 2 = FF (Finish-to-Finish): finish of source → finish of target
  // Type 3 = SF (Start-to-Finish): start of source → finish of target
  //
  // However, dhtmlx-gantt may auto-convert link types based on task positions.
  // We need to ensure the correct type is maintained.
  const typeMap: Record<string, number> = {
    'FS': 0, // Finish-to-Start: finish of predecessor → start of successor
    'SS': 1, // Start-to-Start: start of predecessor → start of successor
    'FF': 2, // Finish-to-Finish: finish of predecessor → finish of successor
    'SF': 3, // Start-to-Finish: start of predecessor → finish of successor
    'relates_to': 0 // Relates to - treat as FS
  };

  // Helper function to normalize dependency type
  // Returns number as dhtmlx-gantt expects numeric types
  const normalizeDependencyType = (type: string | undefined): number => {
    if (!type) return 0; // Default to FS
    const normalized = type.toUpperCase().trim();
    return typeMap[normalized] !== undefined ? typeMap[normalized] : 0;
  };

  // Helper function to extract ID from object or string
  const extractId = (id: any): string | null => {
    if (!id) return null;
    if (typeof id === 'string') return id;
    if (typeof id === 'object' && id._id) return String(id._id);
    return String(id);
  };

  // Process dependencies for all tasks (including functions if they can have dependencies)
  const allTaskIds = new Set([
    ...tasks.map(t => t._id),
    ...functions.map(f => f._id)
  ]);

  allTaskIds.forEach(taskId => {
    const deps = dependencies[taskId];
    if (!deps?.dependencies) return;

    deps.dependencies.forEach(dep => {
     
      // So: source = successor (task that depends), target = predecessor (task being depended on)
      const predecessorId = extractId(dep.depends_on_task_id); // Predecessor (task being depended on)
      const successorId = extractId(taskId); // Successor (current task that depends)
      
      if (!predecessorId || !successorId || predecessorId === successorId) return;

      // Check if both predecessor and successor exist in gantt tasks
      const predecessorExists = ganttTasks.some(t => String(t.id) === String(predecessorId));
      const successorExists = ganttTasks.some(t => String(t.id) === String(successorId));
      
      if (!predecessorExists || !successorExists) return;

      // Normalize dependency type (will default to 0 if invalid)
      const dependencyType = normalizeDependencyType(dep.dependency_type);
      const originalDepType = dep.dependency_type?.toUpperCase().trim() || 'FS';
      
      // Validate dependency type is valid (0, 1, 2, or 3)
      if (![0, 1, 2, 3].includes(dependencyType)) {
        return; // Silently skip invalid links
      }

      // Get task names for tooltip
      const predecessorTask = ganttTasks.find(t => String(t.id) === String(predecessorId));
      const successorTask = ganttTasks.find(t => String(t.id) === String(successorId));
      const predecessorName = predecessorTask?.text || 'Không xác định';
      const successorName = successorTask?.text || 'Không xác định';
      
     
      
      let linkSource: string;
      let linkTarget: string;
      let finalLinkType: number;
      
      // CORRECTED: dhtmlx-gantt link convention for ALL types:
      // source = predecessor (task being depended on, e.g., task 'a')
      // target = successor (task that depends, e.g., task 'c')
      // 
      // The arrow should point FROM source TO target (from 'a' to 'c')
      // 
      // Link type determines which edges are connected:
      // Type 0 (FS): finish of source → start of target (finish of 'a' → start of 'c')
      // Type 1 (SS): start of source → start of target (start of 'a' → start of 'c')
      // Type 2 (FF): finish of source → finish of target (finish of 'a' → finish of 'c')
      // Type 3 (SF): start of source → finish of target (start of 'a' → finish of 'c')
      //
      // For FS: We want finish of predecessor (a) → start of successor (c)
      // Arrow should point FROM a TO c
      linkSource = predecessorId; // Source = 'a' (predecessor)
      linkTarget = successorId;   // Target = 'c' (successor)
      finalLinkType = dependencyType; // Use the normalized type (0 for FS, 1 for SS, etc.)

      // Create unique key for this link to avoid duplicates
      const linkKey = `${linkSource}-${linkTarget}-${finalLinkType}`;
      if (addedLinks.has(linkKey)) return;
      addedLinks.add(linkKey);
      
      const link: any = {
        id: linkId++,
        source: linkSource,
        target: linkTarget,
        type: finalLinkType,
        dependency_type: dep.dependency_type, // Store original dependency type for tooltip (FS, FF, SS, SF)
        predecessor_name: predecessorName, // Store predecessor task name for tooltip
        successor_name: successorName // Store successor task name for tooltip
      };
      
      ganttLinks.push(link);
    });
  });

  // Also process dependents (reverse dependencies)
  // For dependents: other tasks depend on current task (taskId)
  allTaskIds.forEach(taskId => {
    const deps = dependencies[taskId];
    if (!deps?.dependents) return;

    deps.dependents.forEach(dep => {
      // For dependents: dep.task_id depends on current task (taskId)
      // Database: dep.task_id (successor) depends on taskId (predecessor)
      // 
      // CORRECTED: dhtmlx-gantt convention:
      // - source = task that depends (successor)
      // - target = task being depended on (predecessor)
      const predecessorId = extractId(taskId); // Predecessor (current task being depended on)
      const successorId = extractId(dep.task_id); // Successor (task that depends)
      
      if (!predecessorId || !successorId || predecessorId === successorId) return;

      // Check if both predecessor and successor exist in gantt tasks
      const predecessorExists = ganttTasks.some(t => String(t.id) === String(predecessorId));
      const successorExists = ganttTasks.some(t => String(t.id) === String(successorId));
      
      if (!predecessorExists || !successorExists) return;

      // Normalize dependency type (will default to 0 if invalid)
      const dependencyType = normalizeDependencyType(dep.dependency_type);
      const originalDepType = dep.dependency_type?.toUpperCase().trim() || 'FS';
      
      // Validate dependency type is valid (0, 1, 2, or 3)
      if (![0, 1, 2, 3].includes(dependencyType)) {
        return; // Silently skip invalid links
      }

      // Get task names for tooltip
      const predecessorTask = ganttTasks.find(t => String(t.id) === String(predecessorId));
      const successorTask = ganttTasks.find(t => String(t.id) === String(successorId));
      const predecessorName = predecessorTask?.text || 'Không xác định';
      const successorName = successorTask?.text || 'Không xác định';
      
      // Use same convention as dependencies: source=predecessor, target=successor
      // Arrow points FROM source TO target (from 'a' to 'c')
      let linkSource: string;
      let linkTarget: string;
      let finalLinkType: number;
      
      linkSource = predecessorId; // Source = predecessor (task 'a')
      linkTarget = successorId;   // Target = successor (task 'c')
      finalLinkType = dependencyType; // Use normalized type

      // Create unique key for this link to avoid duplicates
      const linkKey = `${linkSource}-${linkTarget}-${finalLinkType}`;
      if (addedLinks.has(linkKey)) return;
      addedLinks.add(linkKey);
      
      const link: any = {
        id: linkId++,
        source: linkSource,
        target: linkTarget,
        type: finalLinkType,
        dependency_type: dep.dependency_type, // Store original dependency type for tooltip (FS, FF, SS, SF)
        predecessor_name: predecessorName, // Store predecessor task name for tooltip
        successor_name: successorName // Store successor task name for tooltip
      };
      
      ganttLinks.push(link);
    });
  });

  return {
    data: ganttTasks,
    links: ganttLinks
  };
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

