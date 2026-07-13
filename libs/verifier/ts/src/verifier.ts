// verifier.ts — the re-grounding checks; the candor floor for every LLM seam output.
//
// 11 §2c: every gateway seam output is re-grounded by a PURE function BEFORE the caller (the
// control-plane, via this lib) lets it touch a spine. The gateway returns a SeamMeta.grounded
// bool; this lib is the INDEPENDENT second opinion — the gateway asserting its own output is
// grounded would be the author-reviewing-its-own-work anti-pattern (11 §7 / CLAUDE.md §8 — the
// cross-family Critic discipline applied to grounding). A seam output that fails a check here
// is REJECTED: the caller degrades to the symbolic fallback with candor microcopy ("we couldn't
// ground this claim — we won't show it", 11 §2c), NEVER silently stored. This is NOT an LLM-as-
// judge — these are rule-based, deterministic, no-model checks.
//
// The checks encode the candor-floor watchdog invariants as executable code (CLAUDE.md §8):
//   - Extract: every assertion subject/object dereferences to a known entity (no hallucinated
//     node — 11 §2c "drawn only from the tenant's SHACL shapes").
//   - Lift: a lift number is ALWAYS carried with a CI that brackets the point AND a non-zero
//     sample count (the "lift rendered without its CI" watchdog hit, made structural).
//   - Outcome: the contrarian block is NEVER empty ("the contrarian block omitted", 26 §6) +
//     the coverage diagnostic is well-formed.
//   - Critique: the Critic family != the Planner family (11 §4 — a same-family Critic is the
//     cross-family breach, a watchdog hit).
//   - Abduce: every falsifiable hypothesis carries a conflict back-pointer (gateway.proto: "a
//     hypothesis with no back-pointer is rejected").
//
// PURE: no I/O, no clock, no network, no service imports — only the contracts types + neverthrow
// (24 §3 — libs sit below the service layer; libs_import_no_service). Deterministic + testable:
// same inputs → same Verdict, every run, every machine.
//
// Cites: 11 §2c (re-grounding) + §4 (cross-family Critic) + §7 (no LLM-as-judge for promotion);
//        26 §6 (the candor non-goals — no contrarian-omission, no un-earned escalation) + §4
//        (the candor-render of the lift + contrarian block); 19 §4 (lift + CI + coverage render);
//        CLAUDE.md §8 (the watchdog list these checks encode); 06 §2.4 (the Outcome/Lift vocab);
//        ADR-0007 (the gate is NOT thinned — re-grounding is a candor-floor mechanism).

import { err, ok, type Result } from "neverthrow";
import { ModelFamily } from "@engenox/contracts/service/v1/gateway";
import type {
  CritiqueResponse,
  ExtractResponse,
  FalsifiableHypothesis,
} from "@engenox/contracts/service/v1/gateway";
import type { Assertion } from "@engenox/contracts/event/v1";
import type { LiftDistribution, Outcome } from "@engenox/contracts/entity/v1/intervention";
import type { MentionRef } from "@engenox/contracts/entity/v1/surface";

// The verifier's typed failure. One variant per candor check; the `kind` discriminator routes
// the caller's degradation (each kind maps to a distinct candor microcopy). `reasons` (Extract)
// lists the specific hallucinated ids so the explainer can name them (26 §4 — a refused ground
// is EXPLAINED, never silently dropped). All fields required per variant (no `exactOptional`
// headache — a variant carries exactly the fields its kind names).
export type VerifierError =
  // Extract: one or more assertion subjects/objects OR resolved mentions referenced an entity
  // id NOT in the tenant's known set → hallucination. `reasons` lists each bad reference for
  // the explainer.
  | { readonly kind: "extract-hallucination"; readonly reasons: readonly string[] }
  // Extract did not produce a valid assertion shape (empty subject_id or predicate). A non-
  // degenerate spine row needs both; the guard rejects before the kg append would.
  | { readonly kind: "extract-degenerate"; readonly reasons: readonly string[] }
  // Lift: the CI does not bracket the point estimate (ciLow > point || point > ciHigh), OR a
  // field is NaN. proto3 doubles default 0, so an unset CI surfaces as [0,0] — which fails this
  // bracket check whenever point != 0 (the structural proxy for "no CI supplied"). The point
  // estimate IS that proxy; the proto's `double` (not `optional double`) cannot carry absence.
  | { readonly kind: "lift-ci-does-not-bracket-point"; readonly pointEstimate: number; readonly ciLow: number; readonly ciHigh: number }
  // Lift: the row summarizes 0 samples — a lift over no evidence is a fabrication, regardless
  // of CI shape. 06 §2.2 "over N samples"; N=0 is not a lift.
  | { readonly kind: "lift-zero-samples" }
  // Outcome: the contrarian block is OMISSIBLE only by a candor breach — 26 §6 forbids omitting
  // it; 19 §4d renders it. A zero-length counterfactual_conditions is rejected, full stop.
  | { readonly kind: "outcome-contrarian-omitted"; readonly outcomeId: string }
  // Outcome: the coverage diagnostic is malformed — coverage_contained > coverage_total (a row
  // claiming "12 of the last 10 intervals" is contradictory; the candor hover would mis-render).
  | { readonly kind: "outcome-bad-coverage"; readonly outcomeId: string; readonly contained: number; readonly total: number }
  // Outcome: realized_lift present but failed re-grounding (lift-ci / lift-zero-samples) — the
  // outcome's OWN lift fails the candor gate, so the outcome cannot enter the spine.
  | { readonly kind: "outcome-lift-ungrounded"; readonly outcomeId: string; readonly cause: VerifierError }
  // Critique: same family as the Planner (the cross-family breach, 11 §4 + CLAUDE.md §8) — the
  // Critic MUST be an adversary from a different model family, never the Planner's mirror.
  | { readonly kind: "critic-same-family"; readonly planner: ModelFamily; readonly critic: ModelFamily }
  // Critique: either family is UNSPECIFIED — the gateway routed a Critic without a family, OR
  // the control-plane supplied no Planner family. The invariant cannot be checked; reject.
  | { readonly kind: "critic-unspecified-family"; readonly planner: ModelFamily; readonly critic: ModelFamily }
  // Abduce: a hypothesis with no conflict back-pointer (gateway.proto "a hypothesis with no
  // back-pointer is rejected") — an un-grounded hypothesis is a free-floating claim, rejected.
  | { readonly kind: "hypothesis-missing-backpointer"; readonly index: number };

