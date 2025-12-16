
"use client";

import { useMemo } from "react";

import { Card } from "@/components/ui/card";
import { GanttTaskBar, STATUS_COLORS, STATUS_LABELS } from "./gantt-task-bar";

export type TaskStatus = "todo" | "in-progress" | "completed";

export interface GanttTask {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: TaskStatus;
  progress?: number;
  dependsOn?: string[];
}

export interface GanttFunction {
  id: string;
  name: string;
  tasks: GanttTask[];
}

export interface GanttFeature {
  id: string;
  name: string;
  functions: GanttFunction[];
}

export interface GanttMilestone {
  id: string;
  name: string;
  features: GanttFeature[];
}

export interface GanttProject {
  id: string;
  name: string;
  milestones: GanttMilestone[];
}

export interface GanttChartProps {
  project: GanttProject;
  selectedMilestones: Set<string>;
  selectedFeatures: Set<string>;
  selectedFunctions: Set<string>;
}

export function GanttChart({
  project,
  selectedMilestones,
  selectedFeatures,
  selectedFunctions,
}: GanttChartProps) {
  const filteredTasks = useMemo(() => {
    const tasks: Array<GanttTask & { milestone: string; feature: string; function: string }> = [];

    project.milestones.forEach((milestone) => {
      if (selectedMilestones.size > 0 && !selectedMilestones.has(milestone.id)) {
        return;
      }

      milestone.features.forEach((feature) => {
        if (selectedFeatures.size > 0 && !selectedFeatures.has(feature.id)) {
          return;
        }

        feature.functions.forEach((fn) => {
          if (selectedFunctions.size > 0 && !selectedFunctions.has(fn.id)) {
            return;
          }

          fn.tasks.forEach((task) => {
            tasks.push({
              ...task,
              milestone: milestone.name,
              feature: feature.name,
              function: fn.name,
            });
          });
        });
      });
    });

    return tasks;
  }, [project, selectedMilestones, selectedFeatures, selectedFunctions]);

  const dateRange = useMemo(() => {
    if (filteredTasks.length === 0) {
      const today = new Date();
      return { start: today, end: today, days: 0 };
    }

    const start = filteredTasks.reduce((earliest, task) => {
      const candidate = new Date(task.startDate);
      return candidate < earliest ? candidate : earliest;
    }, new Date(filteredTasks[0].startDate));

    const end = filteredTasks.reduce((latest, task) => {
      const candidate = new Date(task.endDate);
      return candidate > latest ? candidate : latest;
    }, new Date(filteredTasks[0].endDate));

    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);

    return { start, end, days };
  }, [filteredTasks]);

  if (filteredTasks.length === 0) {
    return (
      <Card className="flex min-h-[220px] items-center justify-center bg-white/80 text-sm text-muted-foreground shadow-sm">
        Không có task nào phù hợp bộ lọc.
      </Card>
    );
  }

  return (
    <Card className="overflow-x-auto bg-gradient-to-br from-white via-orange-50/60 to-rose-50/40 p-6 shadow-lg shadow-orange-100/40 ring-1 ring-orange-100">
      <div className="inline-block min-w-full">
        <div className="flex gap-3">
          {/* Left column */}
          <div className="w-96 flex-shrink-0 rounded-2xl border border-orange-200/70 bg-white/80 shadow-sm">
            <div className="flex h-12 items-center rounded-t-2xl border-b border-orange-100 bg-gradient-to-r from-orange-100/70 to-rose-100/70 px-4 text-sm font-semibold text-orange-700">
              Tasks
            </div>
            <div className="divide-y divide-orange-100/70">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="px-4 py-3 text-sm text-slate-700 transition-colors hover:bg-orange-50/80"
                  title={`${task.milestone} · ${task.feature} · ${task.function}`}
                >
                  <div className="flex items-start gap-2">
                    <span
                      className={`mt-1 inline-flex h-2.5 w-2.5 flex-shrink-0 rounded-full ${STATUS_COLORS[task.status]} shadow-sm shadow-black/10`}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold text-slate-800">{task.name}</div>
                      <div className="truncate text-xs text-slate-400">{task.function}</div>
                      <div className="truncate text-xs text-slate-300">{STATUS_LABELS[task.status]}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline */}
          <div
            className="relative min-w-max flex-1 rounded-2xl border border-orange-200/70 bg-white/90 shadow-sm"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(249, 115, 22, 0.08) 1px, transparent 1px)",
              backgroundSize: "64px 100%",
            }}
          >
            <div className="flex h-12 items-center rounded-t-2xl border-b border-orange-100 bg-gradient-to-r from-white via-orange-50 to-white px-3 text-xs font-semibold text-orange-600">
              <div className="flex">
                {Array.from({ length: dateRange.days }).map((_, index) => {
                  const date = new Date(dateRange.start);
                  date.setDate(date.getDate() + index);
                  return (
                    <div
                      key={index}
                      className="w-16 border-r border-orange-100 text-center text-[11px] font-semibold tracking-wide"
                      title={date.toDateString()}
                    >
                      {date.getDate()}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="divide-y divide-orange-100/70">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex h-14 items-center bg-white/70 px-3 py-2 odd:bg-orange-50/30"
                >
                  <GanttTaskBar task={task} startDate={dateRange.start} totalDays={dateRange.days} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
