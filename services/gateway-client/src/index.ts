// src/index.ts — ConnectRPC client for GatewayService (the six bounded LLM seams).
//
// The control-plane (and DecisionService) call the gateway's seams via this client.
// Gateway is the ONLY model-touching surface (CLAUDE.md §5 - gateway is leaf-only).
// M3-thin: provides fallback responses when Gateway service is unavailable.
// Generated from contracts/proto/engenox/service/v1/gateway.proto.
// Cites: 11 §2 (gateway responsibilities + six seams) + 24 §3 (service boundary).

import { create } from "@bufbuild/protobuf";
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import type { AnswerEvent, MentionRef } from "@engenox/contracts/entity/v1/surface";
import type {
  AbduceRequest,
  AbduceResponse,
  AdjudicateRequest,
  AdjudicateResponse,
  CriticObjection,
  CritiqueRequest,
  CritiqueResponse,
  DraftRequest,
  DraftResponse,
  EmbedRequest,
  EmbedResponse,
  ExtractRequest,
  ExtractResponse,
  FalsifiableHypothesis,
  SeamMeta,
} from "@engenox/contracts/service/v1/gateway";

// Import enum VALUES (not types) for fallback construction
import {
  ModelFamily,
  SeamStatus,
  CriticVerdict,
} from "@engenox/contracts/service/v1/gateway";

import type { ConflictType } from "@engenox/contracts/entity/v1/conflict";
import { ConflictType as EntityConflictType } from "@engenox/contracts/entity/v1/conflict";


export type { AnswerEvent, MentionRef } from "@engenox/contracts/entity/v1/surface";
// Re-export all types
export type {
  AbduceRequest,
  AbduceResponse,
  AdjudicateRequest,
  AdjudicateResponse,
  CriticObjection,
  CritiqueRequest,
  CritiqueResponse,
  DraftRequest,
  DraftResponse,
  EmbedRequest,
  EmbedResponse,
  ExtractRequest,
  ExtractResponse,
  FalsifiableHypothesis,
  SeamMeta,
} from "@engenox/contracts/service/v1/gateway";

// Re-export enum VALUES
export { ModelFamily, SeamStatus, CriticVerdict } from "@engenox/contracts/service/v1/gateway";
export { ConflictType } from "@engenox/contracts/entity/v1/conflict";


// Import schemas from contracts
import {
  AbduceRequestSchema,
  AdjudicateRequestSchema,
  CritiqueRequestSchema,
  DraftRequestSchema,
  EmbedRequestSchema,
  ExtractRequestSchema,
  SeamMetaSchema,
  ExtractResponseSchema,
  DraftResponseSchema,
  AdjudicateResponseSchema,
  EmbedResponseSchema,
  AbduceResponseSchema,
  CritiqueResponseSchema,
  FalsifiableHypothesisSchema,
} from "@engenox/contracts/service/v1/gateway";

import { GatewayService } from "@engenox/contracts/service/v1/gateway/connect";

const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:8080";

// Create the ConnectRPC transport for the Gateway service
const transport = createConnectTransport({
  baseUrl: GATEWAY_URL,
  httpVersion: "1.1",
});

// GatewayService from codegenv2 is a GenService (extends DescService) —
// compatible with @connectrpc/connect v2's createClient directly.
const gatewayClient = createClient(GatewayService as any, transport);

// ============================================================================
// Helper: detect if we're in M3-thin mode (fallback only)
// ============================================================================

const FALLBACK_MODE = process.env.GATEWAY_FALLBACK_MODE === "true" ||
  process.env.NODE_ENV === "test" ||
  process.env.M3_THIN === "true";

function createFallbackSeamMeta(seamName: string): SeamMeta {
  return create(SeamMetaSchema, {
    status: SeamStatus.FALLBACK,
    modelId: "fallback-model",
    family: ModelFamily.ANTHROPIC,
    promptVersion: "fallback.v1",
    grounded: false,
    costTokens: 0,
    traceId: `fallback-${seamName}-${Date.now()}`,
    ranAt: undefined,
  });
}

