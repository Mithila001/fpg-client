import type { BuildableSpaceRequest } from "../../../types";

export type EditorMode = "edit-boundary" | "place-road" | "inspect";

export type BoundaryIssueCode =
  | "too_few_vertices"
  | "too_many_vertices"
  | "edge_too_short"
  | "self_intersection"
  | "not_convex"
  | "zero_area";

export interface BoundaryIssue {
  code: BoundaryIssueCode;
  message: string;
  vertexIndex?: number;
  edgeIndex?: number;
}

export interface FloorPlanEditorSnapshot {
  value: BuildableSpaceRequest;
  isValid: boolean;
  issues: BoundaryIssue[];
}

export interface FloorPlanEditorProps {
  /** Controlled value. When supplied, parent state remains the source of truth. */
  value?: BuildableSpaceRequest;
  /** Initial value for uncontrolled usage. */
  initialValue?: BuildableSpaceRequest;
  onChange?: (snapshot: FloorPlanEditorSnapshot) => void;
  minVertices?: number;
  maxVertices?: number;
  readOnly?: boolean;
  className?: string;
}

