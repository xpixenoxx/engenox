# T01 — Perception Fleet: Go Probe Workers (M5-thin)

> **Milestone:** M5 — The Perception fleet + the connectors + the consented-panel's first cohort (the probe scale-out + the second moat's seed)
> **Track:** Perception Engineer (founder-as-team role)
> **Depends on:** M4-thin complete (measurement service, quarantine guard, corpus writer)
> **Implements:** 25 §3 M5, 19 §3 Panel 1 (the verbatim probe read), 11 §3 (perception responsibilities + seams), ADR-0007 thin-column-then-thicken

---

## Deliverable (M5-thin)

A **multi-surface probe fleet** that fans out M×N×K across AI surfaces (ChatGPT, Perplexity, Gemini, Grok, Claude):

- **Per-probe workers** with timeouts/retries/cool-downs (thin: in-process; thicken: Spot-based)
- **Connector adapters** for Ahrefs/Semrush/GSC/GA4/CDN/Git/CMS with per-connector rate-limits (thin: stubbed interfaces; thicken: real connectors)
- **Consented panel cohort** — consent ledger + revocable model + jurisdiction-aware routing (thin: in-memory ledger + fixture rows; thicken: privacy cell + sglang)
- **EWMA/CUSUM fixture-refresh hook** — re-runs probes when foreign-change detector signals drift (thin: calls existing measurement.ForeignChangeDetector; thicken: ClickHouse-scheduled)

**Independently deployable as:** a probe run against the 5 surfaces that returns multi-sample `AnswerEvent` rows to the KG via `libs/kg` `Assert` (with `id_strategy=RCT-eligible` for consented panel rows).

---

## Scope — What M5-thin SHIPS (no more, no less)

| Area | Thin Implementation | Thickening Target (deferred) |
|------|---------------------|------------------------------|
| **Probe workers** | In-process Go workers per surface (ChatGPT, Perplexity, Gemini, Grok, Claude), configurable timeout/retry/cooldown, emit `AnswerEvent` | Spot fleet with per-probe preemption handling, pod disruption budgets, autoscaling, cost-flip threshold |
| **Gateway call** | ConnectRPC call to `gateway.Extract` seam per answer (already wired in M3) | Circuit breaker, retries, latency budgets, Langfuse spans |
| **Connector adapters** | 7 interfaces + no-op implementations (Ahrefs, Semrush, GSC, GA4, CDN, Git, CMS) with rate-limit config struct | Real SDKs + creds in Vault, per-connector quotas, pagination, error classification |
| **Consent panel** | In-memory `ConsentLedger` with `RecordConsent`/`RevokeConsent`/`ListConsented`; fixture cohort of 3 tenants with `id_strategy=RCT-eligible` | Immutable consent ledger (Append-only + R2 mirror), revocable GPG-signed consent, jurisdiction routing to privacy cell |
| **Fixture refresh** | Calls `measurement.ForeignChangeDetector` on probe series; if `combined_signal ∈ {WARNING, ALERT}` → re-schedule probe for affected surface | ClickHouse-driven scheduled job, tenant-surface-level refresh policies, cost-aware throttling |
| **KG write** | Uses existing `services/perception/internal/server.New()` `kg.AssertionStore` (in-memory M3-thin) | CNPG+AGE `AssertionStore` with bi-temporal indexes, RLS, canary-row test |

---

## Non-Goals (Explicitly Deferred to Thickening)

- ❌ Spot fleet orchestration, node pools, preemption handling
- ❌ Real connector SDKs (Ahrefs, Semrush APIs) — interfaces only
- ❌ Vault integration for connector credentials
- ❌ Privacy cell + self-hosted sglang for jurisdiction routing
- ❌ ClickHouse-scheduled fixture refresh — calls measurement service directly
- ❌ CNPG+AGE KG store — uses M3-thin in-memory store
- ❌ `id_strategy` enum on `AnswerEvent` — contract already has it, this ticket writes `RCT-eligible` value

---

## Contracts (Immutable — Strict-Add-Only v1)

