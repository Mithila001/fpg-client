import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Circle, Layer, Line, Rect, Stage, Text } from "react-konva";
import Konva from "konva";
import { formatLengthFromCm, cmToM, mToCm } from "../../utils/units";
import {
  buildRoadPolygonFromPlacement,
  findNearestBoundarySegment,
  type RoadPlacement,
} from "./utils/geometry";
import type { BuildableRectangleSides } from "../../api/getUsableLand";

export type CornerKey = "A" | "B" | "C" | "D" | "E" | "F";

export interface RoomPoint {
  x: number;
  y: number;
}

export type RoomPoints = Record<CornerKey, RoomPoint>;

interface InputPlanCanvasProps {
  points: RoomPoints;
  borderCount: number;
  editable: boolean;
  roadMode?: "idle" | "placing";
  placedRoad?: RoadPlacement | null;
  buildableRectangle?: RoomPoint[] | null;
  buildableRectangleSides?: BuildableRectangleSides | null;
  shrunkBoundary?: RoomPoint[] | null;
  onAddBorderLine?: () => void;
  onRemoveBorderLine?: () => void;
  onPointsChange: (next: RoomPoints) => void;
  onRoadPlace?: (placement: RoadPlacement) => void;
  onRoadCancel?: () => void;
}

const ALL_KEYS: CornerKey[] = ["A", "B", "C", "D", "E", "F"];
const PADDING = 24;
const MIN_EDGE = 24;
const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT = 620;
const ROAD_WIDTH = 750; // Realistic road width (7.5m)
const ROAD_LENGTH = 5000; // Longer road to ensure coverage
const ROAD_GAP = 12; // Gap from plot boundary
const ROAD_SNAP_THRESHOLD = 60; // Increased snap threshold for wider roads
const FIT_PADDING = 36;
const MIN_VIEW_SCALE = 5;
const MAX_VIEW_SCALE = 1000;

const distance = (a: RoomPoint, b: RoomPoint): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const segmentIntersects = (p1: RoomPoint, p2: RoomPoint, p3: RoomPoint, p4: RoomPoint): boolean => {
  const ccw = (a: RoomPoint, b: RoomPoint, c: RoomPoint): boolean =>
    (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);

  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
};

const isConvexPolygon = (points: RoomPoints, orderedKeys: CornerKey[]): boolean => {
  if (orderedKeys.length < 4) return true;

  let sign = 0;
  for (let i = 0; i < orderedKeys.length; i += 1) {
    const p0 = points[orderedKeys[i]];
    const p1 = points[orderedKeys[(i + 1) % orderedKeys.length]];
    const p2 = points[orderedKeys[(i + 2) % orderedKeys.length]];

    const cross = (p1.x - p0.x) * (p2.y - p1.y) - (p1.y - p0.y) * (p2.x - p1.x);
    if (Math.abs(cross) < 1e-8) {
      continue;
    }

    const currentSign = cross > 0 ? 1 : -1;
    if (sign === 0) {
      sign = currentSign;
    } else if (sign !== currentSign) {
      return false;
    }
  }

  return sign !== 0;
};

const isValidPolygon = (points: RoomPoints, orderedKeys: CornerKey[]): boolean => {
  for (let i = 0; i < orderedKeys.length; i += 1) {
    const current = orderedKeys[i];
    const next = orderedKeys[(i + 1) % orderedKeys.length];
    if (distance(points[current], points[next]) < MIN_EDGE) {
      return false;
    }
  }

  for (let i = 0; i < orderedKeys.length; i += 1) {
    const a1 = points[orderedKeys[i]];
    const a2 = points[orderedKeys[(i + 1) % orderedKeys.length]];
    for (let j = i + 1; j < orderedKeys.length; j += 1) {
      const nextI = (i + 1) % orderedKeys.length;
      const nextJ = (j + 1) % orderedKeys.length;
      if (j === i || j === nextI || nextJ === i) continue;

      const b1 = points[orderedKeys[j]];
      const b2 = points[orderedKeys[nextJ]];
      if (segmentIntersects(a1, a2, b1, b2)) {
        return false;
      }
    }
  }

  return isConvexPolygon(points, orderedKeys);
};

