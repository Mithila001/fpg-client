import { useCallback, useEffect, useState } from "react";
import type { Point } from "../../../types";
import { clamp } from "../engine/geometry/vector";
import { polygonBounds } from "../engine/geometry/polygon";

interface Viewport {
  scale: number;
  x: number;
  y: number;
}

interface Size {
  width: number;
  height: number;
}

const MIN_SCALE = 0.5;
const MAX_SCALE = 80;
const FIT_PADDING = 48;

export const useCanvasViewport = (points: Point[], size: Size) => {
  const [viewport, setViewport] = useState<Viewport>({ scale: 1, x: 0, y: 0 });

  const fit = useCallback(() => {
    const bounds = polygonBounds(points);
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
  }, [points, size.height, size.width]);

  useEffect(() => {
    fit();
  }, [fit]);

  const zoomAt = useCallback(
    (screenPoint: Point, factor: number) => {
      setViewport((current) => {
        const scale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE);
        return {
          scale,
          x: screenPoint.x - ((screenPoint.x - current.x) / current.scale) * scale,
          y: screenPoint.y - ((screenPoint.y - current.y) / current.scale) * scale,
        };
      });
    },
    [],
  );

  return { viewport, setViewport, fit, zoomAt };
};
