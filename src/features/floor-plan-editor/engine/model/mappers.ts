import type { BuildableSpaceRequest } from "../../../../types";
import type { EditorDocument } from "./editor-state";
import type { EditorConfig } from "./editor-state";

export const requestToEditorDocument = (
  value: BuildableSpaceRequest,
  config: EditorConfig,
): EditorDocument => {
  const road = value.roads[0] ?? null;
  return {
    boundary: {
      points: value.landBoundary.points.map((point) => ({ ...point })),
    },
    road: road
      ? {
          edgeIndex: road.boundaryEdgeIndex,
          t: 0.5,
          width: config.roadWidth,
          length: config.roadLength,
          gap: config.roadGap,
          role: road.role,
          roadType: road.roadType,
        }
      : null,
  };
};

export const editorDocumentToRequest = (
  document: EditorDocument,
): BuildableSpaceRequest => ({
  landBoundary: {
    points: document.boundary.points.map((point) => ({ ...point })),
  },
  roads: document.road
    ? [
        {
          boundaryEdgeIndex: document.road.edgeIndex,
          role: document.road.role,
          roadType: document.road.roadType,
        },
      ]
    : [],
});