// ============================================================================
// Seam 1: Extract — constrained extraction of typed assertions
// ============================================================================

export interface CallExtractInput {
  tenantId: string;
  answer: AnswerEvent;
  knownEntityIds: string[];
  idempotencyKey: string;
}

export async function callExtract(input: CallExtractInput): Promise<ExtractResponse> {
  if (FALLBACK_MODE) {
    console.log(`[GATEWAY-CLIENT] FALLBACK callExtract for tenant ${input.tenantId}`);
    return createFallbackExtractResponse(input);
  }
  const request = create(ExtractRequestSchema, {
    tenantId: input.tenantId,
    answer: input.answer,
    knownEntityIds: input.knownEntityIds,
    idempotencyKey: input.idempotencyKey,
  });
  return (gatewayClient as any).extract(request) as Promise<ExtractResponse>;
}

function createFallbackExtractResponse(_input: CallExtractInput): ExtractResponse {
  // FALLBACK: empty assertions + mentions, with FALLBACK meta
  return create(ExtractResponseSchema, {
    assertions: [],
    mentions: [],
    meta: createFallbackSeamMeta("extract"),
  });
}

// ============================================================================
// Seam 2: Draft — schema.org JSON-LD / content brief / brand-card edit
// ============================================================================

export interface CallDraftInput {
  tenantId: string;
  brandCard: DraftRequest["brandCard"];
  interventionType: DraftRequest["interventionType"];
  gapEntityIds: string[];
  targetsConflictId: string;
  targetSurface: DraftRequest["targetSurface"];
  targetQuery: string;
  idempotencyKey: string;
}

export async function callDraft(input: CallDraftInput): Promise<DraftResponse> {
  if (FALLBACK_MODE) {
    console.log(`[GATEWAY-CLIENT] FALLBACK callDraft for tenant ${input.tenantId}`);
    return createFallbackDraftResponse(input);
  }
  const request = create(DraftRequestSchema, {
    tenantId: input.tenantId,
    brandCard: input.brandCard,
    interventionType: input.interventionType,
    gapEntityIds: input.gapEntityIds,
    targetsConflictId: input.targetsConflictId,
    targetSurface: input.targetSurface,
    targetQuery: input.targetQuery,
    idempotencyKey: input.idempotencyKey,
  });
  return (gatewayClient as any).draft(request) as Promise<DraftResponse>;
}

function createFallbackDraftResponse(_input: CallDraftInput): DraftResponse {
  // FALLBACK: no params generated, schema not validated
  return create(DraftResponseSchema, {
    params: undefined,
    schemaValidated: false,
    meta: createFallbackSeamMeta("draft"),
  });
}

// ============================================================================
// Seam 3: Adjudicate — constrained choice among ConflictTypes
// ============================================================================

export interface CallAdjudicateInput {
  tenantId: string;
  brandTruthNodeId: string;
  surfaceAssertionId: string;
  candidateTypes: ConflictType[];
  idempotencyKey: string;
}

// Re-export ConflictType from entity for consumers

export async function callAdjudicate(input: CallAdjudicateInput): Promise<AdjudicateResponse> {
  if (FALLBACK_MODE) {
    console.log(`[GATEWAY-CLIENT] FALLBACK callAdjudicate for tenant ${input.tenantId}`);
    return createFallbackAdjudicateResponse(input);
  }
  const request = create(AdjudicateRequestSchema, {
    tenantId: input.tenantId,
    brandTruthNodeId: input.brandTruthNodeId,
    surfaceAssertionId: input.surfaceAssertionId,
    candidateTypes: input.candidateTypes,
    idempotencyKey: input.idempotencyKey,
  });
  return (gatewayClient as any).adjudicate(request) as Promise<AdjudicateResponse>;
}

function createFallbackAdjudicateResponse(input: CallAdjudicateInput): AdjudicateResponse {
  // Default to the first candidate type (typically MISSING = 1)
  const chosenType = input.candidateTypes[0] ?? EntityConflictType.MISSING;
  return create(AdjudicateResponseSchema, {
    conflictType: chosenType,
    severity: 0.5,
    explainer: "FALLBACK: Adjudicate seam unavailable; defaulting to first candidate type",
    meta: createFallbackSeamMeta("adjudicate"),
  });
}

