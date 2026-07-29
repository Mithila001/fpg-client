# House Plan Generator API — Complete Client Integration Reference

> Canonical client-facing API document. This file consolidates the current `docs/api/client-integration-guide.md` contract and the still-relevant integration details from the superseded generation and SSE documents. Where older documents conflict with the current guide, this document follows the current guide.


This guide defines the public HTTP and Server-Sent Events (SSE) contract for
frontend applications and other API consumers.

## API overview

The API has five public endpoints:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/metadata` | Discover reference data and supported client options. |
| `POST` | `/buildable-space` | Calculate buildable and usable land. |
| `POST` | `/generation` | Generate a floor plan and wait for the final result. |
| `POST` | `/generation/stream` | Generate a floor plan while receiving SSE updates. |
| `DELETE` | `/generation/stream/{job_id}` | Cancel an active streamed generation. |

All URLs are currently unversioned. Metadata and SSE envelopes include their own
schema versions.

### Base URL

- Docker Compose default: `http://127.0.0.1:8001`
- Direct local server default: `http://127.0.0.1:8000`
- Production: supplied by the API operator.

Append the endpoint path directly to the deployment base URL.

### Authentication

The server currently has no endpoint authentication. Do not expose it directly
to an untrusted network without an authenticated gateway or equivalent access
control.

### CORS

Browser origins must be included in the server's configured CORS allowlist. The
development defaults allow `http://localhost:5173` and
`http://127.0.0.1:5173`.

### Units and coordinates

The API uses project units. The current buildable-space reference profile uses
10 project units per meter. Coordinates use an `x`, `y` Cartesian plane. Areas
are square project units.

```text
10 project units = 1 meter
1 project unit = 0.1 meter = 10 centimeters
```

The floor-plan orientation is:

```text
                 Back (+Y)
                     ↑
                     |
Left (-X)  ←---------+---------→  Right (+X)
                     |
                     ↓
                 Front (-Y)
```

Polygon points are ordered vertices. Clients must render the closing segment
from the last point back to the first point; the first point is not required to
be repeated at the end.

Clients should use the `units.project_units_per_meter` value returned by
`POST /buildable-space` when converting for display. Metadata buffers are
reported with `unit: "square_project_units"`.

## Request and response conventions

- JSON requests use `Content-Type: application/json`.
- JSON responses use `Content-Type: application/json`.
- Unknown request fields are rejected.
- Enum values are lowercase `snake_case` strings and are case-sensitive.
- Successful JSON bodies are endpoint-specific and are not wrapped.
- Every JSON error uses the same envelope:

```json
{
  "error": {
    "code": "invalid_request",
    "message": "The request is invalid.",
    "stage": "request_validation",
    "details": {
      "errors": [
        {
          "location": ["body", "rooms", "0", "room_type"],
          "code": "enum",
          "message": "Input should be a valid enumeration member."
        }
      ]
    }
  }
}
```

`error.code` is the stable machine-readable discriminator.
`error.message` is safe to display or log. `error.stage` identifies the failed
phase. `error.details` is always an object, but its members depend on the error
code.

### HTTP status codes

| Status | Meaning |
|---|---|
| `200` | Successful request, or cancellation was already requested. |
| `202` | A new cancellation request was accepted. |
| `404` | Endpoint or active generation job not found. |
| `422` | Structurally or semantically invalid client input, or generation could not satisfy the request. |
| `500` | Reference data or an unexpected server operation failed. |

### Pagination, filtering, and sorting

The API currently has no paginated collection endpoints. Pagination, filtering,
and sorting parameters are not supported.

### Rate limits

The application does not currently publish or enforce an application-level rate
limit. A deployment gateway may impose its own limits.

## Enumerations

### Client-selectable room types

`bedroom`, `bathroom`, `attached_bathroom`, `living_room`, `kitchen`,
`dining_room`, `veranda`, `garage`.

`hallway` is server-managed and must not appear in a generation request.

### Road values

- Road role: `main_entry`
- Road types: `main_road`, `private_road`

### Floor width alignment

`parallel_to_entry_road`, `perpendicular_to_entry_road`.

### Openings

- Opening type: `door`, `window`
- Purpose: `room_connection`, `main_entrance`, `secondary_entrance`, `daylight`

### Scoring

- Evaluation status: `completed`, `not_applicable`, `skipped`
- Group status: `completed`, `failed`, `not_applicable`, `skipped`
- Finding severity: `info`, `warning`, `error`

