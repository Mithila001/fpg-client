import React from "react";
import type { JobEventPayload } from "../types";

interface LoadingOverlayProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  events: JobEventPayload[];
}

const formatEventLabel = (event: JobEventPayload): string => {
  if (event.message) return event.message;
  if (event.event) return event.event;
  return "Processing...";
};

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ isOpen, title, subtitle, events }) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200/60 bg-white/95 p-5 shadow-2xl">
        <div className="flex flex-col gap-1">
          <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Live Job Stream</div>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {subtitle && <div className="text-xs text-slate-600">{subtitle}</div>}
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="text-xs font-semibold text-slate-700">Latest Updates</div>
          <div className="mt-2 space-y-2">
            {events.length === 0 && (
              <div className="text-xs text-slate-500">Waiting for first server event...</div>
            )}
            {events.map((event, index) => (
              <div
                key={`${event.timestamp ?? "t"}-${index}`}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2"
              >
                <div className="text-xs font-medium text-slate-800">{formatEventLabel(event)}</div>
                {event.timestamp && (
                  <div className="mt-1 text-[11px] text-slate-500">{event.timestamp}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-linear-to-r from-slate-900 via-slate-500 to-slate-900" />
        </div>
      </div>
    </div>
  );
};

export default LoadingOverlay;
