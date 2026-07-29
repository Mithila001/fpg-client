import type Konva from "konva";
import { Group, Shape, Text } from "react-konva";
import type { CandidateHint } from "../../../../types";

interface HintMapLayerProps {
  hints: CandidateHint[];
  scale: number;
}

const HINT_LABELS: Record<string, string> = {
  bedroom: "BR",
  bathroom: "BA",
  attached_bathroom: "AB",
  living_room: "LR",
  kitchen: "K",
  dining_room: "DR",
  hallway: "H",
  veranda: "V",
  garage: "G",
  open_area: "OA",
};

const formatHintLabel = (hint: CandidateHint): string => {
  if (!hint.roomType) return `H${hint.hintIndex + 1}`;
  return HINT_LABELS[hint.roomType] ?? hint.roomType.slice(0, 3).toUpperCase();
};

export const HintMapLayer = ({ hints, scale }: HintMapLayerProps) => {
  const radius = 3.5 / scale;
  const labelOffsetX = 7 / scale;
  const labelOffsetY = -6 / scale;

  return (
    <Group listening={false}>
      <Shape
        fill="#7c3aed"
        opacity={0.76}
        listening={false}
        perfectDrawEnabled={false}
        sceneFunc={(context: Konva.Context, shape: Konva.Shape) => {
          context.beginPath();
          hints.forEach((hint) => {
            context.moveTo(hint.x + radius, hint.y);
            context.arc(hint.x, hint.y, radius, 0, Math.PI * 2, false);
          });
          context.fillStrokeShape(shape);
        }}
      />

      {hints.map((hint) => (
        <Text
          key={`${hint.roomId}:${hint.hintIndex}`}
          x={hint.x + labelOffsetX}
          y={hint.y + labelOffsetY}
          text={formatHintLabel(hint)}
          fontSize={10 / scale}
          fontStyle="bold"
          fill="#5b21b6"
          opacity={0.82}
          listening={false}
          perfectDrawEnabled={false}
        />
      ))}
    </Group>
  );
};
