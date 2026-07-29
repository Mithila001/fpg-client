# Service Layer

This folder is the boundary between the application and the server.

- API contract types stay private inside each service folder.
- Runtime validators validate only API-shaped data.
- Mappers convert application models to API requests and API responses/events to application models.
- The rest of the application imports its data types from `src/types`.

## Structure

```text
src/
├── types/
│   ├── geometry.ts
│   ├── boundary.ts
│   ├── floor-plan.ts
│   └── index.ts
└── service/
    ├── boundary/
    │   ├── boundary.api.types.ts
    │   ├── boundary.mapper.ts
    │   ├── boundary.validators.ts
    │   ├── boundary.service.ts
    │   └── index.ts
    └── floor-plan/
        ├── floor-plan.api.types.ts
        ├── floor-plan.mapper.ts
        ├── floor-plan.service.types.ts
        ├── floor-plan.validators.ts
        ├── floor-plan.service.ts
        ├── floor-plan.reference.service.ts
        └── index.ts
```

## Dependency rule

```text
Application -> src/types
Service mapper -> src/types + private API types
Validator/transport -> private API types
```

Files outside a service folder must not import `*.api.types.ts` or a mapper directly.

## Boundary usage

```ts
import { calculateBuildableSpace } from "./service/boundary";
import type { BuildableSpaceRequest } from "./types";

const request: BuildableSpaceRequest = {
  landBoundary: {
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 80 },
      { x: 0, y: 80 },
    ],
  },
  roads: [
    {
      boundaryEdgeIndex: 0,
      role: "main_entry",
      roadType: "main_road",
    },
  ],
};

const result = await calculateBuildableSpace(request);
console.log(result.usableLand.width);
```

## Floor-plan stream usage

```ts
import { startFloorPlanGeneration } from "./service/floor-plan";
import type { FloorPlanGenerationRequest } from "./types";

const request: FloorPlanGenerationRequest = {
  floorLimits: { maxWidth: 120, maxLength: 100 },
  aspectRatio: "4:3",
  rooms: [
    { id: "bedroom_1", roomType: "bedroom" },
    { id: "bathroom_1", roomType: "bathroom" },
    { id: "kitchen_1", roomType: "kitchen" },
  ],
};

const session = await startFloorPlanGeneration(request, {
  onEvent: (event) => {
    console.log(event.jobId, event.event, event.payload);
  },
});

const result = await session.completion;
if (result.status === "completed" && result.selectedFloorPlan) {
  console.log(result.selectedFloorPlan.floorPlan);
}
```

## Generation reference and cancellation

```ts
import {
  cancelFloorPlanGeneration,
  getRoomSizeConstraints,
} from "./service/floor-plan";

const { constraints } = await getRoomSizeConstraints();
const cancellation = await cancelFloorPlanGeneration(session.jobId!);
```

The stream remains open after the DELETE request. Continue reading until the
terminal `cancelled`, `completed`, or `error` event is received.

## Measurement boundary

Application geometry always uses `10 project units = 1 meter`. API mappers must
call the helpers from `src/service/measurement` for every coordinate, length,
and area field.

Length and area are intentionally separate:

- Length uses the units-per-meter factor once.
- Area uses the square of the units-per-meter factor.

The boundary API response declares `project_units_per_meter`; its mapper uses
that response value. The floor-plan API currently uses the constant in
`src/service/measurement/api-measurement.mapper.ts`.
