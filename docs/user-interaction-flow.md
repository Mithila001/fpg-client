# User Interaction Flow (Caves / Configure Rooms)

This file documents the user workflow in the `Caves` page and related canvas components. It is intended for developer reference and future understanding. It is not user-facing content.

## Section 1: Raw User Flow (Plain English)

1. User begins with a land boundary form where 4-6 points define a polygon on the canvas.
2. User drags corner points to reshape the plot. The shape updates live.
3. User adds/removes border lines to change polygon complexity (min 4, max 6).
4. User confirms the shape to lock it and generate a reference baseline.
5. After confirmation, user enters a target area in square meters.
6. User clicks apply area; system rescales the shape to match target area proportionally.
7. User can enable road placement mode. While in this mode:
   - the system tracks the pointer near polygon edges,
   - it snaps to the closest edge if within threshold,
   - user left-click places a road anchor, right-click cancels.
8. With a road placed, user runs the land-use algorithm.
9. System sends land shape + road data to backend and obtains usable rectangle + shrunken boundary.
10. User moves to room configuration, selects optional rooms and set floor dimensions within allowed limits.
11. User submits room configuration and requests floor plan generation.
12. System generates a floor plan and then switches to preview mode.
13. In preview mode, user sees the generated floor plan with walls, rooms, labels, and openings.
14. User can pan/zoom the view and return to step A for edits.

---

## Section 2: Current Implementation (code mapping + maintenance)

- `Caves.tsx`: orchestrates state and event handlers for all steps.
  - state: polygon points, border count, confirmation flag, road placement, algorithm outputs, generated floor plan data.
  - actions: confirm/edit shape, apply area, add/remove border, road placement toggle, run algorithm, configure room data, generate floor plan.

- `process/UnifiedProcessCanvas.tsx`: single process-canvas shell for both steps.
  - `mode === "edit"` → renders `process/StepAEditLayer.tsx`
  - `mode === "view"` → renders `process/StepBFloorPlanLayer.tsx`
  - keeps one shared white canvas surface style while mode toggles preserve flow.

- `CavesCanvas.tsx`: compatibility export pointing to `process/UnifiedProcessCanvas.tsx`.

- `InputPlanCanvas.tsx` (used by `process/StepAEditLayer.tsx`): implements step A interactions:
  - drag points with boundary validity checks (`isValidPolygon`, `isConvexPolygon`, min edge distance),
  - compute/display edge distances,
  - road placement preview and commit,
  - buildable rectangle and shrunk boundary drawing,
  - zoom, pan, fit-to-geometry, and helper controls.

- `KonvaCanvas.tsx` (used by `process/StepBFloorPlanLayer.tsx`): implements step B preview:
  - scales + offset for generated geometry,
  - grid draw, wall segments draw, label draw, openings draw,
  - zoom/pan state, wheel-based zoom and pan, reset via ref,
  - supports either segment paths or explicit point list as input.

### Metadata

- Last updated: 2026-03-30
- Maintainer note: If the source code for `Caves.tsx`, `process/UnifiedProcessCanvas.tsx`, `process/StepAEditLayer.tsx`, `process/StepBFloorPlanLayer.tsx`, `InputPlanCanvas.tsx`, or `KonvaCanvas.tsx` changes, update this section to reflect:
  1. Changed component responsibilities.
  2. Modified user action sequence.
  3. Updated props or event callback names.

### Instruction to AI for future updates

When a code change is made, follow this process:
- Read the modified files and key route (Caves page -> canvas component -> drawing component).
- Reconstruct step-by-step user flow in simple language (no code names in Section 1).
- Map the new implementation in Section 2 with explicit component function responsibilities.
- Set `Last updated` to the current date.
- Keep the separation: Section 1 for raw flow, Section 2 for implementation technical notes.
