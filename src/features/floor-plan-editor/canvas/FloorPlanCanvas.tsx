import type Konva from "konva";
import { useRef } from "react";
import { Layer, Stage } from "react-konva";
import type { Point } from "../../../types";
import { GridLayer } from "./layers/GridLayer";
import type { FloorPlanCanvasProps } from "./canvas.types";
import { useCanvasViewport } from "./use-canvas-viewport";
import { useContainerSize } from "./use-container-size";

export const FloorPlanCanvas = ({
  bounds,
  fitKey,
  interaction = "navigate",
  showGrid = true,
  blurred = false,
  overlay,
  className = "",
  children,
  onPointerMove,
  onPointerLeave,
  onPrimaryPointerDown,
}: FloorPlanCanvasProps) => {
  const stageRef = useRef<Konva.Stage | null>(null);
  const { ref, size } = useContainerSize();
  const { viewport, setViewport, fit, zoomAt } = useCanvasViewport(
    bounds,
    size,
    fitKey,
  );
  const locked = interaction === "locked";
  const heightClassName =
    className.length > 0 ? className : "h-[560px] min-h-[420px]";

  const pointerInWorld = (): Point | null => {
    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return null;

    return {
      x: (pointer.x - viewport.x) / viewport.scale,
      y: (pointer.y - viewport.y) / viewport.scale,
    };
  };

  const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
    event.evt.preventDefault();
    if (locked) return;

    const pointer = stageRef.current?.getPointerPosition();
    if (!pointer) return;
    zoomAt(pointer, event.evt.deltaY > 0 ? 0.9 : 1.1);
  };

  const handlePointerDown = (event: Konva.KonvaEventObject<MouseEvent>) => {
    if (event.evt.button !== 0 || locked) return;
    onPrimaryPointerDown?.({
      point: pointerInWorld(),
      isBackground: event.target === stageRef.current,
    });
  };

  return (
    <div
      ref={ref}
      className={`relative w-full overflow-hidden bg-white ${heightClassName}`}
    >
      <div
        className="h-full w-full transition-[filter,transform] duration-200"
        style={
          blurred
            ? { filter: "blur(2.5px)", transform: "scale(1.01)" }
            : undefined
        }
      >
        <Stage
          ref={stageRef}
          width={size.width}
          height={size.height}
          x={viewport.x}
          y={viewport.y}
          scaleX={viewport.scale}
          scaleY={viewport.scale}
          draggable={!locked}
          onDragEnd={(event: Konva.KonvaEventObject<DragEvent>) => {
            if (event.target !== stageRef.current) return;
            setViewport((current) => ({
              ...current,
              x: event.target.x(),
              y: event.target.y(),
            }));
          }}
          onMouseMove={() => onPointerMove?.(pointerInWorld())}
          onMouseLeave={onPointerLeave}
          onMouseDown={handlePointerDown}
          onWheel={handleWheel}
          onContextMenu={(event: Konva.KonvaEventObject<PointerEvent>) =>
            event.evt.preventDefault()
          }
        >
          {showGrid && (
            <Layer listening={false}>
              <GridLayer
                width={size.width}
                height={size.height}
                scale={viewport.scale}
                stageX={viewport.x}
                stageY={viewport.y}
              />
            </Layer>
          )}
          {children({ scale: viewport.scale, viewport, size })}
        </Stage>
      </div>

      {!locked && (
        <div className="absolute right-3 top-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() =>
              zoomAt({ x: size.width / 2, y: size.height / 2 }, 1.2)
            }
            className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-sm font-bold shadow-sm hover:bg-slate-50"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() =>
              zoomAt({ x: size.width / 2, y: size.height / 2 }, 0.8)
            }
            className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-sm font-bold shadow-sm hover:bg-slate-50"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={fit}
            className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold shadow-sm hover:bg-slate-50"
          >
            Fit
          </button>
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 left-3 flex items-end gap-3 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-2 text-[10px] font-semibold text-slate-600 shadow-sm backdrop-blur">
        <span className="flex flex-col items-center text-indigo-700">
          <span className="text-sm leading-none">↑</span>
          <span>FRONT · −Y</span>
        </span>
        <span className="flex flex-col gap-1">
          <span
            className="h-1 border-x border-b border-slate-700"
            style={{ width: `${Math.max(18, Math.min(100, viewport.scale * 10))}px` }}
          />
          <span>1 meter</span>
        </span>
      </div>

      {overlay}
    </div>
  );
};
