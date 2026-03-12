import React from "react";
import { Text } from "react-konva";
import type { Label } from "./types";

interface LabelsProps {
  labels: Label[];
}

const Labels: React.FC<LabelsProps> = ({ labels }) => {
  return (
    <>
      {labels.map((lbl, idx) => {
        const fontSize = lbl.fontSize ?? 14;
        // crude estimation: assume each character ~0.6 * fontSize wide
        const approxWidth = lbl.text.length * fontSize * 0.6;
        const approxHeight = fontSize;
        return (
          <Text
            key={idx}
            x={lbl.x}
            y={lbl.y}
            text={lbl.text}
            fontSize={fontSize}
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
