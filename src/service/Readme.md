# Service Layer

This folder contains server communication, runtime contract validation, and reusable transport helpers. It does not contain React state, drawing logic, or production page behavior.

## Structure

```text
service/
├── http/          # API URL builder and shared Axios client
├── transport/     # Reusable fetch-response SSE parser
├── validation/    # Reusable primitive runtime validators
├── boundary/      # POST /buildable-space
└── floor-plan/    # POST /generation/stream
```

## Floor-plan stream

The floor-plan endpoint is SSE over POST:

```text
POST /generation/stream
  -> validate request
  -> fetch with Accept: text/event-stream
  -> read response.body
  -> buffer complete SSE frames
  -> validate every envelope and event payload
  -> retain floor_plan events by sequence
  -> select completed.final_floor_plan_sequence
```

Browser `EventSource` is not used because it only performs GET and cannot send the JSON request body.

## Usage

```ts
import {
  startFloorPlanGeneration,
  type FloorPlanGenerationRequest,
} from "./service/floor-plan";

const request: FloorPlanGenerationRequest = {
  floor_limits: { max_width: 120, max_length: 100 },
  aspect_ratio: "4:3",
  rooms: [
    { id: "bedroom_1", room_type: "bedroom" },
    { id: "bathroom_1", room_type: "bathroom" },
    { id: "kitchen_1", room_type: "kitchen" },
    { id: "veranda_1", room_type: "veranda" },
  ],
};

const session = await startFloorPlanGeneration(request, {
  onOpen: (jobId) => console.log("Opened", jobId),
  onEvent: (event) => console.log(event.event, event.payload),
  onClose: (reason) => console.log("Closed", reason),
  onError: (error) => console.error(error),
});

const result = await session.completion;
console.log("Final plan", result.selectedFloorPlan);

// This only closes local delivery. It does not cancel server computation.
session.stream.close();
```

## Environment

Docker Compose commonly exposes the API on port `8001`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8001
```

A directly launched Uvicorn server commonly uses port `8000`:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

The default stream path is `/generation/stream`. Override it only when the deployed server uses a different relative route:

```env
VITE_FLOOR_PLAN_STREAM_PATH=/generation/stream
```
