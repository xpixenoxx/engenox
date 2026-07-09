# 10 — Frontend Architecture

> **Status: FROZEN.** The Next.js App Router frontend architecture: the streaming-RSC provenance-rendering pattern for the six explanation panels, the SSE/streaming contract with the Control Plane, the data-fetching layer (TanStack Query + RSC payloads + Server Actions), the design-system-to-frontend contract, edge auth, and the test strategy. Authored against `00_FOUNDATION_FINAL.md`, `04_PRODUCT_WEDGE.md` (the <10-minute journey), and `19_UI_UX.md` (forward-ref for the design system).

---

## 1. Stack and topology

- **Framework:** Next.js 15 App Router on React 19 (RSC, Server Actions, partial prerendering), TypeScript strict, Tailwind CSS v4 (Oxide engine), Radix UI primitives (accessibility-owned, fully-customized), TanStack Query (server-cache for the GraphQL+REST+SSE fanout), Zustand (small ephemeral client state: the autonomy-dial slider, in-flight probe previews).
- **Edge:** Cloudflare in front of the Next.js deploy; auth middleware runs at the edge (WorkOS session validation) so the truth-tx backend only ever sees authenticated traffic.
- **Hosting (production-tier): self-hosted on the GCP cluster** (Fly.io / GKE Autopilot) for the billing-sensitive production deploy; Vercel only for preview/PR deploys and pre-revenue. The app is Vercel-agnostic by construction (no Vercel-only APIs).
- **Single shared type package** with the backend via Buf codegen (the contract spine) — the `ActionRecord`, `KnowledgeConflict`, `Intervention` shapes are imported, never hand-written.

---

## 2. The core pattern: streaming-RSC provenance rendering

The defining Frontend problem: the six-panel explanation (per `05` §8) is a dense, provenance-grounded render — verbatim probe quotes + sample counts + binomial CIs + conflict types + corpus precedents + Critic's surviving objections + the contrarian block. This cannot be a client-side fetch-and-build; it would block the dashboard with megabytes of JSON and blow the JS budget. It must render server-side, streamed.

### Pattern
- **Each explanation panel is a Server Component** that receives a `provenance_subgraph_ref` and streams its render against the GraphQL endpoint.
- **`loading.tsx`/Suspense boundaries** per panel — the page's headline panels (what-we-perceived, what-brand-truth-says, the conflict) render first; the deeper panels (corpus precedents, the contrarian block) stream in.
- **The prose-rendering Draft seam is invisible to the frontend.** The backend's constrained-Draft + verifier produces a string whose every claim has a KG node pointer; the frontend renders the prose *with interactive pointers* — clicking a claim shows its provenance subgraph inline (the audit hover).
- **No client-side claim fabrication.** The frontend renders only what the backend's verifier-grounded output contains; a TM claim with no node pointer is impossible to display (the type enforces it).

### SSR vs RSC discipline
- **Server Components:** the explanation panels, the Brand Card (loaded server-side from the typed entity graph), the monthly Candor Report, the degradation-alert feed, the competitor trajectory charts.
- **`"use client"` islands:** the autonomy-dial slider (Zustand + Cedar-gated), the in-flight probe preview (SSE-streamed, optimistic), the Brand Card editor (forms + optimistic updates via Server Actions), the chartinteractions (the lift-trajectory zoom), the 1-click PR connector (the GitHub OAuth redirect flow).
- **Streaming:** `loading.tsx` for first paint; `next/dynamic` for the lazy-loaded chart libs (reactflow for the provenance graph, a lightweight chart lib for the lift trajectories); Suspense for the streamed panels.

---

## 3. Data-fetching layers (the GraphQL+REST+SSE fanout)

