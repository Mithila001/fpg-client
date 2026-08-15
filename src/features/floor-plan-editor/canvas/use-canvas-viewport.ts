import { useCallback, useEffect, useRef, useState } from "react";
import type { Point } from "../../../types";
import { clamp } from "../engine/geometry/vector";
import type { CanvasSize, CanvasViewport, WorldBounds } from "./canvas.types";

const MIN_SCALE = 0.5;
const MAX_SCALE = 80;

export const fitViewport = (
  bounds: WorldBounds,
  size: CanvasSize,
  fitPadding: number,
): CanvasViewport => {
  const availableWidth = Math.max(1, size.width - fitPadding * 2);
  const availableHeight = Math.max(1, size.height - fitPadding * 2);
  const scale = clamp(
    Math.min(availableWidth / bounds.width, availableHeight / bounds.height),
    MIN_SCALE,
    MAX_SCALE,
  );
  return {
    scale,
    x: (size.width - bounds.width * scale) / 2 - bounds.minX * scale,
    y: (size.height - bounds.height * scale) / 2 - bounds.minY * scale,
  };
};

export const recenterViewport = (
  viewport: CanvasViewport,
  oldSize: CanvasSize,
  newSize: CanvasSize,
): CanvasViewport => {
  const worldCenter = {
    x: (oldSize.width / 2 - viewport.x) / viewport.scale,
    y: (oldSize.height / 2 - viewport.y) / viewport.scale,
  };
  return {
    ...viewport,
    x: newSize.width / 2 - worldCenter.x * viewport.scale,
    y: newSize.height / 2 - worldCenter.y * viewport.scale,
  };
};

export const useCanvasViewport = (
  bounds: WorldBounds,
  size: CanvasSize,
  fitKey: string,
  fitPadding = 48,
) => {
  const [viewport, setViewport] = useState<CanvasViewport>({ scale: 1, x: 0, y: 0 });
  const previousFitKey = useRef<string | null>(null);
  const previousSize = useRef<CanvasSize>(size);
  const automaticFit = useRef(true);

  const fittedViewport = useCallback(
    (): CanvasViewport => fitViewport(bounds, size, fitPadding),
    [bounds, fitPadding, size],
  );

  const fit = useCallback(() => {
    automaticFit.current = true;
    setViewport(fittedViewport());
  }, [fittedViewport]);

  useEffect(() => {
    if (size.width <= 0 || size.height <= 0) return;
    const phaseChanged = previousFitKey.current !== fitKey;
    const resized = previousSize.current.width !== size.width || previousSize.current.height !== size.height;
    const oldSize = previousSize.current;
    previousFitKey.current = fitKey;
    previousSize.current = size;

    if (phaseChanged || automaticFit.current) {
      setViewport(fittedViewport());
      return;
    }
    if (resized) {
      setViewport((current) => recenterViewport(current, oldSize, size));
    }
  }, [fitKey, fittedViewport, size]);

  const zoomAt = useCallback((screenPoint: Point, factor: number) => {
    automaticFit.current = false;
    setViewport((current) => {
      const scale = clamp(current.scale * factor, MIN_SCALE, MAX_SCALE);
      return {
        scale,
        x: screenPoint.x - ((screenPoint.x - current.x) / current.scale) * scale,
        y: screenPoint.y - ((screenPoint.y - current.y) / current.scale) * scale,
      };
    });
  }, []);

  const markNavigated = useCallback(() => {
    automaticFit.current = false;
  }, []);

  return { viewport, setViewport, fit, zoomAt, markNavigated };
};
