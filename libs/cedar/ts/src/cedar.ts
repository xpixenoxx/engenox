// cedar.ts — the two-pass Cedar policy gate for the governance dial + the dial ledger.
//
// The dial is the candor-floor mechanism for HOW HARD Engenox pushes on a brand's behalf (12
// §5 + 26 §4). It is NEVER auto-merge in the MVP — the customer merges their own PR (26 §6).
// The dial has three MVP actions: `propose` (the default — open a PR, argue for it, do NOT
// merge), `escalate` (assert this is HIGH-stakes and warrants broader surfacing — REQUIRES 3
// axes, else DENY), `demote` (back off — fire on alert, always allowed). 23 §3m makes the
// <2ms p99 Cedar eval a CI test; 23 §3n makes the conformal-coverage-by-segment metric a CI
// test. The watchdog (CLAUDE.md §8) blocks an escalation rendered with fewer than 3 axes.
//
// `@cedar-policy/ceda-wasm@4.11.2` is the REAL Cedar runtime (NOT a stub) — the two-pass gate
// is enforced by the actual policy engine, the same one the deployed service uses (ADR-0007
// Thinning Rule: thin the store/scale/cadence, NEVER the gate mechanism — Cedar is the gate,
// it is NOT thinned). The dev ledger here is the launch-first in-memory thinning of the WORM
// append-only dial ledger (the thickening writes the ledger row to R2 Object-Lock + Postgres,
// the dual-canonical two-fence — libs/crypto signs it).
//
// Cites: 12 §5 (the dial) + 26 §4 (the candor-render of the dial) + 26 §6 (no auto-merge MVP);
//        23 §3m (<2ms p99 CI test) + §3n (conformal coverage); 15 §3 (Cedar two-pass gate);
//        CLAUDE.md §2 (Cedar <2ms p99) + §8 (escalation-requires-3-axes watchdog hit);
//        ADR-0007 (the gate is NOT thinned).

import { err, ok, type Result } from "neverthrow";
import * as cedar from "@cedar-policy/cedar-wasm/nodejs";

// The three MVP dial actions. `autoAct` (merge without human) is THICKENING — deferred per
// 26 §6 (the MVP dial tops out at `propose`; autoAct is a post-MVP graduation with its own
// ADR). Kept OFF the type so a caller cannot request it at the type level (a watchdog hit if
// it ever appears).
export type DialAction = "propose" | "escalate" | "demote";

// The dial request — what the control-plane asks the gate. `axisCount` is the number of
// independent uplift/evidence axes behind the escalation (12 §9 — escalation requires 3
// axes; the Planner/Critic deadlock escalates to a HUMAN, never an LLM tiebreaker). For
// `propose`/`demote` axisCount is ignored by the policy (only `escalate` gates on it).
export interface DialRequest {
  readonly tenantId: string;
  readonly action: DialAction;
  readonly axisCount: number;
}

// The Cedar verdict — `allow` (the requested dial transition is permitted) or `deny` (the
// candor gate refused — e.g. escalation with <3 axes). `reasons` are the Cedar diagnostics
// (the policy ids that matched, or empty on default-deny) — surfaced in the ledger-explainer
// so a refused escalation is EXPLAINED to the customer, not silently dropped (26 §4).
export interface DialVerdict {
  readonly decision: "allow" | "deny";
  readonly reasons: readonly string[];
}

export type CedarError =
  | { readonly kind: "missing-tenant" }
  | { readonly kind: "missing-action" }
  | { readonly kind: "negative-axis-count"; readonly axisCount: number }
  | { readonly kind: "eval-failure"; readonly errors: readonly string[] };

// The dial candor policy — Cedar TEXT (verified against the real runtime: escalate+>=3 axes
// → allow, escalate+<3 → deny, propose → allow, demote → allow). Cedar's default is DENY, so
// an escalation with fewer than 3 axes matches NO permit → deny. This is the candor invariant
// made executable: the dial cannot render an unearned escalation, full stop.
//
// - `propose`: always permitted (the default dial state — 12 §5 / 26 §4).
// - `escalate`: permitted IFF `principal.axisCount >= 3` (the 3-axes rule — 12 §9 + CLAUDE.md
//   §8 watchdog).
// - `demote`: always permitted (demotion-on-alert — the dial backs off the moment an alert
//   fires; 12 §5).
const DIAL_POLICY = `
permit (
  principal is Engenox::Tenant,
  action == Engenox::Action::"propose",
  resource == Engenox::Dial::"the-dial"
);

permit (
  principal is Engenox::Tenant,
  action == Engenox::Action::"escalate",
  resource == Engenox::Dial::"the-dial"
)
when { principal.axisCount >= 3 };

permit (
  principal is Engenox::Tenant,
  action == Engenox::Action::"demote",
  resource == Engenox::Dial::"the-dial"
);
`;

