# Engenox MVP — Complete 88-Task Strategic Plan (Local-First)

**Generated:** 2026-07-17  
**Source:** `docs/_RECOVERY.md` + `docs/26_MVP_SCOPE.md` + ADR-0007 + CLAUDE.md  
**Status:** Ready for execution — Phase 0 starts now

---

## Executive Summary

**Goal:** Ship the world's first AI Visibility Operating System MVP — a stranger signs up → dashboard → opens first PR in <10 minutes, no human at Engenox involved.

**Architecture:** Two-spine intelligence — bi-temporal KG (Postgres+AGE → FalkorDB) + counterfactual uplift estimator (CIO corpus, dual-canonical Postgres+R2). Six bounded LLM seams (Extract, Draft, Adjudicate, Embed, Abduce, Critique) with cross-family Critic, constrained decoding, verifier re-grounding. Temporal workflow spine. Dial at `Co-pilot` (propose only). Candor floor: CI never omitted, contrarian block renders, Provenance Audit Hover works.

**Strategy:** Local-first (docker-compose) → Concierge validation → Production deploy. Zero cloud spend until Phase 6.

---

## Phase Overview

| Phase | Duration | Focus |
|---|---|---|
| **0: Local Stack + Unblock** | Week 1 | docker-compose, M3-VAL-01, all services local |
| **1: M6 Backend** | Weeks 2-4 | Decision Service + Control Plane |
| **2: Web App + Design System** | Weeks 3-6 | Next.js 16, Candor Report, Dial UI, Design System |
| **3: Wedge Features + E2E** | Weeks 5-7 | F7 PR Connector, F8 Pixel, Playwright journey |
| **4: Concierge Validation** | Week 8 | Gates C — real loop with founder cohort |
| **5: Closure Gates** | Parallel | Security, AI-Intelligence, Production, Product |
| **6: Production + Launch** | Week 9-10 | GKE HA, Argo CD, Gates A-D, stranger self-serve |

**Total: ~9-10 weeks to live MVP**

---

## Complete Task List (88 Tasks)

### Phase 0: Local Stack + Unblock (7 Tasks)
| ID | Task | Status |
|---|---|---|
| 28 | LOCAL: docker-compose dev stack (Postgres+AGE+Valkey+Redpanda+Temporal+MinIO+ClickHouse) | ⬜ |
| 29 | LOCAL: Atlas migrations + RLS introspection + canary-row on local Postgres | ⬜ |
| 30 | LOCAL: M3-VAL-01 — AtlasCycle + replay on local Temporal **(UNBLOCKS MVP)** | ⬜ |
| 31 | LOCAL: Gateway (6 seams) with AI APIs (needs ANTHROPIC + OPENAI keys) | ⬜ |
| 32 | LOCAL: Perception + Action + Temporal + Decision services | ⬜ |
| 33 | LOCAL: Measurement (SCM/DML/conformal/foreign-change/corpus) | ⬜ |
| 34 | LOCAL: Perception fleet + connectors + consent panel + probe workers | ⬜ |

### Phase 1: M6 Backend (6 Tasks)
| ID | Task | Status |
|---|---|---|
| 35 | LOCAL: Decision Service — Adjudicate/Draft/Critique → proposal → CIO row | ⬜ |
| 41 | E39.1: Decision service core — seam integration + synthesis | ⬜ |
| 42 | E39.2: Decision service tests — mocking + synthesis + verifier + CIO | ⬜ |
| 43 | E39.3: Decision service CI — vitest step | ⬜ |
| 36 | LOCAL: Control Plane — AtlasCycle orchestration + per-tenant config | ⬜ |
| 44-48 | E40.1-5: Control Plane workflow + activities + HTTP + tests + CI | ⬜ |

