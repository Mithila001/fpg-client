import React, { useMemo, useState } from "react";
import InputPlanCanvas, { type RoomPoints } from "../components/Konva/InputPlanCanvas";

const KEYS = ["A", "B", "C", "D", "E", "F"] as const;
const MIN_BORDERS = 4;
const MAX_BORDERS = 6;

const distance = (a: { x: number; y: number }, b: { x: number; y: number }): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const InputPlan: React.FC = () => {
  const [points, setPoints] = useState<RoomPoints>({
    A: { x: 140, y: 140 },
    B: { x: 460, y: 140 },
    C: { x: 460, y: 380 },
    D: { x: 140, y: 380 },
    E: { x: 300, y: 500 },
    F: { x: 520, y: 300 },
  });
  const [borderCount, setBorderCount] = useState(4);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const shapeSummary = useMemo(() => {
    const active = KEYS.slice(0, borderCount);
    return active
      .map((key, idx) => {
        const next = active[(idx + 1) % active.length];
        const len = distance(points[key], points[next]);
        return `${key}->${next}: ${len.toFixed(1)}`;
      })
      .join(" | ");
  }, [borderCount, points]);

  const addBorderLine = () => {
    if (isConfirmed || borderCount >= MAX_BORDERS) return;
    setBorderCount((prev) => Math.min(MAX_BORDERS, prev + 1));
  };

  const removeBorderLine = () => {
    if (isConfirmed || borderCount <= MIN_BORDERS) return;
    setBorderCount((prev) => Math.max(MIN_BORDERS, prev - 1));
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex flex-1 overflow-hidden min-h-0">
        <div className="bg-amber-100 w-[72%] flex-none p-2 flex flex-col gap-2 min-h-0">
          <div className="text-sm text-gray-700">Land Border Shape Canvas</div>
          <div className="flex-1 min-h-0 overflow-auto">
            <InputPlanCanvas
              points={points}
              borderCount={borderCount}
              editable={!isConfirmed}
              onAddBorderLine={addBorderLine}
              onRemoveBorderLine={removeBorderLine}
              onPointsChange={setPoints}
            />
          </div>
        </div>

        <div className="bg-slate-100 w-[28%] min-w-[280px] p-4 flex flex-col gap-4 border-l border-gray-200">
          <div className="rounded-md border border-gray-300 bg-white p-4 flex flex-col gap-3">
            <h2 className="text-sm font-semibold text-gray-800">Shape Definition</h2>
            <div className="text-xs text-gray-600">Land border lines: {borderCount}</div>
            <div className="text-xs text-gray-500 break-words">{shapeSummary}</div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsConfirmed(true)}
                disabled={isConfirmed}
                className="px-3 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm shape
              </button>
              <button
                onClick={() => setIsConfirmed(false)}
                disabled={!isConfirmed}
                className="px-3 py-2 bg-amber-500 text-white text-sm rounded hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Edit
              </button>
            </div>
          </div>

          <div className="rounded-md border border-dashed border-gray-300 bg-white p-4 flex-1">
            <h3 className="text-sm font-semibold text-gray-700">Phase 2 Panel</h3>
            <p className="text-xs text-gray-500 mt-2">Reserved for border values and business logic in the next step.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputPlan;