// =============================================================================
// Extract (seam 1) — every subject/object dereferences a known entity (11 §2c).
// =============================================================================

/**
 * Re-ground an ExtractResponse against the tenant's known entity set. Each assertion's
 * subject_id + object_id (when the object is a NodeRef) MUST resolve to a known_entity_id;
 * each mention's entity_id (when non-empty — an empty mention id is the unresolved-gap signal
 * 04 §5, allowed) MUST resolve too. A non-empty subject_id + non-empty predicate are required
 * (a degenerate assertion row is rejected before the kg append).
 */
export function reGroundExtract(
  response: ExtractResponse,
  knownEntityIds: readonly string[],
): Result<void, VerifierError> {
  const known = new Set(knownEntityIds);
  const reasons: string[] = [];

  for (const a of response.assertions) {
    if (a.subjectId === "" || a.predicate === "") {
      reasons.push(`assertion subject_id/predicate empty (subject="${a.subjectId}", predicate="${a.predicate}")`);
      continue;
    }
    if (!known.has(a.subjectId)) {
      reasons.push(`assertion subject_id not in known set: ${a.subjectId}`);
    }
    // The oneof `object` is a discriminated union on `case`. A NodeRef object (case "objectId")
    // must resolve; a literal object (case "objectLiteral") is a value, not an entity, so it is
    // not grounded against the entity set.
    if (a.object.case === "objectId") {
      if (!known.has(a.object.value)) {
        const refId = a.object.value === "" ? "<empty>" : a.object.value;
        reasons.push(`assertion object_id not in known set: ${refId}`);
      }
    }
  }

  for (const m of response.mentions) {
    // An empty entity_id is the unresolved "ARM MISSING" gap signal (04 §5) — allowed; the gap
    // is the very thing the Extract surfaces for the Draft seam to close. Only a NON-EMPTY id
    // must resolve (a resolved mention pointing outside the known set is a hallucination).
    if (m.entityId !== "" && !known.has(m.entityId)) {
      reasons.push(`mention entity_id not in known set: ${m.entityId}`);
    }
  }

  if (reasons.length === 0) return ok(undefined);
  // Split the two failure kinds for distinct microcopy: degenerate (shape) vs hallucination
  // (entity). The first degenerate reason keys the kind; hallucination is any non-degenerate
  // off-set reference. A single pass collects both; route by reason-prefix.
  const degenerate = reasons.some((r) => r.startsWith("assertion subject_id/predicate"));
  return err(degenerate ? { kind: "extract-degenerate", reasons } : { kind: "extract-hallucination", reasons });
}

// =============================================================================
// Lift / Outcome — the lift-number-always-with-CI candor floor (19 §4 + 26 §6).
// =============================================================================

/**
 * Re-ground a LiftDistribution. The candor invariants (CLAUDE.md §8 "a lift-number rendered
 * without its CI"):
 *   - sample_count MUST be > 0 (a lift over no evidence is a fabrication — 06 §2.2 "over N").
 *   - ci_low <= point_estimate <= ci_high (the CI brackets the point). proto3 doubles default 0,
 *     so an unset CI surfaces as [0,0]; this bracket check rejects a defaulted CI whenever the
 *     point is non-zero (the structural proxy for "no CI supplied"). A genuine null result
 *     (point=0, CI=[0,0], N>0) still passes — an honest null is NOT a candor breach.
 *   - no field is NaN (a JS caller could construct a NaN; reject it rather than mis-render).
 */
