// cedar.test.ts — the dial candor invariants on the REAL Cedar runtime + the <2ms p99 gate.
//
// The dial floor (12 §5 + 26 §6 + CLAUDE.md §8): default `propose`; an escalation REQUIRES 3
// axes (a watchdog hit if fewer); demotion-on-alert; no auto-merge in the MVP. These run
// against @cedar-policy/cedar-wasm (the real engine, NOT a stub — the gate mechanism is never
// thinned, ADR-0007). The benchmark asserts the warm-eval p99 < 2.0ms (23 §3m — the CI test),
// measured on `process.hrtime.bigint()` (the monotonic clock).
//
// Cites: 12 §5/§9 + 26 §4/§6 + 23 §3m; CLAUDE.md §2/§8; ADR-0007 Thinning Rule.

import { describe, expect, it } from "vitest";
import { benchmarkDecideP99, decide, InMemoryDialLedger } from "../src/cedar.js";

describe("decide — the two-pass dial gate (real Cedar runtime)", () => {
  it("ALLOW: escalate with axisCount >= 3 (the 3-axes rule, 12 §9)", () => {
    const r = decide({ tenantId: "tenant-1", action: "escalate", axisCount: 3 });
    expect(r.isOk()).toBe(true);
    expect(r.isOk() && r.value.decision).toBe("allow");
  });

  it("DENY: escalate with axisCount = 2 (the escalation-requires-3-axes watchdog hit)", () => {
    const r = decide({ tenantId: "tenant-1", action: "escalate", axisCount: 2 });
    expect(r.isOk() && r.value.decision).toBe("deny");
  });

  it("DENY: escalate with axisCount = 0 (an un-earned escalation is refused)", () => {
    const r = decide({ tenantId: "tenant-1", action: "escalate", axisCount: 0 });
    expect(r.isOk() && r.value.decision).toBe("deny");
  });

  it("ALLOW: propose (the default dial — always permitted, 12 §5)", () => {
    const r = decide({ tenantId: "tenant-1", action: "propose", axisCount: 0 });
    expect(r.isOk() && r.value.decision).toBe("allow");
  });

  it("ALLOW: demote (demotion-on-alert — the dial backs off the moment an alert fires)", () => {
    const r = decide({ tenantId: "tenant-1", action: "demote", axisCount: 0 });
    expect(r.isOk() && r.value.decision).toBe("allow");
  });

  it("REJECT: a malformed request fails pass 1 (missing-tenant) — never reaches Cedar", () => {
    const r = decide({ tenantId: "", action: "propose", axisCount: 3 });
    expect(r.isErr() && r.error.kind === "missing-tenant").toBe(true);
  });

  it("REJECT: a negative axisCount fails pass 1 (negative-axis-count)", () => {
    const r = decide({ tenantId: "tenant-1", action: "propose", axisCount: -1 });
    expect(r.isErr() && r.error.kind === "negative-axis-count").toBe(true);
  });
});

describe("benchmarkDecideP99 — the <2ms p99 CI test (23 §3m, real runtime warm-eval)", () => {
  it("the warm-eval p99 of `decide(propose)` is < 2.0ms", () => {
    // 2000 iterations is enough to resolve a stable p99 at sub-ms latencies (the CI uses 10k;
    // the assertion is the SAME bound — the warm p99 is the in-request SLA, not cold start).
    const p99 = benchmarkDecideP99({ tenantId: "tenant-1", action: "propose", axisCount: 3 }, 2000);
    expect(p99).toBeLessThan(2.0);
  });
});

describe("InMemoryDialLedger — a refused escalation is STILL recorded (the candor floor)", () => {
  it("appends + surfaces the last decision per tenant (a denied escalate is retained, 26 §4)", () => {
    const ledger = new InMemoryDialLedger();
    ledger.append({
      tenantId: "tenant-1",
      action: "escalate",
      axisCount: 2,
      decision: "deny",
      reasons: [],
      txTime: { seconds: 100n, nanos: 0 },
    });
    expect(ledger.devCount).toBe(1);
    const last = ledger.lastFor("tenant-1");
    expect(last?.decision).toBe("deny"); // the refused escalation is recorded, not erased.
    expect(last?.action).toBe("escalate");
  });

  it("returns undefined for a tenant with no prior dial action", () => {
    const ledger = new InMemoryDialLedger();
    expect(ledger.lastFor("never-seen")).toBeUndefined();
  });
});
