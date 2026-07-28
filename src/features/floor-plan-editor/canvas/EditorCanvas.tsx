import type Konva from "konva";
import { useRef } from "react";
import { Layer, Stage } from "react-konva";
import type { Point } from "../../../types";
import type { EditorState } from "../engine/model/editor-state";
import { BoundaryLayer } from "./layers/BoundaryLayer";
import { DimensionLayer } from "./layers/DimensionLayer";
import { GridLayer } from "./layers/GridLayer";
import { RoadLayer } from "./layers/RoadLayer";
import { useCanvasViewport } from "./use-canvas-viewport";
import { useContainerSize } from "./use-container-size";

interface EditorCanvasProps {
  state: EditorState;
  onSelectVertex: (index: number | null) => void;
  onMoveVertex: (index: number, point: Point) => void;
  onPreviewRoadAt: (point: Point | null) => void;
  onPlacePreviewRoad: () => void;
}

export const EditorCanvas = ({
  state,
  onSelectVertex,
  onMoveVertex,
  onPreviewRoadAt,
  onPlacePreviewRoad,
}: EditorCanvasProps) => {
  const stageRef = useRef<Konva.Stage | null>(null);
  const { ref, size } = useContainerSize();
  const points = state.document.boundary.points;
  const { viewport, setViewport, fit, zoomAt } = useCanvasViewport(points, size);

  const pointerInWorld = (): Point | null => {
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return null;
    return {
      x: (pointer.x - viewport.x) / viewport.scale,
      y: (pointer.y - viewport.y) / viewport.scale,
    };
  };

  const handlePointerMove = () => {
    if (state.mode === "place-road") onPreviewRoadAt(pointerInWorld());
  };

  const handlePointerDown = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (event.evt.button !== 0) return;
    if (state.mode === "place-road") {
      onPlacePreviewRoad();
      return;
    }
    if (event.target === stageRef.current) onSelectVertex(null);
  };

  const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;
    zoomAt(pointer, event.evt.deltaY > 0 ? 0.9 : 1.1);
  };

  return (
    <div ref={ref} className="relative h-[560px] min-h-[420px] w-full overflow-hidden rounded-xl border border-slate-200 bg-white">
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        x={viewport.x}
        y={viewport.y}
        scaleX={viewport.scale}
        scaleY={viewport.scale}
        draggable
        onDragEnd={(event: Konva.KonvaEventObject<DragEvent>) => {
          if (event.target === stageRef.current) {
            setViewport((current) => ({
              ...current,
              x: event.target.x(),
              y: event.target.y(),
            }));
          }
        }}
        onMouseMove={handlePointerMove}
        onMouseLeave={() => onPreviewRoadAt(null)}
        onMouseDown={handlePointerDown}
        onWheel={handleWheel}
        onContextMenu={(event: Konva.KonvaEventObject<PointerEvent>) => event.evt.preventDefault()}
      >
        <Layer>
          <GridLayer
            width={size.width}
            height={size.height}
            scale={viewport.scale}
            stageX={viewport.x}
            stageY={viewport.y}
          />
          <RoadLayer
            boundary={points}
            road={state.document.road}
            preview={state.roadPreview}
            scale={viewport.scale}
          />
          <BoundaryLayer
            points={points}
            mode={state.mode}
            scale={viewport.scale}
            selectedVertexIndex={state.selection?.index ?? null}
            onSelectVertex={onSelectVertex}
            onMoveVertex={onMoveVertex}
          />
          <DimensionLayer points={points} scale={viewport.scale} />
        </Layer>
      </Stage>

      <div className="absolute right-3 top-3 flex flex-col gap-2">
        <button type="button" onClick={() => zoomAt({ x: size.width / 2, y: size.height / 2 }, 1.2)} className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-sm font-bold shadow-sm hover:bg-slate-50" aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoomAt({ x: size.width / 2, y: size.height / 2 }, 0.8)} className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-sm font-bold shadow-sm hover:bg-slate-50" aria-label="Zoom out">−</button>
        <button type="button" onClick={fit} className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold shadow-sm hover:bg-slate-50">Fit</button>
      </div>

      <div className="absolute bottom-3 left-3 rounded-lg border border-slate-200 bg-white/90 px-3 py-2 text-xs text-slate-600 shadow-sm backdrop-blur">
        Grid: 0.1 m · Wheel to zoom · Drag canvas to pan
      </div>
    </div>
  );
};
