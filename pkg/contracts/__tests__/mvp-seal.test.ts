// mvp-seal.test.ts - the A0 MVP-payload acceptance seal (07 §3 the thin column).
//
// The T02 round-trip test proved the AbstractSpine (AssertedNode + AssertionEvent +
// PerceptionService.Assert). A0 adds the MVP entity vocabulary that carries the
// candor-critical invariants: LiftDistribution (lift ALWAYS carries its CI - the honesty
// floor, 06 §2.4); InterventionParams (the Draft seam's schema.org JSON-LD artifact, 06
// §2.4); KnowledgeConflict + ConflictType (the Adjudicate seam's constrained-choice
// vocabulary, 06 §2.3); Outcome.integrity (the integrity-tag-on-the-row, 06 §2.4 +
// ADR-0008); the cross-family Critic shape (Critic family != Planner family, 11 §4); and
// the GatewayService descriptor - the six bounded seams as stateless schema-constrained
// RPCs (11 §3, gateway-leaf-only per ADR-0007 invariants 4/5).
//
// Each case is a failing-mode test: if a candor field (the CI, the integrity tag, the
// cross-family carrier, the oneof artifact) ever drops off the wire, the assertion fails.
// These are the honesty-floor fields CLAUDE.md §8 names as watchdog hits - so their
// round-trip survival is the contract's enforcement of the candor floor, not optional
// coverage. The GatewayService descriptor case asserts the six-seam surface the
// control-plane composes the AtlasCycle through (24 §4 - never a direct internal-package
// import to services/gateway/, enforced by the dependency-direction lint T03).
//
// Cites: 06 §2.3 (ConflictType) + §2.4 (Intervention/Outcome/LiftDistribution/IntegrityTags);
//        11 §3 (the six seams) + §4 (the cross-family Critic); 14 §3 (the wire envelope the
//        re-grounded seam output rides); 19 §3 Panels 1/3/5/6 (the candor renderings);
//        ADR-0007 invariants 4/5 (gateway-leaf-only) + ADR-0008 (the integrity-vocab
//        relocation); CLAUDE.md §8 (the watchdog hits); T02 (the round-trip pattern).

import { describe, expect, it } from "vitest";
import { create, fromBinary, toBinary } from "@bufbuild/protobuf";
// The MVP entity vocabulary (06 §2) - the four entity sub-packages A0 added.
import {
  InterventionSchema,
  InterventionParamsSchema,
  InterventionType,
  LiftDistributionSchema,
  OutcomeSchema,
} from "../generated/ts/engenox/entity/v1/intervention_pb.js";
import { KnowledgeConflictSchema, ConflictType } from "../generated/ts/engenox/entity/v1/conflict_pb.js";
import { AnswerEventSchema, Surface } from "../generated/ts/engenox/entity/v1/surface_pb.js";
// The integrity-tag vocabulary - relocated to entity.v1 at A0 (ADR-0008): the
// entity/outcome canonical home (06 §2.4); event -> entity stays the single direction.
import {
  ForeignChangeStatus,
  IdentificationStrategy,
  IntegrityTagsSchema,
} from "../generated/ts/engenox/entity/v1/integrity_pb.js";
// The six bounded seams (11 §3) - gateway-leaf-only (ADR-0007 invariants 4/5).
import {
  CritiqueRequestSchema,
  CritiqueResponseSchema,
  CriticVerdict,
  ExtractRequestSchema,
  GatewayService,
  ModelFamily,
} from "../generated/ts/engenox/service/v1/gateway_pb.js";

