import { FloorPlanWorkspace } from "./FloorPlanWorkspace";
import type { FloorPlanEditorProps } from "./types/editor.types";

export const FloorPlanEditor = (props: FloorPlanEditorProps) => (
  <FloorPlanWorkspace phase="editing-land" {...props} />
);
