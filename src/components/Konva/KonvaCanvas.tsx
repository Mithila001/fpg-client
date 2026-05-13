import React, {
  useState,
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { Stage, Layer } from "react-konva";
import Konva from "konva";
import { Grid, Wall, Labels, Openings, Rooms } from "./shapes";
import type { Coordinate, Label } from "./shapes";
import { cmToPx } from "../../utils/units";
import type { CanvasOpening } from "../../types";
import type { ProcessedRoomData } from "../../types";
import RoomDimensionsOverlay from "./overlays/RoomDimensionsOverlay";

interface CoordinateCanvasEffects {
  roomDimensions?: {
    enabled: boolean;
    rooms: ProcessedRoomData[] | null;
  };
}

interface CoordinateCanvasProps {
  segments?: Coordinate[][];
  points?: Coordinate[];
  labels?: Label[];
  openings?: CanvasOpening[];
  rooms?: ProcessedRoomData[]; // New prop for floor rendering
  pxPerCm?: number;
  wallThickness?: number;
  viewEffects?: CoordinateCanvasEffects;
}

export interface CoordinateCanvasHandle {
  reset: () => void;
}

const MIN_VIEW_SCALE = 5;
const MAX_VIEW_SCALE = 1000;
const FIT_PADDING = 36;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const CoordinateCanvas = forwardRef<CoordinateCanvasHandle, CoordinateCanvasProps>(
  ({ segments, points, labels, openings, rooms, pxPerCm, wallThickness, viewEffects }, ref) => {
    const scale = pxPerCm ?? 1;

    let effectivePoints: Coordinate[] = [];
    if (segments && segments.length > 0) {
      effectivePoints = segments.flat();
    } else if (points && points.length > 0) {
      effectivePoints = points;
    }

    const scaledPoints = effectivePoints.map((p) => ({
      x: cmToPx(p.x, scale),
      y: -cmToPx(p.y, scale),
      label: p.label,
    }));

    const scaledLabels: Label[] | undefined = labels
      ? labels.map((l) => ({
          x: cmToPx(l.x, scale),
          y: -cmToPx(l.y, scale),
          text: l.text,
          fontSize: l.fontSize,
          color: l.color,
        }))
      : undefined;

    const containerRef = useRef<HTMLDivElement>(null);
    const stageRef = useRef<Konva.Stage>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    const [stageScale, setStageScale] = useState(1);
    const [stageX, setStageX] = useState(0);
    const [stageY, setStageY] = useState(0);
    const [hasFit, setHasFit] = useState(false);

    // 1 meter grid size = 100 cm
    const gridSize = cmToPx(100, scale);

    const fitToGeometry = useCallback(() => {
      if (dimensions.width <= 0 || dimensions.height <= 0 || effectivePoints.length === 0) {
        setStageScale(1);
        setStageX(0);
        setStageY(0);
        return;
      }

      const minX = Math.min(...scaledPoints.map((p) => p.x));
      const maxX = Math.max(...scaledPoints.map((p) => p.x));
      const minY = Math.min(...scaledPoints.map((p) => p.y));
      const maxY = Math.max(...scaledPoints.map((p) => p.y));

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
    }, [scaledPoints, dimensions.width, dimensions.height]);

    useEffect(() => {
      if (dimensions.width > 0 && dimensions.height > 0 && effectivePoints.length > 0 && !hasFit) {
        fitToGeometry();
        setHasFit(true);
      }
    }, [dimensions.width, dimensions.height, effectivePoints, hasFit, fitToGeometry]);

    const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;

      const oldScale = stageScale;
      const pointerPos = stage.getPointerPosition();
      if (!pointerPos) return;

      const zoomSpeed = 0.1;
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      const nextScale = clamp(
        oldScale + direction * zoomSpeed * oldScale,
        MIN_VIEW_SCALE,
        MAX_VIEW_SCALE,
      );

      const newX = pointerPos.x - ((pointerPos.x - stageX) / oldScale) * nextScale;
      const newY = pointerPos.y - ((pointerPos.y - stageY) / oldScale) * nextScale;

      setStageScale(nextScale);
      setStageX(newX);
      setStageY(newY);
    };

    const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
      setStageX(e.target.x());
      setStageY(e.target.y());
    };

    const zoomFromViewportCenter = (delta: number) => {
      const nextScale = clamp(stageScale + delta, MIN_VIEW_SCALE, MAX_VIEW_SCALE);
      if (Math.abs(nextScale - stageScale) < 1e-6) return;

      const center = {
        x: dimensions.width / 2,
        y: dimensions.height / 2,
      };

      const nextX = center.x - ((center.x - stageX) / stageScale) * nextScale;
      const nextY = center.y - ((center.y - stageY) / stageScale) * nextScale;

      setStageScale(nextScale);
      setStageX(nextX);
      setStageY(nextY);
    };

    const handleZoomIn = () => zoomFromViewportCenter(stageScale * 0.2);
    const handleZoomOut = () => zoomFromViewportCenter(-stageScale * 0.2);
    const handleResetZoom = () => fitToGeometry();

    useImperativeHandle(ref, () => ({
      reset: () => {
        setHasFit(false);
      },
    }));

    useEffect(() => {
      const observeTarget = containerRef.current;
      if (!observeTarget) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          setDimensions({ width, height });
        }
      });

      resizeObserver.observe(observeTarget);

      return () => resizeObserver.unobserve(observeTarget);
    }, []);

    const viewStartX = -stageX / stageScale;
    const viewEndX = (dimensions.width - stageX) / stageScale;
    const viewStartY = -stageY / stageScale;
    const viewEndY = (dimensions.height - stageY) / stageScale;

    return (
      <div
        ref={containerRef}
        className="relative h-full w-full rounded-lg border border-gray-200 bg-white overflow-hidden"
      >
        {dimensions.width > 0 && (
          <Stage
            ref={stageRef}
            width={Math.floor(dimensions.width)}
            height={Math.floor(dimensions.height)}
            draggable
            scaleX={stageScale}
            scaleY={stageScale}
            x={stageX}
            y={stageY}
            onWheel={handleWheel}
            onDragEnd={handleDragEnd}
          >
            <Layer>
              <Grid
                startX={viewStartX}
                endX={viewEndX}
                startY={viewStartY}
                endY={viewEndY}
                gridSize={gridSize}
                pxPerCm={scale}
                stageScale={stageScale}
              />

              {rooms && rooms.length > 0 && (
                <Rooms 
                  rooms={rooms}
                  pxPerCm={scale}
                  stageScale={stageScale}
                />
              )}

              {segments && segments.length > 0 ? (
                segments.map((seg, idx) => (
                  <Wall
                    key={`seg-${idx}`}
                    points={seg.map((p) => ({
                      x: cmToPx(p.x, scale),
                      y: -cmToPx(p.y, scale),
                    }))}
                    thickness={cmToPx(wallThickness ?? 10, scale)}
                    stageScale={stageScale}
                  />
                ))
              ) : (
                <Wall
                  points={scaledPoints}
                  thickness={cmToPx(wallThickness ?? 10, scale)}
                  stageScale={stageScale}
                />
              )}

              {scaledLabels && <Labels labels={scaledLabels} stageScale={stageScale} />}

              {openings && openings.length > 0 && (
                <Openings
                  openings={openings.map((o) => ({
                    ...o,
                    y1: -o.y1,
                    y2: -o.y2,
                  }))}
                  pxPerCm={scale}
                  offsetX={0}
                  offsetY={0}
                  stageScale={stageScale}
                />
              )}
            </Layer>

            {viewEffects?.roomDimensions?.enabled &&
              viewEffects.roomDimensions.rooms &&
              viewEffects.roomDimensions.rooms.length > 0 && (
                <Layer>
                  <RoomDimensionsOverlay
                    rooms={viewEffects.roomDimensions.rooms}
                    pxPerCm={scale}
                    stageScale={stageScale}
                    precision={1}
                  />
                </Layer>
              )}
          </Stage>
        )}

        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          <button
            onClick={handleZoomIn}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/90 backdrop-blur border border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-sm transition-all active:scale-95"
            title="Zoom In"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
          </button>
          <button
            onClick={handleZoomOut}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/90 backdrop-blur border border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-sm transition-all active:scale-95"
            title="Zoom Out"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
          </button>
          <button
            onClick={handleResetZoom}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white/90 backdrop-blur border border-slate-200/80 text-[11px] font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 shadow-sm transition-all active:scale-95 uppercase tracking-wider"
            title="Scale to Fit"
          >
            Fit
          </button>
        </div>
      </div>
    );
  },
);

export default CoordinateCanvas;