### Phase 2: Web App + Design System (19 Tasks)
| ID | Task | Status |
|---|---|---|
| 49 | Design System — tokens, primitives, Candor patterns, Storybook, a11y | ⬜ |
| 50 | Web scaffold — Next.js 16 + local auth mock + layout | ⬜ |
| 51 | Onboarding (F1) — 5-field wizard | ⬜ |
| 52 | Dashboard + Conflict List — KG assertion_view + SSE | ⬜ |
| 53 | Intervention Detail — proposal diff + propose PR + candor | ⬜ |
| 54 | **Candor Report** — 6 panels (lift+CI, trajectory, honesty, contrarian, provenance, dial) | ⬜ |
| 55 | **Dial UI** — 4-position knob + Ledger Explainer modal | ⬜ |
| 56 | Consent Panel + SSE broker | ⬜ |
| 57 | Web tests — Vitest + MSW + RTL + CI | ⬜ |
| 78 | Observability — OTel Collector + Grafana + Langfuse (local + prod parity) | ⬜ |
| 79 | **Provenance Audit Hover** — full corpus audit drawer with dual-canonical proof | ⬜ |
| 80 | Consent Panel — granular revocation + history + audit links | ⬜ |
| 81 | Security — CSP + HSTS + rate limits + secret scan + dep audit | ⬜ |
| 82 | Perf — <90s probe + <10min journey + Lighthouse CI | ⬜ |
| 84 | Models — Pinned ModelSpec per seam + canary migration + cost tracking | ⬜ |
| 85 | Golden probe regression — pipeline behavior fixtures + nightly drift detection | ⬜ |
| 86 | Cost — Per-tenant token budget + alerts + dashboard + FinOps | ⬜ |
| 87 | Compliance — Audit log viewer + signed export + Merkle root + break-glass | ⬜ |
| 88 | Migrations — Atlas expand-only + destructive lint + rollback tested | ⬜ |

### Phase 3: Wedge Features + E2E (10 Tasks)
| ID | Task | Status |
|---|---|---|
| 58 | F7.1: GitHub App webhook handler in Action service | ⬜ |
| 59 | F7.2: GitHub App OAuth flow in web app + tenant linking | ⬜ |
| 60 | F7.3: PR creation — intervention diff files + draft PR + idempotency | ⬜ |
| 61 | F8.1: AI-referral pixel JS — AI referrer detection + beacon | ⬜ |
| 62 | F8.2: Referral ingestion endpoint — KG write + rate limit | ⬜ |
| 63 | E42.1: Playwright E2E — full <10-min journey test | ⬜ |
| 64 | E42.2: Playwright CI — docker-compose + test + artifacts | ⬜ |
| 65 | E43.1: M6 CI — decision + control-plane + web + e2e | ⬜ |
| 18 | F7: Implement 1-click PR connector (aggregate) | ⬜ |
| 19 | F8: Build AI-referral pixel + ingestion (aggregate) | ⬜ |

### Phase 4: Concierge Validation (5 Tasks)
| ID | Task | Status |
|---|---|---|
| 66 | Gates C.1: Seed concierge cohort (3-5 tenants × 5 surfaces) | ⬜ |
| 67 | Gates C.2: Run perception fleet on cohort → collect assertions | ⬜ |
| 68 | Gates C.3: Execute AtlasCycle on cohort → CIO corpus rows | ⬜ |
| 69 | Gates C.4: Validate Candor Reports (lift+CI, contrarian, provenance, dial) | ⬜ |
| 70 | Gates C.5: Document Gates C evidence | ⬜ |

### Phase 5: Closure Gates (4 Tasks — All Must Pass)
| ID | Gate | Status |
|---|---|---|
| 22 | Security — RLS + canary + diff-review + Cedar + crypto + audit log | ⬜ |
| 23 | AI-Intelligence — constrained decoding + cross-family Critic + verifier + conformal + golden-probe | ⬜ |
| 24 | Production-readiness — chaos + DR + R2 restore + blue/green + rollback | ⬜ |
| 25 | Product — Gates A-D + <10-min + <90s + candor UX in prod | ⬜ |

### Phase 6: Production + Launch (3 Tasks)
| ID | Task | Status |
|---|---|---|
| 83 | PROD: Production deploy — GKE HA + R2 WORM + WorkOS/Stripe + Argo CD + smoke test | ⬜ |
| 77 | Launch: Gates A-D closure + Go/No-Go decision | ⬜ |
| 27 | LAUNCH: Open to concierge + Starter self-serve → monitor | ⬜ |

### Manual Actions Required (You Do These — 6 Free Accounts)
| ID | Action | Cost | When |
|---|---|---|---|
| 2 | GCP project + billing | Free credit | Phase 6 only |
| 3 | Cloudflare R2 bucket + Object Lock + API token | **Free** | Phase 0 |
| 4 | GitHub App (contents, PRs, webhook) | **Free** | Phase 0 |
| 5 | WorkOS account + OIDC | **Free** | Phase 0 |
| 6 | Stripe account + Starter $129 product (test mode) | **Free** | Phase 0 |
| 7 | Domain + DNS | ~$12/yr | Phase 6 (optional) |

