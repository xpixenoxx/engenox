# 18 — API Specification

> **Status: FROZEN.** The external + inter-service contract surface: the **GraphQL+BFF** at the Control Plane (the only frontend-facing API), the **REST** endpoints (the AI-referral pixel ingestion, the connector webhooks-in, the customer webhook-out delivery, the OAuth callbacks), the **graphql-ws/SSE** subscription contract for streaming (probe partials, the alert feed, the dry-run toggle), the **gRPC** typed internal calls, the Buf-generated client contract across the polyglot tiers, the auth envelope (edge-validated JWT + Cedar authz), and the typed error / idempotency / pagination model. Authored against `10_FRONTEND_ARCHITECTURE.md` (the data-fetching fanout), `09_BACKEND_ARCHITECTURE.md` (inter-service comms + the contract spine), `14_EVENT_ARCHITECTURE.md` (the SSE broker), and `_FOUNDATION_TECH.md` Layer 8. **Every type — across the GraphQL schema, the REST envelope, the gRPC service, the client SDK — is Buf-generated from one Protobuf/JSON-Schema source; no hand-written cross-language types survive a commit.**

---

## 1. The single rule

**The API is the typed contract; everything is generated from one schema source; the version is explicit; the auth + the idempotency + the error are part of the type.** A frontend developer never writes a fetch with a hand-typed body; they import the generated query/mutation, and the compiler refuses a non-conforming call. A service author never hand-writes a gRPC stub; they import the generated client. The contract spine (09 §4) on the wire is this document's runtime form.

This section defines the surface topology, the GraphQL schema shape, the REST endpoints, the streaming contract, and the cross-cutting model (auth, idempotency, pagination, errors).

---

## 2. The surface topology

| Surface | Consumers | Wire | Schema source | Rate-limit |
|---|---|---|---|---|
| **GraphQL+BFF** | Next.js frontend (RSC + TanStack Query) | HTTPS + graphql-ws | the GraphQL schema (built from the Buf entity/event types) | per-tenant, edge |
| **REST** | the customer's sites (the AI-referral pixel JS), the connectors (Ahrefs/Semrush/GSC/GA4/CDN/Git/CMS webhooks-in), the customer's webhook-receivers (webhook-out), the OAuth providers | HTTPS | the Buf event/entity envelope | per-tenant + per-route |
| **gRPC** (internal) | service-to-service (Control → Perception/Decision/Action/Measurement; ↔ LLM Gateway) | HTTP/2 | the Buf service definitions | per-call quota |
| **SSE / ws** (within GraphQL) | the frontend's subscriptions | HTTPS upgrade | the GraphQL subscription types | per-session |

**No GraphQL over the public internet for non-frontend consumers** — the connector webhooks-in are REST (the connectors send REST); the customer's webhook-out is REST; the AI-referral pixel is a REST POST. GraphQL is exclusively the dashboard's BFF (10 §3).

---

## 3. The GraphQL+BFF schema

The schema is built *from* the Buf entity types (the `AssertedNode`, `KnowledgeConflict`, `Intervention`, `ActionRecord`, `Outcome`, `BrandCard` shapes from 06) — not hand-written in parallel. The BFF resolvers fan out to internal gRPC + use dataloaders per-tenant (10 §3).

