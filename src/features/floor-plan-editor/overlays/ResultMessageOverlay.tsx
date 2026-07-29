interface ResultMessageOverlayProps {
  title?: string;
  message: string;
}

export const ResultMessageOverlay = ({
  title = "No floor plan found",
  message,
}: ResultMessageOverlayProps) => (
  <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
    <div className="pointer-events-auto w-full max-w-md rounded-2xl border border-amber-200 bg-white/95 p-5 text-center shadow-xl backdrop-blur">
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-lg font-bold text-amber-700">
        !
      </div>
      <h3 className="mt-3 text-sm font-bold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
    </div>
  </div>
);
