import React, { useState, useEffect, useRef } from "react";
import { Stage, Layer, Circle, Text, Rect } from "react-konva";
import { Grid, Wall, Labels } from "./shapes";
import type { Coordinate, Label } from "./shapes";

interface CoordinateCanvasProps {
  // optional collection of wall segments (each segment is a polyline)
  segments?: Coordinate[][];
  // optional points array; retained for backwards compatibility
  points?: Coordinate[];
  // array of textual labels to place on the stage
  labels?: Label[];
  // resolution multiplier; scales coordinates and grid spacing
  resolution?: number;
  // wall thickness in pixels
  wallThickness?: number;
}

const CoordinateCanvas: React.FC<CoordinateCanvasProps> = ({
  segments,
  points,
  labels,
  resolution,
  wallThickness,
}) => {
  const scale = resolution ?? 1;

  // determine which geometry to render (flatten segments for debugging)
  let effectivePoints: Coordinate[] = [];
  if (segments && segments.length > 0) {
    effectivePoints = segments.flat();
  } else if (points && points.length > 0) {
    effectivePoints = points;
  }

  // compute offset so the minimum coordinate isn't at the very edge
  const margin = 100;
  let offsetX = 0;
  let offsetY = 0;
  if (effectivePoints.length > 0) {
    const minX = Math.min(...effectivePoints.map((p) => p.x));
    const minY = Math.min(...effectivePoints.map((p) => p.y));
    offsetX = margin - minX * scale;
    offsetY = margin - minY * scale;
  }

  const scaledPoints = effectivePoints.map((p) => ({
    x: p.x * scale + offsetX,
    y: p.y * scale + offsetY,
    label: p.label,
  }));

  const scaledLabels: Label[] | undefined = labels
    ? labels.map((l) => ({
        x: l.x * scale + offsetX,
        y: l.y * scale + offsetY,
        text: l.text,
        fontSize: l.fontSize,
        color: l.color,
      }))
    : undefined;

  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // grid configuration
  const baseGridSize = 50;

  // start with a simple scale-based grid size, but if we have geometry
  // compute a "dynamic" grid spacing so the number of cells between the
  // minimum and maximum coordinate stays roughly constant regardless of the
  // raw coordinate values.  This keeps a small floor plan from being
  // overwhelmed by a huge grid and a large plan from having only a handful of
  // lines.
  let gridSize = baseGridSize * scale; // fallback value
  if (effectivePoints.length > 0) {
    const maxX = Math.max(...effectivePoints.map((p) => p.x));
    const maxY = Math.max(...effectivePoints.map((p) => p.y));
    const minX = Math.min(...effectivePoints.map((p) => p.x));
    const minY = Math.min(...effectivePoints.map((p) => p.y));

    const rangeX = (maxX - minX) * scale;
    const rangeY = (maxY - minY) * scale;
    const maxRange = Math.max(rangeX, rangeY);

    // how many grid cells do we want along the longest dimension?
    const targetCells = 20;
    const dynamicSize = maxRange / targetCells;

    // clamp so that the grid never becomes absurdly tiny or huge
    const minSize = baseGridSize * scale * 0.05;
    const maxSize = baseGridSize * scale * 5;
    gridSize = Math.min(maxSize, Math.max(minSize, dynamicSize));
  }

  // debug: log whenever dimensions state changes
  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      console.log(
        "Dimensions state updated:",
        Math.round(dimensions.width),
        "x",
        Math.round(dimensions.height),
        "scale:",
        scale,
      );
    }
  }, [dimensions, scale]);

  // watch the container's size and update dimensions for Konva
  useEffect(() => {
    const observeTarget = containerRef.current;
    if (!observeTarget) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
        console.log("CoordinateCanvas resized:", Math.round(width), "x", Math.round(height));
      }
    });

    resizeObserver.observe(observeTarget);

    return () => resizeObserver.unobserve(observeTarget);
  }, []);

  return (
    // minimal wrapper: this div is measured to provide dimensions
    // use full size so parent resizing triggers ResizeObserver
    <div ref={containerRef} style={{ width: "100%", height: "100%" }} className="bg-red-200">
      {dimensions.width > 0 && (
        <Stage width={Math.floor(dimensions.width)} height={Math.floor(dimensions.height)}>
          <Layer>
            {/* draw border around the entire canvas */}
            <Rect
              x={0}
              y={0}
              width={dimensions.width}
              height={dimensions.height}
              stroke="#000"
              strokeWidth={1}
            />

            {/* grid and labels */}
            <Grid dimensions={dimensions} gridSize={gridSize} />

            {/* walls rendered using the new Wall shape */}
            {segments && segments.length > 0 ? (
              segments.map((seg, idx) => (
                <Wall
                  key={`seg-${idx}`}
                  points={seg.map((p) => ({
                    x: p.x * scale + offsetX,
                    y: p.y * scale + offsetY,
                  }))}
                  thickness={wallThickness ?? 6}
                />
              ))
            ) : (
              <Wall points={scaledPoints} thickness={wallThickness ?? 6} />
            )}

            {/* custom text labels */}
            {scaledLabels && <Labels labels={scaledLabels} />}

            {/* point markers / labels (keep for debugging) */}
            {scaledPoints.map((point, index) => (
              <React.Fragment key={index}>
                <Circle
                  x={point.x}
                  y={point.y}
                  radius={5}
                  fill="white"
                  stroke="#4f46e5"
                  strokeWidth={2}
                />
                {point.label && (
                  <Text
                    x={point.x + 8}
                    y={point.y - 12}
                    text={point.label}
                    fontSize={11}
                    fontStyle="bold"
                    fill="#475569"
                  />
                )}
              </React.Fragment>
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  );
};

export default CoordinateCanvas;