| Layer | Pattern | Use |
|---|---|---|
| **RSC payload** | Server Components fetch against the GraphQL Control Plane during render; the response is the RSC payload streamed to the client | The explanation panels, the Brand Card, the monthly report |
| **TanStack Query** | Client-side queries for the dashboard's interactive surfaces (mutation/optimism, invalidation on probe-complete) | The probe-status indicators, the competitor list, the alert feed (with SSE-driven invalidation) |
| **Server Actions** | The Brand Card editor, the 1-click PR connector, the consent toggles | Mutations with optimistic UI + form-progressive-enhancement |
| **SSE** | Streaming partial probe results, the dry-run toggle of an explanation, the degradation-alert feed | The "feels responsive while the loop closes" UX |
| **Webhooks-out** (config-side) | Signed webhooks for Slack/email digests (configured in the UI; delivered by the backend) | The alert subscription |

### The GraphQL+BFF shape
- A single GraphQL endpoint on the Control Plane (Hono) acting as a BFF for the dashboard.
- Stitched/typed-resolvers pattern; **no N+1** — the BFF fans out to internal gRPC and uses dataloaders per-tenant.
- Subscriptions over `graphql-ws` for the SSE-equivalent of the alert feed and probe-complete events.

---

## 4. The <10-minute journey mapped to Frontend routes

- `/onboarding` — the 5-field flow; fires the fast-partial-probe immediately; optimistic partial-render; redirects to `/dashboard` on completion.
- `/dashboard` — the live state: the latest probe (verbatim + mentions + competitors + the conflict feed), the in-flight cycle status, the degradation-alert feed.
- `/brand-card` — the editable Brand Truth source-of-truth; the server-side loaded typed entity editor.
- `/interventions` — the candidate interventions list (Critic-vetoed survivors), each with the six-panel explanation + the dry-run toggle + the 1-click PR preview + the connect-GitHub flow.
- `/report` — the monthly Candor Report (the lift trajectory + the CI + the coverage diagnostic + the contrarian block + degradation timeline).
- `/competitors` — the 3 tracked competitors with their mention trajectory vs the brand.
- `/settings` — the AI-referral pixel install snippet, the alert subscriptions (Slack/email), the consent toggles, the per-tenant data-residency/retention overrides.
- `/admin` (Growth/Agency/Enterprise tiers) — the autonomy-dial UI ("hands-on-the-wheel": Off/Co-pilot/Auto-pilot with review/Full auto-pilot), the API keys, the webhooks configuration.

### Activation moment
The fast-partial-probe renders <90s (F2 from `04`). The dashboard's SSR path shows a *preliminary* result (1 surface, 1 sample, the brand's mention status vs the first competitor) immediately; the full multi-sample probe streams in over SSE and the dashboard fills. Activation metric: surfaced results <90s.

---

## 5. The autonomy-dial UI ("hands-on-the-wheel")

Product critique #4 is binding: the seven-level autonomy dial is engineer-speak; buyers think "do I trust this enough to let it touch my website." The frontend maps it to a 4-tier human metaphor:

| Internal dial level | Frontend label | UI affordance |
|---|---|---|
| read | Off | "Tell me what's wrong — don't change anything" |
| recommend / draft | Co-pilot | "Suggest fixes; I'll review and ship them myself" |
| propose | **Co-pilot** (default for MVP) ↑ | "Open a PR for me to merge" |
| execute-with-approval | Auto-pilot with review | "Open and assign PRs to me; I approve merges" |
| guarded / autonomous | Full auto-pilot | "Land changes within my blast-radius cap; alert me on regret" — gated behind an explicit, calibrated, opt-in flow |

- **Default for MVP:** `Co-pilot` (=`propose` — the PR-for-you-to-merge level). No tenant starts above this; the growth above is *earned* and *opt-in*, never default.
- The dial UI is a single slider with these four labels; the underlying seven-level mapping is internal. Demotion-on-alert is visible (a small "auto-rolled back to Co-pilot after 2 alerts" notification).

---

## 6. The honesty-differentiator UI (the Candor Report)

