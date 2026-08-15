import type { FloorPlanWorkspacePhase } from "../floor-plan-editor";
import type { WorkflowTab } from "./workflow.types";

interface ResolveWorkspacePhaseInput {
  activeTab: WorkflowTab;
  generationActive: boolean;
  startingGeneration: boolean;
  hasVisibleResult: boolean;
  adverseResult: boolean;
  hasBuildableResult: boolean;
}

export const resolveWorkspacePhase = ({
  activeTab,
  generationActive,
  startingGeneration,
  hasVisibleResult,
  adverseResult,
  hasBuildableResult,
}: ResolveWorkspacePhaseInput): FloorPlanWorkspacePhase => {
  if (activeTab === "land") return hasBuildableResult ? "buildable-review" : "editing-land";
  if (startingGeneration || generationActive) return "generating";
  if (hasVisibleResult) return "final-plan";
  if (adverseResult) return "no-result";
  return hasBuildableResult ? "buildable-review" : "editing-land";
};