No proto changes — all types exist in `pkg/contracts/proto/engenox/`:
- `entity/v1/surface.proto`: `Surface` enum (5 surfaces), `AnswerEvent`, `MentionRef`, `SurfaceAssertion`
- `entity/v1/entity.proto`: `AssertedNode`, `Distribution`, `TimeInterval`, `ProvenanceRef`, `IdentificationStrategy` (has `RCT_ELIGIBLE`)
- `service/v1/service.proto`: `PerceptionService` { `ProbeSurface`, `FastPartialProbe`, `GetProbeHistory`, `Assert` }
- `event/v1/event.proto`: `Assertion`, `IntegrityTags` (has `foreign_change_status`)

---

## Files to Create / Modify

```
services/perception/
├── cmd/
│   ├── main.go                          # (exists) gRPC server entry
│   └── probe-worker/
│       └── main.go                      # NEW: fleet worker entry point
├── internal/
│   ├── probe/                           # NEW: probe fleet core
│   │   ├── worker.go                    # Surface worker interface + base
│   │   ├── chatgpt.go                   # ChatGPT probe worker
│   │   ├── perplexity.go                # Perplexity probe worker
│   │   ├── gemini.go                    # Gemini probe worker
│   │   ├── grok.go                      # Grok probe worker
│   │   ├── claude.go                    # Claude probe worker
│   │   ├── scheduler.go                 # Fan-out M×N×K scheduler
│   │   ├── config.go                    # Timeout/retry/cooldown config
│   │   └── probe_test.go                # Unit tests
│   ├── connector/                       # NEW: connector adapters
│   │   ├── adapter.go                   # Connector interface
│   │   ├── ahrefs.go                    # Ahrefs adapter (stub)
│   │   ├── semrush.go                   # Semrush adapter (stub)
│   │   ├── gsc.go                       # GSC adapter (stub)
│   │   ├── ga4.go                       # GA4 adapter (stub)
│   │   ├── cdn.go                       # CDN adapter (stub)
│   │   ├── git.go                       # Git adapter (stub)
│   │   ├── cms.go                       # CMS adapter (stub)
│   │   ├── ratelimit.go                 # Per-connector rate limiter
│   │   └── fixture.go                   # Connector fixture data
│   ├── consent/                         # NEW: consent ledger
│   │   ├── ledger.go                    # In-memory ConsentLedger
│   │   ├── models.go                    # ConsentRecord, PanelCohort
│   │   └── fixture.go                   # Founder-network panel fixture (3 tenants)
│   ├── refresh/                         # NEW: EWMA/CUSUM fixture refresh
│   │   ├── hook.go                      # Detect foreign change → re-schedule
│   │   └── config.go                    # Refresh policy config
│   ├── kg/
│   │   └── client.go                    # NEW: kg.AssertionStore client for worker
│   └── server/
│       └── server.go                    # (exists) MODIFY: add probe history query
```

---

## Acceptance Criteria (All Must Pass)

### Contract Compatibility
- [ ] `buf lint` clean
- [ ] `buf generate` byte-reproducible
- [ ] `tsc --noEmit` strict exit 0
- [ ] `go build ./...` exit 0

### Probe Fleet
- [ ] `ProbeSurface` gRPC call returns `AnswerEvent` with `verbatim_answer`, `mentions`, `cited_sources`
- [ ] Fan-out across all 5 surfaces completes (5×M queries × N samples × K intents)
- [ ] Per-surface timeout/retry/cooldown respected (config-driven)
- [ ] Probe worker handles surface errors gracefully (partial results, no panic)

### Connector Adapters
- [ ] 7 interfaces compile with identical `Fetch(ctx, req) (Response, error)` signature
- [ ] Rate limiter enforces per-connector QPS (token bucket)
- [ ] No-op implementations return empty/fixture data without panic

### Consent Panel
- [ ] `ConsentLedger` supports `RecordConsent(tenant, surface, strategy)`, `RevokeConsent`, `ListConsented`
- [ ] Fixture cohort: 3 tenants, 5 surfaces each, `IdentificationStrategy=RCT_ELIGIBLE`
- [ ] Consent status readable via `ProbeSurface` path (worker checks ledger before probe)

### Fixture Refresh Hook
- [ ] Calls `measurement.ForeignChangeDetector` on daily impression series per surface
- [ ] `combined_signal == ALERT` or `WARNING` → schedules re-probe for affected tenant+surface
- [ ] Integration test with synthetic series triggering EWMA/CUSUM

