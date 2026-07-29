# Buildable Space API — Client Documentation

## 1. Overview

The Buildable Space API accepts a convex land boundary and the land edge connected to the main entry road. It returns:

- the original land area;
- the land remaining after server-configured setbacks;
- a road-aligned usable rectangular building area; and
- the setback applied to each classified land edge.

This endpoint is synchronous. It does not create a generation job, stream progress, or generate a floor plan.

> **Important regulatory limitation:** The current `mock_residential_v1` setback profile contains migration seed values. It is not verified as Sri Lankan regulatory data and must not be presented to users as legal or regulatory advice.

---

## 2. Endpoint

```http
POST {BASE_URL}/buildable-space
Content-Type: application/json
```

### Successful status

```http
200 OK
```

### Trace header

Every response includes:

```http
X-Flow-ID: <flow-id>
```

The same value is returned as `flow_id` in the response body. Store this ID when reporting an API failure.

---

## 3. Measurement Rules

The endpoint uses project units:

```text
10 project units = 1 metre
1 project unit = 10 centimetres
```

Rules:

- Request coordinates must be integers.
- Do not send metres or decimal project units.
- Returned polygon coordinates are JSON numbers and may contain decimals because geometric calculations can create non-integer points.
- Areas are measured in square project units.

Example:

```text
Width: 120 units = 12 metres
Area: 12,000 square units = 120 square metres
```

To convert a returned area to square metres:

```text
square_metres = square_project_units / 100
```

---

## 4. Request Body

```json
{
  "land_boundary": {
    "points": [
      { "x": 0, "y": 0 },
      { "x": 200, "y": 0 },
      { "x": 200, "y": 200 },
      { "x": 0, "y": 200 }
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

### 4.1 Request type

```ts
export interface BuildableSpaceRequest {
  land_boundary: LandBoundaryRequest;
  roads: RoadAttachmentRequest[];
}

export interface LandBoundaryRequest {
  points: LandPointRequest[];
}

export interface LandPointRequest {
  x: number;
  y: number;
}

