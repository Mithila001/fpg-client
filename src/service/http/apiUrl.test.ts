import { describe, expect, it } from "vitest";
import { createApiUrl, createServerUrl } from "./apiUrl";

describe("API URL resolution", () => {
  it("centralizes the API v1 prefix", () => {
    expect(createApiUrl("/metadata")).toMatch(/\/api\/v1\/metadata$/);
  });

  it("resolves server-returned job URLs without duplicating the prefix", () => {
    expect(createServerUrl("/api/v1/floor-plan-jobs/job-1")).toMatch(/\/api\/v1\/floor-plan-jobs\/job-1$/);
  });
});