### KG Integration
- [ ] Worker writes `AnswerEvent` → `gateway.Extract` → `Assertion` → `KG Assert` (end-to-end)
- [ ] `id_strategy` field on written assertions = `RCT_ELIGIBLE` for consented panel tenants
- [ ] In-memory `AssertionStore` round-trip verified (same as M3-thin)

### Boundary Lint
- [ ] `pnpm lint:boundary` clean (no `libs-import-no-service`, `gateway-leaf-only`, `no-cross-service-internal`)
- [ ] `check-no-utils` clean (no `utils.go`, `helpers.go`, `misc.go`)

### Tests
- [ ] Go tests: `go test ./internal/probe/... ./internal/connector/... ./internal/consent/... ./internal/refresh/...` pass
- [ ] Property test: fan-out completes all surfaces under timeout
- [ ] Property test: rate limiter blocks excess calls

---

## Definition of Done (per `docs/enforcement/DEFINITION_OF_DONE.md`)

- [ ] All acceptance criteria pass
- [ ] CI gates green (contract-compat, RLS-introspection, canary-row, idempotency, diff-review, dial property, golden-probe, per-language tests, Trivy, secret-scan, Biome/Ruff/golangci-lint, dep-direction)
- [ ] Failing mode tested (surface timeout, connector rate-limit, consent revoked, foreign change detected)
- [ ] Rollback identified (worker binary rollback, config flag to disable fleet)
- [ ] Observability added (span per probe + connector call, metrics: probes_total, probes_duration_seconds, connector_calls_total)
- [ ] Doc updated or ADR filed (this ticket + RECOVERY.md)
- [ ] Candor preserved (no inflated coverage claims; M5-thin = interfaces + in-process, not Spot fleet)

---

## Implementation Notes

### Probe Worker Interface
```go
type SurfaceWorker interface {
    Surface() entityv1.Surface
    Probe(ctx context.Context, req ProbeRequest) (*entityv1.AnswerEvent, error)
    Config() ProbeConfig
}

type ProbeConfig struct {
    Timeout       time.Duration
    MaxRetries    int
    Cooldown      time.Duration
    SamplesPerQuery int
}
```

### Scheduler
Fan-out: for each tenant, for each active surface, for each query template, for each sample (1..N):
- Execute with per-surface worker
- Call `gateway.Extract` via ConnectRPC
- Write assertions via `Assert` gRPC
- Record `AnswerEvent` in probe history

### Connector Rate Limiter
Token bucket per connector type, config-driven QPS, burst allowance.

### Consent Ledger
```go
type ConsentRecord struct {
    TenantId    string
    Surface     entityv1.Surface
    Strategy    entityv1.IdentificationStrategy // RCT_ELIGIBLE
    GrantedAt   time.Time
    RevokedAt   *time.Time
    Jurisdiction string
}
```

### Fixture Refresh Hook
```go
func (h *RefreshHook) CheckAndSchedule(ctx context.Context, tenantId string, surface entityv1.Surface, impressions []float64) error {
    result := foreignchange.DetectForeignChange(series)
    if result.CombinedSignal != DetectorSignal.CLEAR {
        return h.scheduler.ReSchedule(tenantId, surface)
    }
    return nil
}
```

---

## Verification Commands

```bash
# From repo root
cd services/perception
go build ./...
go test ./internal/probe/... ./internal/connector/... ./internal/consent/... ./internal/refresh/... -v

# Contract gates (from repo root)
mise exec -- pnpm lint:boundary
mise exec -- buf lint
mise exec -- buf generate
mise exec -- tsc --noEmit
mise exec -- go build ./...

# Check-no-utils
./tools/check-no-utils.sh
```

---

## Candor Flag

**M5-thin ships interfaces and in-process orchestration.** The "fleet" is a Go scheduler calling workers in the same process. The "connectors" are no-op stubs. The "consent panel" is an in-memory map with 3 fixture rows. The "refresh hook" calls the measurement service directly, not a ClickHouse job.

**This is the correct thin column.** The thickening pass (M5-thicken → M6+) swaps each component for its production substrate. The MVP scope (26) requires the loop's *mechanism* to ship with candor microcopy — not the scale infrastructure.

---

## Recovery Instruction

If interrupted, resume from the first ⬜ task in the task list below. Do not redo completed work. Write each artifact to disk, mark ✅, continue.