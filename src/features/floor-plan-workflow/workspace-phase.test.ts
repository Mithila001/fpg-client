import { describe, expect, it } from "vitest";
import { resolveWorkspacePhase } from "./workspace-phase";

const base = {
  generationActive: false,
  startingGeneration: false,
  hasVisibleResult: false,
  adverseResult: false,
  hasBuildableResult: false,
};

describe("workspace tab canvas phase", () => {
  it("shows land context instead of a persisted final plan when Land is selected", () => {
    expect(resolveWorkspacePhase({ ...base, activeTab: "land", hasBuildableResult: true, hasVisibleResult: true }))
      .toBe("buildable-review");
  });

  it("returns to editable land after a fresh reset", () => {
    expect(resolveWorkspacePhase({ ...base, activeTab: "land" })).toBe("editing-land");
  });

  it("switches immediately to generation context while a job is being created", () => {
    expect(resolveWorkspacePhase({ ...base, activeTab: "generate", hasBuildableResult: true, startingGeneration: true }))
      .toBe("generating");
  });

  it("shows the final plan only in Generate mode", () => {
    expect(resolveWorkspacePhase({ ...base, activeTab: "generate", hasBuildableResult: true, hasVisibleResult: true }))
      .toBe("final-plan");
  });
});