## Shared data models

### Point and polygon

```ts
type Point = { x: number; y: number };
type Polygon = { points: Point[] };
```

Land request coordinates are integers. Generated floor-plan coordinates are
numbers.

### Generation request

```ts
interface GenerationRequest {
  floor_limits: {
    max_width: number;  // > 0
    max_length: number; // > 0
  };
  aspect_ratio: "1:2" | "3:4" | "1:1" | "4:3" | "2:1" | number;
  rooms: GenerationRoom[];
}

interface GenerationRoom {
  room_type:
    | "bedroom"
    | "bathroom"
    | "attached_bathroom"
    | "living_room"
    | "kitchen"
    | "dining_room"
    | "veranda"
    | "garage";
  id?: string | null;
  name?: string | null;
  requested_size?: string | null; // defaults to "regular"
}
```

Numeric aspect ratios are accepted only when equivalent to a supported preset:
`0.5`, `0.75`, `1`, `1.3333333333333333`, or `2`.

Room IDs and names are generated when omitted. IDs must be unique when supplied.
Every submitted room is mandatory; there is no `required` field.

### Room-count validation

| Room | Minimum | Maximum | Client selectable |
|---|---:|---:|---|
| Bedroom | 1 | 4 | Yes |
| Bathroom | 1 | 4 | Yes |
| Attached bathroom | 0 | 4 | Yes |
| Living room | 1 | 1 | Yes |
| Kitchen | 1 | 1 | Yes |
| Dining room | 1 | 1 | Yes |
| Hallway | 1 | 1 | No, server-generated |
| Veranda | 1 | 1 | Yes |
| Garage | 0 | 1 | Yes |

The attached-bathroom count cannot exceed the bedroom count.

### Floor plan

```ts
interface FloorPlan {
  boundary: Polygon;
  rooms: FloorPlanRoom[];
  openings: FloorPlanOpening[];
  identity_redirects: Record<string, string>;
  applied_transformations: string[];
}

interface FloorPlanRoom {
  id: string;
  room_type: string;
  name: string;
  boundary: Polygon;
  role: "standard" | "solver_placeholder";
  parent_room_id: string | null;
  metadata: {
    source_room_ids: string[];
    applied_transformations: string[];
  };
}

interface FloorPlanOpening {
  id: string;
  opening_type: "door" | "window";
  purpose:
    | "room_connection"
    | "main_entrance"
    | "secondary_entrance"
    | "daylight";
  start: Point;
  end: Point;
  connected_room_ids: string[];
}
```

### Scoring result

```ts
interface ScoringResult {
  total_score: number;
  passed_critical: boolean;
  critical_failure: ScoreFinding | null;
  group_results: ScoringGroupResult[];
  evaluator_results: EvaluatorResult[];
  findings: ScoreFinding[];
}

interface ScoreFinding {
  code: string;
  message: string;
  severity: "info" | "warning" | "error";
  subject_ids: string[];
  metrics: ScoreMetric[];
}

interface ScoreMetric {
  name: string;
  value: number;
  unit: string | null;
}

interface ScoringGroupResult {
  group_key: string;
  status: "completed" | "failed" | "not_applicable" | "skipped";
  normalized_maximum: number;
  raw_score: number | null;
  contribution: number;
}

interface EvaluatorResult {
  evaluator_key: string;
  group_key: string;
  status: "completed" | "not_applicable" | "skipped";
  raw_score: number | null;
  configured_weight: number;
  normalized_weight: number;
  contribution: number;
  threshold: number | null;
  passed_threshold: boolean | null;
  findings: ScoreFinding[];
  metrics: ScoreMetric[];
  visualization_payload: unknown | null;
}
```

`total_score` is the overall numeric quality score. Always inspect
`passed_critical` separately; a high total score does not override a failed
critical evaluator.

Current known scoring group keys are `critical` and `functional`. Current known
evaluator keys are:

- `geometry_integrity`
- `required_adjacency`
- `enclosed_voids`
- `inward_recess`
- `living_room_balance`
- `bedroom_quality`
- `kitchen_dining_proximity`

Clients must tolerate future group and evaluator keys. The visualization payload
is evaluator-specific. The historical generation contract documented non-null
payloads for `enclosed_voids` and `inward_recess`; clients should discriminate
using `evaluator_key` and safely ignore unfamiliar payloads.

