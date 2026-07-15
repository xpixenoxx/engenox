// seams/extract.ts — Seam 1: Extract (11 §3).
//
// Constrained on tenant's SHACL shapes (known entities + predicates). Highest-volume seam.
// M2-thin: constrained decoding + post-hoc validation + verifier reGroundExtract.
//
// Cites: 11 §3 (Extract) + ADR-0007 (constrained decoding on Extract first).

import { create } from "@bufbuild/protobuf";
import { type Timestamp, TimestampSchema } from "@bufbuild/protobuf/wkt";
import {
  type ExtractRequest,
  ExtractResponseSchema,
  ModelFamily,
  type SeamMeta,
  SeamMetaSchema,
  SeamStatus
} from "@engenox/contracts/service/v1/gateway";
import type { ExtractResponse } from "@engenox/contracts/service/v1/gateway";
import { reGroundExtract } from "@engenox/verifier/verifier";
import { SEAM_MODEL_SPECS } from "../client/litellm.js";
import type { CallInput, LiteLLMClient, ModelSpec } from "../client/litellm.js";
import { DEFAULT_PREDICATES, buildExtractPrompt, runExtractWithConstraints } from "../constraints/extract.js";
import { type TokenBudgetStore, budgetGate } from "../middleware/tokenBudget.js";

const spec: ModelSpec = SEAM_MODEL_SPECS.extract ?? { modelId: "unknown", family: ModelFamily.UNSPECIFIED, promptVersion: "unknown" };

export interface ExtractDeps {
  llm: LiteLLMClient;
  budget: TokenBudgetStore;
  predicateWhitelist: readonly string[];
}

export async function runExtract(
  request: ExtractRequest,
  deps: ExtractDeps
): Promise<ExtractResponse> {
  const traceId = request.idempotencyKey;
  const predicateWhitelist = deps.predicateWhitelist.length > 0 ? deps.predicateWhitelist : DEFAULT_PREDICATES;
  const prompt = buildExtractPrompt(request, predicateWhitelist);

  // Budget gate
  const estimated = 2048;
  const gate = await budgetGate(deps.budget, request.tenantId, estimated);
  if (!gate.ok) {
    return fallbackExtract(request, traceId);
  }

  // LLM call with bounded retries
  let output: { content: string; usage: { totalTokens: number } } | null = null;
  for (let attempt = 0; attempt <= 2; attempt++) {
    const callInput: CallInput = {
      systemPrompt: "You are an assertion extractor. Output ONLY valid JSON.",
      userPrompt: prompt,
      maxTokens: 2048,
      temperature: 0.0,
      traceId
    };
    const result = await deps.llm.call(callInput, spec);
    if (result.isOk()) {
      output = result.value;
      break;
    }
    if (attempt === 2) {
      return fallbackExtract(request, traceId);
    }
  }

  if (!output) {
    return fallbackExtract(request, traceId);
  }

  // Constrained parsing + validation
  const validated = await runExtractWithConstraints(request, async () => ({
    raw: output!.content,
    tokens: output!.usage.totalTokens
  }), predicateWhitelist);

  // Build the full response
  const response = create(ExtractResponseSchema, {
    assertions: validated.assertions as any,
    mentions: validated.mentions as any,
    meta: createSeamMeta({
      status: SeamStatus.OK,
      modelId: spec.modelId,
      family: spec.family,
      promptVersion: spec.promptVersion,
      grounded: true,
      costTokens: output.usage.totalTokens,
      traceId,
      ranAt: new Date()
    })
  });

  // Verifier re-grounding (independent second opinion)
  const reground = reGroundExtract(response, request.knownEntityIds);

  if (reground.isErr()) {
    return fallbackExtract(request, traceId, output.usage.totalTokens);
  }

  await deps.budget.consume(request.tenantId, output.usage.totalTokens);

  return response;
}

function fallbackExtract(request: ExtractRequest, traceId: string, costTokens = 0): ExtractResponse {
  return create(ExtractResponseSchema, {
    assertions: [],
    mentions: [],
    meta: createSeamMeta({
      status: SeamStatus.FALLBACK,
      modelId: spec.modelId,
      family: spec.family,
      promptVersion: spec.promptVersion,
      grounded: false,
      costTokens,
      traceId,
      ranAt: new Date()
    })
  });
}

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

// Re-exports for callers
export { reGroundExtract };
export { DEFAULT_PREDICATES, buildExtractPrompt, runExtractWithConstraints } from "../constraints/extract.js";