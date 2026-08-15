import type { ReactNode } from "react";
import type {
  BuildableSpaceResult,
  CandidateHint,
  FloorPlan,
  Point,
} from "../../../types";
import type { FloorPlanEditorProps } from "./editor.types";

export type FloorPlanWorkspacePhase =
  | "editing-land"
  | "buildable-review"
  | "generating"
  | "final-plan"
  | "no-result";

export interface GenerationProgressDisplay {
  current?: number;
  total?: number;
  label?: string;
}

export interface FloorPlanGenerationDisplay {
  title?: string;
  message: string;
  hints?: CandidateHint[];
  candidatePlan?: FloorPlan | null;
  progress?: GenerationProgressDisplay;
}

export interface FloorPlanWorkspaceControlSlots {
  landModificationControls: ReactNode;
  roadPlacementControls: ReactNode;
  editorInspector: ReactNode;
  viewerControls: ReactNode;
}

export type PlanDimensionSide = "outside" | "left" | "right";
export type PlanDimensionKind = "room-width" | "room-length" | "overall";
export type PlanDimensionOrientation = "horizontal" | "vertical";
export type PlanDimensionPlacement = "inside" | "outside";

export interface PlanDimension {
  id: string;
  start: Point;
  end: Point;
  kind: PlanDimensionKind;
  orientation: PlanDimensionOrientation;
  placement: PlanDimensionPlacement;
  roomId?: string;
  compactAnchor?: Point;
  label?: string;
  side?: PlanDimensionSide;
  offsetPx?: number;
  priority?: number;
}

export interface FloorPlanWorkspaceProps extends FloorPlanEditorProps {
  phase: FloorPlanWorkspacePhase;
  buildableResult?: BuildableSpaceResult | null;
  generation?: FloorPlanGenerationDisplay | null;
  finalPlan?: FloorPlan | null;
  planDimensions?: PlanDimension[];
  showDimensions?: boolean;
  defaultShowDimensions?: boolean;
  onShowDimensionsChange?: (visible: boolean) => void;
  noResultMessage?: string;
  showGrid?: boolean;
  canvasClassName?: string;
  canvasOverlay?: ReactNode;
  renderSidePanel?: (
    slots: FloorPlanWorkspaceControlSlots,
  ) => ReactNode;
  footer?: ReactNode;
}
