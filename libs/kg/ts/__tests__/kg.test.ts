// kg.test.ts — the bi-temporal candor-gate + the as-of read, made executable.
//
// The candor floor at the kg layer (06 §7 invariant 2 + 13 §2): a typed-optional does NOT become
// an omitted-mandatory on the wire. The contract type marks valid_time/tx_time/provenance
// optional (proto3 optional semantics); the STORE enforces them mandatory. These tests assert
// the append REJECTS a node missing any one — the failing modes a hand-written `valid_time @>`
// elsewhere would silently accept. The view tests assert the as-of read respects the half-open
// window + the no-cross-tenant scoping (RLS, at the store layer now so a caller can't bypass it).
//
// Cites: 13 §2/§3/§4 + 06 §2.1/§7; CLAUDE.md §5/§10.

import { describe, expect, it } from "vitest";
import { create } from "@bufbuild/protobuf";
import {
  AssertedNodeSchema,
  ProvenanceRefSchema,
  TimeIntervalSchema,
} from "@engenox/contracts/entity/v1";
import type { AssertedNode, TimeInterval } from "@engenox/contracts/entity/v1";
import { InMemoryAssertionStore, timeGte, timeLt } from "../src/kg.js";

// The default bi-temporal window [validStart=1000s, validEnd=5000s) + txStart=2000s + a present
// ProvenanceRef. `drop` leaves exactly one mandatory field unset (set to undefined in the init)
// to assert that gate fires; `id`/`tenantId` override to the empty string to assert THOSE gates.
// `drop = "validTime"` produces a node where `node.validTime === undefined` — the candor gate's
// failing mode. Returns a real AssertedNode (no `as` cast — `create` is typed to AssertedNode).
function makeNode(opts: { id?: string; tenantId?: string; drop?: "validTime" | "txTime" | "provenance" } = {}): AssertedNode {
  const drop = opts.drop;
  const validWindow: TimeInterval = create(TimeIntervalSchema, {
    start: { seconds: 1000n, nanos: 0 },
    end: { seconds: 5000n, nanos: 0 },
  });
  const txWindow: TimeInterval = create(TimeIntervalSchema, { start: { seconds: 2000n, nanos: 0 } });
  return create(AssertedNodeSchema, {
    id: opts.id ?? "node-1",
    tenantId: opts.tenantId ?? "tenant-1",
    entityType: 0, // ENTITY_TYPE_UNSPECIFIED — a concrete type is not the candor gate's concern.
    validTime: drop === "validTime" ? undefined : validWindow,
    txTime: drop === "txTime" ? undefined : txWindow,
    provenance: drop === "provenance" ? undefined : create(ProvenanceRefSchema),
  });
}

// A node with NO valid-time end — "true from start onward", unbounded above (13 §2).
function makeOpenNode(): AssertedNode {
  return create(AssertedNodeSchema, {
    id: "node-1",
    tenantId: "tenant-1",
    entityType: 0,
    validTime: create(TimeIntervalSchema, { start: { seconds: 1000n, nanos: 0 } }),
    txTime: create(TimeIntervalSchema, { start: { seconds: 2000n, nanos: 0 } }),
    provenance: create(ProvenanceRefSchema),
  });
}

describe("InMemoryAssertionStore.append — the bi-temporal candor gate", () => {
  it("appends a fully-formed bi-temporal node", () => {
    const store = new InMemoryAssertionStore();
    const r = store.append(makeNode());
    expect(r.isOk()).toBe(true);
    expect(store.devCount).toBe(1);
  });

  it("REJECTS a node missing valid_time (typed-optional ≠ omitted-mandatory, 13 §2)", () => {
    const store = new InMemoryAssertionStore();
    const r = store.append(makeNode({ drop: "validTime" }));
    expect(r.isErr()).toBe(true);
    expect(r.isErr() && r.error.kind === "missing-valid-time").toBe(true);
    expect(store.devCount).toBe(0); // the candor floor: rejected, NOT silently stored.
  });

  it("REJECTS a node missing tx_time", () => {
    const store = new InMemoryAssertionStore();
    const r = store.append(makeNode({ drop: "txTime" }));
    expect(r.isErr() && r.error.kind === "missing-tx-time").toBe(true);
    expect(store.devCount).toBe(0);
  });

  it("REJECTS a node missing provenance (06 §2.1 — the audit fan-back is mandatory)", () => {
    const store = new InMemoryAssertionStore();
    const r = store.append(makeNode({ drop: "provenance" }));
    expect(r.isErr() && r.error.kind === "missing-provenance").toBe(true);
    expect(store.devCount).toBe(0);
  });

  it("REJECTS a node missing tenant (the RLS key — no silent cross-tenant row)", () => {
    const store = new InMemoryAssertionStore();
    const r = store.append(makeNode({ tenantId: "" }));
    expect(r.isErr() && r.error.kind === "missing-tenant").toBe(true);
  });

  it("REJECTS a node missing id (the deterministic hash — the entity identity IS the id)", () => {
    const store = new InMemoryAssertionStore();
    const r = store.append(makeNode({ id: "" }));
    expect(r.isErr() && r.error.kind === "missing-id").toBe(true);
  });
});

