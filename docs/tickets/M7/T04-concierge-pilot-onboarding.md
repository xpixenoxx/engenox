# M7-T04: Concierge Pilot Onboarding — 3–5 Founder-Network Tenants

**Status:** ⬜ NOT STARTED  
**Milestone:** M7 (Gate C)  
**Owner:** Founder / Product Engineer  
**Depends on:** T02 (AtlasCycle E2E stage), E41 (Web onboarding)

---

## Objective

Onboard **3–5 pilot tenants** from the founder network into the **concierge cohort** (Gates C). Each tenant:
- Enters via invite-only `/onboarding/concierge` flow
- Consent pre-filled as `RCT_ELIGIBLE` (per `26` §6 consent ledger)
- Dial locked at **Co-pilot** (never escalates above; `propose` only)
- Every intervention → PR opened at Action service (human merges)
- Candor Report rendered with lift CI + contrarian block

---

## Onboarding Flow

```
Invite Email (WorkOS magic link)
       │
       ▼
/onboarding/concierge (Next.js page)
  ├─ Step 1: Accept invite → WorkOS session
  ├─ Step 2: Consent panel (pre-filled: RCT_ELIGIBLE, 5 surfaces)
  ├─ Step 3: Connect data sources (GSC, GA4, Ahrefs/Semrush tokens → Vault)
  ├─ Step 4: Select brand surfaces to monitor (auto-discovered)
  └─ Step 5: Confirm → TenantConfigStore seeded + AtlasCycle scheduled
```

---

## Tenant Config (Stage Pilot Defaults)

| Setting | Value | Rationale |
|---|---|---|
| `dial_level` | `co-pilot` | Gate C: no escalation above propose |
| `canary_cohort` | `true` | Enables warm-canary 5% routing |
| `measurement_window_days` | 7 | M7 pilot window |
| `consent_strategy` | `RCT_ELIGIBLE` | Gold-standard cohort per `26` §6 |
| `data_sources` | `gsc, ga4, ahrefs, semrush` | Per connector stubs |
| `surfaces` | `chatgpt, perplexity, gemini, grok, claude` | 5 surface workers |

---

## Per-Tenant Provisioning (Automated on Confirm)

```python
# scripts/onboard_concierge_tenant.py
def provision_tenant(tenant_id: str, config: PilotConfig):
    # 1. R2 prefix
    r2_client.put_object(Bucket="engenox-corpus", Key=f"{tenant_id}/.keep", Body=b"")
    
    # 2. ClickHouse partition
    ch_client.execute(f"ALTER TABLE cio_corpus_analytics ADD PARTITION IF NOT EXISTS '{tenant_id}'")
    
    # 3. Consent ledger entries (15 rows: 3 tenants × 5 surfaces)
    consent_ledger.seed_pilot_tenant(tenant_id, config.surfaces)
    
    # 4. TenantConfigStore (Postgres-backed in thickening; in-memory M6)
    tenant_config_store.upsert(tenant_id, config)
    
    # 5. Schedule first AtlasCycle (Temporal)
    temporal_client.start_workflow(
        AtlasCycleWorkflow.run,
        args=[AtlasCycleInput(tenant_id=tenant_id, surfaces=config.surfaces)],
        id=f"atlas-cycle-{tenant_id}-{uuid4()}",
        task_queue="atlas-cycle"
    )
    
    # 6. Emit onboarding event (Langfuse + Grafana)
    observability.emit("concierge_onboarded", {"tenant_id": tenant_id})
```

---

## Pilot SLA (Documented in `/onboarding/concierge`)

| Commitment | Detail |
|---|---|
| **Dial** | Locked at Co-pilot (`propose` only). No automated merges. |
| **Human approval** | Every intervention PR requires manual merge in GitHub UI. |
| **Response time** | First conflict detected → PR within 24h (SLA dashboard in Web). |
| **Candor Report** | Lift rendered with CI; contrarian block always shown. |
| **Data rights** | Full export + delete via `/settings/data-rights`. |
| **Duration** | 8-week pilot; auto-extend unless tenant opts out. |

---

## Web UI Additions (extends E41)

| Route | Component | Purpose |
|---|---|---|
| `/onboarding/concierge` | `ConciergeOnboardingFlow` | 5-step wizard above |
| `/pilot/[tenant]/dashboard` | `PilotDashboard` | Conflict list + PR status + SLA timer |
| `/pilot/[tenant]/reports` | `CandorReportViewer` | Read-only candor report (no editing) |
| `/pilot/[tenant]/settings` | `PilotSettings` | Data source tokens, surface toggles, export |

---

## Verification Checklist

| Item | Verification |
|---|---|
| Invite flow works end-to-end | Manual test with 3 founder emails |
| Consent pre-filled + immutable | Consent ledger shows `RCT_ELIGIBLE` + `GRANTED` |
| Vault stores connector tokens | `vault read engenox/concierge/{tenant}/{connector}` |
| R2 prefix created | `wrangler r2 object list engenox-corpus --prefix={tenant}/` |
| ClickHouse partition exists | `SELECT count() FROM cio_corpus_analytics WHERE tenant_id='{tenant}'` |
| First AtlasCycle completes | Temporal UI shows `Completed` for pilot tenant |
| PR opened at Action service | GitHub PR visible in tenant's repo (via GitHub App) |
| Candor Report renders lift+CI+contrarian | `/pilot/{tenant}/reports` shows report |

---

## Candor Flags

- [ ] **No dial escalation** — verify Cedar policy denies `escalate` when `dial_level=co-pilot`
- [ ] **No auto-merge** — Action service `dialGateEvaluator` returns `propose` only
- [ ] **Consent truly revocable** — `/settings` revoke button calls `ConsentLedger.revoke()`
- [ ] **Pilot cohort isolated** — no prod tenant data in pilot R2/ClickHouse partitions
- [ ] **SLA visible** — dashboard shows countdown to 24h PR commitment

---

## Files to Create/Modify

```
web/src/app/onboarding/concierge/page.tsx
web/src/app/pilot/[tenant]/dashboard/page.tsx
web/src/app/pilot/[tenant]/reports/page.tsx
web/src/app/pilot/[tenant]/settings/page.tsx
web/src/components/concierge/ConsentPanel.tsx
web/src/components/concierge/DataSourceConnect.tsx
scripts/onboard_concierge_tenant.py
services/control-plane/src/config/pilotDefaults.ts
services/action/internal/cedargate/policies/pilot.cedar
```

---

## Acceptance Criteria

- [ ] 3–5 pilot tenants successfully onboarded via invite flow
- [ ] All pilot tenants have: R2 prefix, CH partition, consent ledger entries, scheduled AtlasCycle
- [ ] First AtlasCycle completes for each pilot tenant (<24h after onboard)
- [ ] PR opened at Action service for each intervention (dial=propose)
- [ ] Candor Report renders lift CI + contrarian block for pilot tenants
- [ ] Pilot SLA documented and visible in Web UI
- [ ] All CI gates pass (contract-compat, lint, tests, dep-direction, security, stack-drift)