const LABEL_STYLE = {
  bg: "#1e293b", // Slate 800
  text: "#ffffff",
  paddingX: 10,
  paddingY: 6,
  cornerRadius: 4,
};

const InputPlanCanvas: React.FC<InputPlanCanvasProps> = ({
  points,
  borderCount,
  editable,
  roadMode = "idle",
  placedRoad = null,
  buildableRectangle = null,
  buildableRectangleSides = null,
  shrunkBoundary = null,
  onAddBorderLine,
  onRemoveBorderLine,
  onPointsChange,
  onRoadPlace,
  onRoadCancel,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [active, setActive] = useState<CornerKey | null>(null);
  const [previewRoad, setPreviewRoad] = useState<RoadPlacement | null>(null);
  const [dimensions, setDimensions] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [stageScale, setStageScale] = useState(1);
  const [stageX, setStageX] = useState(0);
  const [stageY, setStageY] = useState(0);
  const orderedKeys = useMemo(() => ALL_KEYS.slice(0, borderCount), [borderCount]);

  useEffect(() => {
    if (roadMode !== "placing") {
      setPreviewRoad(null);
    }
  }, [roadMode]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const width = Math.max(320, Math.floor(entry.contentRect.width));
      const height = Math.max(320, Math.floor(entry.contentRect.height));
      setDimensions({ width, height });
    });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const wallLengths = useMemo(
    () =>
      orderedKeys.reduce(
        (acc, key, idx) => {
          const next = orderedKeys[(idx + 1) % orderedKeys.length];
          acc[key] = distance(points[key], points[next]);
          return acc;
        },
        {} as Record<CornerKey, number>,
      ),
    [orderedKeys, points],
  );

  const polygon = useMemo(
    () => orderedKeys.flatMap((key) => [cmToM(points[key].x), cmToM(points[key].y)]),
    [orderedKeys, points],
  );

  const placedRoadPolygon = useMemo(() => {
    if (!placedRoad) return null;
    const result = buildRoadPolygonFromPlacement(points, orderedKeys, placedRoad);
    return result?.polygon ?? null;
  }, [placedRoad, points, orderedKeys]);

  const previewRoadPolygon = useMemo(() => {
    if (!previewRoad) return null;
    const result = buildRoadPolygonFromPlacement(points, orderedKeys, previewRoad);
    return result?.polygon ?? null;
  }, [previewRoad, points, orderedKeys]);

  const roadToLinePoints = (roadPolygon: RoomPoint[]): number[] =>
    roadPolygon.flatMap((point) => [cmToM(point.x), cmToM(point.y)]);

  // Helper to get midpoint of a segment
  const getMidpoint = (p1: RoomPoint, p2: RoomPoint) => ({
    x: cmToM((p1.x + p2.x) / 2),
    y: cmToM((p1.y + p2.y) / 2),
  });

  const buildableRectanglePoints = useMemo(() => {
    if (!buildableRectangle || buildableRectangle.length < 3) return null;
    return buildableRectangle.flatMap((point) => [cmToM(point.x), cmToM(point.y)]);
  }, [buildableRectangle]);

  const shrunkBoundaryPoints = useMemo(() => {
    if (!shrunkBoundary || shrunkBoundary.length < 3) return null;
    return shrunkBoundary.flatMap((point) => [cmToM(point.x), cmToM(point.y)]);
  }, [shrunkBoundary]);

  const allGeometryPoints = useMemo(() => {
    const base = orderedKeys.map((key) => ({ x: cmToM(points[key].x), y: cmToM(points[key].y) }));
    if (buildableRectangle && buildableRectangle.length > 0) {
      base.push(...buildableRectangle.map(p => ({ x: cmToM(p.x), y: cmToM(p.y) })));
    }
    if (shrunkBoundary && shrunkBoundary.length > 0) {
      base.push(...shrunkBoundary.map(p => ({ x: cmToM(p.x), y: cmToM(p.y) })));
    }
    return base;
  }, [orderedKeys, points, buildableRectangle, shrunkBoundary]);

  const fitToGeometry = useCallback(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0 || allGeometryPoints.length === 0) {
      setStageScale(1);
      setStageX(0);
      setStageY(0);
      return;
    }

    const minX = Math.min(...allGeometryPoints.map((p) => p.x));
    const maxX = Math.max(...allGeometryPoints.map((p) => p.x));
    const minY = Math.min(...allGeometryPoints.map((p) => p.y));
    const maxY = Math.max(...allGeometryPoints.map((p) => p.y));

    const bboxWidth = Math.max(1, maxX - minX);
    const bboxHeight = Math.max(1, maxY - minY);
    const availableWidth = Math.max(1, dimensions.width - FIT_PADDING * 2);
    const availableHeight = Math.max(1, dimensions.height - FIT_PADDING * 2);

    const nextScale = clamp(
      Math.min(availableWidth / bboxWidth, availableHeight / bboxHeight),
      MIN_VIEW_SCALE,
      MAX_VIEW_SCALE,
    );

    const nextX = (dimensions.width - bboxWidth * nextScale) / 2 - minX * nextScale;
    const nextY = (dimensions.height - bboxHeight * nextScale) / 2 - minY * nextScale;

    setStageScale(nextScale);
    setStageX(nextX);
    setStageY(nextY);
  }, [allGeometryPoints, dimensions.height, dimensions.width]);

  useEffect(() => {
    if (dimensions.width <= 0 || dimensions.height <= 0) return;
    if (editable && active) return;

    fitToGeometry();
  }, [fitToGeometry, dimensions.width, dimensions.height, editable, active]);

  const getPointerInCanvas = (): RoomPoint | null => {
    const stage = stageRef.current;
    if (!stage) return null;

    const pointer = stage.getPointerPosition();
    if (!pointer) return null;

    return {
      x: mToCm((pointer.x - stageX) / stageScale),
      y: mToCm((pointer.y - stageY) / stageScale),
    };
  };

  const updateRoadPreview = () => {
    if (roadMode !== "placing") return;

    const pointer = getPointerInCanvas();
    if (!pointer) {
      setPreviewRoad(null);
      return;
    }

    const nearest = findNearestBoundarySegment(pointer, points, orderedKeys);
    if (!nearest || nearest.distance > ROAD_SNAP_THRESHOLD) {
      setPreviewRoad(null);
      return;
    }

    setPreviewRoad({
      segmentIndex: nearest.segmentIndex,
      t: nearest.t,
      width: ROAD_WIDTH,
      length: ROAD_LENGTH,
      gap: ROAD_GAP,
    });
  };

  const handleRoadPointerDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (roadMode !== "placing") return;

    if (e.evt.button === 2) {
      e.evt.preventDefault();
      setPreviewRoad(null);
      onRoadCancel?.();
      return;
    }

    if (e.evt.button !== 0 || !previewRoad) return;

    onRoadPlace?.(previewRoad);
    setPreviewRoad(null);
  };

  const handleContextMenu = (e: Konva.KonvaEventObject<PointerEvent>) => {
    if (roadMode !== "placing") return;

    e.evt.preventDefault();
    setPreviewRoad(null);
    onRoadCancel?.();
  };

  const handleDragMove = (key: CornerKey, e: Konva.KonvaEventObject<DragEvent>) => {
    const mx = e.target.x();
    const my = e.target.y();
    const candidate = {
      x: clamp(mToCm(mx), 0, 1000000),
      y: clamp(mToCm(my), 0, 1000000),
    };

    const next = { ...points, [key]: candidate };
    if (isValidPolygon(next, orderedKeys)) {
      onPointsChange(next);
      e.target.position({ x: cmToM(candidate.x), y: cmToM(candidate.y) });
    } else {
      e.target.position({ x: cmToM(points[key].x), y: cmToM(points[key].y) });
    }
  };

  const addPointOnLastEdge = () => {
    if (!editable || !onAddBorderLine) return;
    if (borderCount >= ALL_KEYS.length) return;

    const lastKey = orderedKeys[orderedKeys.length - 1];
    const firstKey = orderedKeys[0];
    const newKey = ALL_KEYS[borderCount];
    const last = points[lastKey];
    const first = points[firstKey];

    const dx = first.x - last.x;
    const dy = first.y - last.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / len;
    const uy = dy / len;

    const mx = (last.x + first.x) / 2;
    const my = (last.y + first.y) / 2;
    const nx = uy;
    const ny = -ux;

    const offset = Math.max(24, len * 0.15);
    const candidate = {
      x: clamp(mx + nx * offset, PADDING, dimensions.width - PADDING),
      y: clamp(my + ny * offset, PADDING, dimensions.height - PADDING),
    };

    const next = { ...points, [newKey]: candidate };
    const nextOrder = ALL_KEYS.slice(0, borderCount + 1);
    if (isValidPolygon(next, nextOrder)) {
      onPointsChange(next);
      onAddBorderLine();
      return;
    }

    const alt = {
      x: clamp(mx - nx * offset, PADDING, dimensions.width - PADDING),
      y: clamp(my - ny * offset, PADDING, dimensions.height - PADDING),
    };
    const nextAlt = { ...points, [newKey]: alt };
    if (isValidPolygon(nextAlt, nextOrder)) {
      onPointsChange(nextAlt);
      onAddBorderLine();
    }
  };

  const removeLastPoint = () => {
    if (!editable || !onRemoveBorderLine) return;
    onRemoveBorderLine();
  };

  const zoomFromViewportCenter = (delta: number) => {
    const nextScale = clamp(stageScale + delta, MIN_VIEW_SCALE, MAX_VIEW_SCALE);
    if (Math.abs(nextScale - stageScale) < 1e-6) return;

    const center = {
      x: dimensions.width / 2,
      y: dimensions.height / 2,
    };

    const nextX = center.x - ((center.x - stageX) * nextScale) / stageScale;
    const nextY = center.y - ((center.y - stageY) * nextScale) / stageScale;

    setStageScale(nextScale);
    setStageX(nextX);
    setStageY(nextY);
  };

  const handleZoomIn = () => zoomFromViewportCenter(0.2);
  const handleZoomOut = () => zoomFromViewportCenter(-0.2);
  const handleResetZoom = () => fitToGeometry();

  return (
    <div ref={containerRef} className="relative h-full w-full rounded-lg border border-gray-200 bg-white overflow-hidden">
      <Stage 
        ref={stageRef} 
        width={dimensions.width} 
        height={dimensions.height}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stageX}
        y={stageY}
        onMouseMove={updateRoadPreview}
        onMouseDown={handleRoadPointerDown}
        onContextMenu={handleContextMenu}
      >
        <Layer>
          {placedRoadPolygon && (
            <React.Fragment>
              <Line
                points={roadToLinePoints(placedRoadPolygon)}
                closed
                fill="#334155" // Slate 700 - Asphalt
                stroke="#1e293b"
                strokeWidth={1 / stageScale}
              />
              {/* Road Center Line */}
              <Line
                points={roadToLinePoints(placedRoadPolygon).slice(0, 4)} // Approximation for center line
                stroke="#ffffff88"
                strokeWidth={4 / stageScale}
                dash={[20 / stageScale, 20 / stageScale]}
                opacity={0.5}
              />
            </React.Fragment>
          )}

          {previewRoadPolygon && (
            <Line
              points={roadToLinePoints(previewRoadPolygon)}
              closed
              fill="#47556944"
              stroke="#475569"
              strokeWidth={2 / stageScale}
              dash={[8 / stageScale, 6 / stageScale]}
            />
          )}

          <Line points={polygon} closed stroke="#0f172a" strokeWidth={6 / stageScale} fill="#f1f5f9" />

          {buildableRectanglePoints && (
            <Line
              points={buildableRectanglePoints}
              closed
              fill="#ef444411"
              stroke="#ef4444"
              strokeWidth={3 / stageScale}
            />
          )}

          {buildableRectangleSides &&
            typeof buildableRectangleSides === "object" &&
            Object.keys(buildableRectangleSides).length > 0 && (
              <React.Fragment>
                {(Object.entries(buildableRectangleSides) as [string, [RoomPoint, RoomPoint]][]).map(
                  ([sideName, points_pair]) => {
                    if (!Array.isArray(points_pair) || points_pair.length < 2) return null;
                    const { x: mx, y: my } = getMidpoint(points_pair[0], points_pair[1]);
                    const label = sideName.toUpperCase();
                    
                    const fontSize = 13 / stageScale;
                    const textWidth = label.length * 8.5; // Approximation
                    const width = (textWidth + LABEL_STYLE.paddingX * 2) / stageScale;
                    const height = (16 + LABEL_STYLE.paddingY * 2) / stageScale;
                    
                    return (
                      <React.Fragment key={`side-grp-${sideName}`}>
                        <Rect
                          x={mx - width / 2}
                          y={my - height / 2}
                          width={width}
                          height={height}
                          fill={LABEL_STYLE.bg}
                          cornerRadius={LABEL_STYLE.cornerRadius / stageScale}
                          shadowColor="black"
                          shadowBlur={4 / stageScale}
                          shadowOpacity={0.2}
                          shadowOffset={{ x: 1 / stageScale, y: 1 / stageScale }}
                        />
                        <Text
                          x={mx - (textWidth / 2) / stageScale}
                          y={my - 8 / stageScale}
                          text={label}
                          fontSize={fontSize}
                          fontStyle="bold"
                          fill={LABEL_STYLE.text}
                          align="center"
                        />
                      </React.Fragment>
                    );
                  },
                )}
              </React.Fragment>
            )}

          {shrunkBoundaryPoints && (
            <Line
              points={shrunkBoundaryPoints}
              closed
              stroke="#7c2d12"
              strokeWidth={3 / stageScale}
            />
          )}

          {orderedKeys.map((key) => {
            const point = points[key];
            const mx = cmToM(point.x);
            const my = cmToM(point.y);
            return (
              <React.Fragment key={key}>
                <Circle
                  x={mx}
                  y={my}
                  radius={8 / stageScale}
                  fill={active === key ? "#f97316" : "#2563eb"}
                  stroke="#ffffff"
                  strokeWidth={2 / stageScale}
                  draggable={editable}
                  onDragStart={() => editable && setActive(key)}
                  onDragMove={(e) => handleDragMove(key, e)}
                  onDragEnd={(e) => {
                    handleDragMove(key, e);
                    setActive(null);
                  }}
                />
                <Text
                  x={mx + 10 / stageScale}
                  y={my - 20 / stageScale}
                  text={`${key} (${mx.toFixed(2)}m, ${my.toFixed(2)}m)`}
                  fontSize={12 / stageScale}
                  fill="#1f2937"
                />
              </React.Fragment>
            );
          })}

          <Text
            x={(16 - stageX) / stageScale}
            y={(12 - stageY) / stageScale}
            text={orderedKeys
              .map((key) => `${key}: ${formatLengthFromCm(wallLengths[key] ?? 0, 2)}`)
              .join(" | ")}
            fontSize={13 / stageScale}
            fill="#334155"
          />
          {!editable && (
            <Text
              x={(16 - stageX) / stageScale}
              y={(34 - stageY) / stageScale}
              text="Shape confirmed (view-only). Click Edit to modify borders."
              fontSize={12 / stageScale}
              fill="#64748b"
            />
          )}
        </Layer>
      </Stage>
      <div className="absolute bottom-3 left-3 flex gap-2">
        <button
          type="button"
          onClick={addPointOnLastEdge}
          disabled={!editable || borderCount >= ALL_KEYS.length}
          className="px-2 py-1 text-xs rounded bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add border line
        </button>
        <button
          type="button"
          onClick={removeLastPoint}
          disabled={!editable || borderCount <= 4}
          className="px-2 py-1 text-xs rounded bg-slate-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Remove border line
        </button>
      </div>
      <div className="absolute top-3 right-3 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 border border-gray-300 text-gray-700 hover:bg-gray-200"
          title="Zoom Out"
        >
          -
        </button>
        <button
          onClick={handleResetZoom}
          className="px-2 h-8 flex items-center justify-center rounded bg-gray-100 border border-gray-300 text-[11px] text-gray-700 hover:bg-gray-200"
          title="Fit View"
        >
          Fit
        </button>
        {Math.abs(stageScale - 1) > 1e-6 && (
          <button
            onClick={handleResetZoom}
            className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 border border-gray-300 text-xs text-gray-700 hover:bg-gray-200"
            title="Reset View"
          >
            1:1
          </button>
        )}
      </div>
    </div>
  );
};

export default InputPlanCanvas;
