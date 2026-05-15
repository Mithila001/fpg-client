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
        const lines = text.split("\n");
        const longestLine = lines.reduce((max, line) => Math.max(max, line.length), 0);
        
        const padding = 6 / stageScale;
        const width = (longestLine * fontSize * 0.6) + padding * 2;
        const lineHeight = fontSize * 1.2;
        const height = (lines.length * lineHeight) + padding;

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
              x={lbl.x - width / 2}
              y={lbl.y - height / 2}
              text={text}
              width={width}
              height={height}
              fontSize={fontSize}
              fontStyle="bold"
              fontFamily="Inter, system-ui, sans-serif"
              fill="#334155"
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
