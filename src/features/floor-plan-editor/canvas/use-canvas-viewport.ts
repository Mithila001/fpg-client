import { useCallback, useEffect, useRef, useState } from "react";
import type { Point } from "../../../types";
import { clamp } from "../engine/geometry/vector";
import type {
  CanvasSize,
  CanvasViewport,
  WorldBounds,
} from "./canvas.types";

const MIN_SCALE = 0.5;
const MAX_SCALE = 80;
const FIT_PADDING = 48;

export const useCanvasViewport = (
  bounds: WorldBounds,
  size: CanvasSize,
  fitKey: string,
) => {
  const [viewport, setViewport] = useState<CanvasViewport>({
    scale: 1,
    x: 0,
    y: 0,
  });
  const previousFitKey = useRef<string | null>(null);

  const fit = useCallback(() => {
    const availableWidth = Math.max(1, size.width - FIT_PADDING * 2);
    const availableHeight = Math.max(1, size.height - FIT_PADDING * 2);
    const scale = clamp(
      Math.min(availableWidth / bounds.width, availableHeight / bounds.height),
      MIN_SCALE,
      MAX_SCALE,
    );

    setViewport({
      scale,
      x: (size.width - bounds.width * scale) / 2 - bounds.minX * scale,
      y: (size.height - bounds.height * scale) / 2 - bounds.minY * scale,
    });
  }, [bounds, size.height, size.width]);

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    if (previousFitKey.current === fitKey) return;

    previousFitKey.current = fitKey;
    fit();
  }, [fit, fitKey, size.height, size.width]);

  const zoomAt = useCallback((screenPoint: Point, factor: number) => {
    setViewport((current) => {
      const scale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE);
      return {
        scale,
        x: screenPoint.x - ((screenPoint.x - current.x) / current.scale) * scale,
        y: screenPoint.y - ((screenPoint.y - current.y) / current.scale) * scale,
      };
    });
  }, []);

  return { viewport, setViewport, fit, zoomAt };
};