## `GET /metadata`

Use this endpoint before building generation or road-selection controls.

```http
GET /metadata
Accept: application/json
```

The response has this shape:

```ts
interface MetadataResponse {
  schema_version: 1;
  generation_reference_data: {
    room_sizes: Array<{
      room_type: string;
      size: string;
      min_width: number;
      max_width: number;
      min_area: number;
      max_area: number;
    }>;
    room_relations: Array<{
      source_room_type: string;
      target_room_types: string[];
      match_policy: "and" | "or";
      strength: "hard" | "soft";
      required: boolean;
    }>;
  };
  road_types: Array<{
    value: "main_road" | "private_road";
    name: "MAIN_ROAD" | "PRIVATE_ROAD";
    display_name: string;
  }>;
  room_requirements: Array<{
    room_type: string;
    name: string;
    min_count: number;
    max_count: number;
    client_selectable: boolean;
  }>;
  compatible_aspect_ratios: Array<{ label: string; value: number }>;
  buffers: {
    hallway_area: 300;
    floor_area: 500;
    unit: "square_project_units";
  };
}
```

Room-relation `required` is relationship metadata; it does not make a room
optional. Clients should treat the running server's metadata as authoritative.

Failure: `500 reference_data_unavailable`, stage `metadata`.

## `POST /buildable-space`

```ts
interface BuildableSpaceRequest {
  land_boundary: { points: Array<{ x: integer; y: integer }> };
  roads: Array<{
    boundary_edge_index: integer; // >= 0
    role: "main_entry";
    road_type: "main_road" | "private_road";
  }>;
}
```

The boundary requires at least four points. At least one road is required.
Road edge indexes refer to the submitted polygon edge order.

Example:

```http
POST /buildable-space
Content-Type: application/json
Accept: application/json
```

```json
{
  "land_boundary": {
    "points": [
      {"x": 0, "y": 0},
      {"x": 200, "y": 0},
      {"x": 200, "y": 200},
      {"x": 0, "y": 200}
    ]
  },
  "roads": [
    {
      "boundary_edge_index": 0,
      "role": "main_entry",
      "road_type": "main_road"
    }
  ]
}
```

Success:

```ts
interface BuildableSpaceResponse {
  flow_id: string;
  units: { project_units_per_meter: number };
  original_land: { area: number };
  buildable_land: {
    boundary: Polygon;
    area: number;
    edge_setbacks: Array<{
      edge_index: number;
      side: "front" | "back" | "left" | "right";
      base_setback: number;
      road_adjustment: number;
      final_setback: number;
      road_type: "main_road" | "private_road" | null;
    }>;
  };
  usable_land: {
    boundary: Polygon;
    width: number;
    length: number;
    area: number;
    floor_width_alignment:
      | "parallel_to_entry_road"
      | "perpendicular_to_entry_road";
    entry_road_edge_index: number;
  };
  reference_profile: string;
}
```

The response includes `X-Flow-ID`, equal to `flow_id`. Error responses also
include this header when a flow was established.

## `POST /generation`

Send a `GenerationRequest`. Success returns:

```ts
interface GenerationResponse {
  floor_plan: FloorPlan;
  scoring: ScoringResult;
}
```

Example:

```json
{
  "floor_limits": {"max_width": 120, "max_length": 100},
  "aspect_ratio": "1:1",
  "rooms": [
    {"room_type": "bedroom", "id": "bedroom_1"},
    {"room_type": "bathroom", "id": "bathroom_1"},
    {"room_type": "living_room", "id": "living_room"},
    {"room_type": "kitchen", "id": "kitchen"},
    {"room_type": "dining_room", "id": "dining_room"},
    {"room_type": "veranda", "id": "veranda"}
  ]
}
```

The server adds one hallway. A successful floor plan contains every room
submitted by the client.

The request remains open until generation succeeds or fails. Client, gateway,
and reverse-proxy timeouts must be longer than the server's configured
generation duration. Use this endpoint when the complete `ScoringResult` is
required; the SSE endpoint sends only the plan score and critical-pass flag with
each floor-plan event.

## `POST /generation/stream`

This is a request-scoped SSE stream using the same JSON body as
`POST /generation`.

```http
POST /generation/stream
Content-Type: application/json
Accept: text/event-stream
```

