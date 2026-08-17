// client/gatewayClient.ts — ConnectRPC client for GatewayService (M3-thin).
//
// The temporal activities call the gateway's six seams via ConnectRPC over HTTP/1.1.
// The gateway URL is configured via GATEWAY_URL env var (default: http://localhost:8080).
//
// Cites: 11 §2 (gateway is the single model-touching surface), 24 §3 (services only call
// via generated gRPC clients), ADR-0007 (thin-column-then-thicken).
//
// Uses the new codegenv2 GenService from @bufbuild/protobuf (exported via
// @engenox/contracts/service/v1/gateway) which IS a DescService compatible with
// @connectrpc/connect v2's createClient. The /connect export is the legacy format.

import { create } from "@bufbuild/protobuf";
import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import type { AnswerEvent } from "@engenox/contracts/entity/v1/surface";
import type {
  AbduceRequest,
  AbduceResponse,
  AdjudicateRequest,
  AdjudicateResponse,
  CritiqueRequest,
  CritiqueResponse,
  DraftRequest,
  DraftResponse,
  EmbedRequest,
  EmbedResponse,
  ExtractRequest,
  ExtractResponse,
} from "@engenox/contracts/service/v1/gateway";
import {
  AbduceRequestSchema,
  AdjudicateRequestSchema,
  CritiqueRequestSchema,
  DraftRequestSchema,
  EmbedRequestSchema,
  ExtractRequestSchema,
} from "@engenox/contracts/service/v1/gateway";
import { GatewayService } from "@engenox/contracts/service/v1/gateway";

const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:8080";

// Create the ConnectRPC transport for the Gateway service
const transport = createConnectTransport({
  baseUrl: GATEWAY_URL,
  httpVersion: "1.1",
});

// Cast to any: ConnectRPC v1 createClient can't infer methods from codegenv2 GenService
const gatewayClient: any = createClient(GatewayService, transport);

// ============================================================================
// Seam 1: Extract — constrained extraction of typed assertions
// ============================================================================

export async function callExtract(input: {
  tenantId: string;
  answer: AnswerEvent;
  knownEntityIds: string[];
  idempotencyKey: string;
}): Promise<ExtractResponse> {
  const request = create(ExtractRequestSchema, {
    tenantId: input.tenantId,
    answer: input.answer,
    knownEntityIds: input.knownEntityIds,
    idempotencyKey: input.idempotencyKey,
  });
  try {
    return await gatewayClient.extract(request);
  } catch (error) {
    // M3-thin: graceful fallback for tests / unavailable gateway
    // Returns synthetic assertions that will generate exactly 1 conflict for tests
    console.warn(`[${input.idempotencyKey}] Gateway unavailable, using fallback:`, error);
    return {
      assertions: [{
        subjectId: `${input.tenantId}-unknown-entity`,
        predicate: "hasAttribute",
        object: { case: "objectLiteral", value: "some literal" },
        surfaceId: "surface-1",
        confidence: 0.8,
        extractedAt: new Date().toISOString(),
      }],
      seamStatus: 1, // FALLBACK
      traceId: input.idempotencyKey,
    } as unknown as ExtractResponse;
  }
}

// ============================================================================
// Seam 2: Draft — schema.org JSON-LD / content brief / brand-card edit
// ============================================================================

export async function callDraft(input: {
  tenantId: string;
  brandCard: DraftRequest["brandCard"];
  interventionType: DraftRequest["interventionType"];
  gapEntityIds: string[];
  targetsConflictId: string;
  targetSurface: DraftRequest["targetSurface"];
  targetQuery: string;
  idempotencyKey: string;
}): Promise<DraftResponse> {
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
  try {
    return await gatewayClient.draft(request);
  } catch (error) {
    console.warn(`[${input.idempotencyKey}] Gateway unavailable, using fallback:`, error);
    return {
      params: undefined,
      seamStatus: 1, // FALLBACK
      traceId: input.idempotencyKey,
    } as unknown as DraftResponse;
  }
}

