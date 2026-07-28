import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type { BuildableSpaceRequest, Point } from "../../../types";
import type {
  EditorMode,
  FloorPlanEditorSnapshot,
} from "../types/editor.types";
import {
  createEditorReducer,
  createEditorState,
  editorStateToRequest,
} from "../engine/editor-reducer";
import { DEFAULT_EDITOR_CONFIG, DEFAULT_EDITOR_VALUE } from "../engine/model/defaults";
import type { EditorConfig } from "../engine/model/editor-state";

interface UseEditorControllerOptions {
  value?: BuildableSpaceRequest;
  initialValue?: BuildableSpaceRequest;
  onChange?: (snapshot: FloorPlanEditorSnapshot) => void;
  minVertices?: number;
  maxVertices?: number;
  readOnly?: boolean;
}

export const useEditorController = ({
  value,
  initialValue,
  onChange,
  minVertices = DEFAULT_EDITOR_CONFIG.minVertices,
  maxVertices = DEFAULT_EDITOR_CONFIG.maxVertices,
  readOnly = false,
}: UseEditorControllerOptions) => {
  const config = useMemo<EditorConfig>(
    () => ({ ...DEFAULT_EDITOR_CONFIG, minVertices, maxVertices }),
    [maxVertices, minVertices],
  );
  const reducer = useMemo(() => createEditorReducer(config), [config]);
  const startingValue = value ?? initialValue ?? DEFAULT_EDITOR_VALUE;
  const [state, dispatch] = useReducer(reducer, startingValue, (current) =>
    createEditorState(current, config),
  );
  const controlledSignature = value ? JSON.stringify(value) : null;

  const snapshot = useMemo<FloorPlanEditorSnapshot>(
    () => ({
      value: editorStateToRequest(state),
      isValid: state.validation.isValid,
      issues: state.validation.issues,
    }),
    [state],
  );

  const internalSignature = JSON.stringify(snapshot.value);
  useEffect(() => {
    if (!value || controlledSignature === internalSignature) return;
    dispatch({ type: "replace-document", value });
  }, [controlledSignature, internalSignature, value]);

  const lastEmittedSignature = useRef<string>(JSON.stringify(snapshot.value));
  useEffect(() => {
    const signature = JSON.stringify(snapshot.value);
    if (signature === lastEmittedSignature.current) return;
    lastEmittedSignature.current = signature;
    onChange?.(snapshot);
  }, [onChange, snapshot]);

  const setMode = useCallback(
    (mode: EditorMode) => {
      if (readOnly && mode !== "inspect") return;
      dispatch({ type: "set-mode", mode });
    },
    [readOnly],
  );

  const selectVertex = useCallback(
    (index: number | null) => {
      if (readOnly) return;
      dispatch({ type: "select-vertex", index });
    },
    [readOnly],
  );

  const moveVertex = useCallback(
    (index: number, point: Point) => {
      if (readOnly) return;
      dispatch({ type: "move-vertex", index, point });
    },
    [readOnly],
  );

  const addVertex = useCallback(() => {
    if (!readOnly) dispatch({ type: "add-vertex" });
  }, [readOnly]);

  const removeSelectedVertex = useCallback(() => {
    if (!readOnly) dispatch({ type: "remove-selected-vertex" });
  }, [readOnly]);

  const previewRoadAt = useCallback(
    (point: Point | null) => {
      if (!readOnly) dispatch({ type: "preview-road-at", point });
    },
    [readOnly],
  );

  const placePreviewRoad = useCallback(() => {
    if (!readOnly) dispatch({ type: "place-preview-road" });
  }, [readOnly]);

  const clearRoad = useCallback(() => {
    if (!readOnly) dispatch({ type: "clear-road" });
  }, [readOnly]);

  return {
    state,
    snapshot,
    config,
    actions: {
      setMode,
      selectVertex,
      moveVertex,
      addVertex,
      removeSelectedVertex,
      previewRoadAt,
      placePreviewRoad,
      clearRoad,
    },
  };
};
