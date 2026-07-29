export type NoticeSeverity = "info" | "success" | "warning" | "error";

export interface FeedbackNoticeData {
  id: number;
  severity: NoticeSeverity;
  title: string;
  message: string;
}

const styles: Record<NoticeSeverity, string> = {
  info: "border-indigo-200 bg-indigo-50 text-indigo-900",
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-rose-200 bg-rose-50 text-rose-900",
};

export const FeedbackNotice = ({
  notice,
  onDismiss,
}: {
  notice: FeedbackNoticeData;
  onDismiss?: () => void;
}) => (
  <section
    className={`rounded-xl border p-4 shadow-lg ${styles[notice.severity]}`}
    role={notice.severity === "error" ? "alert" : "status"}
    aria-live={notice.severity === "error" ? "assertive" : "polite"}
  >
    <div className="flex items-start justify-between gap-4">
      <div>
        <strong className="block text-sm">{notice.title}</strong>
        <p className="mt-1 text-xs leading-5 opacity-80">{notice.message}</p>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="rounded px-1.5 py-0.5 text-sm font-bold opacity-60 hover:bg-black/5 hover:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  </section>
);

export const FeedbackNoticeStack = ({
  notices,
  onDismiss,
}: {
  notices: FeedbackNoticeData[];
  onDismiss: (id: number) => void;
}) => (
  <div className="pointer-events-none fixed right-4 top-20 z-[90] grid w-[min(24rem,calc(100vw-2rem))] gap-2">
    {notices.map((notice) => (
      <div key={notice.id} className="pointer-events-auto">
        <FeedbackNotice
          notice={notice}
          onDismiss={() => onDismiss(notice.id)}
        />
      </div>
    ))}
  </div>
);
