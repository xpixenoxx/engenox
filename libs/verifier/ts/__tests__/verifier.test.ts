// verifier.test.ts — the candor-floor failing modes, made executable.
//
// The verifier is the INDEPENDENT second opinion on every seam output (11 §2c) — the gateway
// asserting its own grounding would be the author-reviewing-its-own-work anti-pattern. These
// tests assert each candor invariant REJECTS its failing mode (an output that fails here never
// reaches the spine — the caller degrades to the symbolic fallback with candor microcopy). The
// checks are rule-based + deterministic (NOT LLM-as-judge — 11 §7); pure, no I/O.
//
// Cites: 11 §2c/§4/§7 + 26 §4/§6 + 19 §4 + 06 §2.4; CLAUDE.md §8 (the watchdog list these encode).

import { describe, expect, it } from "vitest";
import { create } from "@bufbuild/protobuf";
import { ModelFamily } from "@engenox/contracts/service/v1/gateway";
import {
  CritiqueResponseSchema,
  ExtractResponseSchema,
  FalsifiableHypothesisSchema,
} from "@engenox/contracts/service/v1/gateway";
import { LiftDistributionSchema, OutcomeSchema } from "@engenox/contracts/entity/v1/intervention";
import {
  reGroundCritique,
  reGroundExtract,
  reGroundHypothesis,
  reGroundLift,
  reGroundOutcome,
} from "../src/verifier.js";

describe("reGroundExtract — every subject/object dereferences a known entity (11 §2c)", () => {
  it("ALLOW: all assertion subjects/objects + resolved mentions are in the known set", () => {
    const resp = create(ExtractResponseSchema, {
      assertions: [
        { subjectId: "b1", predicate: "is_a", object: { case: "objectId", value: "c1" } },
        { subjectId: "b1", predicate: "competes_with", object: { case: "objectId", value: "c2" } },
      ],
      mentions: [{ entityId: "b1" }, { entityId: "" }], // "" is the unresolved-gap signal (allowed).
    });
    expect(reGroundExtract(resp, ["b1", "c1", "c2"]).isOk()).toBe(true);
  });

  it("REJECT: a hallucinated subject_id NOT in the known set (extract-hallucination)", () => {
    const resp = create(ExtractResponseSchema, {
      assertions: [
        { subjectId: "b1", predicate: "is_a", object: { case: "objectId", value: "c1" } },
        { subjectId: "GHOST-ENTITY", predicate: "is_a", object: { case: "objectId", value: "c1" } },
      ],
    });
    const r = reGroundExtract(resp, ["b1", "c1"]);
    expect(r.isErr() && r.error.kind === "extract-hallucination").toBe(true);
    if (r.isErr() && r.error.kind === "extract-hallucination") {
      // a refused ground is EXPLAINED (26 §4) — the reasons name the bad reference.
      expect(r.error.reasons.some((m) => m.includes("GHOST-ENTITY"))).toBe(true);
    }
  });

  it("REJECT: a hallucinated object_id (a NodeRef to an entity outside the known set)", () => {
    const resp = create(ExtractResponseSchema, {
      assertions: [{ subjectId: "b1", predicate: "is_a", object: { case: "objectId", value: "PHANTOM" } }],
    });
    const r = reGroundExtract(resp, ["b1"]);
    expect(r.isErr() && r.error.kind === "extract-hallucination").toBe(true);
  });

  it("ALLOW: a literal object is NOT grounded against the entity set (a value, not a node)", () => {
    const resp = create(ExtractResponseSchema, {
      assertions: [{ subjectId: "b1", predicate: "ranking", object: { case: "objectLiteral", value: "first" } }],
    });
    expect(reGroundExtract(resp, ["b1"]).isOk()).toBe(true);
  });

  it("ALLOW: an empty mention entity_id is the unresolved-gap signal (04 §5) — NOT a hallucination", () => {
    const resp = create(ExtractResponseSchema, {
      mentions: [{ entityId: "" }],
    });
    expect(reGroundExtract(resp, []).isOk()).toBe(true);
  });

  it("REJECT: a resolved mention whose entity_id is outside the known set (extract-hallucination)", () => {
    const resp = create(ExtractResponseSchema, {
      mentions: [{ entityId: "ORPHAN" }],
    });
    expect(reGroundExtract(resp, ["b1"]).isErr()).toBe(true);
  });

  it("REJECT: a degenerate assertion (empty subject_id/predicate) — extract-degenerate", () => {
    const resp = create(ExtractResponseSchema, {
      assertions: [{ subjectId: "", predicate: "", object: { case: "objectLiteral", value: "x" } }],
    });
    const r = reGroundExtract(resp, []);
    expect(r.isErr() && r.error.kind === "extract-degenerate").toBe(true);
  });
});