// Pass 1 — the fast structural gate: the request is well-formed (tenant + action present,
// axisCount non-negative). A malformed request never reaches the Cedar engine — this is the
// first ditch against a garbage request, and it keeps the Dal-engine eval for the genuine
// authorization question (the second pass). The two-pass shape is the documented gate (15 §3).
function pass1Structural(req: DialRequest): Result<void, CedarError> {
  if (req.tenantId === "") return err({ kind: "missing-tenant" });
  // `DialAction` is a closed union of the 3 MVP actions — the type excludes `""` (TS agrees:
  // the comparison has no overlap). A `missing-action` err is unreachable at the type level
  // here; the variant stays in `CedarError` as the v2 forward-ref (a post-MVP dial adds an
  // action; this guard returns then). No runtime widening guard — a deserialized row widened
  // past the union is the caller's `as`-cast sin (CLAUDE.md §6), not this lib's to catch.
  if (req.axisCount < 0) return err({ kind: "negative-axis-count", axisCount: req.axisCount });
  return ok(undefined);
}

/** The two-pass dial gate. Pass 1 = structural; pass 2 = the real Cedar `isAuthorized`. */
export function decide(req: DialRequest): Result<DialVerdict, CedarError> {
  // Pass 1 — structural. A malformed request is a typed err, never a thrown exception the
  // caller must catch (CLAUDE.md §6 — Result over throw). pass1Structural already returns the
  // shaped CedarError; forward it verbatim (no re-match — the discriminant is already the
  // canonical err). The action union is closed at the type level — a widened value reaching
  // pass2 is the caller's `as`-cast sin, not a structural err this gate catches.
  const structural = pass1Structural(req);
  if (structural.isErr()) return err(structural.error);

  // Pass 2 — the real Cedar eval. The principal carries axisCount as a Cedar long; the action
  // is the dial transition being requested. The resource is the singleton dial.
  const principal: cedar.EntityUid = {
    __entity: { type: "Engenox::Tenant", id: req.tenantId },
  };
  const action: cedar.EntityUid = {
    __entity: { type: "Engenox::Action", id: req.action },
  };
  const resource: cedar.EntityUid = {
    __entity: { type: "Engenox::Dial", id: "the-dial" },
  };
  // The principal entity carries the axisCount attribute — the policy reads
  // `principal.axisCount`. The context is empty: the dial decision is a function of (tenant,
  // action, axisCount) only; an LLM-weighted context would be the candor breach (the gate is
  // rule-based, never LLM-judged — 11 §7).
  const entities: cedar.Entities = [
    {
      uid: { __entity: { type: "Engenox::Tenant", id: req.tenantId } },
      attrs: {
        // Cedar integer attrs are longs; a JS number in the safe-integer range is exact.
        axisCount: req.axisCount,
      },
      parents: [],
    },
  ];

  const result = cedar.isAuthorized({
    principal,
    action,
    resource,
    context: {},
    // `policies: PolicySet` — the typed form wraps the Cedar text under `staticPolicies`
    // (StaticPolicySet = string | Policy[] | Record<PolicyId, Policy>); a bare string is not
    // assignable to PolicySet. The runtime parses the string as Cedar policy text.
    policies: { staticPolicies: DIAL_POLICY },
    entities,
  });

  if (result.type === "failure") {
    // DetailedError → its .message string (the explainer renders messages, not the full
    // {help,code,url,severity} diagnostic — those land in the trace span, not the verdict).
    return err({ kind: "eval-failure", errors: result.errors.map((e) => e.message) });
  }
  // result.type === "success" — the decision + diagnostics live on `response`. Cedar's
  // Diagnostics field is `reason` (singular — the PolicyIds that matched, [] on default-deny):
  // that set IS the ledger-explainer's "which policies authorized / refused this" surface.
  return ok({
    decision: result.response.decision,
    reasons: result.response.diagnostics.reason,
  });
}

