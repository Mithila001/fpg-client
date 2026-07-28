# Floor Plan Editor feature

A bounded UI feature for editing the land boundary and entry-road attachment.

- `engine/`: pure state transitions, geometry, commands, and rules. No React or Konva.
- `controller/`: React adapter that owns the reducer and publishes stable actions.
- `canvas/`: Konva rendering and pointer/viewport translation only.
- `panels/`: feature UI controls and inspection surfaces.
- `index.ts`: the only supported import surface for the rest of the application.

The public value is the application-level `BuildableSpaceRequest`. Temporary selections, road previews, viewport state, and command types stay private to the feature.