export interface RoadAttachmentRequest {
  boundary_edge_index: number;
  role: "main_entry";
  road_type: "main_road" | "private_road";
}
```

Although TypeScript uses `number`, `x`, `y`, and `boundary_edge_index` must contain integer values.

---

## 5. Land Boundary Requirements

`land_boundary.points` defines the land polygon.

| Requirement | Current rule |
|---|---:|
| Minimum points | 4 |
| Maximum points | 50 |
| Coordinate type | Integer only |
| Maximum absolute coordinate | 100,000 |
| Polygon shape | Convex |
| Self-intersection | Not allowed |
| Degenerate/zero-area shape | Not allowed |
| Unknown fields | Not allowed |

The server rejects values such as:

- `200.0`, even when mathematically equal to an integer;
- `true` or `false` as coordinates;
- additional point properties such as `z`;
- concave, self-intersecting, or collinear/degenerate boundaries.

### Edge indexing

For a polygon with points `P0 ... Pn`, request edge indexes are interpreted as:

```text
Edge 0 = P0 -> P1
Edge 1 = P1 -> P2
...
Final edge = Pn -> P0
```

Example:

```text
P3 -------- P2
|            |
|            |
P0 -------- P1
```

```text
Edge 0: P0 -> P1
Edge 1: P1 -> P2
Edge 2: P2 -> P3
Edge 3: P3 -> P0
```

---

## 6. Road Attachment Requirements

Each road attachment contains:

| Field | Type | Allowed values / rule |
|---|---|---|
| `boundary_edge_index` | Integer | `0` or greater and must identify an existing land edge |
| `role` | String enum | `main_entry` |
| `road_type` | String enum | `main_road`, `private_road` |

The request model uses an array for future extensibility. In the current API, only the `main_entry` role exists, and multiple main-entry roads are rejected. Clients should therefore send exactly one road attachment.

The selected road edge determines the land's front side and the alignment used when searching for the usable rectangle.

---

## 7. Server-Owned Values

The client must not send:

- setback distances;
- the active setback profile;
- project-unit configuration;
- minimum usable dimensions;
- search resolution; or
- search limits.

These values are controlled by server reference data.

### Current reference configuration

The following values describe the current packaged configuration and may change without requiring a request-contract change.

#### Active profile

```text
mock_residential_v1
```

#### Base setbacks

| Side | Project units | Metres |
|---|---:|---:|
| Front | 10 | 1.0 m |
| Back | 30 | 3.0 m |
| Left | 10 | 1.0 m |
| Right | 10 | 1.0 m |

#### Road adjustments

`final_setback = base_setback + road_adjustment`

An adjustment is relevant when an edge is associated with that road type. Under the current request contract, the single main-entry road identifies the front edge; the remaining side-specific values support the server's reference-data model and future road attachments.

| Road type | Front | Back | Left | Right |
|---|---:|---:|---:|---:|
| `main_road` | +5 | +0 | +5 | +5 |
| `private_road` | +5 | +0 | +0 | +0 |

#### Usable-land search configuration

| Setting | Current value |
|---|---:|
| Minimum width | 80 units |
| Minimum length | 80 units |
| Search resolution | 5 units |
| Maximum sweep lines | 1,000 |

Do not hardcode these values into client-side validation or business logic. The server remains the source of truth.

---

## 8. Successful Response

### 8.1 Response type

```ts
export interface BuildableSpaceResponse {
  flow_id: string;
  units: {
    project_units_per_meter: number;
  };
  original_land: {
    area: number;
  };
  buildable_land: {
    boundary: PolygonResponse;
    area: number;
    edge_setbacks: EdgeSetbackResponse[];
  };
  usable_land: {
    boundary: PolygonResponse;
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

export interface PolygonResponse {
  points: PointResponse[];
}

export interface PointResponse {
  x: number;
  y: number;
}

export interface EdgeSetbackResponse {
  edge_index: number;
  side: "front" | "back" | "left" | "right";
  base_setback: number;
  road_adjustment: number;
  final_setback: number;
  road_type: "main_road" | "private_road" | null;
}
```

### 8.2 Response shape

The following JSONC shows the response structure. Geometry and measurement values are intentionally represented as placeholders because they depend on the submitted land.

```jsonc
{
  "flow_id": "<flow-id>",
  "units": {
    "project_units_per_meter": 10
  },
  "original_land": {
    "area": <number>
  },
  "buildable_land": {
    "boundary": {
      "points": [
        { "x": <number>, "y": <number> },
        // Additional returned polygon points
      ]
    },
    "area": <number>,
    "edge_setbacks": [
      {
        "edge_index": 0,
        "side": "front",
        "base_setback": 10,
        "road_adjustment": 5,
        "final_setback": 15,
        "road_type": "main_road"
      }
    ]
  },
  "usable_land": {
    "boundary": {
      "points": [
        { "x": <number>, "y": <number> },
        // Four rectangle corners are returned
      ]
    },
    "width": <integer>,
    "length": <integer>,
    "area": <integer>,
    "floor_width_alignment": "parallel_to_entry_road",
    "entry_road_edge_index": 0
  },
  "reference_profile": "mock_residential_v1"
}
```

### 8.3 Field meanings

| Field | Meaning |
|---|---|
| `flow_id` | Request execution identifier used for tracing and support |
| `units.project_units_per_meter` | Unit scale used for this calculation |
| `original_land.area` | Area of the validated original land polygon |
| `buildable_land.boundary` | Polygon remaining after setbacks |
| `buildable_land.area` | Area remaining after setbacks |
| `buildable_land.edge_setbacks` | Setback calculation applied to each classified edge |
| `edge_setbacks[].side` | Server-classified side relative to the main entry road |
| `edge_setbacks[].road_type` | Road type affecting that edge, or `null` when no road adjustment applies |
| `usable_land.boundary` | Returned usable rectangular building boundary |
| `usable_land.width` | Width of the usable rectangle in project units |
| `usable_land.length` | Length of the usable rectangle in project units |
| `usable_land.area` | `width * length` in square project units |
| `usable_land.floor_width_alignment` | Whether the returned width is parallel or perpendicular to the entry road |
| `usable_land.entry_road_edge_index` | Entry-road edge index used by the usable-land calculation |
| `reference_profile` | Server profile used for the calculation |

---

## 9. Usable-Rectangle Accuracy

The returned usable rectangle is deterministic for the same request and server configuration.

It is the best candidate found on the server's configured search lattice. It is not claimed to be the continuous mathematical maximum rectangle possible inside the buildable polygon.

The current search uses a 5-unit local-Y resolution. Candidate boundaries are conservatively snapped inward to whole project units and checked again for containment before the response is returned.

Clients should use the returned rectangle as authoritative and should not independently reconstruct it from the setback values.

---

## 10. Error Responses

### 10.1 Error type

```ts
export interface BuildableSpaceErrorResponse {
  flow_id: string;
  stage:
    | "request_validation"
    | "reference_data"
    | "buildable_land"
    | "usable_land"
    | "response";
  code: BuildableSpaceErrorCode;
  message: string;
  details: Record<string, unknown>;
}

export type BuildableSpaceErrorCode =
  | "invalid_request"
  | "invalid_land_boundary"
  | "non_convex_land"
  | "self_intersecting_land"
  | "invalid_road_attachment"
  | "multiple_main_entry_roads"
  | "unsupported_road_type"
  | "reference_data_error"
  | "setback_eliminates_buildable_land"
  | "buildable_land_calculation_failed"
  | "no_usable_land_found"
  | "search_limit_exceeded"
  | "usable_land_calculation_failed"
  | "unexpected_buildable_space_error";
```

### 10.2 Structural validation error example

```json
{
  "flow_id": "<flow-id>",
  "stage": "request_validation",
  "code": "invalid_request",
  "message": "The buildable-space request is invalid.",
  "details": {
    "errors": [
      {
        "location": ["body", "land_boundary", "points", "0", "x"],
        "message": "Input should be a valid integer",
        "type": "int_type"
      }
    ]
  }
}
```

The exact Pydantic `message` and `type` values can vary. Client logic should primarily use the HTTP status and top-level `code`.

### 10.3 Business/calculation error shape

```json
{
  "flow_id": "<flow-id>",
  "stage": "usable_land",
  "code": "no_usable_land_found",
  "message": "<human-readable explanation>",
  "details": {}
}
```

`details` may be empty or may contain error-specific diagnostic fields. Clients must tolerate additional keys.

---

## 11. HTTP Status Codes

| Status | Meaning |
|---:|---|
| `200` | Calculation completed successfully |
| `422` | Invalid request, invalid land/road data, no valid buildable area, or another handled calculation failure |
| `500` | Server reference data is unavailable or an unexpected server failure occurred |

### Error-code status mapping

#### Normally returned with `422`

- `invalid_request`
- `invalid_land_boundary`
- `non_convex_land`
- `self_intersecting_land`
- `invalid_road_attachment`
- `multiple_main_entry_roads`
- `unsupported_road_type`
- `setback_eliminates_buildable_land`
- `buildable_land_calculation_failed`
- `no_usable_land_found`
- `search_limit_exceeded`
- `usable_land_calculation_failed`

#### Returned with `500`

- `reference_data_error`
- `unexpected_buildable_space_error`

The `message` field is intended for display or diagnostics. Do not use it as a stable programmatic identifier; use `code`.

---

## 12. Client Request Example

```ts
export async function calculateBuildableSpace(
  baseUrl: string,
  request: BuildableSpaceRequest,
): Promise<BuildableSpaceResponse> {
  const response = await fetch(`${baseUrl}/buildable-space`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  const body = (await response.json()) as
    | BuildableSpaceResponse
    | BuildableSpaceErrorResponse;

  if (!response.ok) {
    const error = body as BuildableSpaceErrorResponse;
    throw new Error(
      `${error.code}: ${error.message} (flow: ${error.flow_id})`,
    );
  }

  return body as BuildableSpaceResponse;
}
```

Example call:

```ts
const result = await calculateBuildableSpace(API_BASE_URL, {
  land_boundary: {
    points: [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 200 },
      { x: 0, y: 200 },
    ],
  },
  roads: [
    {
      boundary_edge_index: 0,
      role: "main_entry",
      road_type: "main_road",
    },
  ],
});

console.log(result.usable_land);
```

---

## 13. Client Implementation Rules

1. Send all coordinates as integer project units.
2. Send a convex, non-self-intersecting land polygon with 4–50 points.
3. Send exactly one current road attachment with `role: "main_entry"`.
4. Ensure `boundary_edge_index` identifies a valid polygon edge.
5. Do not send or calculate setback configuration on the client.
6. Treat server-returned geometry as the authoritative result.
7. Handle both `422` and `500` using the structured error body.
8. Record `flow_id` or `X-Flow-ID` when logging or reporting failures.
9. Do not describe the current mock setback profile as verified legal compliance.
