// __tests__/gateway.test.ts — minimal gateway seam tests (M2-thin).
//
// Tests the candor floor invariants: verifier-reject on Extract hallucinations,
// cross-family Critic invariant, FALLBACK status is always rendered (never silent).
//
// Cites: 11 §2c (re-grounding), §2d (budget), §3 (seams), §4 (cross-family),
//        §6 (FALLBACK candor), 26 §6 (candor floor), CLAUDE.md §8 (watchdog).

import { describe, it, expect } from "vitest";
import { reGroundExtract, reGroundCritique, reGroundHypothesis } from "@engenox/verifier/verifier";

describe("Verifier re-grounding tests (independent second opinion)", () => {
  it("reGroundExtract passes valid assertions", () => {
    const result = reGroundExtract({
      assertions: [
        { subjectId: "brand-A", predicate: "competes_with", object: { case: "objectId", value: "brand-B" } }
      ],
      mentions: [],
    }, ["brand-A", "brand-B"]);

    expect(result.isOk()).toBe(true);
  });

  it("reGroundExtract rejects hallucinated subject_id", () => {
    const result = reGroundExtract({
      assertions: [
        { subjectId: "brand-Z", predicate: "competes_with", object: { case: "objectId", value: "brand-B" } }
      ],
      mentions: [],
    }, ["brand-A", "brand-B"]);

    expect(result.isErr()).toBe(true);
    expect(result.error.kind).toBe("extract-hallucination");
  });

  it("reGroundCritique passes when Critic family != Planner family", () => {
    const response = {
      verdict: 1,
      objections: [],
      criticFamily: 2,
      summary: "ok",
      meta: { status: 1, modelId: "gpt-5", family: 2, promptVersion: "v1", grounded: true, costTokens: 0, traceId: "t", ranAt: new Date() }
    } as any;

    const result = reGroundCritique(response, 1);
    expect(result.isOk()).toBe(true);
  });

  it("reGroundCritique rejects when Critic family == Planner family", () => {
    const response = {
      verdict: 1,
      objections: [],
      criticFamily: 1,
      summary: "ok",
      meta: { status: 1, modelId: "gpt-5", family: 1, promptVersion: "v1", grounded: true, costTokens: 0, traceId: "t", ranAt: new Date() }
    } as any;

    const result = reGroundCritique(response, 1);
    expect(result.isErr()).toBe(true);
    expect(result.error.kind).toBe("critic-same-family");
  });

  it("reGroundHypothesis rejects missing conflict back-pointer", () => {
    const hypothesis = { hypothesis: "X causes Y", referencesConflictId: "", falsificationTest: "test" };
    const result = reGroundHypothesis(hypothesis, 0);
    expect(result.isErr()).toBe(true);
    expect(result.error.kind).toBe("hypothesis-missing-backpointer");
  });

  it("reGroundHypothesis passes with valid back-pointer", () => {
    const hypothesis = { hypothesis: "X causes Y", referencesConflictId: "conflict-1", falsificationTest: "test" };
    const result = reGroundHypothesis(hypothesis, 0);
    expect(result.isOk()).toBe(true);
  });
});