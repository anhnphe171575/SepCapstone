"use client";

import type { GanttTask } from "./gantt-chart";

export const STATUS_COLORS: Record<GanttTask["status"], string> = {
  todo: "bg-rose-500",
  "in-progress": "bg-amber-500",
  completed: "bg-emerald-500",
};

export const STATUS_LABELS: Record<GanttTask["status"], string> = {
  todo: "To Do",
  "in-progress": "In Progress",
  completed: "Completed",
};

interface GanttTaskBarProps {
  task: GanttTask;
  startDate: Date;
  totalDays: number;
}

export function GanttTaskBar({ task, startDate, totalDays }: GanttTaskBarProps) {
  if (totalDays <= 0) {
    return null;
  }

  const taskStart = new Date(task.startDate);
  const taskEnd = new Date(task.endDate);

  const msPerDay = 86400000;
  const daysFromStart = Math.max(0, Math.round((taskStart.getTime() - startDate.getTime()) / msPerDay));
  const taskDuration = Math.max(1, Math.round((taskEnd.getTime() - taskStart.getTime()) / msPerDay) + 1);

  const leftPercent = (daysFromStart / totalDays) * 100;
  const widthPercent = (taskDuration / totalDays) * 100;

  return (
    <div className="relative h-9 w-full" style={{ minWidth: `${Math.max(totalDays, 1) * 64}px` }}>
      <div
        className={`absolute flex h-8 items-center rounded-md px-3 text-xs font-semibold text-white shadow-sm shadow-black/15 transition-all duration-150 hover:shadow-md hover:brightness-105 ${
          STATUS_COLORS[task.status]
        } opacity-90 hover:opacity-100`}
        style={{
          left: `${leftPercent}%`,
          width: `${widthPercent}%`,
          minWidth: "64px",
        }}
        title={`${task.name} (${STATUS_LABELS[task.status]})`}
      >
        <span className="truncate">{task.name}</span>
      </div>
    </div>
  );
}
