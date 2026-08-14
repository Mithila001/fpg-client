import { describe, expect, it, vi } from "vitest";
import { subscribeToFloorPlanEvents } from "./floor-plan.service";

class FakeEventSource {
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  listeners = new Map<string, (event: MessageEvent<string>) => void>();
  close = vi.fn();
  addEventListener(type: string, listener: EventListenerOrEventListenerObject) {
    this.listeners.set(type, listener as (event: MessageEvent<string>) => void);
  }
  emit(type: string, payload: unknown) {
    this.listeners.get(type)?.({ data: JSON.stringify(payload) } as MessageEvent<string>);
  }
}

describe("native EventSource subscription", () => {
  it("delivers named events and closes only on terminal", () => {
    const source = new FakeEventSource(); const received: number[] = [];
    const subscription = subscribeToFloorPlanEvents({ eventsUrl: "/api/v1/floor-plan-jobs/job-1/events" }, {
      onEvent: (event) => received.push(event.sequence),
    }, { eventSourceFactory: () => source as unknown as EventSource });
    const envelope = {
      schema_version: "1.0", job_id: "job-1", sequence: 1, event_type: "stage",
      stage: "preprocessing", state: "started", message: "Preprocessing", data: {},
      error: null, trial_number: null, candidate_id: null, timestamp_utc: "2026-08-14T08:30:00Z",
    };
    source.emit("stage", envelope);
    expect(received).toEqual([1]);
    expect(subscription.closed).toBe(false);
    source.emit("terminal", { ...envelope, sequence: 2, event_type: "terminal", stage: "job", state: "completed" });
    expect(subscription.closed).toBe(true);
    expect(source.close).toHaveBeenCalledOnce();
  });
});