The initial response is `200`, has `Content-Type: text/event-stream`, and
includes `X-Generation-Job-ID`. Retain the job ID for cancellation.

Additional response headers:

- `Cache-Control: no-cache, no-transform`
- `Connection: keep-alive`
- `X-Accel-Buffering: no`

Native browser `EventSource` cannot send this required POST body. Use `fetch()`
and parse the returned `ReadableStream`.

### SSE wire format

```text
id: 4
event: progress
data: {"schema_version":1,"sequence":4,"timestamp":"2026-07-29T12:00:00.000Z","job_id":"...","event":"progress","payload":{...}}

```

```ts
interface SseEnvelope<TEvent extends string, TPayload> {
  schema_version: 1;
  sequence: number;
  timestamp: string; // UTC ISO-8601
  job_id: string;
  event: TEvent;
  payload: TPayload;
}
```

The SSE `id` equals `sequence`. Event names are:

| Event | Payload |
|---|---|
| `status` | `{ status: GenerationStatus }` |
| `candidate_trial` | `{ trial_number, trial_limit, candidate_hints }` |
| `progress` | `{ stage, trial_number, trial_limit, elapsed_ms, timeout_ms }` |
| `floor_plan` | `{ classification, trial_number, candidate_id, solver_run_id, score, passed_critical, floor_plan }` |
| `completed` | `{ outcome, final_floor_plan_sequence, elapsed_ms }` |
| `cancelled` | `{ reason }` |
| `error` | `{ stage, code, message, details, recoverable }` |

```ts
type GenerationStatus =
  | "job_started"
  | "candidate_search_started"
  | "floor_plan_generation_started"
  | "usable_floor_plan_found"
  | "presentable_floor_plan_found"
  | "timeout_reached";

interface CandidateHint {
  room_id: string;
  x: number;
  y: number;
  room_type: string | null;
  hint_index: number;
}
```

`floor_plan.classification` is `usable` or `presentable`.
`completed.outcome` is `presentable_plan_found` or
`best_usable_plan_returned`.

`completed`, `cancelled`, and `error` are terminal; the connection closes after
one of them. Treat a transport close without a terminal event as an interrupted
request.

Candidate-trial events are throttled to at most one per 100 ms and progress
events to at most one per 500 ms. Intermediate events may be coalesced or
dropped under backpressure. Never use event count as business state.

### Heartbeats and lifecycle

When no event is available, the server sends an SSE comment every 15 seconds:

```text
: keep-alive

```

Ignore comment frames. The stream has no replay buffer and does not implement
`Last-Event-ID` recovery. To retry after a network failure, submit a new POST,
receive a new job ID, and treat it as a new generation.

Disconnecting the HTTP reader stops delivery but does not guarantee immediate
server-side cancellation. Call the cancellation endpoint when the user
explicitly stops generation.

### Browser connection example

Native `EventSource` cannot be used because it issues only GET requests. The
client must use `fetch()`, buffer arbitrary network chunks, split frames only at
blank-line boundaries, and ignore comment-only heartbeat frames.

