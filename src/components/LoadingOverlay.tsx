import React from "react";
import type { JobEventPayload } from "../types";

interface LoadingOverlayProps {
  isOpen: boolean;
  title: string;
  event: JobEventPayload | null;
  onCancel?: () => void;
}

const formatEventName = (name: string): string => {
  if (!name) return "";
  // Split by underscores, hyphens, or before capital letters (camelCase)
  return name
    .split(/(?=[A-Z])|[_-]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isOpen, title, event, onCancel }) => {
  const [hasFoundBest, setHasFoundBest] = React.useState(false);

  React.useEffect(() => {
    if (event?.event === "current_best_updated") {
      setHasFoundBest(true);
    }
  }, [event?.event]);

  React.useEffect(() => {
    if (!isOpen) {
      setHasFoundBest(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const rawEventLabel = event?.event ?? "Waiting...";
  const mappedRawEventLabel =
    rawEventLabel === "solver_gate_not_passed" ? "Running Trials" : rawEventLabel;
  const eventLabel = formatEventName(mappedRawEventLabel);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-[2px]">
      <div
        className={`w-full max-w-xs overflow-hidden rounded-xl border border-slate-200/60 bg-white/95 p-4 shadow-xl transition-all duration-500 ${
          hasFoundBest ? "animate-border-success border-green-500/50" : ""
        }`}
      >
        {/* Row 1: Title and Loading */}
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <div className="flex h-5 w-5 items-center justify-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
          </div>
        </div>

        {/* Row 2: Event Name */}
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
          <span className="text-slate-400">Status:</span>
          <span key={eventLabel} className="animate-event-swap text-slate-900">
            {eventLabel}
          </span>
          {hasFoundBest && (
            <span className="ml-auto flex items-center gap-1 text-[10px] font-bold text-green-600 animate-pulse">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              FOUND
            </span>
          )}
        </div>

        {/* Row 3: Terminate Button */}
        {onCancel && (
          <div className="mt-3">
            <button
              onClick={onCancel}
              className="w-full rounded-lg border border-red-100 bg-red-50/50 py-2 text-[11px] font-semibold text-red-600 transition-all hover:bg-red-50 hover:text-red-700"
            >
              Terminate Process
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingOverlay;
