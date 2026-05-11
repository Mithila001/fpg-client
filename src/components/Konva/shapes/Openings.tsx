import React from "react";
import { Line } from "react-konva";
import type { CanvasOpening } from "../../../types";

interface OpeningsProps {
  openings: CanvasOpening[];
  pxPerCm: number;
  offsetX: number;
  offsetY: number;
  stageScale: number;
}



const Openings: React.FC<OpeningsProps> = ({ openings, pxPerCm, offsetX, offsetY, stageScale }) => {
  return (
    <>
      {openings.map((opening, idx) => {
        const x1 = opening.x1 * pxPerCm + offsetX;
        const y1 = opening.y1 * pxPerCm + offsetY;
        const x2 = opening.x2 * pxPerCm + offsetX;
        const y2 = opening.y2 * pxPerCm + offsetY;

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);
        if (len < 0.001) {
          return null;
        }

        const nx = -dy / len;
        const ny = dx / len;

        const gap = 2.5 / stageScale;
        const isWindow = opening.kind === "window";
        
        // Professional Color Palette
        const colors = isWindow ? {
          frame: "#64748b",    // Slate 500
          primary: "#bae6fd",  // Sky 200 (Glass blue)
          detail: "#7dd3fc",   // Sky 300
        } : {
          frame: "#475569",    // Slate 600
          primary: "#cbd5e1",  // Slate 300 (Door panel)
          detail: "#94a3b8",   // Slate 400
          floor: "#E3E3E3",    // Match the new floor color for cutouts
        };

        // End caps (frames)
        const frameWidth = 4 / stageScale;
        const wallThickness = 10 * pxPerCm; // 10cm wall in canvas units (no division by stageScale needed here)

        return (
          <React.Fragment key={`opening-${idx}`}>
            {/* DOOR CUTOUT: Clear the wall area visually */}
            {!isWindow && (
              <Line
                points={[x1, y1, x2, y2]}
                stroke={colors.floor}
                strokeWidth={wallThickness}
                lineCap="butt" // Clean square cutout
              />
            )}

            {/* Center line (main opening body) */}
            <Line 
              points={[x1, y1, x2, y2]} 
              stroke={colors.frame} 
              strokeWidth={isWindow ? (1 / stageScale) : (1.5 / stageScale)} 
              lineCap="round"
            />
            
            {/* Window specific glass panes or Door specific panel */}
            {isWindow ? (
              <>
                <Line
                  points={[x1 + nx * gap, y1 + ny * gap, x2 + nx * gap, y2 + ny * gap]}
                  stroke={colors.primary}
                  strokeWidth={1.5 / stageScale}
                  lineCap="round"
                />
                <Line
                  points={[x1 - nx * gap, y1 - ny * gap, x2 - nx * gap, y2 - ny * gap]}
                  stroke={colors.primary}
                  strokeWidth={1.5 / stageScale}
                  lineCap="round"
                />
              </>
            ) : (
              /* Door panel - single offset line */
              <Line
                points={[x1 + nx * (gap * 0.6), y1 + ny * (gap * 0.6), x2 + nx * (gap * 0.6), y2 + ny * (gap * 0.6)]}
                stroke={colors.primary}
                strokeWidth={3 / stageScale}
                lineCap="round"
              />
            )}

            {/* Frame end caps - perpendicular to the opening */}
            <Line
              points={[
                x1 + nx * gap * 1.5, y1 + ny * gap * 1.5,
                x1 - nx * gap * 1.5, y1 - ny * gap * 1.5
              ]}
              stroke={colors.frame}
              strokeWidth={frameWidth}
              lineCap="round"
            />
            <Line
              points={[
                x2 + nx * gap * 1.5, y2 + ny * gap * 1.5,
                x2 - nx * gap * 1.5, y2 - ny * gap * 1.5
              ]}
              stroke={colors.frame}
              strokeWidth={frameWidth}
              lineCap="round"
            />

            {/* Hinge indicator for Doors only (to distinguish from windows) */}
            {!isWindow && (
              <Line
                points={[
                  x1 - nx * gap * 2, y1 - ny * gap * 2,
                  x1 - nx * gap * 2 + (dx * 0.1), y1 - ny * gap * 2 + (dy * 0.1)
                ]}
                stroke={colors.frame}
                strokeWidth={1.5 / stageScale}
                lineCap="round"
              />
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

export default Openings;
