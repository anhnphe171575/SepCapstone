"use client";

import { useState } from "react";

import { Card } from "@/components/ui/card";

import type {
  GanttFeature,
  GanttFunction,
  GanttMilestone,
} from "@/components/gantt-chart";

export interface GanttFilterProps {
  milestones: GanttMilestone[];
  onFilterChange: (filters: {
    milestones: Set<string>;
    features: Set<string>;
    functions: Set<string>;
  }) => void;
}

export function GanttFilter({ milestones, onFilterChange }: GanttFilterProps) {
  const [selectedMilestones, setSelectedMilestones] = useState<Set<string>>(new Set());
  const [selectedFeatures, setSelectedFeatures] = useState<Set<string>>(new Set());
  const [selectedFunctions, setSelectedFunctions] = useState<Set<string>>(new Set());

  const [openMilestone, setOpenMilestone] = useState(false);
  const [openFeature, setOpenFeature] = useState(false);
  const [openFunction, setOpenFunction] = useState(false);

  const availableFeatures: GanttFeature[] = Array.from(selectedMilestones).flatMap((milestoneId) => {
    const milestone = milestones.find((m) => m.id === milestoneId);
    return milestone ? milestone.features : [];
  });

  const availableFunctions: GanttFunction[] = Array.from(selectedFeatures).flatMap((featureId) => {
    const feature = availableFeatures.find((f) => f.id === featureId);
    return feature ? feature.functions : [];
  });

  const emit = (milestoneSet: Set<string>, featureSet: Set<string>, functionSet: Set<string>) => {
    onFilterChange({
      milestones: new Set(milestoneSet),
      features: new Set(featureSet),
      functions: new Set(functionSet),
    });
  };

  const handleMilestoneToggle = (milestoneId: string) => {
    const nextMilestones = new Set(selectedMilestones);
    let nextFeatures = new Set(selectedFeatures);
    let nextFunctions = new Set(selectedFunctions);

    if (nextMilestones.has(milestoneId)) {
      nextMilestones.delete(milestoneId);
      nextFeatures = new Set();
      nextFunctions = new Set();
    } else {
      nextMilestones.add(milestoneId);
    }

    setSelectedMilestones(nextMilestones);
    setSelectedFeatures(nextFeatures);
    setSelectedFunctions(nextFunctions);
    emit(nextMilestones, nextFeatures, nextFunctions);
  };

  const handleFeatureToggle = (featureId: string) => {
    const nextFeatures = new Set(selectedFeatures);
    let nextFunctions = new Set(selectedFunctions);

    if (nextFeatures.has(featureId)) {
      nextFeatures.delete(featureId);
      nextFunctions = new Set();
    } else {
      nextFeatures.add(featureId);
    }

    setSelectedFeatures(nextFeatures);
    setSelectedFunctions(nextFunctions);
    emit(selectedMilestones, nextFeatures, nextFunctions);
  };

  const handleFunctionToggle = (functionId: string) => {
    const nextFunctions = new Set(selectedFunctions);
    if (nextFunctions.has(functionId)) {
      nextFunctions.delete(functionId);
    } else {
      nextFunctions.add(functionId);
    }
    setSelectedFunctions(nextFunctions);
    emit(selectedMilestones, selectedFeatures, nextFunctions);
  };

  const handleClearAll = () => {
    const empty = { milestones: new Set<string>(), features: new Set<string>(), functions: new Set<string>() };
    setSelectedMilestones(empty.milestones);
    setSelectedFeatures(empty.features);
    setSelectedFunctions(empty.functions);
    emit(empty.milestones, empty.features, empty.functions);
  };

  return (
    <Card className="border-b border-border bg-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Bộ lọc</h3>
        {(selectedMilestones.size > 0 || selectedFeatures.size > 0 || selectedFunctions.size > 0) && (
          <button
            type="button"
            onClick={handleClearAll}
            className="rounded-md border border-border px-3 py-1 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            Xóa tất cả
          </button>
        )}
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:gap-8">
        <FilterColumn
          label="Mốc thời gian"
          placeholder="Chọn mốc thời gian..."
          open={openMilestone}
          onToggle={() => setOpenMilestone((v) => !v)}
          disabled={false}
          selectedCount={selectedMilestones.size}
        >
          {milestones.map((milestone) => (
            <FilterOption
              key={milestone.id}
              label={milestone.name}
              checked={selectedMilestones.has(milestone.id)}
              onToggle={() => handleMilestoneToggle(milestone.id)}
            />
          ))}
        </FilterColumn>

        <FilterColumn
          label="Tính năng"
          placeholder="Chọn tính năng..."
          open={openFeature}
          onToggle={() => setOpenFeature((v) => !v)}
          disabled={selectedMilestones.size === 0}
          selectedCount={selectedFeatures.size}
        >
          {availableFeatures.map((feature) => (
            <FilterOption
              key={feature.id}
              label={feature.name}
              checked={selectedFeatures.has(feature.id)}
              onToggle={() => handleFeatureToggle(feature.id)}
            />
          ))}
        </FilterColumn>

        <FilterColumn
          label="Chức năng"
          placeholder="Chọn chức năng..."
          open={openFunction}
          onToggle={() => setOpenFunction((v) => !v)}
          disabled={selectedFeatures.size === 0}
          selectedCount={selectedFunctions.size}
        >
          {availableFunctions.map((fn) => (
            <FilterOption
              key={fn.id}
              label={fn.name}
              checked={selectedFunctions.has(fn.id)}
              onToggle={() => handleFunctionToggle(fn.id)}
            />
          ))}
        </FilterColumn>
      </div>
    </Card>
  );
}

interface FilterColumnProps {
  label: string;
  placeholder: string;
  selectedCount: number;
  open: boolean;
  disabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function FilterColumn({
  label,
  placeholder,
  selectedCount,
  open,
  disabled,
  onToggle,
  children,
}: FilterColumnProps) {
  return (
    <div className="flex-1">
      <div className="text-sm font-medium text-muted-foreground mb-2">{label}</div>
      <div className="relative">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-border bg-transparent px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled}
          onClick={onToggle}
        >
          <span>{selectedCount === 0 ? placeholder : `${selectedCount} đã chọn`}</span>
          <ChevronIcon />
        </button>
        {open && !disabled && (
          <div className="absolute top-full left-0 right-0 z-10 mt-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-background shadow-lg">
            <div className="p-3 space-y-1">{children}</div>
          </div>
        )}
      </div>
    </div>
  );
}

interface FilterOptionProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
}

function FilterOption({ label, checked, onToggle }: FilterOptionProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-sm hover:bg-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-4 w-4 rounded border-border accent-primary focus:outline-none"
      />
      <span>{label}</span>
    </label>
  );
}

function ChevronIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7-7-7M12 21V3" />
    </svg>
  );
}