// ============================================================================
// Seam 4: Embed — deferred (returns FALLBACK in M3-thin)
// ============================================================================

export interface CallEmbedInput {
  tenantId: string;
  texts: string[];
  idempotencyKey: string;
}

export async function callEmbed(input: CallEmbedInput): Promise<EmbedResponse> {
  if (FALLBACK_MODE) {
    console.log(`[GATEWAY-CLIENT] FALLBACK callEmbed for tenant ${input.tenantId}`);
    return createFallbackEmbedResponse(input);
  }
  const request = create(EmbedRequestSchema, {
    tenantId: input.tenantId,
    texts: input.texts,
    idempotencyKey: input.idempotencyKey,
  });
  return (gatewayClient as any).embed(request) as Promise<EmbedResponse>;
}

function createFallbackEmbedResponse(input: CallEmbedInput): EmbedResponse {
  // FALLBACK: empty vector refs (embedding service deferred at MVP)
  return create(EmbedResponseSchema, {
    vectorRefs: input.texts.map(() => `fallback-ref-${Date.now()}`),
    meta: createFallbackSeamMeta("embed"),
  });
}

// ============================================================================
// Seam 5: Abduce — deferred (returns FALLBACK in M3-thin)
// ============================================================================

export interface CallAbduceInput {
  tenantId: string;
  conflictIds: string[];
  idempotencyKey: string;
}

export async function callAbduce(input: CallAbduceInput): Promise<AbduceResponse> {
  if (FALLBACK_MODE) {
    console.log(`[GATEWAY-CLIENT] FALLBACK callAbduce for tenant ${input.tenantId}`);
    return createFallbackAbduceResponse(input);
  }
  const request = create(AbduceRequestSchema, {
    tenantId: input.tenantId,
    conflictIds: input.conflictIds,
    idempotencyKey: input.idempotencyKey,
  });
  return (gatewayClient as any).abduce(request) as Promise<AbduceResponse>;
}

function createFallbackAbduceResponse(_input: CallAbduceInput): AbduceResponse {
  return create(AbduceResponseSchema, {
    hypotheses: [],
    meta: createFallbackSeamMeta("abduce"),
  });
}

// ============================================================================
// Seam 6: Critique — cross-family adversarial review
// ============================================================================

export interface CallCritiqueInput {
  tenantId: string;
  intervention: CritiqueRequest["intervention"];
  plannerFamily: CritiqueRequest["plannerFamily"];
  idempotencyKey: string;
}

export async function callCritique(input: CallCritiqueInput): Promise<CritiqueResponse> {
  if (FALLBACK_MODE) {
    console.log(`[GATEWAY-CLIENT] FALLBACK callCritique for tenant ${input.tenantId}`);
    return createFallbackCritiqueResponse(input);
  }
  const request = create(CritiqueRequestSchema, {
    tenantId: input.tenantId,
    intervention: input.intervention,
    plannerFamily: input.plannerFamily,
    idempotencyKey: input.idempotencyKey,
  });
  return (gatewayClient as any).critique(request) as Promise<CritiqueResponse>;
}

function createFallbackCritiqueResponse(_input: CallCritiqueInput): CritiqueResponse {
  // Default to ACCEPT_WITH_RESERVATIONS (FALLBACK behavior per candor floor)
  // Critic family != Planner family: we use OPENAI since planner is ANTHROPIC
  return create(CritiqueResponseSchema, {
    verdict: CriticVerdict.ACCEPT_WITH_RESERVATIONS,
    objections: [],
    criticFamily: ModelFamily.OPENAI,
    summary: "FALLBACK: Critique seam unavailable; accepting with reservations per candor floor",
    meta: createFallbackSeamMeta("critique"),
  });
}

// ============================================================================
// Re-export the client for advanced use cases
// ============================================================================

export { gatewayClient };