describe("view — the as-of read (the ONLY sanctioned bi-temporal query, 13 §3)", () => {
  it("returns the node whose valid_time window CONTAINS validAt (start <= validAt < end)", () => {
    const store = new InMemoryAssertionStore();
    store.append(makeNode());
    const r = store.view({ tenantId: "tenant-1", entityId: "node-1", validAt: { seconds: 2000n, nanos: 0 } });
    expect(r.isOk()).toBe(true);
    expect(r.isOk() && r.value.length).toBe(1);
  });

  it("EXCLUDES a node whose window has not yet started (validAt before start)", () => {
    const store = new InMemoryAssertionStore();
    store.append(makeNode());
    const r = store.view({ tenantId: "tenant-1", entityId: "node-1", validAt: { seconds: 500n, nanos: 0 } });
    expect(r.isOk() && r.value.length).toBe(0);
  });

  it("EXCLUDES a node at/past the half-open end (end exclusive, validAt == end)", () => {
    const store = new InMemoryAssertionStore();
    store.append(makeNode()); // window [1000, 5000)
    const r = store.view({ tenantId: "tenant-1", entityId: "node-1", validAt: { seconds: 5000n, nanos: 0 } });
    expect(r.isOk() && r.value.length).toBe(0);
  });

  it("INCLUDES a node with no end (unbounded above — the fact is still true, 13 §2)", () => {
    const store = new InMemoryAssertionStore();
    store.append(makeOpenNode());
    const r = store.view({ tenantId: "tenant-1", entityId: "node-1", validAt: { seconds: 999_999n, nanos: 0 } });
    expect(r.isOk() && r.value.length).toBe(1);
  });

  it("scopes by tenant + entity (NO cross-tenant leakage — RLS at the store layer)", () => {
    const store = new InMemoryAssertionStore();
    store.append(makeNode({ tenantId: "tenant-A" }));
    // A query for tenant-B against the SAME entity id must see ZERO rows.
    const r = store.view({ tenantId: "tenant-B", entityId: "node-1", validAt: { seconds: 2000n, nanos: 0 } });
    expect(r.isOk() && r.value.length).toBe(0);
    // A query for tenant-A but a different entity id also sees zero (the id IS the entity id).
    const r2 = store.view({ tenantId: "tenant-A", entityId: "other-entity", validAt: { seconds: 2000n, nanos: 0 } });
    expect(r2.isOk() && r2.value.length).toBe(0);
  });
});

describe("timeLt / timeGte — the (seconds, nanos) lexicographic order", () => {
  it("orders by seconds first, then nanos (a naive seconds-only compare would mis-order sub-second rows)", () => {
    expect(timeLt({ seconds: 1n, nanos: 0 }, { seconds: 1n, nanos: 1 })).toBe(true);
    expect(timeLt({ seconds: 1n, nanos: 1 }, { seconds: 1n, nanos: 0 })).toBe(false);
    expect(timeLt({ seconds: 2n, nanos: 999_999_999 }, { seconds: 3n, nanos: 0 })).toBe(true);
  });

  it("timeGte is the total complement of timeLt", () => {
    expect(timeGte({ seconds: 5n, nanos: 0 }, { seconds: 5n, nanos: 0 })).toBe(true);
    expect(timeGte({ seconds: 5n, nanos: 1 }, { seconds: 5n, nanos: 0 })).toBe(true);
    expect(timeGte({ seconds: 4n, nanos: 9 }, { seconds: 5n, nanos: 0 })).toBe(false);
  });
});
