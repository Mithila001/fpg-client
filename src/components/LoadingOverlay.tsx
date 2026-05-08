import React from "react";
import type { JobEventPayload } from "../types";

interface LoadingOverlayProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  event: JobEventPayload | null;
  onCancel?: () => void;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isOpen, title, subtitle, event, onCancel }) => {
  if (!isOpen) return null;

  const eventLabel = event?.event ?? "Waiting for server event...";

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/60 bg-white/95 p-5 shadow-2xl">
        <div className="grid grid-cols-[1fr_auto] items-center gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Live Job Stream</div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            {subtitle && <div className="text-xs text-slate-600">{subtitle}</div>}
          </div>
          <div className="flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-xs font-semibold text-slate-700">Current Event</div>
          <div className="mt-2 min-h-7" aria-live="polite">
            <div key={eventLabel} className="animate-event-swap text-sm font-medium text-slate-900">
              {eventLabel}
            </div>
          </div>
        </div>

        {onCancel && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={onCancel}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 hover:text-red-700"
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
