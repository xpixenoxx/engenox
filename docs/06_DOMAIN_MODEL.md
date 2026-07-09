# 06 — Domain Model

> **Status: FROZEN.** The typed domain model Engenox reasons over — entities, facts, relationships, conflicts, interventions, outcomes, the ontology — that the bi-temporal knowledge graph enforces via SHACL/OWL shapes. This is the **truth spine's vocabulary**: every Perception assertion, every Brand-Truth fact, every `KnowledgeConflict`, every `ActionRecord`, and every tagged `Outcome` is an instance of the types defined here. No module may write an untyped assertion. Authored against `00_FOUNDATION_INTELLIGENCE_CORE.md` and `09_BACKEND_ARCHITECTURE.md` (forward-ref).

---

## 1. Modeling principles

1. **Everything is a typed, bi-temporal assertion.** Every node carries `valid_time` (when it was true in the world) and `tx_time` (when Engenox asserted it). Assertions are append-only via supersession; corrections are new assertions, never overwrites. Corrected facts leave **anti-facts** (assertions that explicitly negate a prior assertion) so dead facts are never re-asserted (ghost-busting).
2. **Provenance runs to a re-derivable tree.** Every assertion carries a `provenance` pointer: which `AnswerEvent` it was Extracted from, which `SourceDoc` that answer cited, which `Probe` produced the answer, at which model-id and timestamp. The truth spine can be audited from "what does ChatGPT say about {Brand} right now" back to the verbatim answer sample that produced each fact.
3. **Tenant isolation at the type level.** Every entity carries `tenant_id`; the SHACL shapes are tenant-instantiable (a per-tenant vocabulary subset) so a tenant's industry-specific entities don't pollute another tenant's namespace. RLS enforces isolation at the storage layer (see `08_DATABASE_ARCHITECTURE.md`).
4. **Conflicts are first-class entities, not exceptions.** When Perception disagrees with Brand-Truth, the disagreement is a `KnowledgeConflict` node — typed, queryable, and the trigger for the Decision layer's abductive reasoning.
5. **Interventions and Outcomes are paired, integrity-tagged.** The corpus's load-bearing type is the `(Intervention, Context, Outcome, Counterfactual, ID-strategy, foreign-change-status, consent)` tuple. These tags gate the causal estimator.

---

## 2. The entity taxonomy (top-level)

