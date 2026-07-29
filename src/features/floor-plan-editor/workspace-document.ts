import type { BuildableSpaceRequest } from "../../types";
import { createEditorState, editorStateToRequest } from "./engine/editor-reducer";
import { snapPoint } from "./engine/geometry/vector";
import { DEFAULT_EDITOR_CONFIG } from "./engine/model/defaults";
import type { FloorPlanEditorSnapshot } from "./types/editor.types";

export const snapWorkspaceRequestToGrid = (
  request: BuildableSpaceRequest,
  gridStep = DEFAULT_EDITOR_CONFIG.gridStep,
): BuildableSpaceRequest => ({
  landBoundary: {
    points: request.landBoundary.points.map((point) =>
      snapPoint(point, gridStep),
    ),
  },
  roads: request.roads.map((road) => ({ ...road })),
});

export const createWorkspaceSnapshot = (
  request: BuildableSpaceRequest,
): FloorPlanEditorSnapshot => {
  const state = createEditorState(request, DEFAULT_EDITOR_CONFIG);
  return {
    value: editorStateToRequest(state),
    isValid: state.validation.isValid,
    issues: state.validation.issues,
  };
};