describe("reGroundLift — a lift number is ALWAYS carried with a bracketing CI (19 §4 + 26 §6)", () => {
  it("ALLOW: ci brackets the point + sample_count > 0", () => {
    const lift = create(LiftDistributionSchema, { pointEstimate: 6, ciLow: 1.5, ciHigh: 8, sampleCount: 10 });
    expect(reGroundLift(lift).isOk()).toBe(true);
  });

  it("REJECT: a defaulted CI [0,0] with a non-zero point does not bracket (lift-ci-does-not-bracket-point)", () => {
    // proto3 doubles default 0 → an UNSET CI surfaces as [0,0]; the bracket check is the proxy.
    const lift = create(LiftDistributionSchema, { pointEstimate: 6, ciLow: 0, ciHigh: 0, sampleCount: 10 });
    const r = reGroundLift(lift);
    expect(r.isErr() && r.error.kind === "lift-ci-does-not-bracket-point").toBe(true);
  });

  it("REJECT: a lift over 0 samples is a fabrication (lift-zero-samples)", () => {
    const lift = create(LiftDistributionSchema, { pointEstimate: 6, ciLow: 1, ciHigh: 8, sampleCount: 0 });
    const r = reGroundLift(lift);
    expect(r.isErr() && r.error.kind === "lift-zero-samples").toBe(true);
  });

  it("REJECT: an inverted/contradictory CI (ci_low > point) — lift-ci-does-not-bracket-point", () => {
    const lift = create(LiftDistributionSchema, { pointEstimate: 2, ciLow: 8, ciHigh: 9, sampleCount: 10 });
    const r = reGroundLift(lift);
    expect(r.isErr() && r.error.kind === "lift-ci-does-not-bracket-point").toBe(true);
  });

  it("ALLOW: a genuine null result (point 0, CI [0,0], N>0) — an honest null is NOT a candor breach", () => {
    const lift = create(LiftDistributionSchema, { pointEstimate: 0, ciLow: 0, ciHigh: 0, sampleCount: 10 });
    expect(reGroundLift(lift).isOk()).toBe(true);
  });
});

