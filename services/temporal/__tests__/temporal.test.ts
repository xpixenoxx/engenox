// __tests__/temporal.test.ts — minimal temporal service tests (M3-thin).
//
// Tests that the temporal workflows and activities can be imported without errors.

import { describe, it, expect, vi } from "vitest";

// Mock the perception client before importing activities
vi.mock("../src/client/perceptionClient.js", () => ({
  probeSurface: vi.fn().mockResolvedValue({ assertions: [] }),
}));

// Mock the decision client before importing activities
vi.mock("../src/client/decisionClient.js", () => ({
  proposeInterventions: vi.fn().mockResolvedValue({ interventions: [], traceId: "test-trace" }),
}));

describe("temporal service imports", () => {
  it("should import activity implementations", async () => {
    const activities = await import("../src/activities/atlasCycleActivities.js");
    expect(typeof activities.runPerceptionPhase).toBe("function");
    expect(typeof activities.runDecisionPhase).toBe("function");
    expect(typeof activities.runActionPhase).toBe("function");
    expect(typeof activities.runMeasurementPhase).toBe("function");
  });

  it("should import intervention saga activities", async () => {
    const activities = await import("../src/activities/interventionSagaActivities.js");
    expect(typeof activities.checkAllowList).toBe("function");
    expect(typeof activities.runDiffReview).toBe("function");
    expect(typeof activities.runCedarGate).toBe("function");
    expect(typeof activities.createGitHubPr).toBe("function");
  });

  it("should import action activities", async () => {
    const activities = await import("../src/activities/actionActivities.js");
    expect(typeof activities.checkAllowList).toBe("function");
    expect(typeof activities.runDiffReview).toBe("function");
    expect(typeof activities.runCedarGate).toBe("function");
    expect(typeof activities.createGitHubPr).toBe("function");
  });

  it("should import workflow implementations", async () => {
    const workflows = await import("../src/workflows/atlasCycle.js");
    expect(typeof workflows.atlasCycle).toBe("function");
  });

  it("should import intervention saga workflow", async () => {
    const workflows = await import("../src/workflows/interventionSaga.js");
    expect(typeof workflows.interventionSaga).toBe("function");
  });

  it("should have correct activity signatures", async () => {
    const { runPerceptionPhase } = await import("../src/activities/atlasCycleActivities.js");
    const result = await runPerceptionPhase({
      tenantId: "test-tenant",
      surfaceIds: ["surface-1"],
      idempotencyKey: "test-key",
    });
    expect(result.conflictIds).toHaveLength(0);
    expect(result.traceId).toBe("test-key");
  });

  it("should have correct intervention activity signatures", async () => {
    const { runDiffReview } = await import("../src/activities/interventionSagaActivities.js");
    const result = await runDiffReview({
      tenantId: "test-tenant",
      params: { content: "safe content" },
    });
    expect(result.blocked).toBe(false);
    expect(result.reasons).toEqual([]);
  });

  it("should block external URLs in diff review", async () => {
    const { runDiffReview } = await import("../src/activities/interventionSagaActivities.js");
    const result = await runDiffReview({
      tenantId: "test-tenant",
      params: { content: "check this https://example.com" },
    });
    expect(result.blocked).toBe(true);
    expect(result.reasons.some((r) => r.includes("External URL"))).toBe(true);
  });
});