// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import type { GenerationSseEvent } from "../../types";
import {
  generationReducer, initialGenerationState, loadPersistedGeneration, persistGeneration,
} from "./generation-state";

const event = (sequence: number, eventType: GenerationSseEvent["eventType"] = "stage"): GenerationSseEvent => ({
  schemaVersion: "1.0", jobId: "job-1", sequence, eventType, stage: "candidate_search",
  state: "started", message: `Event ${sequence}`, data: {}, error: null,
  trialNumber: null, candidateId: null, timestampUtc: "2026-08-14T08:30:00Z",
});

describe("generationReducer", () => {
  beforeEach(() => localStorage.clear());

  it("deduplicates replayed sequences", () => {
    const first = generationReducer(initialGenerationState, { type: "event", event: event(3) });
    const replay = generationReducer(first, { type: "event", event: event(3) });
    expect(replay).toBe(first);
    expect(replay.timeline).toHaveLength(1);
  });

  it("keeps attempt errors recoverable and continues", () => {
    const warning = { ...event(4, "attempt_error"), error: {
      code: "solver_infeasible", message: "Try another candidate", recoverable: true, details: {},
    } };
    const state = generationReducer(initialGenerationState, { type: "event", event: warning });
    expect(state.warning).toBe("Try another candidate");
    expect(state.view).toBe("idle");
    expect(state.timeline[0]?.severity).toBe("warning");
  });

  it("persists only the current normalized run", () => {
    const created = generationReducer(initialGenerationState, { type: "job_created", descriptor: {
      jobId: "job-1", state: "queued", statusUrl: "/status", eventsUrl: "/events", cancellationUrl: "/cancel",
    } });
    const state = generationReducer(created, { type: "event", event: event(1) });
    persistGeneration(state);
    expect(loadPersistedGeneration()?.lastSequence).toBe(1);
    persistGeneration(initialGenerationState);
    expect(loadPersistedGeneration()).toBeNull();
  });
});
