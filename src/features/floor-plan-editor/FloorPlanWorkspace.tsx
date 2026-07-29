import { useMemo, useState } from "react";
import { FloorPlanCanvas } from "./canvas/FloorPlanCanvas";
import { boundsFromPoints, mergeBounds } from "./canvas/canvas-bounds";
import { BuildableReviewScene } from "./canvas/scenes/BuildableReviewScene";
import { FinalPlanScene } from "./canvas/scenes/FinalPlanScene";
import { GenerationScene } from "./canvas/scenes/GenerationScene";
import { LandEditingScene } from "./canvas/scenes/LandEditingScene";
import { useEditorController } from "./controller/use-editor-controller";
import { createBoundaryPlanDimensions } from "./display/plan-dimensions";
import { ProcessingOverlay } from "./overlays/ProcessingOverlay";
import { ResultMessageOverlay } from "./overlays/ResultMessageOverlay";
import { EditorInspector } from "./panels/EditorInspector";
import { EditorToolbar } from "./panels/EditorToolbar";
import { ViewerToolbar } from "./panels/ViewerToolbar";
import type { FloorPlanWorkspaceProps } from "./types/workspace.types";

export const FloorPlanWorkspace = ({
  phase,
  value,
  initialValue,
  onChange,
  minVertices,
  maxVertices,
  readOnly = false,
  className = "",
  buildableResult,
  generation,
  finalPlan,
  planDimensions,
  showDimensions,
  defaultShowDimensions = false,
  onShowDimensionsChange,
  noResultMessage = "The generation run completed without a usable floor plan.",
  showGrid = true,
  canvasClassName = "",
  renderSidePanel,
  footer,
}: FloorPlanWorkspaceProps) => {
  const editingEnabled = phase === "editing-land" && !readOnly;
  const editor = useEditorController({
    value,
    initialValue,
    onChange,
    minVertices,
    maxVertices,
    readOnly: !editingEnabled,
  });
  const [internalShowDimensions, setInternalShowDimensions] = useState(
    defaultShowDimensions,
  );
  const dimensionsVisible = showDimensions ?? internalShowDimensions;
  const landBoundary = editor.state.document.boundary.points;
  const hints = useMemo(() => generation?.hints ?? [], [generation?.hints]);
  const candidatePlan = generation?.candidatePlan ?? null;

  const dimensions = useMemo(() => {
    if (planDimensions !== undefined) return planDimensions;
    return finalPlan ? createBoundaryPlanDimensions(finalPlan) : [];
  }, [finalPlan, planDimensions]);

  const bounds = useMemo(() => {
    const landBounds = boundsFromPoints(landBoundary);
    const buildableBounds = buildableResult
      ? boundsFromPoints(buildableResult.buildableLand.boundary.points)
      : null;
    const usableBounds = buildableResult
      ? boundsFromPoints(buildableResult.usableLand.boundary.points)
      : null;
    const candidateBounds = candidatePlan
      ? boundsFromPoints(candidatePlan.boundary.points)
      : null;
    const hintBounds = hints.length > 0 ? boundsFromPoints(hints) : null;
    const finalBounds = finalPlan
      ? boundsFromPoints(finalPlan.boundary.points)
      : null;

    switch (phase) {
      case "editing-land":
        return landBounds;
      case "buildable-review":
      case "no-result":
        return mergeBounds([landBounds, buildableBounds, usableBounds]);
      case "generating":
        return candidateBounds ?? hintBounds ?? landBounds;
      case "final-plan":
        return finalBounds ?? landBounds;
      default:
        return landBounds;
    }
  }, [
    buildableResult,
    candidatePlan,
    finalPlan,
    hints,
    landBoundary,
    phase,
  ]);

  const fitKey = useMemo(() => {
    switch (phase) {
      case "buildable-review":
        return `buildable-review:${buildableResult?.flowId ?? "pending"}`;
      case "generating":
        if (candidatePlan) return "generating:candidate";
        return hints.length > 0 ? "generating:hints-ready" : "generating:empty";
      case "final-plan":
        return `final-plan:${JSON.stringify(finalPlan?.boundary.points ?? [])}`;
      default:
        return phase;
    }
  }, [
    buildableResult?.flowId,
    candidatePlan,
    finalPlan?.boundary.points,
    hints.length,
    phase,
  ]);

  const changeDimensionsVisibility = (visible: boolean) => {
    if (showDimensions === undefined) setInternalShowDimensions(visible);
    onShowDimensionsChange?.(visible);
  };

  const landEditorControls =
    phase === "editing-land" ? (
      <div className="space-y-3">
        <EditorToolbar
          mode={editor.state.mode}
          vertexCount={editor.state.document.boundary.points.length}
          minVertices={editor.config.minVertices}
          maxVertices={editor.config.maxVertices}
          hasRoad={editor.state.document.road !== null}
          readOnly={readOnly}
          onModeChange={editor.actions.setMode}
          onAddVertex={editor.actions.addVertex}
          onRemoveVertex={editor.actions.removeSelectedVertex}
          onClearRoad={editor.actions.clearRoad}
        />
        <EditorInspector state={editor.state} />
      </div>
    ) : null;

  const viewerControls =
    phase === "final-plan" && finalPlan ? (
      <ViewerToolbar
        showDimensions={dimensionsVisible}
        onShowDimensionsChange={changeDimensionsVisibility}
      />
    ) : null;

  const canvasOverlay =
    renderSidePanel === undefined
      ? phase === "generating"
        ? (
            <ProcessingOverlay
              title={generation?.title}
              message={generation?.message ?? "Preparing the generation run..."}
              progress={generation?.progress}
            />
          )
        : phase === "no-result"
          ? <ResultMessageOverlay message={noResultMessage} />
          : phase === "final-plan" && !finalPlan
            ? (
                <ResultMessageOverlay
                  title="Final floor plan unavailable"
                  message="The workspace is in final-plan mode, but no final floor-plan data was provided."
                />
              )
            : null
      : null;

  const canvas = (
    <FloorPlanCanvas
      bounds={bounds}
      fitKey={fitKey}
      interaction="navigate"
      showGrid={phase !== "generating" && showGrid}
      overlay={canvasOverlay}
      className={canvasClassName}
      onPointerMove={
        editingEnabled && editor.state.mode === "place-road"
          ? editor.actions.previewRoadAt
          : undefined
      }
      onPointerLeave={
        editingEnabled
          ? () => editor.actions.previewRoadAt(null)
          : undefined
      }
      onPrimaryPointerDown={
        editingEnabled
          ? ({ isBackground }) => {
              if (editor.state.mode === "place-road") {
                editor.actions.placePreviewRoad();
                return;
              }
              if (isBackground) editor.actions.selectVertex(null);
            }
          : undefined
      }
    >
      {({ scale }) => {
        switch (phase) {
          case "editing-land":
            return (
              <LandEditingScene
                state={editor.state}
                scale={scale}
                onSelectVertex={editor.actions.selectVertex}
                onMoveVertex={editor.actions.moveVertex}
              />
            );
          case "buildable-review":
          case "no-result":
            return (
              <BuildableReviewScene
                landBoundary={landBoundary}
                road={editor.state.document.road}
                result={buildableResult}
                scale={scale}
              />
            );
          case "generating":
            return (
              <GenerationScene
                hints={hints}
                candidatePlan={candidatePlan}
                scale={scale}
              />
            );
          case "final-plan":
            return finalPlan ? (
              <FinalPlanScene
                plan={finalPlan}
                scale={scale}
                dimensions={dimensions}
                showDimensions={dimensionsVisible}
              />
            ) : (
              <BuildableReviewScene
                landBoundary={landBoundary}
                road={editor.state.document.road}
                result={buildableResult}
                scale={scale}
                showDimensions={false}
                muted
              />
            );
          default:
            return null;
        }
      }}
    </FloorPlanCanvas>
  );

  return (
    <section
      className={
        renderSidePanel
          ? `grid min-h-0 lg:grid-cols-[minmax(0,1fr)_380px] ${className}`
          : `space-y-3 ${className}`
      }
    >
      {renderSidePanel ? (
        <>
          <div className="min-h-0 min-w-0">{canvas}</div>
          {renderSidePanel({ landEditorControls, viewerControls })}
        </>
      ) : (
        <>
          {landEditorControls}
          {viewerControls}
          {canvas}
        </>
      )}
      {footer}
    </section>
  );
};
