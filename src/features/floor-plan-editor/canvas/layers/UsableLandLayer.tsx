import { Line } from "react-konva";
import type { Point } from "../../../../types";

interface UsableLandLayerProps {
  points: Point[];
  scale: number;
}

const flatten = (points: Point[]): number[] =>
  points.flatMap((point) => [point.x, point.y]);

export const UsableLandLayer = ({ points, scale }: UsableLandLayerProps) => (
  <Line
    points={flatten(points)}
    closed
    fill="#dbeafe99"
    stroke="#2563eb"
    strokeWidth={3 / scale}
    listening={false}
  />
);
