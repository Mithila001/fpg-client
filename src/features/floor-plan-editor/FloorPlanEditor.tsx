import { EditorCanvas } from "./canvas/EditorCanvas";
import { useEditorController } from "./controller/use-editor-controller";
import { EditorInspector } from "./panels/EditorInspector";
import { EditorToolbar } from "./panels/EditorToolbar";
import type { FloorPlanEditorProps } from "./types/editor.types";

export const FloorPlanEditor = ({
  value,
  initialValue,
  onChange,
  minVertices,
  maxVertices,
  readOnly = false,
  className = "",
}: FloorPlanEditorProps) => {
  const editor = useEditorController({
    value,
    initialValue,
    onChange,
    minVertices,
    maxVertices,
    readOnly,
  });

  return (
    <section className={`space-y-3 ${className}`}>
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

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_280px]">
        <EditorCanvas
          state={editor.state}
          onSelectVertex={editor.actions.selectVertex}
          onMoveVertex={editor.actions.moveVertex}
          onPreviewRoadAt={editor.actions.previewRoadAt}
          onPlacePreviewRoad={editor.actions.placePreviewRoad}
        />
        <EditorInspector state={editor.state} />
      </div>
    </section>
  );
};
