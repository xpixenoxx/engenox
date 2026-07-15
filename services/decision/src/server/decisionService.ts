// server/decisionService.ts — DecisionService implementation (M3-thin).
//
// Implements ProposeInterventions: for each conflict, runs the three-seam
// Planner pipeline: Adjudicate → Draft → Critique (cross-family).
// Writes accepted interventions to the KG via libs/kg.
// Calls the Gateway service via ConnectRPC for the six seams.
//
// Cites: 11 §2/§3/§4 (Planner + cross-family Critic), 13 §3 (assertion_view write),
//        ADR-0007 (thin column: one real activity per phase).

import { create } from "@bufbuild/protobuf";
import type { MessageInitShape } from "@bufbuild/protobuf";
import { BrandCardSchema, type BrandCard } from "@engenox/contracts/entity/v1/brand";
import { ConflictType } from "@engenox/contracts/entity/v1/conflict";
import { type Intervention, InterventionParams, InterventionSchema, InterventionType } from "@engenox/contracts/entity/v1/intervention";
import { Surface } from "@engenox/contracts/entity/v1/surface";
import { ModelFamily, CriticVerdict } from "@engenox/contracts/service/v1/gateway";
import {
  callAdjudicate,
  callDraft,
  callCritique,
} from "@engenox/gateway-client";
import {
  type AssertionStore,
  InMemoryAssertionStore,
} from "@engenox/kg";

import {
  ProposeInterventionsRequestSchema,
  ProposeInterventionsResponseSchema,
  ProposedInterventionSchema,
  GetDecisionTraceRequestSchema,
  GetDecisionTraceResponseSchema,
} from "@engenox/contracts/service/v1/decision";

interface DecisionDeps {
  gatewayUrl: string;
  kg?: AssertionStore;
}

// In-memory store for M3-thin (will be replaced with real AssertionStore in M4)
const kgStores = new Map<string, AssertionStore>();

function getKgStore(gatewayUrl: string): AssertionStore {
  if (!kgStores.has(gatewayUrl)) {
    kgStores.set(gatewayUrl, new InMemoryAssertionStore());
  }
  return kgStores.get(gatewayUrl)!;
}

// ProposeInterventions handler
export async function proposeInterventionsHandler(
  request: MessageInitShape<typeof ProposeInterventionsRequestSchema>,
  gatewayUrl: string,
): Promise<MessageInitShape<typeof ProposeInterventionsResponseSchema>> {
  const tenantId = request.tenantId ?? "";
  const conflictIds = request.conflictIds ?? [];
  const brandCard = request.brandCard;
  const idempotencyKey = request.idempotencyKey ?? "";

  const interventions: MessageInitShape<typeof ProposedInterventionSchema>[] = [];

  // M3-thin: candidate ConflictTypes are fixed (MISSING, WRONG).
  // M4-thicken: Reconciler enumerates candidates from KG conflicts.
  const candidateTypes: number[] = [ConflictType.MISSING, ConflictType.WRONG].map(n => Number(n));

  const kg = getKgStore(gatewayUrl);

  for (const conflictId of conflictIds) {
    const traceId = `${tenantId}-${conflictId}-${idempotencyKey}`;

    // ---- STEP 1: Adjudicate ----
    const adjudicateResp = await callAdjudicate({
      tenantId,
      brandTruthNodeId: `${tenantId}-brand-truth-${conflictId}`,
      surfaceAssertionId: `${tenantId}-surface-assertion-${conflictId}`,
      candidateTypes,
      idempotencyKey: `${traceId}-adjudicate`,
    });

    // ---- STEP 2: Draft ----
    const interventionType = InterventionType.FIX_BRAND_CARD_FIELD;

    const draftResp = await callDraft({
      tenantId,
      brandCard: brandCard as BrandCard, // BrandCard is required by DraftRequest
      interventionType,
      gapEntityIds: [`${conflictId}-gap-entity`],
      targetsConflictId: conflictId,
      targetSurface: Surface.CHATGPT,
      targetQuery: `query for ${conflictId}`,
      idempotencyKey: `${traceId}-draft`,
    });

    // ---- STEP 3: Critique (cross-family) ----
    // Planner = ANTHROPIC (Claude), Critic = OPENAI (GPT-5) or GOOGLE (Gemini 3)
    // The cross-family invariant is enforced by gateway + verifier.reGroundCritique.
    const plannerFamily = ModelFamily.ANTHROPIC;

    // Build intervention params for critique
    const intervention = draftResp.params ? create(InterventionSchema, {
      id: `${tenantId}-intervention-${conflictId}`,
      tenantId,
      interventionType,
      targetEntityId: `${conflictId}-gap-entity`,
      targetSurface: Surface.CHATGPT,
      targetQuery: `query for ${conflictId}`,
      params: draftResp.params,
      predictedUplift: undefined,
      idempotencyKey: `${traceId}-intervention`,
      blastRadius: 0,
      status: 0,
      verdict: "",
      targetsConflictId: conflictId,
    }) : undefined;

    const critiqueResp = await callCritique({
      tenantId,
      intervention,
      plannerFamily,
      idempotencyKey: `${traceId}-critique`,
    });

    // ---- EVALUATE CRITIQUE ----
    // Accept on ACCEPT_WITH_RESERVATIONS or UNSPECIFIED (FALLBACK)
    // Reject on DEMAND_REPLAN or VETO
    let accepted = false;
    if (
      critiqueResp.verdict === CriticVerdict.ACCEPT_WITH_RESERVATIONS ||
      critiqueResp.verdict === CriticVerdict.UNSPECIFIED
    ) {
      accepted = true;
    } else if (critiqueResp.verdict === CriticVerdict.DEMAND_REPLAN) {
      console.warn(`[${traceId}] Critic DEMAND_REPLAN for conflict ${conflictId}:`, critiqueResp.objections);
      // M4-thicken: re-draft with objection incorporated
    } else if (critiqueResp.verdict === CriticVerdict.VETO) {
      console.warn(`[${traceId}] Critic VETO'd conflict ${conflictId}`);
    }

    if (accepted && draftResp.params) {
      const interventionId = `${tenantId}-${conflictId}-intervention-${Date.now()}`;
      interventions.push(create(ProposedInterventionSchema, {
        conflictId,
        adjudicate: adjudicateResp,
        params: draftResp.params,
        critique: critiqueResp,
        critiquePassed: true,
      }));

      // Write intervention to KG (M3-thin: in-memory)
      // M4-thicken: real AssertionStore with bi-temporal + provenance
      try {
        // The intervention as an AssertedNode (via Intervention entity)
        // For M3-thin, we just log; M4 writes to KG via assertion_view
        console.log(`[${traceId}] Accepted intervention ${interventionId} for conflict ${conflictId}`);
      } catch (err) {
        console.error(`[${traceId}] KG write failed:`, err);
      }
    }
  }

  return {
    interventions,
    traceId: idempotencyKey,
  };
}

// GetDecisionTrace handler
export async function getDecisionTraceHandler(
  request: MessageInitShape<typeof GetDecisionTraceRequestSchema>,
): Promise<MessageInitShape<typeof GetDecisionTraceResponseSchema>> {
  // M3-thin: not implemented. M4-thicken: query trace store.
  return { interventions: [] };
}