export function reGroundLift(lift: LiftDistribution): Result<void, VerifierError> {
  if (
    !Number.isFinite(lift.pointEstimate) ||
    !Number.isFinite(lift.ciLow) ||
    !Number.isFinite(lift.ciHigh)
  ) {
    return err({ kind: "lift-ci-does-not-bracket-point", pointEstimate: lift.pointEstimate, ciLow: lift.ciLow, ciHigh: lift.ciHigh });
  }
  if (lift.sampleCount === 0) {
    return err({ kind: "lift-zero-samples" });
  }
  if (lift.ciLow > lift.pointEstimate || lift.pointEstimate > lift.ciHigh) {
    return err({ kind: "lift-ci-does-not-bracket-point", pointEstimate: lift.pointEstimate, ciLow: lift.ciLow, ciHigh: lift.ciHigh });
  }
  return ok(undefined);
}

/**
 * Re-ground an Outcome. The candor invariants (26 §6 — "never omit the contrarian block"):
 *   - counterfactual_conditions MUST be non-empty (the contrarian block — 19 §4d renders it;
 *     an omitted block is a candor-floor watchdog hit).
 *   - realized_lift, when PRESENT, must itself pass reGroundLift (an outcome carrying a
 *     fabricated lift is rejected — its own lift fails the gate). A future-dated Outcome with
 *     no realized_lift yet (pre-measurement) is allowed.
 *   - coverage_contained <= coverage_total whenever coverage_total > 0 (a coverage row claiming
 *     "12 of the last 10" is contradictory; the candor hover would mis-render).
 */
export function reGroundOutcome(outcome: Outcome): Result<void, VerifierError> {
  if (outcome.counterfactualConditions.length === 0) {
    return err({ kind: "outcome-contrarian-omitted", outcomeId: outcome.id });
  }
  if (outcome.realizedLift !== undefined) {
    const liftOk = reGroundLift(outcome.realizedLift);
    if (liftOk.isErr()) {
      return err({ kind: "outcome-lift-ungrounded", outcomeId: outcome.id, cause: liftOk.error });
    }
  }
  if (outcome.coverageTotal > 0 && outcome.coverageContained > outcome.coverageTotal) {
    return err({
      kind: "outcome-bad-coverage",
      outcomeId: outcome.id,
      contained: outcome.coverageContained,
      total: outcome.coverageTotal,
    });
  }
  return ok(undefined);
}

// =============================================================================
// Critique (seam 6) — the cross-family Critic invariant (11 §4).
// =============================================================================

/**
 * Re-ground a CritiqueResponse against the Planner's family. The cross-family invariant
 * (11 §4 + CLAUDE.md §8): the Critic's model family MUST differ from the Planner's — the Critic
 * is an adversary, never a mirror. Both families must be specified ( != UNSPECIFIED); a routed-
 * without-family Critique cannot be checked and is rejected. A VETO/DEMAND_REPLAN verdict is a
 * VALID Critic output (NOT a grounding failure) — the Planner/Critic deadlock escalates to a
 * HUMAN, never an LLM tiebreaker (11 §4, 26 §6); that escalation is the control-plane's job,
 * not this check's.
 */
export function reGroundCritique(
  response: CritiqueResponse,
  plannerFamily: ModelFamily,
): Result<void, VerifierError> {
  if (plannerFamily === ModelFamily.UNSPECIFIED || response.criticFamily === ModelFamily.UNSPECIFIED) {
    return err({ kind: "critic-unspecified-family", planner: plannerFamily, critic: response.criticFamily });
  }
  if (response.criticFamily === plannerFamily) {
    return err({ kind: "critic-same-family", planner: plannerFamily, critic: response.criticFamily });
  }
  return ok(undefined);
}

// =============================================================================
// Abduce (seam 5) — every hypothesis carries a conflict back-pointer.
// =============================================================================

/**
 * Re-ground a FalsifiableHypothesis — it must reference an existing conflict (gateway.proto:
 * "a hypothesis with no back-pointer is rejected"). A free-floating hypothesis with no conflict
 * anchor is an un-grounded claim; it is rejected. `index` is the caller's hypothesis index (so
 * an AbduceResponse with several hypotheses can name which one failed in the explainer).
 */
export function reGroundHypothesis(
  hypothesis: FalsifiableHypothesis,
  index: number,
): Result<void, VerifierError> {
  if (hypothesis.referencesConflictId === "") {
    return err({ kind: "hypothesis-missing-backpointer", index });
  }
  return ok(undefined);
}
