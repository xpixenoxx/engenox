# M7-T03: Warm-Canary Divergence Baseline — 5% Symbolic Fallback Path

**Status:** ⬜ NOT STARTED  
**Milestone:** M7 (Gate C–D)  
**Owner:** AI Engineer (founder acting as)  
**Depends on:** T02 (AtlasCycle E2E in stage)

---

## Objective

Implement and validate the **warm-canary symbolic fallback** per `25` §3 + `11` §6: 5% of stage AtlasCycle executions route through a **symbolic-rules-only path** (no LLM calls) that produces a `ProposedIntervention` + `CIOCorpusRow`. Compare against the LLM path on:
- ConflictType match rate
- Draft schema validity (schema.org JSON-LD)
- Lift estimate CI overlap
- Critique verdict (allow/deny)

**Divergence threshold:** <15% on all metrics (per `11` §3j baseline). Run 48h soak; gate in CI.

---

## Architecture

| Component | LLM Path (95%) | Symbolic Path (5%) |
|---|---|---|
| **Extract** | Gateway.Extract (constrained decoding) | Deterministic regex/keyword → `ConflictType` enum |
| **Draft** | Gateway.Draft (schema.org JSON-LD) | Template fill from `SurfaceProfile` fixture |
| **Adjudicate** | Gateway.Adjudicate (ConflictType enum) | Rule-based: `if brand_mention ∧ sentiment<0 → NEGATIVE_OMISSION` |
| **Critique** | Gateway.Critique (cross-family Critic) | Static checklist: `has_citation ∧ has_CI ∧ contrarian_block` |
| **Measurement** | SCM/DML + conformal | Simple pre/post diff + fixed CI (±15%) |

**Routing:** Temporal activity `runDecisionPhase` reads `canary_weight=0.05` from `TenantConfigStore`. If `random() < 0.05` → `SymbolicDecisionActivity` else `DecisionActivity`.

---

## Implementation Steps

### 1. Add Canary Weight Config
```typescript
// services/control-plane/src/config/tenantConfig.ts
interface TenantConfig {
  canaryWeight: number; // 0.05 for stage pilot tenants
  // ...
}
```

### 2. Create Symbolic Activities
```
services/temporal/src/activities/symbolicDecisionActivities.ts
├── symbolicExtract()      → AdversarialResponse<ExtractResponse>
├── symbolicDraft()        → AdversarialResponse<DraftResponse>
├── symbolicAdjudicate()   → AdversarialResponse<AdjudicateResponse>
├── symbolicCritique()     → AdversarialResponse<CritiqueResponse>
└── symbolicMeasure()      → AdversarialResponse<MeasurementResponse>
```

### 3. Wire Routing in Decision Phase
```typescript
// services/temporal/src/activities/atlasCycleActivities.ts
async function runDecisionPhase(input: DecisionPhaseInput): Promise<DecisionPhaseOutput> {
  const config = await tenantConfigStore.get(input.tenantId);
  if (Math.random() < (config.canaryWeight ?? 0)) {
    return symbolicDecisionActivity(input);
  }
  return decisionActivity(input);
}
```

### 4. Metrics Emission (ClickHouse)
```sql
-- Table: warm_canary_metrics
CREATE TABLE warm_canary_metrics (
  cycle_id UUID,
  tenant_id String,
  path Enum8('llm' = 1, 'symbolic' = 2),
  conflict_type_match Bool,
  draft_schema_valid Bool,
  lift_ci_overlap Float32,
  critique_verdict Enum8('allow' = 1, 'deny' = 2),
  latency_ms UInt32,
  ts DateTime64(3)
) ENGINE = MergeTree ORDER BY (tenant_id, ts);
```

Emit from both paths after `runMeasurementPhase`.

### 5. CI Gate Job
```yaml
# .github/workflows/ci-orchestrator.yaml (add job)
warm-canary-divergence:
  runs-on: ubuntu-latest
  needs: stage-deploy
  if: github.ref == 'refs/heads/main'
  steps:
    - uses: actions/checkout@v4
    - name: Query 48h divergence
      run: |
        python scripts/check_warm_canary_divergence.py --hours=48 --threshold=0.15
```

---

## Verification (48h Soak)

| Metric | Target | Measurement |
|---|---|---|
| ConflictType match | ≥85% | `AVG(conflict_type_match) WHERE path='symbolic'` |
| Draft schema valid | 100% | `AVG(draft_schema_valid) WHERE path='symbolic'` |
| Lift CI overlap | ≥85% | `AVG(lift_ci_overlap) WHERE path='symbolic'` |
| Critique verdict parity | ≥85% | `AVG(critique_verdict = llm_verdict) WHERE path='symbolic'` |
| Latency delta | Symbolic < LLM | `AVG(latency_ms) WHERE path='symbolic'` |

**Gate fails if ANY metric < threshold.**

---

## Candor Flags

- [ ] Symbolic path uses **zero LLM calls** (verify no LiteLLM imports)
- [ ] Canary weight **configurable per-tenant** (not hardcoded)
- [ ] Metrics emitted **atomically** with corpus write (no divergence in observability)
- [ ] 48h soak completed **without manual intervention**
- [ ] Divergence threshold **not lowered** to pass; if fails, document root cause

---

## Files to Create/Modify

```
services/control-plane/src/config/tenantConfig.ts
services/temporal/src/activities/symbolicDecisionActivities.ts
services/temporal/src/activities/atlasCycleActivities.ts (routing)
services/measurement/src/engenox/measurement/clickhouse/client.py (metrics)
scripts/check_warm_canary_divergence.py
.github/workflows/ci-orchestrator.yaml (warm-canary-divergence job)
```

---

## Acceptance Criteria

- [ ] 5% routing implemented + verified via logs
- [ ] Symbolic path produces valid `ProposedIntervention` + `CIOCorpusRow`
- [ ] Metrics emitted to ClickHouse for both paths
- [ ] 48h soak completes; divergence <15% on all 4 metrics
- [ ] CI gate `warm-canary-divergence` passes on `main`
- [ ] Candor flags documented; no silent deferrals