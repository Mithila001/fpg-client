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
  landEditorControls: ReactNode;
  viewerControls: ReactNode;
}

export type PlanDimensionSide = "outside" | "left" | "right";

export interface PlanDimension {
  id: string;
  start: Point;
  end: Point;
  label?: string;
  side?: PlanDimensionSide;
  offsetPx?: number;
  insetRatio?: number;
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
  renderSidePanel?: (
    slots: FloorPlanWorkspaceControlSlots,
  ) => ReactNode;
  footer?: ReactNode;
}