describe("reGroundOutcome — the contrarian block NEVER omitted (26 §6 + 19 §4d)", () => {
  it("ALLOW: a contrarian block present + a grounded realized lift + well-formed coverage", () => {
    const outcome = create(OutcomeSchema, {
      id: "o1",
      counterfactualConditions: [{}], // one contrarian condition (the candor block is non-empty)
      realizedLift: create(LiftDistributionSchema, { pointEstimate: 6, ciLow: 1.5, ciHigh: 8, sampleCount: 10 }),
      coverageContained: 8,
      coverageTotal: 10,
    });
    expect(reGroundOutcome(outcome).isOk()).toBe(true);
  });

  it("REJECT: an EMPTY contrarian block (outcome-contrarian-omitted — the watchdog hit)", () => {
    const outcome = create(OutcomeSchema, { id: "o1" }); // counterfactualConditions defaults to []
    const r = reGroundOutcome(outcome);
    expect(r.isErr() && r.error.kind === "outcome-contrarian-omitted").toBe(true);
  });

  it("REJECT: a present realized_lift that itself fails re-grounding (outcome-lift-ungrounded)", () => {
    const outcome = create(OutcomeSchema, {
      id: "o1",
      counterfactualConditions: [{}],
      realizedLift: create(LiftDistributionSchema, { pointEstimate: 6, ciLow: 0, ciHigh: 0, sampleCount: 10 }),
    });
    const r = reGroundOutcome(outcome);
    expect(r.isErr() && r.error.kind === "outcome-lift-ungrounded").toBe(true);
  });

  it("REJECT: coverage_contained > coverage_total (outcome-bad-coverage — a contradictory diagnostic)", () => {
    const outcome = create(OutcomeSchema, {
      id: "o1",
      counterfactualConditions: [{}],
      coverageContained: 12,
      coverageTotal: 10,
    });
    const r = reGroundOutcome(outcome);
    expect(r.isErr() && r.error.kind === "outcome-bad-coverage").toBe(true);
  });

  it("ALLOW: an outcome with NO realized_lift yet (pre-measurement) + a contrarian block", () => {
    const outcome = create(OutcomeSchema, { id: "o1", counterfactualConditions: [{}] });
    expect(reGroundOutcome(outcome).isOk()).toBe(true);
  });
});

describe("reGroundCritique — the cross-family Critic invariant (11 §4)", () => {
  it("ALLOW: the Critic family differs from the Planner family", () => {
    const resp = create(CritiqueResponseSchema, { criticFamily: ModelFamily.OPENAI });
    expect(reGroundCritique(resp, ModelFamily.ANTHROPIC).isOk()).toBe(true);
  });

  it("REJECT: the Critic family EQUALS the Planner family (critic-same-family — the watchdog hit)", () => {
    const resp = create(CritiqueResponseSchema, { criticFamily: ModelFamily.ANTHROPIC });
    const r = reGroundCritique(resp, ModelFamily.ANTHROPIC);
    expect(r.isErr() && r.error.kind === "critic-same-family").toBe(true);
  });

  it("REJECT: an UNSPECIFIED Critic family (critic-unspecified-family — the invariant can't be checked)", () => {
    const resp = create(CritiqueResponseSchema, { criticFamily: ModelFamily.UNSPECIFIED });
    const r = reGroundCritique(resp, ModelFamily.ANTHROPIC);
    expect(r.isErr() && r.error.kind === "critic-unspecified-family").toBe(true);
  });

  it("REJECT: an UNSPECIFIED Planner family (the control-plane supplied no Planner family)", () => {
    const resp = create(CritiqueResponseSchema, { criticFamily: ModelFamily.OPENAI });
    const r = reGroundCritique(resp, ModelFamily.UNSPECIFIED);
    expect(r.isErr() && r.error.kind === "critic-unspecified-family").toBe(true);
  });
});

describe("reGroundHypothesis — every hypothesis carries a conflict back-pointer (gateway.proto)", () => {
  it("ALLOW: a hypothesis with a non-empty references_conflict_id", () => {
    const h = create(FalsifiableHypothesisSchema, { referencesConflictId: "conflict-1" });
    expect(reGroundHypothesis(h, 0).isOk()).toBe(true);
  });

  it("REJECT: a hypothesis with no back-pointer (hypothesis-missing-backpointer)", () => {
    const h = create(FalsifiableHypothesisSchema, {}); // referencesConflictId defaults to ""
    const r = reGroundHypothesis(h, 3);
    expect(r.isErr() && r.error.kind === "hypothesis-missing-backpointer").toBe(true);
    if (r.isErr() && r.error.kind === "hypothesis-missing-backpointer") {
      // index names WHICH hypothesis failed (an AbduceResponse with several can pin the bad one).
      expect(r.error.index).toBe(3);
    }
  });
});
