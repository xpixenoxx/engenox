// kg.ts — the truth-spine typed access; the ONLY sanctioned bi-temporal query path.
//
// 13 §3: assertion_view is the single sanctioned bi-temporal query path. A hand-written
// `valid_time @> ...` query anywhere else is a lint-banned + stack-drift watchdog hit
// (CLAUDE.md §5). libs/kg encodes the view as a typed PORT so the thickening (CNPG + AGE per
// ADR-0003) swaps the STORE impl behind the same interface — the access contract is the
// long-term surface, the dev in-memory store is the launch-first thinning (ADR-0007 Thinning
// Rule: thin the store's substrate, NEVER the bi-temporal gate mechanism).
//
// The bi-temporal candor gate rides in `append`: 06 §7 invariant 2 + 13 §2 — valid_time +
// tx_time are MANDATORY on every assertion. The contract type marks them optional (proto3
// optional field semantics — the wire admits their absence); the STORE enforces the
// invariant the type lets slide, so a node WITHOUT both temporal windows is REJECTED here,
// not silently stored. (The candor floor made physical: a typed-optional does not become an
// omitted-mandatory on the wire.) Provenance carries the same mandatory pair (06 §2.1 — the
// audit fan-back is present on every node); it too is rejected if absent.
//
// Cites: 13 §2/§3/§4 (bi-temporal + assertion_view + the no-lookahead-bias as-of read);
//        06 §2.1 + §7 invariant 2 (identity + the temporal/provenance mandatory pair);
//        24 §3 (libs sit below the service layer — libs_import_no_service); ADR-0003 (the
//        thickening store substrate); ADR-0007 (thin the substrate, not the gate);
//        CLAUDE.md §5 (the only sanctioned query path).

import { err, ok, type Result } from "neverthrow";
import type { AssertedNode, TimeInterval } from "@engenox/contracts/entity/v1";

// A point on the (seconds, nanos) wire Timestamp axis. `start` is mandatory on every window;
// `end` is optional (a half-open window — a fact true from `start` up to but not including
// `end`; a missing `end` means "true from `start` onward", unbounded above — 13 §2).
export interface TimePoint {
  readonly seconds: bigint;
  readonly nanos: number;
}

// 13 §3 — the single sanctioned bi-temporal query: "what was true for (tenant, entity) as-of
// `validAt`?" The query carries ONLY the (tenant, entity, validAt) tuple. A query that ALSO
// filtered by tx_time would be the no-lookahead-bias breach (13 §4 — the causal scorer reads
// at a specific as_of so estimator input reflects what was KNOWN then, not what is true now),
// so the view is valid-time only. The store returns the nodes whose valid_time window contains
// validAt for that tenant + entity.
export interface AssertionViewQuery {
  readonly tenantId: string;
  readonly entityId: string;
  readonly validAt: TimePoint;
}

// The store PORT — the long-term contract. `append` validates the bi-temporal + provenance +
// identity invariants; `view` is the ONLY sanctioned query. A caller that reaches into the
// store's internal rows is the lint-banned path — callers reach ONLY through this port.
// `Result<T, E>` over `throw` (CLAUDE.md §6 / neverthrow) — a rejected append is a typed err,
// never an exception the caller must catch.
export interface AssertionStore {
  append(node: AssertedNode): Result<void, KgError>;
  view(query: AssertionViewQuery): Result<readonly AssertedNode[], KgError>;
}

export type KgError =
  | { readonly kind: "missing-id" }
  | { readonly kind: "missing-tenant"; readonly nodeId: string }
  | { readonly kind: "missing-valid-time"; readonly nodeId: string }
  | { readonly kind: "missing-tx-time"; readonly nodeId: string }
  | { readonly kind: "missing-provenance"; readonly nodeId: string };

// The launch-first dev store — an in-memory append-only list. The thickening replaces this
// with the CNPG + AGE assertion_view without touching a caller (same port). Thread-unsafe — a
// single dev process; the deployed store serializes through the cell + the RLS policy
// (ADR-0003). 13 §4: append-only — a supersession writes a NEW row (supersededBy points
// back); the old row is RETAINED, never mutated. The in-memory list honors that (no in-place
// edits — push only).
export class InMemoryAssertionStore implements AssertionStore {
  private readonly rows: AssertedNode[] = [];

  append(node: AssertedNode): Result<void, KgError> {
    // The candor gate — the typed-optional fields become mandatory HERE. Order matters only
    // for the error message clarity; ALL of these MUST hold for the append to succeed.
    if (node.id === "") return err({ kind: "missing-id" });
    if (node.tenantId === "") return err({ kind: "missing-tenant", nodeId: node.id });
    if (node.validTime === undefined || node.validTime.start === undefined) {
      return err({ kind: "missing-valid-time", nodeId: node.id });
    }
    if (node.txTime === undefined || node.txTime.start === undefined) {
      return err({ kind: "missing-tx-time", nodeId: node.id });
    }
    if (node.provenance === undefined) {
      return err({ kind: "missing-provenance", nodeId: node.id });
    }
    this.rows.push(node);
    return ok(undefined);
  }

  view(query: AssertionViewQuery): Result<readonly AssertedNode[], KgError> {
    // The as-of read — a node is "valid at validAt" when its valid_time window CONTAINS
    // validAt: start <= validAt, AND (the window is open-ended OR validAt < end). The
    // half-open upper bound is the bi-temporal convention; a missing end means unbounded
    // above (the fact is still true). The entity identity IS the node id (06 §2.1 — the
    // deterministic hash), so `id === entityId` selects every bi-temporal assertion for
    // that entity, filtered by the as-of validAt → the true-at-that-time set.
    const out = this.rows.filter((n) => {
      if (n.tenantId !== query.tenantId) return false;
      if (n.id !== query.entityId) return false;
      const vt = n.validTime;
      if (vt === undefined || vt.start === undefined) return false;
      if (timeLt(query.validAt, toPoint(vt.start))) return false;
      if (vt.end !== undefined && !timeLt(query.validAt, toPoint(vt.end))) return false;
      return true;
    });
    return ok(out);
  }

  // The dev introspection surface (tests + the dev console). NOT part of the port — the
  // deployed store's count is a SQL aggregate, exposed differently. Keep this off the
  // AssertionStore interface so callers don't bind to it.
  get devCount(): number {
    return this.rows.length;
  }
}

// The temporal comparison. NaN-free: nanos is 0 <= n < 1e9 by the proto Timestamp contract (a
// malformed nanos would be a contract breach upstream, not this lib's concern). A
// seconds-then-nanos lexicographic compare is the ONLY correct ordering for a (seconds,
// nanos) pair — a naive seconds-only compare would mis-order sub-second-differing rows.
function toPoint(t: { readonly seconds: bigint; readonly nanos: number }): TimePoint {
  return { seconds: t.seconds, nanos: t.nanos };
}

/** `a` strictly before `b` on the (seconds, nanos) axis. */
export function timeLt(a: TimePoint, b: TimePoint): boolean {
  if (a.seconds !== b.seconds) return a.seconds < b.seconds;
  return a.nanos < b.nanos;
}

/** `a` at or after `b`. (Defined as `!timeLt(a, b)` — the complement, so the two are total.) */
export function timeGte(a: TimePoint, b: TimePoint): boolean {
  return !timeLt(a, b);
}

// Re-export the contract types the callers reach kg THROUGH, so a consumer imports the truth-
// spine vocabulary from one place (`@engenox/kg`) rather than scattering contract imports.
// The types stay the single contract source (re-exported, NOT re-declared — no hand-written
// cross-language type, CLAUDE.md §4).
export type { AssertedNode, TimeInterval };
