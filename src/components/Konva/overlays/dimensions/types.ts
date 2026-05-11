export interface Vertex2D {
  x: number;
  y: number;
}

export interface RoomEdge {
  start: Vertex2D;
  end: Vertex2D;
  lengthCm: number;
  direction: "horizontal" | "vertical";
  useInwardOffset: boolean;
  index: number;
}

export interface DimensionPrimitive {
  roomName: string;
  edgeIndex: number;
  extensionStartA: Vertex2D;
  extensionEndA: Vertex2D;
  extensionStartB: Vertex2D;
  extensionEndB: Vertex2D;
  dimensionStart: Vertex2D;
  dimensionEnd: Vertex2D;
  tickStartA: Vertex2D;
  tickEndA: Vertex2D;
  tickStartB: Vertex2D;
  tickEndB: Vertex2D;
  labelPoint: Vertex2D;
  lengthCm: number;
}