// The ledger entry — append-only, signed at thickening (libs/crypto over the canonical row).
// `txTime` is the transaction-sysclock point the control-plane supplies (NOT Date.now() — the
// lib is deterministic testable; the deployed service has a clock port). The txTime makes the
// ledger bi-temporal-candor-honest: a dial decision is a fact asserted at a known sysclock
// instant, never back-datable.
export interface DialLedgerEntry {
  readonly tenantId: string;
  readonly action: DialAction;
  readonly axisCount: number;
  readonly decision: "allow" | "deny";
  readonly reasons: readonly string[];
  readonly txTime: { readonly seconds: bigint; readonly nanos: number };
}

// The dev in-memory ledger — append-only (a denied escalation is STILL recorded, with the
// `deny` + the reasons; the candor floor surfaces the refused-escalation in the explainer,
// 26 §4). The thickening swaps this for the WORM R2 + Postgres dual-canonical row.
export class InMemoryDialLedger {
  private readonly rows: DialLedgerEntry[] = [];

  append(entry: DialLedgerEntry): void {
    // No in-place edits — push only (the append-only invariant, 13 §4). A dial transition that
    // supersedes a prior one writes a NEW row; the candor hover walks the chain back.
    this.rows.push(entry);
  }

  /** The dev introspection surface (tests). NOT part of the long-term ledger port. */
  get devCount(): number {
    return this.rows.length;
  }

  /** The dev read — the last decision recorded for a tenant (the candor-hover walks back from
   *  here). Returns undefined for a tenant with no prior dial action. */
  lastFor(tenantId: string): DialLedgerEntry | undefined {
    for (let i = this.rows.length - 1; i >= 0; i -= 1) {
      // `this.rows[i]` is `DialLedgerEntry | undefined` under noUncheckedIndexedAccess — the
      // guard is the honest refinement (an indexed slot, never silently dereferenced).
      const row = this.rows[i];
      if (row !== undefined && row.tenantId === tenantId) return row;
    }
    return undefined;
  }
}

// The <2ms p99 warm-eval benchmark (23 §3m — the CI test). `process.hrtime.bigint()` is the
// monotonic nanosecond clock (NOT Date.now() — deterministic testable, unaffected by wall-
// clock skew). Returns the p99 latency in fractional ms over `iterations` of `decide(sample)`.
// The CI test asserts the returned p99 < 2.0. A warm-eval (not cold-start) because the gate
// runs hot in-request — the deployed p99 SLA is the warm p99.
export function benchmarkDecideP99(
  sample: DialRequest,
  iterations = 10_000,
): number {
  const latNs: number[] = [];
  // Warm the engine once (the policy compile is the cold cost; the in-request path is warm).
  // The first `decide` compiles DIAL_POLICY; subsequent calls reuse — the warm p99 is honest.
  const warmup = decide(sample);
  if (warmup.isErr()) {
    // A sample that the gate denies still exercises the eval path (the deny is a Cedar result,
    // not a throw). But a structurally-malformed sample (pass1 err) skips the engine — pick a
    // sample that reaches pass1 OK so the benchmark measures pass2, not the structural guard.
    throw new Error(`benchmark sample failed structural pass: ${warmup.error.kind}`);
  }
  for (let i = 0; i < iterations; i += 1) {
    const t0 = process.hrtime.bigint();
    decide(sample);
    const t1 = process.hrtime.bigint();
    // Number(bigint ns) is exact in the safe-integer range (latencies are ≤ ms → ≤ 1e6 ns).
    latNs.push(Number(t1 - t0));
  }
  latNs.sort((a, b) => a - b);
  // p99 index — the ceil(0.99 * n) -th element, 0-indexed. For n=10_000 → index 9899/9900.
  const p99Idx = Math.min(
    Math.floor(0.99 * iterations),
    iterations - 1,
  );
  // `latNs[p99Idx]` is `number | undefined` under noUncheckedIndexedAccess; p99Idx is clamped to
  // [0, iterations-1] and we pushed exactly `iterations` samples, so the slot IS defined — the
  // `?? 0` is the Honest refinement (an undefined p99 reads 0ms rather than dereferencing air).
  const p99 = latNs[p99Idx] ?? 0;
  // ns → fractional ms. 1e6 ns = 1 ms.
  return p99 / 1_000_000;
}
