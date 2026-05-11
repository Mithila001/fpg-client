import React from "react";
import { Text, Rect } from "react-konva";
import type { Label } from "./types";

interface LabelsProps {
  labels: Label[];
  stageScale: number;
}

const Labels: React.FC<LabelsProps> = ({ labels, stageScale }) => {
  return (
    <>
      {labels.map((lbl, idx) => {
        const fontSize = (lbl.fontSize ?? 14) / stageScale;
        const text = lbl.text;
        
        // Approximate dimensions for background
        const padding = 4 / stageScale;
        const width = (text.length * fontSize * 0.6) + padding * 2;
        const height = fontSize + padding * 2;

        return (
          <React.Fragment key={idx}>
            {/* Label Background Plate */}
            <Rect
              x={lbl.x - width / 2}
              y={lbl.y - height / 2}
              width={width}
              height={height}
              fill="rgba(255, 255, 255, 0.85)"
              cornerRadius={2 / stageScale}
            />
            <Text
              x={lbl.x}
              y={lbl.y}
              text={text}
              fontSize={fontSize}
              fontStyle="bold"
              fontFamily="Inter, system-ui, sans-serif"
              fill="#334155"
              offsetX={width / 2 - padding}
              offsetY={height / 2 - padding}
              align="center"
              verticalAlign="middle"
            />
          </React.Fragment>
        );
      })}
    </>
  );
};

export default Labels;
