# Floor-plan workspace

This feature owns the shared Konva workspace used across the floor-plan workflow.

## Public components

- `FloorPlanEditor`: backward-compatible land/road editor.
- `FloorPlanWorkspace`: phase-based workspace for editing, buildable-space review, generation progress, final-plan viewing, and no-result display.

## Design

- `FloorPlanCanvas` owns viewport behavior only: resize, pan, zoom, fit, grid, blur, and HTML overlays.
- `scenes/` compose the visible content for each workflow phase.
- `layers/` render one type of geometry and do not call APIs.
- `controller/` and `engine/` continue to own land-editing state, commands, rules, and validation.
- API and SSE code must prepare application-level data and pass it into `FloorPlanWorkspace`.

Adding a visual feature normally means adding a layer and composing it into the relevant scene. It should not require changing viewport or editor-engine code.