The ontology distinguishes **brand-owned entities** (the Brand-Truth SOT), **AI-surface entities** (what the surfaces believe), and **intervention/outcome entities** (the action spine's vocabulary). All inherit from the abstract `AssertedNode`.

### 2.1 Brand-Truth entities (the brand-authored source of truth)

```
AssertedNode (abstract)
  ├─ id: UUID (deterministic: hash(tenant_id, type, natural_keys))
  ├─ tenant_id: UUID (RLS key)
  ├─ entity_type: Enum
  ├─ valid_time: Interval
  ├─ tx_time: Interval
  ├─ provenance: ProvenanceRef
  ├─ confidence: Distribution (where measurable)
  └─ superseded_by: UUID? (the supersession pointer)

Organization
  ├─ legal_name, alternate_names[], parent_org_id?
  ├─ category: IndustryCategory
  ├─ founded_date, founders[]
  ├─ hq_location: PostalAddress
  ├─ differentiators[]: Claim
  └─ voice_profile: VoiceProfileRef

Product
  ├─ name, sku?, parent_org_id
  ├─ category: ProductCategory
  ├─ icp: ICPStatement
  ├─ features[]: FeatureClaim
  ├─ pricing?: PricingClaim
  └─ docs_url?, changelog_url?

Person (founder / spokesperson / author)
  ├─ name, role_at: Organization
  ├─ affiliated_orgs[]
  └─ authoritative_for[]: Topic

Claim (an atomic, citable brand assertion)
  ├─ subject_id: NodeRef
  ├─ predicate: Predicate (e.g., "is_a", "competes_with", "differentiates_by")
  ├─ object: Literal | NodeRef
  └─ evidence: SourceRef[]  (the URLs/docs the brand cites for this claim)

Topic (the category/keyword the brand wants to own in AI answers)
  ├─ name, parent_topic?
  ├─ buyer_queries[]: BuyerQuery
  └─ competing_brands[]: CompetitorRef
```

**Why these and not more:** the MVP wedge needs the brand to declare *who they are, what they sell, who it's for, what makes them different, and which queries they want to win*. Each declared field maps to either an Organization/Product schema.org type (for the JSON-LD PR) or a content brief seed (for content-only gaps). The taxonomy deliberately stops here at MVP — the formalization ceiling (Open Q #6) means broadening the ontology is a metered, post-traction activity.

### 2.2 AI-surface entities (what the surfaces believe)

These mirror the brand-truth entities but record *what the AI surfaces say*, with multi-sample distributions rather than declared truth.

```
AnswerEvent (the atomic probe sample)
  ├─ id: UUID (deterministic: hash(tenant, probe_id, query, sample_idx, surface))
  ├─ tenant_id, probe_id
  ├─ surface: Surface (ChatGPT | Perplexity | Gemini | Grok | Claude)
  ├─ query: BuyerQuery
  ├─ model_id: String (e.g., "gpt-5", "claude-opus-4-8")
  ├─ sample_idx: Int (1..N)
  ├─ verbatim_answer: TextRef  (→ R2 Object-Lock, immutable)
  ├─ cited_sources[]: SourceDoc
  ├─ mentions[]: MentionRef  (which entities appear, with span offsets)
  ├─ rankedAt: Int?  (position if surfaced as a list)
  └─ captured_at: Timestamp

MentionRef
  ├─ entity_id: NodeRef (resolved to brand or competitor entity)
  ├─ surface: Surface
  ├─ stance: Enum (positive | neutral | negative | misrepresented | omitted)
  └─ span: (start, end) into verbatim_answer

SurfaceAssertion (the aggregated, multi-sample belief of a surface about an entity on a query, on a week)
  ├─ entity_id, surface, query
  ├─ mention_prob: Distribution (binomial over N samples)
  ├─ avg_rank: Distribution
  ├─ stance_distribution: Multinomial
  └─ valid_time: week_interval  (aggregated at week granularity)

Competitor
  ├─ id, tenant_id (the tenant tracking this competitor)
  ├─ resolved_entity_id: NodeRef (cross-tenant where the competitor is itself an Engenox customer; else a tenant-private entity)
  ├─ tracked_competitiveness: SurfaceAssertion[] (their mention trajectory)
  └─ is_customer: Boolean (the competitor is itself an Engenox tenant — informs the donor pool)
```

### 2.3 Conflict types (the trigger for reasoning)

When `SurfaceAssertion` disagrees with the brand-truth entity, the Reconciler emits a `KnowledgeConflict`:

```
KnowledgeConflict (abstract)
  ├─ id, tenant_id
  ├─ brand_truth_node: NodeRef  (what the SOT says)
  ├─ surface_assertion_id: NodeRef  (what the surface says)
  ├─ conflict_type: Enum
  ├─ detected_at, valid_time
  └─ severity: Float (how customer-visible / how much lift-blocking)

ConflictType (enum, the taxonomy the Adjudicate seam picks among)
  ├─ Stale              (surface asserts a prior version of a fact — reindexation lag)
  ├─ Wrong              (surface asserts a fact contradicted by brand-truth)
  ├─ Missing            (surface omits the brand entity entirely on a relevant query)
  ├─ Ambiguous          (surface mentions the brand but with wrong category/attribution)
  └─ CompetitorDistortion (surface attributes brand's trait/position to a competitor)
```

The `ConflictType` enum is the **constrained choice vocabulary** the Adjudicate LLM seam operates over — it picks among the classes the symbolic Reconciler already enumerated, never free-generating a class.

### 2.4 Intervention & Outcome entities (the action spine's vocabulary)

```
Intervention (a typed action taken in the customer's infra)
  ├─ id, tenant_id
  ├─ intervention_type: Enum (AddSchemaElement | AddContentBrief | FixBrandCardField | ClaimRestoration)
  ├─ target_entity_id: NodeRef  (which brand entity the intervention concerns)
  ├─ target_surface: Surface?  (intended to lift on which surface; null = all)
  ├─ target_query: BuyerQuery?  (intended to win which query)
  ├─ params: InterventionParams  (schema field, brief text, brand card field, claim text)
  ├─ predicted_uplift: LiftDistribution  (E[Y|do(I)|context] + conformal CI + realization_date)
  ├─ side_effects: SideEffectVector  (penalty risk, cannibalization, dupcontent, voice drift)
  ├─ feature_embedding: Vector  (the intervention feature space — the standardization asset)
  ├─ idempotency_key: String (deterministic hash — the Temporal key)
  └─ status: ActionRecord.status  (see below)

ActionRecord (the commitment — typed, signed, auditable)
  ├─ id, tenant_id
  ├─ intervention_id
  ├─ blast_radius: BlastRadius (computed symbolically)
  ├─ reversibility: Enum (git-revert | content-edit | schema-edit)
  ├─ autonomy_level: Enum (read | recommend | draft | propose | execute-with-approval | guarded | autonomous)
  ├─ approval_required: Boolean
  ├─ derivation_subgraph: SubgraphRef  (the provenance fanout)
  ├─ approved_by: UserId? (the human if execute-with-approval)
  ├─ signed_manifest: ManifestRef  (who/what/why/expected-uplift/CI/rollback-hash — WORM-archived)
  ├─ pr_url: String?  (the PR in the customer's repo)
  └─ status: Enum (candidate → scored → proposed → approved → executed → merged → measurement-window-open → measured → counterfactual-estimated → recorded)

Outcome (the measured result of an intervention)
  ├─ id, tenant_id
  ├─ intervention_id (the causal pairing)
  ├─ measurement_window: Interval  (the lagged window, days-weeks)
  ├─ measured_metrics: SurfaceAssertion[]  (post-intervention perception)
  ├─ counterfactual_estimate: SyntheticControl  (the donor-basket trajectory)
  ├─ realized_lift: LiftDistribution  (the area between actual and synthetic, bootstrap CIs)
  ├─ identification_strategy: Enum (rct-eligible | quasi-experimental | observational)
  ├─ foreign_change_status: Enum (clean | suspected-bump | confirmed-bump | period-invalid)
  ├─ confounders_seen: Confounder[]
  └─ consent_flag: Boolean  (panel/tenant consented to this row entering the corpus)
```

**The integrity tags** (`identification_strategy`, `foreign_change_status`) are the load-bearing addition that gates how hard the row pulls the causal estimator — they are not optional metadata; they are the corpus's causal honesty.

### 2.5 Provenance & identity

```
ProvenanceRef (every assertion's audit pointer)
  ├─ source_type: Enum (probe-sample | brand-card-edit | connector | human-review | federated)
  ├─ source_id: NodeRef  (e.g., the AnswerEvent.id for a perception assertion)
  ├─ extracted_by: String  (the Extract seam's model-id + prompt-version)
  ├─ reverified_by: String  (the verifier's model-id + version, if re-grounded)
  └─ signed_at: Timestamp  (the corpus row's signature)

SourceDoc (a cited URL or document)
  ├─ id, url, fetched_at, content_hash  (→ R2 Object-Lock snapshot)
  ├─ authority_tier: Enum (high-authority-cited | mid | low | untrusted)
  └─ belongs_to_competitor? : Boolean

BuyerQuery (the query the brand wants to win)
  ├─ id, tenant_id
  ├─ query_text
  ├─ intent: Enum (commercial | informational | navigational | transactional)
  ├─ target_entity_id: NodeRef  (which brand entity should surface)
  └─ target_surface[]: Surface
```

---

## 3. The relationships (edge types)

```
(entity)-[:ASSERTS_FACT {valid_time, tx_time, provenance, confidence}]->(fact)
(entity)-[:MENTIONED_IN {stance, span, sample_idx, surface}]->(answer_event)
(answer_event)-[:CITES]->(source_doc)
(surface_assertion)-[:CONFLICTS_WITH {conflict_type, severity}]->(brand_truth_node)
(intervention)-[:TARGETS {surface, query}]->(entity | buyer_query)
(intervention)-[:PREDICTED_TO_LIFT]->(lift_distribution)
(intervention)-[:PRODUCED]->(outcome)
(outcome)-[:PAIRED_WITH]->(intervention)  (the causal pairing)
(competitor)-[:COMPETES_WITH]->(brand)
(person)-[:AUTHORITATIVE_FOR]->(topic)
(organization)-[:OWNS]->(product)
(organization)-[:DIFFERENTIATES_BY]->(claim)
(claim)-[:EVIDENCED_BY]->(source_doc)
```

Every edge is an `AssertedNode` (bi-temporal, provenance-bearing, tenant-scoped). The graph store (Apache AGE operational → FalkorDB analytical) materializes these edges from the typed assertions.

---

## 4. The SHACL/OWL ontology discipline

- **SHACL shapes** validate every assertion against the tenant's vocabulary: the Extract seam's constrained-decoding can emit only terms drawn from these shapes (so the LLM literally cannot produce an undefined entity type or relationship). The symbolic verifier re-checks SHACL conformance on every commit.
- **OWL** provides the light semantics (subclassing: `Organization ⊑ AssertedNode`; disjointness: `Intervention` and `Outcome` are disjoint from brand-truth entities).
- **Datalog/SHACL rules engine** carries derived inferences: `CompetitorDistortion` is inferred when a `Claim`'s `predicate` and `object` appear in a `MentionRef` of a competitor; `Stale` is inferred when `surface_assertion.valid_time` overlaps a supersession of the brand-truth node.
- **Versioning**: shapes are versioned in the Buf contract package with strict add-only compatibility — adding an optional field or a new enum value is allowed; removing/renaming/changing semantics is a major version bump that triggers an assertion-migration.

---

## 5. The closed-loop domain traversal (one cycle, end to end)

```
1. Probe fires → AnswerEvent (verbatim + mentions + citations) [Perception]
2. Extract → typed Assertions on brand/competitor entities [LLM seam #1, constrained]
3. Aggregation → SurfaceAssertion (multi-sample distribution) [deterministic]
4. Reconcile → KnowledgeConflict nodes where SurfaceAssertion ≠ Brand-Truth [deterministic + LLM seam #3 Adjudicate]
5. Abduce → candidate hypotheses ("why is this conflict here") [LLM seam #5]
6. Generate → candidate Interventions [LLM seam #2 Draft, constrained]
7. Critic veto → reject weak/counterfactual-bad candidates [LLM seam #6, cross-family]
8. Symbolic verify → re-ground each candidate's facts against the KG [deterministic]
9. Causal score → predicted_uplift + CI + side_effects + realization_date [action spine]
10. Policy gate → blast-radius + autonomy-dial mapping [Cedar, deterministic]
11. Action → ActionRecord → PR into customer's repo [execute]
12. Customer merges → status=merged [human]
13. Measurement window opens → next-cycle Probe [Temporal, weeks later]
14. Outcome measured → realized_lift + counterfactual_estimate [action spine]
15. Integrity tag → identification_strategy + foreign_change_status [deterministic flagging]
16. Append to Corpus → refit causal scorer [federated, weekly]
```

Every step is a typed assertion write; every write is bi-temporal and provenance-bearing; nothing crosses a spine without re-grounding.

---

## 6. The MVP subset vs the OS superset

The MVP ships a *subset* of this domain model — enough to close the loop end-to-end on the wedge:
- **MVP entities:** `Organization`, `Product`, `Claim`, `Topic`, `BuyerQuery`, `AnswerEvent`, `MentionRef`, `SurfaceAssertion`, `Competitor`, `KnowledgeConflict` (all 5 types), `Intervention` (AddSchemaElement + AddContentBrief + FixBrandCardField only), `ActionRecord` (status, signed_manifest, pr_url), `Outcome` (measured + counterfactual_estimate + integrity tags).
- **MVP deferred:** `Person` authoritativeness (used for thought-leadership content briefs later), `ClaimRestoration` interventions (competitor-distortion fixes — Horizon 2), the Ecosystem-layer plugin candidate-fact types, the published-Index aggregate types.
- **OS superset:** the marketplace plugin candidate-fact pipeline, the AI Visibility Index publication types, the cross-surface coordinate-graph unification — added in Horizon 2–3 as the wedge deepens.

---

## 7. The non-negotiable invariants (the domain layer)

1. **No untyped assertions.** Every write is an instance of a SHACL shape; the Extract seam can emit only shape-valid terms.
2. **Bi-temporality is mandatory.** `valid_time` and `tx_time` on every assertion; `superseded_by` for corrections; anti-facts for revoked assertions.
3. **Provenance to a re-derivable tree.** Every assertion points back to its `AnswerEvent` / `SourceDoc` / probe / model-id.
4. **Conflicts are first-class.** No silent disagreement — every Perception-vs-Truth divergence materializes as a `KnowledgeConflict`.
5. **Interventions and outcomes are paired and integrity-tagged.** No outcome without an intervention; no intervention added to the corpus without both integrity tags.
6. **Tenant isolation at the type level.** `tenant_id` on every node; SHACL vocabulary is tenant-instantiable.
7. **Versioning is add-only-compatible.** The ontology evolves without breaking historical replay.

---

*End of domain model. Next: `07_KNOWLEDGE_GRAPH.md` — the graph-store architecture (operational AGE + analytical FalkorDB), the bi-temporal storage mechanics, community-summarized GraphRAG, and the supersession/anti-fact memory model.*
