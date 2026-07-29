import type { GenerationProgressDisplay } from "../types/workspace.types";

interface ProcessingOverlayProps {
  title?: string;
  message: string;
  progress?: GenerationProgressDisplay;
}

export const ProcessingOverlay = ({
  title = "Generating floor plan",
  message,
  progress,
}: ProcessingOverlayProps) => {
  const hasProgress =
    progress?.current !== undefined &&
    progress.total !== undefined &&
    progress.total > 0;
  const percentage = hasProgress
    ? Math.min(100, Math.max(0, (progress.current! / progress.total!) * 100))
    : null;

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/20 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white/95 p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <p className="mt-1 animate-event-swap text-sm leading-6 text-slate-600">
              {message}
            </p>
          </div>
        </div>

        {progress && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-medium text-slate-500">
              <span>{progress.label ?? "Generation progress"}</span>
              {hasProgress && (
                <span>
                  {progress.current}/{progress.total}
                </span>
              )}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full rounded-full bg-indigo-600 transition-[width] duration-300 ${
                  percentage === null ? "w-1/3 animate-pulse" : ""
                }`}
                style={percentage === null ? undefined : { width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
