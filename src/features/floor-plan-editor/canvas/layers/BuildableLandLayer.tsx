import { Line } from "react-konva";
import type { Point } from "../../../../types";

interface BuildableLandLayerProps {
  points: Point[];
  scale: number;
}

const flatten = (points: Point[]): number[] =>
  points.flatMap((point) => [point.x, point.y]);

export const BuildableLandLayer = ({
  points,
  scale,
}: BuildableLandLayerProps) => (
  <Line
    points={flatten(points)}
    closed
    fill="#dcfce799"
    stroke="#16a34a"
    strokeWidth={3 / scale}
    dash={[9 / scale, 6 / scale]}
    listening={false}
  />
);
