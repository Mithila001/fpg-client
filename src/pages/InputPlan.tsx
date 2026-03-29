import React, { useMemo, useState } from "react";
import InputPlanCanvas, { type RoomPoints, type CornerKey } from "../components/Konva/InputPlanCanvas";
import {
  calculatePolygonArea,
  calculatePolygonCentroid,
  scalePolygon,
  type RoadPlacement,
} from "../components/Konva/utils/geometry";
import {
  getUsableLand,
  type UsableLandPayload,
  type UsableLandRoadConnectedSegment,
} from "../api/getUsableLand.ts";
import {
  formatAreaFromCm2,
  formatLengthFromCm,
  parseAreaM2InputToCm2,
} from "../utils/units";

const KEYS: CornerKey[] = ["A", "B", "C", "D", "E", "F"];
const MIN_BORDERS = 4;
const MAX_BORDERS = 6;

const distance = (a: { x: number; y: number }, b: { x: number; y: number }): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const buildClosedLoopCoordinates = (
  points: RoomPoints,
  orderedKeys: CornerKey[],
): Array<{ x: number; y: number }> => {
  const loop = orderedKeys.map((key) => ({ x: points[key].x, y: points[key].y }));
  if (loop.length > 0) {
    loop.push({ ...loop[0] });
  }
  return loop;
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
  const [roadMode, setRoadMode] = useState<"idle" | "placing">("idle");
  const [placedRoads, setPlacedRoads] = useState<RoadPlacement[]>([]);
  const [runAlgoStatus, setRunAlgoStatus] = useState<string | null>(null);

  const currentArea = useMemo(() => {
    return calculatePolygonArea(points, KEYS.slice(0, borderCount));
  }, [points, borderCount]);

  const shapeSummary = useMemo(() => {
    const active = KEYS.slice(0, borderCount);
    return active
      .map((key, idx) => {
        const next = active[(idx + 1) % active.length];
        const len = distance(points[key], points[next]);
        return `${key}->${next}: ${formatLengthFromCm(len, 2)}`;
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
    setRoadMode("idle");
    setPlacedRoads([]);
    setRunAlgoStatus(null);
  };

  const handleRoadButtonClick = () => {
    if (!isConfirmed || lastAppliedArea === null) return;
    setRoadMode((prev) => (prev === "placing" ? "idle" : "placing"));
  };

  const handleRoadPlace = (placement: RoadPlacement) => {
    // Keep single-road UX for now while preserving array-compatible storage.
    setPlacedRoads([placement]);
    setRoadMode("idle");
    setRunAlgoStatus(null);
  };

  const handleRoadCancel = () => {
    setRoadMode("idle");
  };

  const handleRunAlgorithm = async () => {
    if (placedRoads.length === 0) return;

    const orderedKeys = KEYS.slice(0, borderCount);
    const area = calculatePolygonArea(points, orderedKeys);

    const roadConnected: UsableLandRoadConnectedSegment[] = placedRoads
      .map((road) => {
        const startKey = orderedKeys[road.segmentIndex];
        const endKey = orderedKeys[(road.segmentIndex + 1) % orderedKeys.length];
        if (!startKey || !endKey) {
          return null;
        }

        return {
          segment: [
            { x: points[startKey].x, y: points[startKey].y },
            { x: points[endKey].x, y: points[endKey].y },
          ],
          roadType: "mainRoad",
        };
      })
      .filter((item): item is UsableLandRoadConnectedSegment => item !== null);

    const payload: UsableLandPayload = {
      area,
      segmentsCoordinates: buildClosedLoopCoordinates(points, orderedKeys),
      roadConnected,
    };

    await getUsableLand(payload);
    setRunAlgoStatus("Run payload printed. Check browser console output.");
  };

  const handleApplyArea = () => {
    if (!confirmedBasePoints) return;
    const targetAreaCm2 = parseAreaM2InputToCm2(targetAreaInput);
    if (targetAreaCm2 === null || targetAreaCm2 <= 0) {
      setScaleError("Please enter a valid positive number for area (m²).");
      return;
    }

    const orderedKeys = KEYS.slice(0, borderCount);
    const baseArea = calculatePolygonArea(confirmedBasePoints, orderedKeys);
    if (baseArea <= 0) {
      setScaleError("Base polygon has zero area.");
      return;
    }

    const scale = Math.sqrt(targetAreaCm2 / baseArea);
    const centroid = calculatePolygonCentroid(confirmedBasePoints, orderedKeys);
    const scaledPoints = scalePolygon(confirmedBasePoints, orderedKeys, centroid, scale);

    // Basic validity bounds could be checking if vertices are too extreme, but zooming allows moving around.
    // For now we assume if it's convex base, scaling is convex.
    
    setPoints(scaledPoints);
    setLastAppliedArea(targetAreaCm2);
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
              roadMode={roadMode}
              placedRoad={placedRoads[0] ?? null}
              onAddBorderLine={addBorderLine}
              onRemoveBorderLine={removeBorderLine}
              onPointsChange={setPoints}
              onRoadPlace={handleRoadPlace}
              onRoadCancel={handleRoadCancel}
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
                  Current Area: <span className="font-semibold">{formatAreaFromCm2(currentArea, 2)}</span>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label htmlFor="areaInput" className="text-xs text-gray-700">Target Area (m²)</label>
                  <input
                    id="areaInput"
                    type="number"
                    min="1"
                    step="any"
                    value={targetAreaInput}
                    onChange={(e) => setTargetAreaInput(e.target.value)}
                    className="rounded border border-gray-300 px-3 py-2 text-sm"
                    placeholder="e.g. 50"
                  />
                </div>

                {scaleError && <div className="text-xs text-red-600">{scaleError}</div>}
                
                <button
                  onClick={handleApplyArea}
                  className="px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 w-full"
                >
                  Apply Area
                </button>

                <div className="rounded border border-slate-200 bg-slate-50 p-2 flex flex-col gap-2">
                  <button
                    onClick={handleRoadButtonClick}
                    disabled={!isConfirmed || lastAppliedArea === null}
                    className="px-3 py-2 bg-slate-700 text-white text-sm rounded hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed w-full"
                  >
                    {roadMode === "placing" ? "Cancel Road" : "Add Road"}
                  </button>

                  {roadMode === "placing" && (
                    <div className="text-[11px] text-slate-600">
                      Place Road mode is active. Hover near a boundary segment, left click to place, right click to cancel.
                    </div>
                  )}

                  {placedRoads.length > 0 && roadMode !== "placing" && (
                    <div className="text-[11px] text-emerald-700">
                      Road placed on border segment {placedRoads[0].segmentIndex + 1}.
                    </div>
                  )}

                  {placedRoads.length > 0 && (
                    <button
                      onClick={handleRunAlgorithm}
                      className="px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700 w-full"
                    >
                      Run Algorithm
                    </button>
                  )}

                  {runAlgoStatus && (
                    <div className="text-[11px] text-indigo-700">{runAlgoStatus}</div>
                  )}
                </div>

                {lastAppliedArea !== null && (
                  <div className="text-xs text-emerald-700 mt-2">
                    ✓ Scaled to match {formatAreaFromCm2(lastAppliedArea, 2)}
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
