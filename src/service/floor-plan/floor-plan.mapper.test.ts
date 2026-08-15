import { describe, expect, it } from "vitest";
import { parseGenerationEvent, parseJobStatus, toFloorPlanApiRequest } from "./floor-plan.mapper";

const floorPlan = {
  boundary: { points: [{ x: 0, y: 0 }, { x: 40, y: 0 }, { x: 40, y: 30 }, { x: 0, y: 30 }] },
  rooms: [{
    id: "hallway-1", room_type: "hallway", name: "Hallway", role: "standard", parent_room_id: null,
    boundary: { points: [{ x: 0, y: 10 }, { x: 40, y: 10 }, { x: 40, y: 15 }, { x: 0, y: 15 }] },
    metadata: { source_room_ids: ["hallway-hint-1", "hallway-hint-2"], applied_transformations: ["consolidated"] },
  }],
  openings: [{
    id: "entrance-1", opening_type: "door", purpose: "main_entrance",
    start: { x: 3, y: 0 }, end: { x: 11, y: 0 }, connected_room_ids: ["hallway-1"],
  }],
  identity_redirects: { "hallway-hint-2": "hallway-1" }, applied_transformations: ["hallway_consolidation"],
};
const result = {
  floor_plan: floorPlan,
  scoring: { total_score: 88.5, passed_critical: true, critical_failure: null },
  classification: "usable", outcome: "best_usable_plan_returned",
};

describe("floor-plan API mapping", () => {
  it("rounds floor limits to required project-unit integers", () => {
    const body = toFloorPlanApiRequest({
      floorLimits: { maxWidth: 120.4, maxLength: 99.6 }, aspectRatio: "4:3",
      rooms: [{ roomType: "bedroom", id: "bedroom-1", requestedSize: "regular" }],
    });
    expect(body.floor_limits).toEqual({ max_width: 120, max_length: 100 });
    expect(body.rooms[0]?.room_type).toBe("bedroom");
  });

  it("parses the documented SSE envelope", () => {
    const parsed = parseGenerationEvent({
      schema_version: "1.0", job_id: "job-1", sequence: 12, event_type: "candidate",
      stage: "candidate_scoring", state: "accepted", message: "Candidate scored",
      data: { score: 90 }, error: null, trial_number: 8, candidate_id: null,
      timestamp_utc: "2026-08-14T08:30:05Z",
    }, "candidate");
    expect(parsed.sequence).toBe(12);
    expect(parsed.trialNumber).toBe(8);
  });

  it("normalizes timed-out best-available results", () => {
    const status = parseJobStatus({
      job_id: "job-1", state: "timed_out", created_at: "2026-08-14T08:30:00Z",
      started_at: "2026-08-14T08:30:01Z", completed_at: "2026-08-14T08:31:01Z",
      result: { best_available: result }, error: { code: "timed_out", message: "Deadline reached", details: {} },
    });
    expect(status.result).toBeNull();
    expect(status.bestAvailable?.floorPlan.boundary.points).toHaveLength(4);
  });

  it("preserves consolidated hallways and off-center main-entrance geometry", () => {
    const status = parseJobStatus({
      job_id: "job-2", state: "completed", created_at: "2026-08-14T08:30:00Z",
      started_at: "2026-08-14T08:30:01Z", completed_at: "2026-08-14T08:30:30Z",
      result, error: null,
    });
    expect(status.result?.floorPlan.rooms).toHaveLength(1);
    expect(status.result?.floorPlan.rooms[0]?.roomType).toBe("hallway");
    expect(status.result?.floorPlan.openings[0]).toMatchObject({
      purpose: "main_entrance", start: { x: 3, y: 0 }, end: { x: 11, y: 0 },
    });
  });

  it("parses recoverable attempt errors without treating them as terminal", () => {
    const parsed = parseGenerationEvent({
      schema_version: "1.0", job_id: "job-3", sequence: 13, event_type: "attempt_error",
      stage: "openings", state: "failed", message: "Attempt rejected",
      data: {}, error: { code: "solver_infeasible", message: "No connected door path", recoverable: true, details: {} },
      trial_number: 9, candidate_id: null, timestamp_utc: "2026-08-14T08:30:06Z",
    }, "attempt_error");
    expect(parsed.error).toMatchObject({ code: "solver_infeasible", recoverable: true });
    expect(parsed.eventType).toBe("attempt_error");
  });
});
