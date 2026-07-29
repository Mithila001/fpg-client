import type { ReactNode } from "react";
import type { Point } from "../../../types";

export interface CanvasSize {
  width: number;
  height: number;
}

export interface CanvasViewport {
  scale: number;
  x: number;
  y: number;
}

export interface WorldBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export type CanvasInteraction = "navigate" | "locked";

export interface FloorPlanCanvasRenderContext {
  scale: number;
  viewport: CanvasViewport;
  size: CanvasSize;
}

export interface CanvasPointerDownInfo {
  point: Point | null;
  isBackground: boolean;
}

export interface FloorPlanCanvasProps {
  bounds: WorldBounds;
  fitKey: string;
  interaction?: CanvasInteraction;
  showGrid?: boolean;
  blurred?: boolean;
  overlay?: ReactNode;
  className?: string;
  children: (context: FloorPlanCanvasRenderContext) => ReactNode;
  onPointerMove?: (point: Point | null) => void;
  onPointerLeave?: () => void;
  onPrimaryPointerDown?: (info: CanvasPointerDownInfo) => void;
}
