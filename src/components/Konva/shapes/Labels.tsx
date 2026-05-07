import React from "react";
import { Text } from "react-konva";
import type { Label } from "./types";

interface LabelsProps {
  labels: Label[];
  stageScale: number;
}

const Labels: React.FC<LabelsProps> = ({ labels, stageScale }) => {
  return (
    <>
      {labels.map((lbl, idx) => {
        const fontSize = lbl.fontSize ?? 14;
        const approxWidth = lbl.text.length * (fontSize / stageScale) * 0.6;
        const approxHeight = fontSize / stageScale;
        return (
          <Text
            key={idx}
            x={lbl.x}
            y={lbl.y}
            text={lbl.text}
            fontSize={fontSize / stageScale}
            fill={lbl.color ?? "#000"}
            offsetX={approxWidth / 2}
            offsetY={approxHeight / 2}
          />
        );
      })}
    </>
  );
};

export default Labels;
