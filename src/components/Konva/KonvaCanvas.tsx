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
  const gridSize = baseGridSize * scale; // pixels between lines, scaled

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
                <Text
                  x={point.x + 8}
                  y={point.y - 12}
                  text={point.label || `(${point.x}, ${point.y})`}
                  fontSize={11}
                  fontStyle="bold"
                  fill="#475569"
                />
              </React.Fragment>
            ))}
          </Layer>
        </Stage>
      )}
    </div>
  );
};

export default CoordinateCanvas;
