import { describe, expect, it } from "vitest";
import { parseGenerationEvent, parseJobStatus, toFloorPlanApiRequest } from "./floor-plan.mapper";

const floorPlan = {
  boundary: { points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }] },
  rooms: [], openings: [], identity_redirects: {}, applied_transformations: [],
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
    expect(status.bestAvailable?.floorPlan.boundary.points).toHaveLength(3);
  });
});
