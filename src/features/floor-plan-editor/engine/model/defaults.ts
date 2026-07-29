import type { BuildableSpaceRequest } from "../../../../types";
import type { EditorConfig } from "./editor-state";

export const DEFAULT_EDITOR_CONFIG: EditorConfig = {
  minVertices: 4,
  maxVertices: 6,
  minimumEdgeLength: 2.4,
  gridStep: 1,
  roadSnapDistance: 6,
  roadWidth: 20,
  roadLength: 500,
  roadGap: 1.2,
};

export const DEFAULT_EDITOR_VALUE: BuildableSpaceRequest = {
  landBoundary: {
    points: [
      { x: 0, y: 0 },
      { x: 80, y: 0 },
      { x: 80, y: 60 },
      { x: 0, y: 60 },
    ],
  },
  roads: [],
};
