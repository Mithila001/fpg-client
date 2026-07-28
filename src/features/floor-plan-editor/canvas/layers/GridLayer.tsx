import { Group, Line } from "react-konva";

interface GridLayerProps {
  width: number;
  height: number;
  scale: number;
  stageX: number;
  stageY: number;
}

export const GridLayer = ({ width, height, scale, stageX, stageY }: GridLayerProps) => {
  const minorStep = 1;
  const majorStep = 10;
  const minX = -stageX / scale;
  const minY = -stageY / scale;
  const maxX = (width - stageX) / scale;
  const maxY = (height - stageY) / scale;
  const startX = Math.floor(minX / minorStep) * minorStep;
  const endX = Math.ceil(maxX / minorStep) * minorStep;
  const startY = Math.floor(minY / minorStep) * minorStep;
  const endY = Math.ceil(maxY / minorStep) * minorStep;
  const showMinor = scale >= 4;
  const lines = [];

  for (let x = startX; x <= endX; x += minorStep) {
    const major = Math.abs(x % majorStep) < 1e-8;
    if (!major && !showMinor) continue;
    lines.push(
      <Line
        key={`vertical-${x}`}
        points={[x, startY, x, endY]}
        stroke={major ? "#cbd5e1" : "#e2e8f0"}
        strokeWidth={(major ? 1.2 : 0.7) / scale}
        listening={false}
      />,
    );
  }

  for (let y = startY; y <= endY; y += minorStep) {
    const major = Math.abs(y % majorStep) < 1e-8;
    if (!major && !showMinor) continue;
    lines.push(
      <Line
        key={`horizontal-${y}`}
        points={[startX, y, endX, y]}
        stroke={major ? "#cbd5e1" : "#e2e8f0"}
        strokeWidth={(major ? 1.2 : 0.7) / scale}
        listening={false}
      />,
    );
  }

  return <Group listening={false}>{lines}</Group>;
};
