import type { BuildableSpaceRequest } from "../../../types";
import { addBoundaryVertex } from "./commands/add-boundary-vertex";
import { moveBoundaryVertex } from "./commands/move-boundary-vertex";
import { removeBoundaryVertex } from "./commands/remove-boundary-vertex";
import { findNearestEdge } from "./geometry/projection";
import { editorDocumentToRequest, requestToEditorDocument } from "./model/mappers";
import type {
  EditorAction,
  EditorConfig,
  EditorState,
} from "./model/editor-state";
import { validateBoundary } from "./rules/validate-boundary";

export const createEditorState = (
  value: BuildableSpaceRequest,
  config: EditorConfig,
): EditorState => {
  const document = requestToEditorDocument(value, config);
  return {
    document,
    mode: "edit-boundary",
    selection: null,
    roadPreview: null,
    validation: validateBoundary(document.boundary.points, config),
    feedback: null,
  };
};

const withBoundary = (
  state: EditorState,
  points: EditorState["document"]["boundary"]["points"],
  config: EditorConfig,
): EditorState => ({
  ...state,
  document: {
    boundary: { points },
    road: null,
  },
  roadPreview: null,
  validation: validateBoundary(points, config),
});

export const createEditorReducer = (config: EditorConfig) =>
  (state: EditorState, action: EditorAction): EditorState => {
    switch (action.type) {
      case "replace-document":
        return createEditorState(action.value, config);

      case "set-mode":
        return {
          ...state,
          mode: action.mode,
          selection: action.mode === "edit-boundary" ? state.selection : null,
          roadPreview: action.mode === "place-road" ? state.roadPreview : null,
          feedback: null,
        };

      case "select-vertex":
        return {
          ...state,
          selection:
            action.index === null ? null : { kind: "vertex", index: action.index },
        };

      case "move-vertex": {
        const points = moveBoundaryVertex(
          state.document.boundary.points,
          action.index,
          action.point,
          config,
        );
        if (!points) {
          return {
            ...state,
            feedback: {
              kind: "error",
              message: "Move rejected because it creates an invalid boundary.",
            },
          };
        }
        return {
          ...withBoundary(state, points, config),
          selection: { kind: "vertex", index: action.index },
          feedback: null,
        };
      }

      case "add-vertex": {
        const points = addBoundaryVertex(state.document.boundary.points, config);
        if (!points) {
          return {
            ...state,
            feedback: {
              kind: "error",
              message: "A valid additional vertex could not be created.",
            },
          };
        }
        return {
          ...withBoundary(state, points, config),
          selection: null,
          feedback: { kind: "info", message: "Boundary vertex added." },
        };
      }

      case "remove-selected-vertex": {
        const selectedIndex = state.selection?.index ?? state.document.boundary.points.length - 1;
        const points = removeBoundaryVertex(
          state.document.boundary.points,
          selectedIndex,
          config,
        );
        if (!points) {
          return {
            ...state,
            feedback: {
              kind: "error",
              message: `Boundary must keep at least ${config.minVertices} valid vertices.`,
            },
          };
        }
        return {
          ...withBoundary(state, points, config),
          selection: null,
          feedback: { kind: "info", message: "Boundary vertex removed." },
        };
      }

      case "preview-road-at": {
        if (state.mode !== "place-road" || !action.point) {
          return { ...state, roadPreview: null };
        }
        const nearest = findNearestEdge(action.point, state.document.boundary.points);
        if (!nearest || nearest.distance > config.roadSnapDistance) {
          return { ...state, roadPreview: null };
        }
        return {
          ...state,
          roadPreview: {
            edgeIndex: nearest.edgeIndex,
            t: nearest.t,
            width: config.roadWidth,
            length: config.roadLength,
            gap: config.roadGap,
            role: "main_entry",
            roadType: "main_road",
          },
        };
      }

      case "place-preview-road":
        if (!state.roadPreview) return state;
        return {
          ...state,
          document: { ...state.document, road: state.roadPreview },
          roadPreview: null,
          mode: "inspect",
          feedback: { kind: "info", message: "Entry road placed." },
        };

      case "clear-road":
        return {
          ...state,
          document: { ...state.document, road: null },
          roadPreview: null,
          feedback: { kind: "info", message: "Entry road removed." },
        };

      case "clear-feedback":
        return { ...state, feedback: null };

      default:
        return state;
    }
  };

export const editorStateToRequest = (state: EditorState): BuildableSpaceRequest =>
  editorDocumentToRequest(state.document);