### Top-level Query roots
```
type Query {
  # the dashboard (04 §minute-by-minute)
  latestProbe(tenantId: ID!): ProbeResult!          # the verbatim + mentions + the conflict + the in-progress flag
  inFlightCycleStatus(tenantId: ID!): CycleStatus! # the current AtlasCycle step
  degradationAlertFeed(tenantId: ID!, after: Cursor): AlertConnection!

  # the brand card (the editable Brand-Truth SOT)
  brandCard(tenantId: ID!): BrandCard!

  # the candidate interventions (the Critic-vetoed survivors)
  interventions(tenantId: ID!, after: Cursor): InterventionConnection!
  intervention(tenantId: ID!, id: ID!): Intervention  # the six-panel explanation + dry-run + 1-click PR preview

  # the monthly candor report
  report(tenantId: ID!, month: YearMonth!): CandorReport!  # the lift + CI + coverage + contrarian + degradation timeline

  # the competitors
  competitors(tenantId: ID!): [Competitor!]!

  # the admin surface (Growth/Agency/Enterprise only, Cedar-gated)
  autonomyDial(tenantId: ID!, surface: Surface!): DialLedger!
  auditLog(tenantId: ID!, after: Cursor): AuditConnection!
}
```
- Every resolver runs **after** the edge auth (§6) sets `app.tenant_id`; the `tenantId` argument must match it (the resolver rejects a mismatch — a tenant cannot query another tenant's `latestProbe`).
- The `BrandCard` / `Intervention` / `CandorReport` types carry the **node pointers** (10 §2): every claim field is `(value, ProvenanceRef)`, the frontend renders the provenance hover from it.

### Top-level Mutations (Server Actions in the frontend, typed)
```
type Mutation {
  # onboarding (the 5-field flow, 04)
  startOnboarding(input: OnboardingInput!): OnboardingPayload!   # fires the fast-partial probe

  # brand-card edits (Brand-Truth SOT)
  updateBrandCard(input: UpdateBrandCardInput!, idempotencyKey: ID!): BrandCard!

  # the 1-click PR connector
  connectGitHub(input: ConnectGitHubInput!, idempotencyKey: ID!): ConnectGitHubPayload!
  requestInterventionPR(tenantId: ID!, interventionId: ID!, idempotencyKey: ID!): PRPayload!

  # consent + alert subscriptions + data-residency
  setConsent(input: ConsentInput!, idempotencyKey: ID!): ConsentState!
  subscribeAlerts(input: AlertSubscriptionInput!, idempotencyKey: ID!): AlertSubscription!

  # the autonomy-dial request (the ledger evaluates, 12 §5)
  requestDialEscalation(input: DialEscalationInput!, idempotencyKey: ID!): DialDecision!  # granted | denied | missing_axes
  humanApproveIntervention(tenantId: ID!, interventionId: ID!, idempotencyKey: ID!): ActionRecord!  # the Signal:HumanApproved, 12 §6
}
```
- **Every mutation carries an `idempotencyKey`** — the frontend generates one per user-action; the Control Plane deduplicates on `(tenant_id, mutation_name, idempotencyKey)`. A double-click or a retry does not double-act (the 09 §2 idempotency invariant on the surface).
- The `requestDialEscalation` returns a typed `DialDecision { granted, denied, missing_axes }` — the measurement from the ledger (12 §5), never a "the system will consider it."

### Subscriptions
```
type Subscription {
  probePartialUpdated(tenantId: ID!): ProbePartial!  # the <90s activation; partial=true until full result
  degradationAlertFired(tenantId: ID!): Alert!
  interventionStatusChanged(tenantId: ID!, interventionId: ID!): InterventionLifecycleEvent!  # PR-opened → merged → measuring → recorded
  cycleStepChanged(tenantId: ID!): CycleStatus!
}
```
- Over **graphql-ws** (the subscription transport); the Control Plane's SSE broker (14 §7) is the back-end; the back-pressure rule (one consumer group → per-session Valkey ring buffer, 14 §7) holds.

### Dataloader discipline (no N+1)
- A `tenantId` + a connection of `Intervention`s → the BFF batches the `brandCard` and `predicted_uplift` fetches via `DataLoader`; one gRPC fan-out, not N. The Vitest test-coverage of "every connection resolver uses a dataloader" is a CI gate (23 + 09 §4).

---

## 4. The REST endpoints

### (a) The AI-referral pixel ingestion
- `POST /v1/pixel/event` — the customer-site JS fires `{tenant_id, surface, query, position, ts, signature}` on an AI-visible referral event. The signature is the per-tenant pixel-secret HMAC (rotated quarterly, 15 §4).
- The pixel event is **not an assertion** (it's a precursor signal); it flows to the Perception layer as a typed `ReferralEvent`, becomes a `ProvenanceRef`, and (after multi-sample confidence) may graduate into a `SurfaceAssertion` via the Extract seam.
- **The pixel endpoint is unauthenticated** (runs on the customer's site visitor's browser) — but **rate-limited per-IP at the edge** (Cloudflare KV, 15 §7) + signature-verified; a tenant's pixel-secret is in the manifest, not in the client.

### (b) Webhook-out (the customer's receiver)
- `POST {tenant.webhook_url}` — signed, retryable, idempotent (14 §8): `Engenox-Signature: t=<ts>,v1=<sig>`, `Engenox-Delivery-Id: <uuid>`, body = the typed `WebhookOut` event.
- The receiver de-duplicates on `Engenox-Delivery-Id`; redelivery cannot double-act.

### (c) Connector webhooks-in
- `POST /v1/connectors/{connector}/webhook` — the connectors push us (Ahrefs/Semrush/GSC/GA4 alerts). The endpoint validates the connector's HMAC signature (per-connector secret in Vault, 15 §10); the typed adapter translates the connector payload into an `AssertionEvent` on the bus (14 §3). **The adapter is the type boundary** — a malformed connector payload is rejected, not propagated.

### (d) OAuth callbacks
- `GET /v1/oauth/github/callback` — the GitHub OAuth flow for the 1-click PR connector (10 §4); the install credential lands in Vault per-tenant (15 §5e).
- `GET /v1/oauth/workos/callback` — the WorkOS session callback (10 §7).

### (e) Health + readiness
- `GET /healthz`, `GET /readyz` — the standard liveness/readiness for the Argo CD probe (17 §3). `/readyz` returns false when the Cedar policy cache is cold, the gateway's downstream is down, or Postgres is unreachable (the closed loop is not "ready" until the symbolic spines are).

---

## 5. The gRPC internal surface (service-to-service)

- The Buf-service definitions generate Go + TS + Python stubs. The Control Plane → Perception/Decision/Action/Measurement calls are **typed gRPC** (09 §4); no ad-hoc HTTP between services.
- **Per-call quota + per-call timeout by service** — the Control Plane's call to Perception.ProbeTenant has a budget timeout; the call to Measurement.EstimateOutcome is async (a Temporal workflow trigger, not a sync gRPC). The sync calls are bounded.
- **gRPC reflection** is enabled in dev/stage for the BFF resolvers' local dev; disabled in prod (15 §10 — minimal attack surface).

---

## 6. The auth envelope

```
JWT (WorkOS-issued, validated at the Cloudflare edge):
{
  sub:    user_id,
  tid:    tenant_id,
  cid:    cell_id,           // the cell the tenant is assigned to (16 §2)
  role:   owner|admin|editor|viewer|auditor,
  tier:   starter|growth|agency|enterprise,
  scopes: [...],
  exp, iat, iss
}
```
- **Validated at the edge** (10 §7) — the truth-tx backend only ever sees a verified session. The backend re-derives `app.tenant_id` from `tid` in the backend session (never from a client-supplied field).
- **Cedar authz at the resolver level** — the GraphQL resolver + the REST handler invoke the Cedar gate (09 §6) for every action: `authorize(subject, action, resource)`. The gate's verdict is audit-logged (15 §9).
- **The PlanNotGuess envelope** (the budget-exhaustion fallback, 11 §2d): when a mutation requires an LLM call + the tenant's token budget is exhausted, the response is HTTP 429 with a structured `{error: "PLAN_NOT_GUESS", budget_reset_at, fallback_used: "symbolic_rules_only"}` — a typed error, not a black-box rate-limit.

---

## 7. The cross-cutting model (idempotency, pagination, errors)

### Idempotency
- Every mutation: `IdempotencyKey` (frontend-generated UUID per user action); the Control Plane deduplicates on `(tenant_id, mutation_name, idempotencyKey)` in a Valkey SET (TTL = 24h); the same key returns the same response payload.
- Every external-side-effect gRPC call (an Action.PR-open): carries the typed `IdempotencyKey` derived from `(tenant_id, cycle_id, intervention_id, activity_name)` (09 §2). The idempotency test is CI-blocked (17 §4).

### Pagination
- **Cursor-based**, typed `PageInfo { hasNextPage, endCursor }` on every connection. No offset pagination (the closed loop's data is append-mostly + bi-temporal; offset pages drift under concurrent inserts).
- The cursor is an opaque base64 of `(tx_time, event_id)` → stable under concurrent writes.

### Errors
- **Typed errors**, not strings. The error envelope:
  ```
  { code: ErrorCode, message: string, details: jsonb, trace_id: uuid }
  ErrorCode ∈ { UNAUTHENTICATED, UNAUTHORIZED, NOT_FOUND, VALIDATION_FAILED,
                 CONFLICT, PLAN_NOT_GUESS, VERIFIER_REJECT, DIAL_DENIED,
                 FOREIGN_CHANGE_QUARANTINE, RATE_LIMITED, INTERNAL }
  ```
- `VERIFIER_REJECT` — the LLM seam's output was ungrounded + the bounded retries exhausted (11 §2c); the caller degrades to the symbolic path. Surfaced as a typed error, not a 500.
- `DIAL_DENIED` — the Cedar gate's second pass rejected the plan (12 §3); the policy decision chain is in `details`.
- `FOREIGN_CHANGE_QUARANTINE` — the measurement window was contaminated (12 §8); the outcome is quarantined, not recorded as regret.
- `trace_id` links the error to the OTel/Langfuse trace (11 §2e) — an error is forensically click-to-trace.

---

## 8. Versioning + compatibility

- **URL scheme:** `/v1/...` for REST; the GraphQL schema follows the strict-add-only rule (09 §4 — only add optional fields/ types; never remove/rename). A breaking change is a major-version bump `/v2/`.
- **The Buf Schema Registry** gates the entity/event/service Protobuf compatibility (14 §5). The GraphQL schema is generated from the same; a breaking Protobuf change rejects the PR before the GraphQL schema even builds.
- **Deprecation discipline:** a deprecated field is marked `@deprecated(reason, sunset_date)`, retained for N cycles, removed at a documented major-version bump (per 02's transparency principle — announced to tenants 60 days prior).

---

## 9. The GraphQL sandbox

- **Disabled in prod** for non-admin tenants (15 §10 — minimal surface). Enabled in dev + stage; the `auditor` role gets a read-only introspection in prod (compliance access), no mutations.

---

## 10. The API invariants

1. **One schema source (Buf Protobuf/JSON-Schema) generates every client — TS (frontend + API), Go (workers), Python (ML); no hand-written cross-language types.**
2. **GraphQL+BFF is the only frontend-facing API;** connector webhooks-in / webhook-out / pixel / OAuth are REST; service-to-service is gRPC.
3. **Every mutation carries an `IdempotencyKey`; every external-side-effect call carries the typed `(tenant, cycle, intervention, activity)` key.**
4. **Auth at the edge (WorkOS JWT); `app.tenant_id` from the JWT, never client-supplied; Cedar authz at every resolver/handler; the verdict is audit-logged.**
5. **Cursor-based pagination typed; the cursor is `(tx_time, event_id)` — stable under concurrent writes.**
6. **Typed errors with `trace_id`;** `PLAN_NOT_GUESS` is the budget's structured 429; `VERIFIER_REJECT` / `DIAL_DENIED` / `FOREIGN_CHANGE_QUARANTINE` are typed, not black-box 500s.
7. **Strict add-only versioning;** a breaking change is a major-version bump with 60-day tenant notice.
8. **Datasloaders on every connection resolver; no N+1.** The "every resolver uses a dataloader" assertion is a CI test.
9. **The GraphQL sandbox is disabled in prod for non-admin;** the `auditor` role gets read-only introspection.

---

*End of API specification. Next: `19_UI_UX.md` — the design-system specifications, the Candor Report UX (the honesty-differentiator), the "hands-on-the-wheel" autonomy-dial UI, the six-panel explanation render, the <10-minute journey's interaction choreography, and the accessibility discipline.*
