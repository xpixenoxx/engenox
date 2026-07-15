// seams/abduce.ts — Seam 5: Abduce (11 §3).
//
// Falsifiable hypotheses about conflicts. Each must reference an existing
// KnowledgeConflict (06 §5 step 5 + 11 §2c). DEFERRED real traffic at MVP.
// The signature + FALLBACK + verifier reGroundHypothesis are present.
//
// Cites: 11 §3 (Abduce table) + 06 §5 step 5 + ADR-0007.

import { create } from "@bufbuild/protobuf";
import { type Timestamp, TimestampSchema } from "@bufbuild/protobuf/wkt";
import { type AbduceRequest, type AbduceResponse, AbduceResponseSchema, ModelFamily, type SeamMeta, SeamMetaSchema, SeamStatus } from "@engenox/contracts/service/v1/gateway";
import { reGroundHypothesis } from "@engenox/verifier/verifier";
import { SEAM_MODEL_SPECS } from "../client/litellm.js";
import type { ModelSpec } from "../client/litellm.js";
import { type TokenBudgetStore, budgetGate } from "../middleware/tokenBudget.js";

const spec: ModelSpec = SEAM_MODEL_SPECS.abduce ?? { modelId: "unknown", family: ModelFamily.UNSPECIFIED, promptVersion: "unknown" };

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

export async function runAbduce(
  request: AbduceRequest,
  deps: { budget: TokenBudgetStore }
): Promise<AbduceResponse> {
  const traceId = request.idempotencyKey;
  // Deferred — always FALLBACK at MVP (highest-stakes cycle)
  return create(AbduceResponseSchema, {
    hypotheses: [],
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

// Re-export for caller's re-grounding
export { reGroundHypothesis };