describe("MVP entity payloads + the GatewayService seam surface (A0)", () => {
  it("GatewayService exposes the six bounded seams, all unary (11 §3; ADR-0007 iv/v)", () => {
    // The descriptor IS the contract the control-plane composes the AtlasCycle through
    // (24 §4 - via the generated gRPC client, never a direct internal-package import).
    expect(GatewayService.typeName).toBe("engenox.service.v1.GatewayService");
    // The six seams in source order (11 §3): Extract, Draft, Adjudicate, Embed, Abduce,
    // Critique. Embed + Abduce carry the DEFERRED-honestly signatures (ADR-0007 M1/M2-thin)
    // - the signature is present so the thickening is NOT a contract change.
    const rpcNames = GatewayService.methods.map((m) => m.name);
    expect(rpcNames).toEqual([
      "Extract",
      "Draft",
      "Adjudicate",
      "Embed",
      "Abduce",
      "Critique",
    ]);
    // Every seam is a stateless unary function (11 §3 - `input -> constrained output`; no
    // seam holds a conversation). A streaming seam here would break the stateless contract.
    for (const m of GatewayService.methods) {
      expect(m.methodKind).toBe("unary");
    }
  });

  it("LiftDistribution round-trips WITH its CI - the candor floor (06 §2.4, CLAUDE.md §8)", () => {
    // A lift is ALWAYS (point, CI). The CI is NEVER omitted - a lift rendered without its
    // CI is a watchdog hit (CLAUDE.md §8). The preliminary flag carries the candor
    // microcopy "calibration in flight; the CI is wider than nominal" (26 §4) until the
    // AI-Intelligence closure passes. RCT-eligible rows pull hardest in the estimator.
    const lift = create(LiftDistributionSchema, {
      pointEstimate: 0.06,
      ciLow: 0.02,
      ciHigh: 0.10,
      sampleCount: 240,
      identificationStrategy: IdentificationStrategy.RCT_ELIGIBLE,
      preliminary: true,
    });

    const wire = toBinary(LiftDistributionSchema, lift);
    const decoded = fromBinary(LiftDistributionSchema, wire);

    // The honesty floor survives: BOTH CI bounds, not just the headline point.
    expect(decoded.pointEstimate).toBe(0.06);
    expect(decoded.ciLow).toBe(0.02);
    expect(decoded.ciHigh).toBe(0.10);
    expect(decoded.sampleCount).toBe(240);
    expect(decoded.identificationStrategy).toBe(IdentificationStrategy.RCT_ELIGIBLE);
    expect(decoded.preliminary).toBe(true);
  });

  it("InterventionParams carries the Draft seam's schema.org JSON-LD artifact (06 §2.4, 04 §3 F6)", () => {
    // The Draft seam generates the schema.org JSON-LD for the EXACT entities the surfaces
    // failed to resolve (04 §3 F6). NOT autonomous content (04 §4 - a documented non-goal).
    // The oneof discriminates the three MVP intervention types; the verifier re-grounds
    // every claim before the control-plane lets it touch the spine (11 §2c).
    const params = create(InterventionParamsSchema, {
      params: { case: "schemaJsonLd", value: '{"@context":"https://schema.org","@type":"Organization","name":"Pixenox"}' },
    });

    const wire = toBinary(InterventionParamsSchema, params);
    const decoded = fromBinary(InterventionParamsSchema, wire);

    expect(decoded.params?.case).toBe("schemaJsonLd");
    expect(decoded.params?.case === "schemaJsonLd" ? decoded.params.value : "").toContain(
      '"@type":"Organization"',
    );
  });

  it("Intervention round-trips the PR-preview candor surface - point + CI + the artifact + the idempotency key (19 §6, 26 §6)", () => {
    // The dial is PROPOSE in the MVP (the customer merges their own PR, 26 §6); the
    // ActionRecord opens the PR. The PR-preview candor surface is: the typed artifact
    // (schema_json_ld) + the predicted_uplift WITH its CI + the idempotency_key (a mutation
    // without one is a watchdog hit, CLAUDE.md §8). All four survive the wire together.
    const intervention = create(InterventionSchema, {
      id: "01923960-7c1a-7a1a-83ad-3b6b8a7c1a40",
      tenantId: "01923949-7c1a-7a1a-83ad-3b6b8a7c1a2e",
      interventionType: InterventionType.ADD_SCHEMA_ELEMENT,
      targetEntityId: "0192394a-7c1a-7a1a-83ad-3b6b8a7c1a2d",
      params: create(InterventionParamsSchema, {
        params: { case: "schemaJsonLd", value: '{"@type":"Organization"}' },
      }),
      predictedUplift: create(LiftDistributionSchema, {
        pointEstimate: 0.06,
        ciLow: 0.02,
        ciHigh: 0.10,
        sampleCount: 240,
        preliminary: true,
      }),
      idempotencyKey: "dk-2026-07-12-schema-org-1",
    });

    const wire = toBinary(InterventionSchema, intervention);
    const decoded = fromBinary(InterventionSchema, wire);

    expect(decoded.id).toBe(intervention.id);
    expect(decoded.interventionType).toBe(InterventionType.ADD_SCHEMA_ELEMENT);
    expect(decoded.params?.params?.case).toBe("schemaJsonLd");
    // The candor floor: the predicted lift's CI survives THROUGH the intervention envelope.
    expect(decoded.predictedUplift?.pointEstimate).toBe(0.06);
    expect(decoded.predictedUplift?.ciLow).toBe(0.02);
    expect(decoded.predictedUplift?.ciHigh).toBe(0.10);
    expect(decoded.idempotencyKey).toBe("dk-2026-07-12-schema-org-1");
  });

  it("Outcome carries the integrity-tag-on-the-row (ADR-0008 - the integrity-vocab relocation)", () => {
    // 06 §2.4: every Outcome carries the integrity tags (identification_strategy +
    // foreign_change_status) that gate the estimator. ADR-0008 relocated the integrity
    // vocabulary from event.v1 to entity.v1 (its canonical entity/outcome home) so an
    // entity-layer type could reference it WITHOUT forming a package cycle with event.v1.
    // This case is the relocation proof: the entity-layer Outcome builds + round-trips an
    // engenox.entity.v1.IntegrityTags - the same typed definition the AssertionEvent envelope
    // carries (one definition, no drift). The contrarian block (Panel 6) is never omitted
    // (26 §6); the coverage diagnostic renders in the Honesty expandable (19 §4c).
    const outcome = create(OutcomeSchema, {
      id: "01923970-7c1a-7a1a-83ad-3b6b8a7c1a50",
      tenantId: "01923949-7c1a-7a1a-83ad-3b6b8a7c1a2e",
      interventionId: "01923960-7c1a-7a1a-83ad-3b6b8a7c1a40",
      realizedLift: create(LiftDistributionSchema, {
        pointEstimate: 0.04,
        ciLow: 0.0,
        ciHigh: 0.08,
        sampleCount: 60,
        identificationStrategy: IdentificationStrategy.QUASI_EXPERIMENTAL,
        preliminary: false,
      }),
      counterfactualConditions: [
        { conditionText: "Bing reindexes mid-measurement-window", probability: 0.18, earlyWarningSignal: "ewma_residual>2σ" },
      ],
      coverageContained: 8,
      coverageTotal: 10,
      consentFlag: true,
      integrity: create(IntegrityTagsSchema, {
        identificationStrategy: IdentificationStrategy.QUASI_EXPERIMENTAL,
        foreignChangeStatus: ForeignChangeStatus.CLEAN,
      }),
    });

    const wire = toBinary(OutcomeSchema, outcome);
    const decoded = fromBinary(OutcomeSchema, wire);

    expect(decoded.id).toBe(outcome.id);
    expect(decoded.interventionId).toBe(outcome.interventionId);
    // The candor floor through the Outcome: the realized lift's CI + the coverage diagnostic.
    expect(decoded.realizedLift?.ciLow).toBe(0.0);
    expect(decoded.realizedLift?.ciHigh).toBe(0.08);
    expect(decoded.coverageContained).toBe(8);
    expect(decoded.coverageTotal).toBe(10);
    // The contrarian block survives (NEVER omitted - 26 §6).
    expect(decoded.counterfactualConditions).toHaveLength(1);
    expect(decoded.counterfactualConditions?.[0]?.probability).toBe(0.18);
    // The integrity tag survives ON the row (ADR-0008 relocation) - the corpus's causal
    // honesty, gated by the estimator, not optional metadata.
    expect(decoded.integrity?.identificationStrategy).toBe(
      IdentificationStrategy.QUASI_EXPERIMENTAL,
    );
    expect(decoded.integrity?.foreignChangeStatus).toBe(ForeignChangeStatus.CLEAN);
  });

  it("KnowledgeConflict round-trips the Adjudicate constrained-choice vocab (06 §2.3, 11 §3 seam 3)", () => {
    // The Reconciler (deterministic) enumerates candidate ConflictTypes; the Adjudicate
    // seam's constrained decoding picks among the enum ONLY - it never free-generates a
    // class (11 §3). The MISSING conflict is the CitationAbsence / "ARM MISSING" trigger
    // (04 §5). The severity (0..1) is gated by the estimator, never inflated (06 §2.3).
    const conflict = create(KnowledgeConflictSchema, {
      id: "01923980-7c1a-7a1a-83ad-3b6b8a7c1a60",
      tenantId: "01923949-7c1a-7a1a-83ad-3b6b8a7c1a2e",
      brandTruthNodeId: "01923981-7c1a-7a1a-83ad-3b6b8a7c1a61",
      surfaceAssertionId: "01923982-7c1a-7a1a-83ad-3b6b8a7c1a62",
      conflictType: ConflictType.MISSING,
      severity: 0.72,
      explainer: "ChatGPT omits Pixenox on 'ai visibility tools' - the brand is not referenced where it should rank.",
    });

    const wire = toBinary(KnowledgeConflictSchema, conflict);
    const decoded = fromBinary(KnowledgeConflictSchema, wire);

    expect(decoded.id).toBe(conflict.id);
    expect(decoded.conflictType).toBe(ConflictType.MISSING);
    expect(decoded.severity).toBe(0.72);
    expect(decoded.explainer).toContain("omits Pixenox");
    expect(decoded.brandTruthNodeId).toBe(conflict.brandTruthNodeId);
    expect(decoded.surfaceAssertionId).toBe(conflict.surfaceAssertionId);
  });

  it("Critique carries the cross-family discipline - Critic family != Planner family (11 §4)", () => {
    // The cross-family invariant (11 §4): the Critic's model family MUST differ from the
    // Planner's. CritiqueRequest carries planner_family so the gateway routes the Critic to
    // a != family; a same-family Critique is a watchdog hit (CLAUDE.md §8). The MVP Planner
    // is ANTHROPIC (ADR-0006); the Critic is OPENAI/GOOGLE. The verdict + the surviving
    // objections render on Panel 5 (19 §3). Escalation on deadlock goes to a HUMAN, never an
    // LLM tiebreaker (26 §6) - so VETO is a legitimate verdict; an LLM-tiebreaker field
    // is NOT.
    const request = create(CritiqueRequestSchema, {
      tenantId: "01923949-7c1a-7a1a-83ad-3b6b8a7c1a2e",
      plannerFamily: ModelFamily.ANTHROPIC,
      idempotencyKey: "dk-2026-07-12-critique-1",
    });
    const response = create(CritiqueResponseSchema, {
      verdict: CriticVerdict.VETO,
      criticFamily: ModelFamily.OPENAI,
      summary: "Critic (GPT-class) vetoed: the schema hunk names a competitor's category.",
    });

    const reqWire = toBinary(CritiqueRequestSchema, request);
    const resWire = toBinary(CritiqueResponseSchema, response);
    const reqDecoded = fromBinary(CritiqueRequestSchema, reqWire);
    const resDecoded = fromBinary(CritiqueResponseSchema, resWire);

    // The request carries the Planner's family - the cross-family route key.
    expect(reqDecoded.plannerFamily).toBe(ModelFamily.ANTHROPIC);
    expect(reqDecoded.idempotencyKey).toBe("dk-2026-07-12-critique-1");
    // The response carries the Critic's family - rendered on Panel 5 (19 §3) so the
    // cross-family discipline is made visible. The invariant: critic != planner.
    expect(resDecoded.criticFamily).toBe(ModelFamily.OPENAI);
    expect(resDecoded.verdict).toBe(CriticVerdict.VETO);
    expect(resDecoded.summary).toContain("GPT-class");
    expect(resDecoded.criticFamily).not.toBe(reqDecoded.plannerFamily);
  });

  it("Extract seam input round-trips an AnswerEvent - the highest-volume seam (11 §3 seam 1)", () => {
    // Extract is the highest-volume seam (ADR-0007 M2-thin: constrained decoding on Extract
    // first). The control-plane passes tenant_id from the validated JWT (CLAUDE.md §8 -
    // NEVER trusted from the web client) + the verbatim probe AnswerEvent + the tenant's
    // known_entity_ids (the living entity set the grammar is built from, 11 §2b). The
    // idempotency_key is mandatory - the Extract result is written to the spine.
    const request = create(ExtractRequestSchema, {
      tenantId: "01923949-7c1a-7a1a-83ad-3b6b8a7c1a2e",
      answer: create(AnswerEventSchema, {
        id: "01923990-7c1a-7a1a-83ad-3b6b8a7c1a70",
        tenantId: "01923949-7c1a-7a1a-83ad-3b6b8a7c1a2e",
        probeId: "probe-2026-07-12-01",
        surface: Surface.CHATGPT,
        queryText: "best ai visibility tools 2026",
        modelId: "gpt-5",
        sampleIdx: 1,
        verbatimAnswer: "Top options include Profound, Otterly, and Lumar...",
        citedSources: ["https://example.com/ai-seo"],
      }),
      knownEntityIds: ["0192394a-7c1a-7a1a-83ad-3b6b8a7c1a2d"],
      idempotencyKey: "dk-2026-07-12-extract-1",
    });

    const wire = toBinary(ExtractRequestSchema, request);
    const decoded = fromBinary(ExtractRequestSchema, wire);

    expect(decoded.tenantId).toBe(request.tenantId);
    expect(decoded.answer?.surface).toBe(Surface.CHATGPT);
    expect(decoded.answer?.verbatimAnswer).toContain("Profound");
    // model_id stored verbatim - the candor floor (26 §6 - never redact the model_id the
    // Provenance Audit Hover needs).
    expect(decoded.answer?.modelId).toBe("gpt-5");
    expect(decoded.knownEntityIds).toEqual(["0192394a-7c1a-7a1a-83ad-3b6b8a7c1a2d"]);
    expect(decoded.idempotencyKey).toBe("dk-2026-07-12-extract-1");
  });
});
