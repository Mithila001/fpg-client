import type { ChangeEvent } from "react";

interface ViewerToolbarProps {
  showDimensions: boolean;
  onShowDimensionsChange: (visible: boolean) => void;
}

export const ViewerToolbar = ({
  showDimensions,
  onShowDimensionsChange,
}: ViewerToolbarProps) => (
  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
    <div>
      <p className="text-sm font-semibold text-slate-900">Final floor plan</p>
      <p className="text-xs text-slate-500">Display options affect only the viewer.</p>
    </div>

    <label className="ml-auto flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
      <input
        type="checkbox"
        checked={showDimensions}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onShowDimensionsChange(event.target.checked)
        }
        className="h-4 w-4 accent-indigo-600"
      />
      Show dimensions
    </label>
  </div>
);