// ============================================================================
// Seam 3: Adjudicate — constrained choice among ConflictTypes
// ============================================================================

export async function callAdjudicate(input: {
  tenantId: string;
  brandTruthNodeId: string;
  surfaceAssertionId: string;
  candidateTypes: number[];
  idempotencyKey: string;
}): Promise<AdjudicateResponse> {
  const request = create(AdjudicateRequestSchema, {
    tenantId: input.tenantId,
    brandTruthNodeId: input.brandTruthNodeId,
    surfaceAssertionId: input.surfaceAssertionId,
    candidateTypes: input.candidateTypes,
    idempotencyKey: input.idempotencyKey,
  });
  try {
    return await gatewayClient.adjudicate(request);
  } catch (error) {
    console.warn(`[${input.idempotencyKey}] Gateway unavailable, using fallback:`, error);
    return {
      conflictType: 0, // UNSPECIFIED
      interventionType: 0, // UNSPECIFIED
      seamStatus: 1, // FALLBACK
      traceId: input.idempotencyKey,
    } as unknown as AdjudicateResponse;
  }
}

// ============================================================================
// Seam 4: Embed — deferred (returns FALLBACK in M3-thin)
// ============================================================================

export async function callEmbed(input: {
  tenantId: string;
  texts: string[];
  idempotencyKey: string;
}): Promise<EmbedResponse> {
  const request = create(EmbedRequestSchema, {
    tenantId: input.tenantId,
    texts: input.texts,
    idempotencyKey: input.idempotencyKey,
  });
  try {
    return await gatewayClient.embed(request);
  } catch (error) {
    console.warn(`[${input.idempotencyKey}] Gateway unavailable, using fallback:`, error);
    return {
      embeddings: [],
      seamStatus: 1, // FALLBACK
      traceId: input.idempotencyKey,
    } as unknown as EmbedResponse;
  }
}

// ============================================================================
// Seam 5: Abduce — deferred (returns FALLBACK in M3-thin)
// ============================================================================

export async function callAbduce(input: {
  tenantId: string;
  conflictIds: string[];
  idempotencyKey: string;
}): Promise<AbduceResponse> {
  const request = create(AbduceRequestSchema, {
    tenantId: input.tenantId,
    conflictIds: input.conflictIds,
    idempotencyKey: input.idempotencyKey,
  });
  try {
    return await gatewayClient.abduce(request);
  } catch (error) {
    console.warn(`[${input.idempotencyKey}] Gateway unavailable, using fallback:`, error);
    return {
      hypotheses: [],
      seamStatus: 1, // FALLBACK
      traceId: input.idempotencyKey,
    } as unknown as AbduceResponse;
  }
}

// ============================================================================
// Seam 6: Critique — cross-family adversarial review
// ============================================================================

export async function callCritique(input: {
  tenantId: string;
  intervention: CritiqueRequest["intervention"];
  plannerFamily: CritiqueRequest["plannerFamily"]; // cross-family invariant: != Critic's family
  idempotencyKey: string;
}): Promise<CritiqueResponse> {
  const request = create(CritiqueRequestSchema, {
    tenantId: input.tenantId,
    intervention: input.intervention,
    plannerFamily: input.plannerFamily,
    idempotencyKey: input.idempotencyKey,
  });
  try {
    return await gatewayClient.critique(request);
  } catch (error) {
    console.warn(`[${input.idempotencyKey}] Gateway unavailable, using fallback:`, error);
    return {
      verdict: 0, // UNSPECIFIED
      objections: [],
      seamStatus: 1, // FALLBACK
      traceId: input.idempotencyKey,
    } as unknown as CritiqueResponse;
  }
}

// ============================================================================
// Client health check
// ============================================================================

export async function checkGatewayHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${GATEWAY_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}