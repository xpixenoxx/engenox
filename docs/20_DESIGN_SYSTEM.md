# 20 — Design System

> **Status: FROZEN.** The token + primitive + pattern layer under `19_UI_UX.md`: the design tokens (color, type, spacing, radius, motion, shadow) consumed by Tailwind v4 `@theme` (no magic numbers in components), the component library (Radix UI primitives, fully-customized, accessibility-owned), the typed component contract (Props + a11y guarantees encoded), the white-label theme-swap mechanism (a token swap, not a separate app), the Storybook + axe a11y addon as the living spec, and the Changeset-versioned publishing discipline. Authored against `10_FRONTEND_ARCHITECTURE.md` (the design-system-to-frontend contract), `19_UI_UX.md` (the honest-trustworthy aesthetic), and `_FOUNDATION_TECH.md` Layer 1. **No magic numbers; tokens only; WCAG 2.2 AA; the system is the source of truth — the app imports, never hand-rolls.**

---

## 1. The single rule

**A component in the app is built only by composing tokens + primitives from this system; any number that isn't a token is a discipline violation.** A `padding: 13px` in a component file is wrong — it's either `space-3` (12px) or it's a new token, decided once, documented. The result: a theme swap (white-label, Phase-2) is a token-file edit, not a codebase fork; an a11y fix is a primitive update, not a sweep; a redesign is a token revision, not a rewrite. The system is the moat against entropy.

This section defines the tokens, the primitives, the patterns, the white-label mechanism, and the publishing discipline.

---

## 2. The tokens (the no-magic-numbers contract)

### Color
The semantic — not the raw — palettes. Components consume `surface`, `surface-muted`, `text`, `text-muted`, `border`, `border-strong`, `brand`, `brand-muted`, `success`, `warning`, `critical`, `accent`. The raw color (`gray-900`, `blue-500`) is **never** used in a component — only the semantic token, so a theme swap or a dark mode re-maps the semantic → raw once, globally.

- **Light + dark themes** (the semantic tokens are re-mapped per theme; the dark map is not a separate palette but a re-mapping — the same `surface` token resolves differently in dark).
- **Contrast:** every `text`/`surface` pair is ≥ 4.5:1 body, ≥ 3:1 large — verified by the axe check (10 §9) + a CI contrast-lint on the token file.
- **Not-color-only encoding:** every status color (`success/warning/critical`) carries a redundant label in the primitive that consumes it (19 §10). The token is the affordance; the label is the truth.

### Type
- **Type scale** (modular, ratio-based): `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl` — each a token binding (size + line-height + tracking together, so a component gets the readable pairing by class, not three separate properties).
- **Type families:** a primary sans (a variable font for the UI; ⚠️-verify the 2026 choice — the Inter/Geist/IBM Plex class is the candidate; the call is performance + the metrics + the legibility at the dense table scale), a fixed-width for the audit provenance pointers (the trace IDs, the `event_id`s), and a numeric face that uses tabular figures for the tables + the charts (the lift numbers must not drift width as they update — `font-variant-numeric: tabular-nums`).
- **Reading measure:** the prose blocks (the candor explainer, the contrarian block) cap at `max-w-prose` (~65ch) for readability.

### Spacing
- **4px base scale** (`space-1` = 4, `space-2` = 8, `space-3` = 12, … `space-12` = 48, `space-16` = 64). No `13px`, no `margin: 5px 7px 5px 5px`. The dense table scale (the audit views, the corpus precedents small multiples) uses the same tokens at lower steps.

### Radius
- A small scale (`radius-sm`, `radius-md`, `radius-lg`, `radius-full`). The understated aesthetic (19 §2.4) leans to the smaller end; the candor chips and the trajectory chart corners stay tight.