```ts
type GenerationEvent = SseEnvelope<string, Record<string, unknown>>;

type StreamHandlers = {
  onEvent?: (event: GenerationEvent) => void;
  onJobId?: (jobId: string) => void;
};

async function streamGeneration(
  baseUrl: string,
  generationRequest: GenerationRequest,
  handlers: StreamHandlers = {},
  signal?: AbortSignal,
): Promise<GenerationEvent> {
  const response = await fetch(`${baseUrl}/generation/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "text/event-stream",
    },
    body: JSON.stringify(generationRequest),
    signal,
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const failure = contentType.includes("application/json")
      ? await response.json()
      : await response.text();
    throw new Error(`Generation HTTP ${response.status}: ${JSON.stringify(failure)}`);
  }

  if (!response.body) {
    throw new Error("The server did not return a readable stream.");
  }

  const headerJobId = response.headers.get("X-Generation-Job-ID");
  if (headerJobId) handlers.onJobId?.(headerJobId);

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  const floorPlans = new Map<number, GenerationEvent>();
  let buffer = "";
  let terminalEvent: GenerationEvent | null = null;

  try {
    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });

      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";

      for (const frame of frames) {
        const data = frame
          .split(/\r?\n/)
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).replace(/^ /, ""))
          .join("\n");

        if (!data) continue;

        const event = JSON.parse(data) as GenerationEvent;
        if (event.schema_version !== 1) {
          throw new Error(`Unsupported SSE schema version: ${event.schema_version}`);
        }

        handlers.onJobId?.(event.job_id);
        handlers.onEvent?.(event);

        if (event.event === "floor_plan") {
          floorPlans.set(event.sequence, event);
        }

        if (
          event.event === "completed" ||
          event.event === "cancelled" ||
          event.event === "error"
        ) {
          terminalEvent = event;
          break;
        }
      }

      if (terminalEvent || done) break;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }

  if (!terminalEvent) {
    throw new Error("SSE connection closed before a terminal event.");
  }

  if (terminalEvent.event === "error") {
    const payload = terminalEvent.payload as {
      stage?: string;
      code?: string;
      message?: string;
    };
    throw new Error(
      `${payload.stage ?? "generation"}/${payload.code ?? "error"}: ` +
      `${payload.message ?? "Generation failed."}`,
    );
  }

  if (terminalEvent.event === "completed") {
    const payload = terminalEvent.payload as {
      final_floor_plan_sequence?: number | null;
    };
    const selectedSequence = payload.final_floor_plan_sequence;
    if (
      selectedSequence == null ||
      !floorPlans.has(selectedSequence)
    ) {
      throw new Error("Completion did not reference a received floor-plan event.");
    }
  }

  return terminalEvent;
}
```

A local `AbortController` stops this client's HTTP reader. It does not guarantee
server-side cancellation. When the user explicitly cancels generation, call the
DELETE endpoint and continue reading until the stream sends a terminal event.

## `DELETE /generation/stream/{job_id}`

Use the exact job ID from `X-Generation-Job-ID`.

- `202`: `{"job_id":"...","status":"cancellation_requested"}`
- `200`: `{"job_id":"...","status":"already_requested"}`
- `404`: common error envelope with code `not_found`

Cancellation is cooperative. Continue reading until the stream emits
`cancelled`, `completed`, or `error`.

Browser example:

```ts
async function cancelGeneration(baseUrl: string, jobId: string) {
  const response = await fetch(
    `${baseUrl}/generation/stream/${encodeURIComponent(jobId)}`,
    {
      method: "DELETE",
      headers: { "Accept": "application/json" },
    },
  );

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    throw new Error(`Cancellation HTTP ${response.status}: ${JSON.stringify(payload)}`);
  }

  return payload as {
    job_id: string;
    status: "cancellation_requested" | "already_requested";
  };
}
```

A `202` response means that the cancellation signal was newly accepted. A `200`
response means the same active job had already received a cancellation request.
A `404` response means no matching active streamed job is registered; this can
also occur after the job has already completed or failed.

## Error codes

### General

| Code | Meaning |
|---|---|
| `invalid_request` | JSON shape, type, enum, required field, or unknown field is invalid. |
| `not_found` | The requested active job does not exist. |
| `reference_data_unavailable` | Metadata could not be loaded or validated. |
| `unexpected_error` / `unexpected_generation_error` | An unclassified server failure occurred. |

### Generation and preprocessing

| Code | Meaning |
|---|---|
| `invalid_input` | A generation input value is invalid. |
| `invalid_aspect_ratio` | The ratio is malformed or not one of the advertised presets. |
| `invalid_room_count` | A room count is outside metadata limits. |
| `forbidden_room_type` | A server-managed or unsupported room type was submitted. |
| `duplicate_room_id` | Two submitted rooms resolve to the same ID. |
| `attached_bathroom_count_exceeds_bedrooms` | There are more attached bathrooms than bedrooms. |
| `invalid_reference_data` | Generation reference data is invalid. |
| `missing_room_reference` | No size definition exists for a submitted room/size. |
| `invalid_room_relation` | A configured relation cannot be prepared. |
| `floor_limits_insufficient` | The supplied floor limits cannot fit the mandatory rooms and buffers. |
| `invalid_prepared_context` | The prepared generation context is inconsistent. |
| `invalid_preprocessing_output` | Final preprocessed input failed validation. |
| `solver_infeasible`, `solver_unknown`, `solver_model_invalid` | The floor-plan solver could not produce a plan. |
| `refinement_infeasible`, `refinement_unknown`, `refinement_model_invalid` | A refinement pass failed. |
| `post_processing_failed` | Final geometry processing failed. |
| `openings_missing_floor_plan` | Opening generation did not return a plan. |
| `critical_validation_failed` | The selected plan failed critical scoring checks. |
| `no_floor_plan_found` | No usable plan was found before timeout or search exhaustion. |
| `generation_cancelled` | Generation was cancelled. In SSE this normally becomes `cancelled`. |

Some stage-specific failures use the lowercase snake-case exception name as
their code. Always branch first on `stage` and `code`, and preserve unknown
codes for logging instead of treating them as a parsing failure.

### Buildable-space

| Code | Meaning |
|---|---|
| `invalid_land_boundary` | Boundary geometry is invalid. |
| `non_convex_land` | The boundary is not supported because it is non-convex. |
| `self_intersecting_land` | Boundary edges intersect. |
| `invalid_road_attachment` | A road points to an invalid boundary edge. |
| `multiple_main_entry_roads` | More than one main-entry road was supplied. |
| `unsupported_road_type` | The selected road type is unavailable. |
| `reference_data_error` | Buildable-space reference data failed. |
| `setback_eliminates_buildable_land` | Setbacks leave no buildable polygon. |
| `buildable_land_calculation_failed` | Buildable-land calculation failed. |
| `no_usable_land_found` | No usable rectangle satisfies the constraints. |
| `search_limit_exceeded` | Usable-land search reached its configured limit. |
| `usable_land_calculation_failed` | Usable-land calculation failed. |
| `unexpected_buildable_space_error` | An unclassified buildable-space failure occurred. |

## End-to-end integration sequence

1. Call `GET /metadata` and cache it for the current server deployment.
2. Build room, road, and aspect-ratio controls from metadata.
3. Submit the land boundary to `POST /buildable-space`.
4. Use the returned usable width and length as generation floor limits.
5. Submit `POST /generation/stream` with all mandatory client rooms.
6. Store `X-Generation-Job-ID`, process events by name, and render the newest
   `floor_plan` event.
7. On `completed`, retain the floor plan referenced by
   `final_floor_plan_sequence`. On `error` or `cancelled`, stop reading.
8. If the user cancels, call the DELETE endpoint and continue reading until the
   terminal event arrives.

For clients that do not need progress, use `POST /generation` in step 5 and
consume its final `floor_plan` and `scoring` objects directly.

## Client error-handling strategy

1. Check the HTTP status before attempting to parse an SSE stream.
2. Check `Content-Type` before assuming an error body is JSON.
3. For JSON errors, branch on `error.stage` and `error.code` rather than the
   English message.
4. Preserve unknown error codes in logs and display the server-provided safe
   message.
5. After an SSE response has started, treat `error`, `cancelled`, and
   `completed` as terminal.
6. Treat connection closure without a terminal event as an interrupted request,
   not as success.
7. Do not infer the final plan from the most recently displayed plan. Use
   `completed.payload.final_floor_plan_sequence`.

## Browser and deployment requirements

For a browser client hosted on another origin:

1. Add the exact client origin to the server's CORS allowlist.
2. Ensure `X-Generation-Job-ID` is exposed to browser JavaScript when the client
   relies on the response header. The event envelope also carries `job_id`.
3. Use HTTPS for the API when the client page is served over HTTPS.
4. Disable reverse-proxy buffering for `/generation/stream`.
5. Keep proxy read and idle timeouts longer than the generation duration and
   heartbeat interval.
6. Avoid intermediary compression or response transformation that delays SSE
   frames.
7. Do not expose the unauthenticated API directly to the public internet without
   an authenticated gateway or equivalent protection.

## Client integration checklist

- Load `/metadata` instead of hard-coding room sizes, relations, aspect ratios,
  room-count rules, road types, or generation buffers.
- Send only canonical lowercase enum values.
- Do not submit `hallway`; it is server-managed.
- Do not send a `required` field. Every submitted room is mandatory.
- Keep room IDs unique when providing them.
- Use the usable width and length returned by `/buildable-space` as generation
  floor limits.
- Use `POST /generation` when the complete scoring report is required.
- Use `fetch()` streaming rather than `EventSource` for
  `POST /generation/stream`.
- Ignore SSE heartbeat comments.
- Do not expect every candidate trial or progress update.
- Do not require contiguous SSE sequence numbers.
- Store floor-plan events by sequence until completion chooses the final one.
- Call the DELETE endpoint for explicit server-side cancellation.
- Start a new POST after network failure; replay and `Last-Event-ID` recovery are
  unsupported.

