import React, { useMemo, useState } from "react";
import InputPlanCanvas, { type RoomPoints, type CornerKey } from "../components/Konva/InputPlanCanvas";
import { calculatePolygonArea, calculatePolygonCentroid, scalePolygon } from "../components/Konva/utils/geometry";

const KEYS: CornerKey[] = ["A", "B", "C", "D", "E", "F"];
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

  const [confirmedBasePoints, setConfirmedBasePoints] = useState<RoomPoints | null>(null);
  const [targetAreaInput, setTargetAreaInput] = useState<string>("");
  const [lastAppliedArea, setLastAppliedArea] = useState<number | null>(null);
  const [scaleError, setScaleError] = useState<string | null>(null);

  const currentArea = useMemo(() => {
    return calculatePolygonArea(points, KEYS.slice(0, borderCount));
  }, [points, borderCount]);

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

  const handleConfirmShape = () => {
    setIsConfirmed(true);
    setConfirmedBasePoints(points);
  };

  const handleEditShape = () => {
    setIsConfirmed(false);
    if (confirmedBasePoints) {
      setPoints(confirmedBasePoints);
    }
    setConfirmedBasePoints(null);
    setTargetAreaInput("");
    setLastAppliedArea(null);
    setScaleError(null);
  };

  const handleApplyArea = () => {
    if (!confirmedBasePoints) return;
    const targetArea = parseFloat(targetAreaInput);
    if (isNaN(targetArea) || targetArea <= 0) {
      setScaleError("Please enter a valid positive number for area.");
      return;
    }

    const orderedKeys = KEYS.slice(0, borderCount);
    const baseArea = calculatePolygonArea(confirmedBasePoints, orderedKeys);
    if (baseArea <= 0) {
      setScaleError("Base polygon has zero area.");
      return;
    }

    const scale = Math.sqrt(targetArea / baseArea);
    const centroid = calculatePolygonCentroid(confirmedBasePoints, orderedKeys);
    const scaledPoints = scalePolygon(confirmedBasePoints, orderedKeys, centroid, scale);

    // Basic validity bounds could be checking if vertices are too extreme, but zooming allows moving around.
    // For now we assume if it's convex base, scaling is convex.
    
    setPoints(scaledPoints);
    setLastAppliedArea(targetArea);
    setScaleError(null);
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
                onClick={handleConfirmShape}
                disabled={isConfirmed}
                className="px-3 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Confirm shape
              </button>
              <button
                onClick={handleEditShape}
                disabled={!isConfirmed}
                className="px-3 py-2 bg-amber-500 text-white text-sm rounded hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Edit
              </button>
            </div>
          </div>

          <div className="rounded-md border border-gray-300 bg-white p-4 flex-1 flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-gray-800">Target Land Area</h3>
            {!isConfirmed ? (
              <p className="text-xs text-gray-500">Confirm shape to set target land area.</p>
            ) : (
              <div className="flex flex-col gap-3">
                <div className="text-xs text-gray-600">
                  Current Area: <span className="font-semibold">{currentArea.toFixed(1)} unit²</span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label htmlFor="areaInput" className="text-xs text-gray-700">Target Area (unit²)</label>
                  <input
                    id="areaInput"
                    type="number"
                    min="1"
                    step="any"
                    value={targetAreaInput}
                    onChange={(e) => setTargetAreaInput(e.target.value)}
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                    placeholder="e.g. 5000"
                  />
                </div>

                {scaleError && <div className="text-xs text-red-600">{scaleError}</div>}
                
                <button
                  onClick={handleApplyArea}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 w-full"
                >
                  Apply Area
                </button>

                {lastAppliedArea !== null && (
                  <div className="text-xs text-emerald-700 mt-2">
                    ✓ Scaled to match {lastAppliedArea} unit²
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputPlan;
