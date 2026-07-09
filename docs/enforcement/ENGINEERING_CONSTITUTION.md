# Engineering Constitution

> **Status: FROZEN.** The 1-page constitution. It does NOT re-derive the architecture's rules — those live in the FROZEN blueprint. It **points to** them, and adds the single engineering-process rule that mirrors the product's own candor floor. Authored against `00_FOUNDATION_FINAL.md` §2 (the 8 cross-cutting invariants) + each blueprint doc's §N "non-negotiable invariants" section + `28_EXECUTION_STRATEGY.md` §8 (the execution invariants).

---

## The constitution is the union of the frozen invariants

The engineering constitution of this project **is** the set of invariants already frozen in the blueprint. They are not restated here — they are **linked**, and the link is the contract:

1. **The 8 cross-cutting architectural invariants** every engineer signs — `docs/00_FOUNDATION_FINAL.md` §2 (the contract spine; Postgres is the truth-tx tier; Temporal owns the closed loop; the event bus is the spine's tap, not the spine; the LLM is six bounded seams behind a custom gateway with mandatory constrained decoding + re-grounding; one cloud + edge partner; cost is a first-class architectural input; every commit-to-state is reproducible from a signed graph node).
2. **Each blueprint document's §N invariants** — `docs/01_*` through `docs/27_*` each closes with a "non-negotiable invariants" section. The constitution is their union. No invariant is added or weakened outside an ADR.
3. **The 7 readiness-score gates + the milestone sync-sequencing** — `docs/_ENGINEERING_READINESS_REPORT.md` §3 (Security + AI-Intelligence gates before the PR-touches-repo / customer-facing-lift moments; Scalability + Production-Readiness gates before public self-serve; dial escalation beyond `Co-pilot` is P2.1-gated).
4. **The execution invariants** — `docs/28_EXECUTION_STRATEGY.md` §8 (enforcement before product code; contract-codegen is the only cross-language type source; adversarial review tiered by blast radius; milestone gates not sprints; JIT ticketing with a ticket required for every Tier-1 PR; checkpoint discipline continues; a stack swap is an ADR not a silent edit; the first-hire timing is the founder's call; no autonomous coding agents for load-bearing work; the candor floor applies to the engineering process).

## The one process rule this constitution adds

**The engineering process models the product.** Engenox's commercial differentiator is *candor* — the CI is never omitted; the contrarian block renders; the dial denies an unearned escalation; the Provenance Audit Hover works (`26` §4). The engineering process must mirror this, or the candor will not be in the product:

- The weekly written review names what's blocked and what's slipping — no inflated status.
- The readiness scores were honestly rendered (three at 9.5, three at 9.0, one at 8.5) and not rounded up.
- The stack audit (`29_STACK_VERIFICATION.md`) names four swaps rather than papering them over.
- A gate that hasn't closed is reported as not-closed, with the closure list, not as "substantially done."
- A postmortem is blameless and is followed by a doc-update or an ADR — the failure is encoded so it cannot recur.

**Build the candor floor into the process, or it will not be in the product.**

## The non-negotiables

- A frozen document is never edited. A change is an ADR (`adr/NNNN-<slug>.md`) that *supercedes* the documented choice at implementation time, citing the evidence (`29_STACK_VERIFICATION.md`).
- No application code until the enforcement environment is complete (`_RECOVERY.md` E01–E16 ✅) and the M0 plan is written (E17 ✅). The single first M0 ticket (E18) is the only product code authorized before the environment is reviewed.
- The contract package `pkg/contracts/` is the only cross-language type source. No hand-written cross-language types. The dependency-direction lint is green before any service code.
- The candor floor is a gate, not a vibe: a lift number is never rendered without its CI; the contrarian block is never omitted; a client never supplies `tenant_id`; an LLM never holds a credential; an LLM never commits.
- The checkpoint discipline continues — write every artifact to disk immediately, mark it ✅ in `_RECOVERY.md`, resume from the first ⬜ on interruption.

---

*End of constitution. The rules live in the frozen docs; this file is the pointer + the one process rule. Next: the ADR system (`adr/README.md`).*
