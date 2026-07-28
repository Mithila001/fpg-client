import type {
  BuildableSpaceRequest,
  Point,
  Polygon,
  RoadRole,
  RoadType,
} from "../../../../types";
import type { BoundaryIssue, EditorMode } from "../../types/editor.types";

export interface EditorRoadPlacement {
  edgeIndex: number;
  t: number;
  width: number;
  length: number;
  gap: number;
  role: RoadRole;
  roadType: RoadType;
}

export interface EditorDocument {
  boundary: Polygon;
  road: EditorRoadPlacement | null;
}

export interface EditorSelection {
  kind: "vertex";
  index: number;
}

export interface EditorFeedback {
  kind: "info" | "error";
  message: string;
}

export interface BoundaryValidation {
  isValid: boolean;
  issues: BoundaryIssue[];
}

export interface EditorState {
  document: EditorDocument;
  mode: EditorMode;
  selection: EditorSelection | null;
  roadPreview: EditorRoadPlacement | null;
  validation: BoundaryValidation;
  feedback: EditorFeedback | null;
}

export interface EditorConfig {
  minVertices: number;
  maxVertices: number;
  minimumEdgeLength: number;
  gridStep: number;
  roadSnapDistance: number;
  roadWidth: number;
  roadLength: number;
  roadGap: number;
}

export type EditorAction =
  | { type: "replace-document"; value: BuildableSpaceRequest }
  | { type: "set-mode"; mode: EditorMode }
  | { type: "select-vertex"; index: number | null }
  | { type: "move-vertex"; index: number; point: Point }
  | { type: "add-vertex" }
  | { type: "remove-selected-vertex" }
  | { type: "preview-road-at"; point: Point | null }
  | { type: "place-preview-road" }
  | { type: "clear-road" }
  | { type: "clear-feedback" };
