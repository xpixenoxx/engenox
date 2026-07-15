// seams/embed.ts — Seam 4: Embed (11 §3).
//
// Embed texts to vectors (pgvector). DEFERRED at MVP (ADR-0007 M1-thin defers
// pgvector). The signature + FALLBACK are present so the seam plugs in without
// a contract change at the thicken pass.
//
// Cites: 11 §3 (Embed table) + ADR-0007 (pgvector deferred).

import { create } from "@bufbuild/protobuf";
import { type Timestamp, TimestampSchema } from "@bufbuild/protobuf/wkt";
import {
  type EmbedRequest,
  EmbedResponseSchema,
  ModelFamily,
  type SeamMeta,
  SeamMetaSchema,
  SeamStatus
} from "@engenox/contracts/service/v1/gateway";
import type { EmbedResponse } from "@engenox/contracts/service/v1/gateway";
import { SEAM_MODEL_SPECS } from "../client/litellm.js";
import type { ModelSpec } from "../client/litellm.js";
import { type TokenBudgetStore, budgetGate } from "../middleware/tokenBudget.js";

const spec: ModelSpec = SEAM_MODEL_SPECS.embed ?? { modelId: "unknown", family: ModelFamily.UNSPECIFIED, promptVersion: "unknown" };

function createSeamMeta(params: {
  status: SeamStatus;
  modelId: string;
  family: ModelFamily;
  promptVersion: string;
  grounded: boolean;
  costTokens: number;
  traceId: string;
  ranAt: Date;
}): SeamMeta {
  return create(SeamMetaSchema, {
    status: params.status,
    modelId: params.modelId,
    family: params.family,
    promptVersion: params.promptVersion,
    grounded: params.grounded,
    costTokens: params.costTokens,
    traceId: params.traceId,
    ranAt: timestampFromDate(params.ranAt)
  });
}

function timestampFromDate(date: Date): Timestamp {
  return create(TimestampSchema, {
    seconds: BigInt(Math.floor(date.getTime() / 1000)),
    nanos: date.getMilliseconds() * 1_000_000
  });
}

export async function runEmbed(
  request: EmbedRequest,
  deps: { budget: TokenBudgetStore }
): Promise<EmbedResponse> {
  // Embed is deferred — always FALLBACK at MVP
  const traceId = request.idempotencyKey;

  return create(EmbedResponseSchema, {
    vectorRefs: [],
    meta: createSeamMeta({
      status: SeamStatus.FALLBACK,
      modelId: spec.modelId,
      family: spec.family,
      promptVersion: spec.promptVersion,
      grounded: false,
      costTokens: 0,
      traceId,
      ranAt: new Date()
    })
  });
}