The Candor Report is the commercial embodiment of the honesty philosophy (Product critique #2 — the CI is intellectually right and commercially terrifying). The Frontend renders it as:

- **Headline number:** the point-estimate lift (`+6%`). This is what the dashboard tile shows.
- **The trajectory chart:** the actual vs synthetic-control counterfactual; the area between is the lift; the CI bands as shaded regions; degradation alerts as vertical lines.
- **The "Honesty" expandable:** the CI (`90% CI [+1%, +11%]`), the coverage diagnostic of past intervals (`8 of last 10 intervals contained the realized lift`), and a one-paragraph "what this means" explainer framed as a *feature* ("we tell you exactly how much we don't know — unlike anyone else").
- **The contrarian block:** the conditions under which the forecast flips (SCM logic, not prose), collapsible.
- **The reviewer bias:** for technical buyers (the MVP ICP), the CI is prominent; for the agency's white-label end-client report (Phase-2), it's summarized — but *never omitted*. The CI omission is what differentiates us from the overconfident competitors; we never commit it.

### The Provenance Audit Hover
Every claim in the report is rendered with a node pointer; hovering/clicking reveals the underlying `AnswerEvent`, the `SourceDoc`, the citation, the sample count. The audit-trail-as-UI is the trust-differentiator: a customer can see *exactly* which probe sample produced each number, on which surface, at which model-id.

---

## 7. Edge auth + session

- **Cloudflare Worker middleware** validates the WorkOS session JWT at the edge; the truth-tx backend only sees authenticated traffic.
- **`app.tenant_id`** is set in the backend session from the JWT claim — never trust a client-supplied `tenant_id`.
- **Per-tenant theme/branding** (Phase-2 agency tier) is resolved server-side from the tenant record; the frontend is brand-agnostic (white-label = a theme token swap, not a separate app).

---

## 8. The design-system-to-frontend contract

- **Tokens** (color, type, spacing, radius, motion) defined in `20_DESIGN_SYSTEM.md`; consumed by Tailwind via the `@theme` directive (Tailwind v4); no magic numbers in components.
- **Components** are Radix primitives + custom styles; the design-system package exports them; the frontend imports; versioned with Changesets.
- **Accessibility WCAG 2.2 AA** is non-negotiable (Radix gives keyboard/focus/ARIA for free); the candor report's chart interactions are keyboard-accessible (the lift-trajectory zoom is operable without a pointer).
- **The "honest-trustworthy" aesthetic:** consciously understated (no gratuitous animations, no vanity scores, no "67/100"-style gamification); the lift number + the CI is the hero; everything else supports it. The critique of "design edge = clarity and trust, not animations" is the design brief.

---

## 9. Testing (frontend)

- **Vitest** for unit (the design-system components, the typed-resolver fanout, the optimistic-update logic).
- **Playwright** for e2e (the <10-minute journey, the 1-click PR flow, the candor report render).
- **Storybook** for the design-system (every component with its props + a11y addon).
- **RSC streaming tests** (a custom harness asserting the panel render-order + the loading states).
- **A11y tests** (axe integrated into Playwright + Storybook).

---

## 10. The non-negotiable invariants (the frontend layer)

1. **The six explanation panels are Server Components rendering grounded back-end output.** No client-side claim fabrication; the type enforces pointer-bearing claims.
2. **`app.tenant_id` from the JWT, never client-supplied.**
3. **The CI is never omitted from the Candor Report.** It may be summarized for the agency end-client, never removed. This is the honesty floor.
4. **The autonomy dial defaults to Co-pilot (`propose`); escalation is opt-in + earned + visible; demotion-on-alert is shown.**
5. **The Provenance Audit Hover is the trust affordance.** Every claim is click-to-provenance.
6. **No magic numbers; design tokens only; WCAG 2.2 AA.**
7. **Vercel-agnostic by construction; production self-hosted on GCP.**

---

*End of frontend architecture. Next: `11_AI_ARCHITECTURE.md` — the AI runtime, the custom thin LLM gateway, the constrained-decoding contracts, the cross-family Critic, and the warm-canary symbolic fallback.*