### AI API Keys You Provide (Pay-Per-Use)
| Key | Used By | Est. Cost/Week |
|---|---|---|
| `ANTHROPIC_API_KEY` | Gateway (Haiku/Opus/Sonnet) | $20-60 |
| `OPENAI_API_KEY` | Gateway (GPT-5 Critic) | $10-25 |
| `GOOGLE_API_KEY` | Optional (Gemini Critic) | Optional |

---

## Critical Path Dependencies

```
Task 28 (docker-compose)
    → Task 29 (Atlas + RLS)
        → Task 30 (M3-VAL-01) ★ UNBLOCKS MVP
            → Task 31 (Gateway + AI APIs)
            → Task 32-34 (All services local)
                → Task 35/41 (Decision Service)
                → Task 36/44 (Control Plane)
                    → Task 50-57 (Web App needs real APIs)
                        → Task 58-62 (F7/F8 need GitHub App + Web)
                            → Task 63-65 (E2E needs full stack)
                                → Task 66-70 (Concierge needs E2E)
                                    → Tasks 22-25 (All closure gates)
                                        → Task 83 (Production deploy)
                                            → Task 77/27 (Launch)
```

---

## What You Need to Do TODAY

### 1. Create Free Accounts (Parallel, ~2 Hours)
| Account | URL | What to Give Me |
|---|---|---|
| **Cloudflare** | dash.cloudflare.com | R2: Account ID, Access Key, Secret Key, Bucket Name |
| **GitHub App** | github.com/settings/apps/new | App ID, Private Key, Webhook Secret, Client ID/Secret |
| **WorkOS** | dashboard.workos.com | Client ID, Client Secret, Organization ID |
| **Stripe** | dashboard.stripe.com/test/apikeys | Publishable Key, Secret Key, Webhook Secret, Price ID |

### 2. Get AI API Keys (Required for Task 31)
| Key | Where | Priority |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com | **REQUIRED** |
| `OPENAI_API_KEY` | platform.openai.com/api-keys | **REQUIRED** |

### 3. Copy `.env.example` → `.env.local` and Fill In
```bash
cp .env.example .env.local
# Edit .env.local with your credentials
```

---

## What I'm Starting Now

**Task 28**: `docker-compose.dev.yml` with:
- Postgres 17 + Apache AGE 1.6.0 + pgvector 0.8.2
- Valkey 9.0
- Redpanda (Kafka API)
- Temporal (Postgres backend)
- MinIO (S3-compatible, R2 simulation)
- ClickHouse
- OpenTelemetry Collector
- Grafana (Mimir/Loki/Tempo)
- Langfuse
- Health checks + init scripts

**Then Task 29**: Atlas migrations + RLS gates on local Postgres

**Then Task 30**: M3-VAL-01 — AtlasCycle + replay on local Temporal (THE BLOCKING GATE)

---

## Reference Files
- `.env.example` — All environment variables structure
- `docs/_RECOVERY.md` — Checkpoint tracker (source of truth)
- `docs/26_MVP_SCOPE.md` — Frozen MVP scope
- `adr/0007-launch-first-walking-skeleton.md` — Execution authorization
- `CLAUDE.md` — Operating manual (this repo's constitution)

---

## Success Criteria (MVP Live = All True)

- [ ] Stranger signs up → dashboard → opens PR in <10 min (no human)
- [ ] <90s fast probe activation (F2)
- [ ] Candor Report renders: lift+CI, trajectory, honesty, contrarian, provenance, dial
- [ ] Dial at `Co-pilot`, escalation grayed with ledger explainer
- [ ] Provenance Audit Hover shows dual-canonical proof
- [ ] Consent panel with granular revocation + audit trail
- [ ] All 4 closure gates pass (Security, AI, Production, Product)
- [ ] Concierge cohort (Gates C) documented with corpus rows + Candor Reports
- [ ] Production deploy on GKE HA with Argo CD
- [ ] Zero inflated metrics — candor floor preserved

---

*Plan saved to `docs/_EXECUTION_PLAN_MVP.md` for session continuity.*