// src/index.ts — ConnectRPC client for GatewayService (the six bounded LLM seams).
//
// The control-plane (and DecisionService) call the gateway's seams via this client.
// Gateway is the ONLY model-touching surface (CLAUDE.md §5 - gateway is leaf-only).
//
// Generated from contracts/proto/engenox/service/v1/gateway.proto.
// Cites: 11 §2 (gateway responsibilities + six seams) + 24 §3 (service boundary).

import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import { create } from "@bufbuild/protobuf";

// Re-export types from contracts
export type {
  AnswerEvent,
  MentionRef,
  ExtractRequest,
  ExtractResponse,
  DraftRequest,
  DraftResponse,
  AdjudicateRequest,
  AdjudicateResponse,
  EmbedRequest,
  EmbedResponse,
  AbduceRequest,
  AbduceResponse,
  CritiqueRequest,
  CritiqueResponse,
  FalsifiableHypothesis,
  SeamMeta,
  SeamStatus,
  ModelFamily,
  CriticVerdict,
  CriticObjection,
} from "@engenox/contracts/service/v1/gateway";

import {
  ExtractRequestSchema,
  DraftRequestSchema,
  AdjudicateRequestSchema,
  EmbedRequestSchema,
  AbduceRequestSchema,
  CritiqueRequestSchema,
} from "@engenox/contracts/service/v1/gateway";

import { GatewayService } from "@engenox/contracts/service/v1/gateway";

const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:8080";

// Create the ConnectRPC transport for the Gateway service
const transport = createConnectTransport({
  baseUrl: GATEWAY_URL,
  httpVersion: "1.1",
});

// GatewayService from codegenv2 is a GenService (extends DescService) —
// compatible with @connectrpc/connect v2's createClient directly.
const gatewayClient = createClient(GatewayService, transport);

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
  const request = create(ExtractRequestSchema, {
    tenantId: input.tenantId,
    answer: input.answer,
    knownEntityIds: input.knownEntityIds,
    idempotencyKey: input.idempotencyKey,
  });
  return gatewayClient.extract(request);
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
  return gatewayClient.draft(request);
}

// ============================================================================
// Seam 3: Adjudicate — constrained choice among ConflictTypes
// ============================================================================

export interface CallAdjudicateInput {
  tenantId: string;
  brandTruthNodeId: string;
  surfaceAssertionId: string;
  candidateTypes: number[];
  idempotencyKey: string;
}

export async function callAdjudicate(input: CallAdjudicateInput): Promise<AdjudicateResponse> {
  const request = create(AdjudicateRequestSchema, {
    tenantId: input.tenantId,
    brandTruthNodeId: input.brandTruthNodeId,
    surfaceAssertionId: input.surfaceAssertionId,
    candidateTypes: input.candidateTypes,
    idempotencyKey: input.idempotencyKey,
  });
  return gatewayClient.adjudicate(request);
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
  const request = create(EmbedRequestSchema, {
    tenantId: input.tenantId,
    texts: input.texts,
    idempotencyKey: input.idempotencyKey,
  });
  return gatewayClient.embed(request);
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
  const request = create(AbduceRequestSchema, {
    tenantId: input.tenantId,
    conflictIds: input.conflictIds,
    idempotencyKey: input.idempotencyKey,
  });
  return gatewayClient.abduce(request);
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
  const request = create(CritiqueRequestSchema, {
    tenantId: input.tenantId,
    intervention: input.intervention,
    plannerFamily: input.plannerFamily,
    idempotencyKey: input.idempotencyKey,
  });
  return gatewayClient.critique(request);
}

// ============================================================================
// Re-export the client for advanced use cases
// ============================================================================

export { gatewayClient };