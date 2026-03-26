import React, { useEffect, useMemo, useRef, useState } from "react";
import { Circle, Layer, Line, Stage, Text } from "react-konva";
import Konva from "konva";

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
  onAddBorderLine?: () => void;
  onRemoveBorderLine?: () => void;
  onPointsChange: (next: RoomPoints) => void;
}

const ALL_KEYS: CornerKey[] = ["A", "B", "C", "D", "E", "F"];
const PADDING = 24;
const MIN_EDGE = 24;
const DEFAULT_WIDTH = 900;
const DEFAULT_HEIGHT = 620;

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

const InputPlanCanvas: React.FC<InputPlanCanvasProps> = ({
  points,
  borderCount,
  editable,
  onAddBorderLine,
  onRemoveBorderLine,
  onPointsChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [active, setActive] = useState<CornerKey | null>(null);
  const [dimensions, setDimensions] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [stageScale, setStageScale] = useState(1);
  const orderedKeys = useMemo(() => ALL_KEYS.slice(0, borderCount), [borderCount]);

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
    () => orderedKeys.flatMap((key) => [points[key].x, points[key].y]),
    [orderedKeys, points],
  );

  const handleDragMove = (key: CornerKey, e: Konva.KonvaEventObject<DragEvent>) => {
    const candidate = {
      x: clamp(e.target.x(), PADDING, dimensions.width - PADDING),
      y: clamp(e.target.y(), PADDING, dimensions.height - PADDING),
    };

    const next = { ...points, [key]: candidate };
    if (isValidPolygon(next, orderedKeys)) {
      onPointsChange(next);
      e.target.position(candidate);
    } else {
      e.target.position(points[key]);
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

  const handleZoomIn = () => setStageScale(prev => Math.min(3, prev + 0.2));
  const handleZoomOut = () => setStageScale(prev => Math.max(0.4, prev - 0.2));

  return (
    <div ref={containerRef} className="relative h-full w-full rounded-lg border border-gray-200 bg-white overflow-hidden">
      <Stage 
        ref={stageRef} 
        width={dimensions.width} 
        height={dimensions.height}
        scaleX={stageScale}
        scaleY={stageScale}
      >
        <Layer>
          <Line points={polygon} closed stroke="#0f172a" strokeWidth={6} fill="#dbeafe" />

          {orderedKeys.map((key) => {
            const point = points[key];
            return (
              <React.Fragment key={key}>
                <Circle
                  x={point.x}
                  y={point.y}
                  radius={8}
                  fill={active === key ? "#f97316" : "#2563eb"}
                  stroke="#ffffff"
                  strokeWidth={2}
                  draggable={editable}
                  dragBoundFunc={(pos) => {
                    const scale = stageScale;
                    return {
                      x: clamp(pos.x, PADDING * scale, (dimensions.width - PADDING) * scale),
                      y: clamp(pos.y, PADDING * scale, (dimensions.height - PADDING) * scale),
                    };
                  }}
                  onDragStart={() => editable && setActive(key)}
                  onDragMove={(e) => handleDragMove(key, e)}
                  onDragEnd={(e) => {
                    handleDragMove(key, e);
                    setActive(null);
                  }}
                />
                <Text
                  x={point.x + 10}
                  y={point.y - 20}
                  text={`${key} (${Math.round(point.x)}, ${Math.round(point.y)})`}
                  fontSize={12}
                  fill="#1f2937"
                />
              </React.Fragment>
            );
          })}

          <Text
            x={16}
            y={12}
            text={orderedKeys
              .map((key) => `${key}: ${(wallLengths[key] ?? 0).toFixed(1)}`)
              .join(" | ")}
            fontSize={13}
            fill="#334155"
          />
          {!editable && (
            <Text
              x={16}
              y={34}
              text="Shape confirmed (view-only). Click Edit to modify borders."
              fontSize={12}
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
        {stageScale !== 1 && (
          <button
            onClick={() => setStageScale(1)}
            className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 border border-gray-300 text-xs text-gray-700 hover:bg-gray-200"
            title="Reset Zoom"
          >
            1x
          </button>
        )}
      </div>
    </div>
  );
};

export default InputPlanCanvas;