### Motion
- A tokenized motion scale (`duration-fast` = 120ms, `duration-normal` = 200ms, `duration-slow` = 320ms; `ease-standard`, `ease-in`, `ease-out`). **No count-ups, no parallax, no celebratory animation on intervention success** (19 §2.4 + §10). Motion is for state transitions (a panel expanding, a chip resolving), not vanity.
- **Reduced-motion:** `prefers-reduced-motion: reduce` shortens the durations to ~0ms + collapses the transitions; the SSE-fill animations obey it.

### Shadow + elevation
- A small elevation scale (`shadow-sm`, `shadow-md`, `shadow-lg`); the aesthetic is **flat-leaning** — the audit hover lifts a `shadow-md`, the modal lifts a `shadow-lg`, the dashboard itself is largely border-delimited, not shadow-delimited. The understated aesthetic distrusts elevation.

### Z-index
- A tokenized z-scale (`z-base`, `z-sticky`, `z-dropdown`, `z-modal`, `z-tooltip`, `z-provenance-hover`). No magic `z-index: 9999`.

---

## 3. The primitives (Radix UI, accessibility-owned, fully custom-styled)

| Primitive | Radix base | Engenox layer | a11y guarantee |
|---|---|---|---|
| **Button** | — (custom) | variants: `primary` `secondary` `ghost` `danger`; sizes `sm` `md` `lg`; loading state with `aria-busy` | focus ring never suppressed; disabled is `aria-disabled` not just `disabled` for the dial-disabled-states |
| **Input** | — (custom on Radix's behaviors) | label + helper + error triad; the probe-`trace_id` shown in error | associated `aria-describedby` for helper + error |
| **Select** | Radix Select | the surface picker, the comparator filters | keyboard open/close, type-ahead, listbox semantics |
| **Dialog/Modal** | Radix Dialog | the dial-escalation explainer, the 1-click PR preview | focus trap, ESC-to-close, restore-focus on close |
| **Tooltip** | Radix Tooltip | the Provenance Audit Hover's primary affordance | keyboard-accessible (focus triggers), not pointer-only, contention with `aria-describedby` |
| **Popover** | Radix Popover | the audit hover's expanded view, the contrarian block's per-condition detail | same as Tooltip + the click-outside dismiss |
| **Tabs** | Radix Tabs | the Brand Card's per-entity editor's tabs; the report's section nav | roving tabindex, the active panel in the tab order |
| **Switch** | Radix Switch | the dry-run / commit toggle; the consent toggles | the label is the truth, the switch is the affordance; `aria-checked` |
| **Slider** | Radix Slider | the autonomy dial (4-position, snapped) | keyboard step (left/right maps Off→Co-pilot→…); the labels in `aria-valuetext` not just `aria-valuenow` |
| **Accordion** | Radix Accordion | the Honesty expandable, the contrarian block | the collapsed/expanded state in the tab order |
| **Toast** | Radix Toast (or `sonner`) | the demotion-on-alert notification, the foreign-change-quarantine | `role="status"`, auto-dismiss with a manual close |
| **Table** | custom on TanStack Table | the audit log, the corpus precedents, the corpus row browser | keyboard row navigation, sortable headers with `aria-sort` |
| **Chart** | a lightweight chart lib (visx/Recharts-class ⚠️-verify) + custom for the provenance graph (reactflow) | the lift trajectory, the small multiples, the provenance subgraph | keyboard-accessible + the screen-reader narrative (19 §10) |
| **Combobox** | Radix Combobox | the entity picker (existing KG nodes only — the verifier-grounded constraint, 11 §2c) | listbox semantics, the no-match state |
| **Link** | custom | every node pointer is a link; the audit hover is on it | the node pointer's `aria-label` carries the entity name |

### The typed Props contract
A primitive's `Props` are typed (`ComponentProps`, TS strict, 22). The a11y guarantees are **encoded in the primitive**, not punted to the caller — a `Button` cannot be used without an accessible label; a `Tooltip` cannot wrap a `div` without a `tabIndex`. The lint + the type system enforce the floor (the Biome rule + the TS type, 22 §).

---

## 4. The patterns (the composition layer)

The documented, named compositions the app reuses:

- **The Panel** — the outer container of every explanation panel (a header + a body + a footer-provenance-strip). Used by all six panels (19 §3).
- **The Provenance Strip** — the row beneath a claim showing the `event_id` + the model-id + the surface + the timestamp, the click-to-provenance affordance. Reused everywhere a claim renders (10 §6).
- **The Candor Stat** — the headline `(value, CI)` block: the point estimate prominent, the CI the secondary line, the canonical "the honest number with its uncertainty" rendering. Used for lift, for coverage, for every measured number.
- **The Integrity Chip** — the `id_strategy` / `foreign_change_status` chip (the labeled, colored-and-labeled redundant encoding, 19 §10). Label is the truth, color is the affordance.
- **The Dial Slider Card** — the four-label autonomy dial + the three-axis ledger explainer + the demotion-on-alert banner (19 §5).
- **The Diff Preview** — the JSON-LD / content-brief / redirect-map hunk with the allow-list scope + the blast-radius + the Critic's verdict (the per-PR-card view, 19 §6).
- **The Conflict Trio** — the `(Brand Card | Perceived | Conflict-type chip)` comparison (Panel 2 + 3 collapsed).
- **The Empty-States** — the typed candor empties (`VERIFIER_REJECT`, `DIAL_DENIED`, `PLAN_NOT_GUESS`, `FOREIGN_CHANGE_QUARANTINE`, no-priors) — the eight states from 19 §9 are patterns, each composed once and reused.

Every pattern lives in the design-system package with a Storybook story + axe-checked a11y state; the app imports the pattern, never reimplements it.

---

## 5. The white-label theme-swap mechanism (Phase-2 agency tier)

- **A theme is a token file** (`theme.ts`: `colors`, `radius`, `motion`, optionally a `fonts` override and a `logo` slot). The app resolves the theme per-tenant server-side (10 §7) — `app.tenant_id` → the tenant record's `theme_id` → the token file → injected as the Tailwind `@theme` CSS variables at SSR.
- **The frontend is brand-agnostic**: white-label = a theme token swap, not a separate app deploy. The agency-tier end-client sees the agency's brand tokens; the technical-buyer ICP sees Engenox's tokens; the underlying JSX is identical.
- **The non-negotiables are theme-proof**: the candor microcopy, the honesty-floor elements (the CI in the Candor Report), the WCAG 2.2 AA contrast, the autonomy-dial labels are **not theme-overridable** — an agency cannot theme-out the CI (10 §6 the honesty floor) or theme-in a vanity score (19 §2.4). The theme token set is a documented subset; the protected elements are out-of-bounds by construction (the token file type refuses overrides on them).
- **The agency tier's summarized-CI** (19 §4f) is a *density* override (the CI rendered smaller, summarized), not an *omission*; the type system distinguishes `CIPresentationMode.prominent | summarized | none` and the `none` branch is type-impossible at the Candor Report layer.

---

## 6. The iconography

- **A single iconset** (Lucide or a superset ⚠️-verify) — line-based, consistent stroke, consistent bounding box. No mixed icon families (no Heroicons in one modal and Feather in another).
- **Icons are decorative by default** (`aria-hidden="true"`); the label is the truth; where an icon conveys state alone (the alert severity, the dial level), it carries a `text-label` companion or an `aria-label`.
- **No emoji in production** (the candor aesthetic, 19 §2.4 — no 🎉 on success); the empty states use the candor prose + a flat-line illustration, not a confetti emoji.

---

## 7. The Storybook + the a11y addon (the living spec)

- **Every primitive + every pattern has a Storybook story** with its props + the states (default, hover, focus, active, disabled, error, loading, empty, dark-mode, reduced-motion). A component without a story is CI-blocked (23).
- **The a11y addon (axe)** runs axe on every story; an a11y violation is a CI failure.
- **The Storybook is the design-system's source of truth** for the design+eng collaboration — a designer reviews the stories; an engineer consumes the primitives; the visual review is on the stories, not the live app (which moves too fast to review).
- **Chromatic** (or Percy ⚠️-verify the 2026 visual-regression choice) for the visual regression — a PR that breaks a snapshot is caught before review.

---

## 8. The publishing discipline (Changesets, versioned)

- The design-system package is versioned with **Changesets** (the conventional-changelog + the per-release notes). A breaking-change to a primitive is a major bump; an additive change is a minor; a fix is a patch. The app pins the major; the upgrade is a deliberate PR, not a `latest` floating.
- **The contract:** a major-bump PR lists the migration notes (which components' `Props` changed; what the app must update). The CI gate asserts the app compiles against the new version before the bump merges.
- **The package never imports from the app** (the dependency direction: app → design-system, never the reverse). A `design-system`'s build is independent — it ships as a tarball that other apps (a future admin console, a marketing-site widget, a CLI's report viewer) could consume without the dashboard.

---

## 9. The token ↔ Tailwind v4 binding

- The token file is the source; Tailwind v4's `@theme` directive consumes it — the Tailwind utility classes (`bg-surface`, `text-text-muted`, `space-3`, `radius-md`) are generated from the tokens, not defined in the Tailwind config. A token change propagates to the utilities; a magic number cannot sneak in.
- **No inline `style={{ ... }}` for tokens** in the app (the lint rule, 22); the only inline-style exception is the chart positioning (which is dynamic by necessity, but uses the token's resolved value, not a hardcoded number).

---

## 10. The dark-mode + the print mode

- **Dark mode** is a token-file re-mapping (§2 color); the app supports `prefers-color-scheme: dark` + a manual toggle persisted per-session. The audit-trail-native presentation (the provenance pointers, the trace IDs) is legible in both.
- **Print mode** (the Candor Report PDF, the monthly email digest): a `@media print` stylesheet that drops the interactive affordances (the hover, the slider, the SSE-fill) and renders the report as a static document — the CI, the trajectory, the contrarian block, the provenance block. The Candor Report's print is **its own designed artifact** (the downloadable PDF, the email), not a screenshot of the dashboard.

---

## 11. The design-system invariants

1. **No magic numbers; tokens only.** Color (semantic, not raw), type (scale + tabular figures), spacing (4px base), radius, motion, shadow, z-index — all tokenized; a non-token value in a component is a discipline violation.
2. **WCAG 2.2 AA by construction** — contrast ≥ 4.5:1 / 3:1; not-color-only encoding; keyboard-accessible charts; screen-reader narratives; reduced-motion; the a11y addon CI-gates every story.
3. **Radix primitives, fully-customized, a11y-owned;** the a11y guarantee is encoded in the primitive, not punted to the caller.
4. **The patterns (Panel, Provenance Strip, Candor Stat, Integrity Chip, Dial Slider Card, Diff Preview, Conflict Trio, the Empty-States) are the named, reused compositions;** the app imports, never reimplements.
5. **White-label is a token swap, not a separate app;** the theme token set is a documented subset; the honesty-floor elements (the CI, the candor microcopy, the dial labels) are theme-unoverridable by construction.
6. **No count-ups, no parallax, no vanity animations, no emoji;** the understated aesthetic; the lift + the CI is the hero.
7. **Storybook is the living spec;** every primitive + pattern has a story + axe-checked; a component without a story is CI-blocked; visual regression via Chromatic/Percy.
8. **Changeset-versioned; app pins the major;** the design-system never imports from the app; the dependency direction is one-way.

---

*End of design system. Next: `21_DEVELOPMENT_GUIDELINES.md` — the developer workflow, the branch + PR + review conventions, the polyglot monorepo setup, the local-dev story with deterministic probe fixtures, the docs-as-source-of-truth until STOP CONDITION, and the founder-acts-as-team operating posture.*
