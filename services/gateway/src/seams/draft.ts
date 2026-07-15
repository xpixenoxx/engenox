// seams/draft.ts — Seam 2: Draft (11 §3).
//
// Drafts schema.org JSON-LD, content briefs, or brand card edits. Grounded in the
// tenant's Brand Card + the conflict the draft targets. The verifier re-grounds
// every claim (schema_validated). M2-thin: constrained decoding on Draft is
// deferred (focus is Extract); the signature + FALLBACK are present.
//
// Cites: 11 §3 (Draft table) + 04 §3 F6/F7 (schema.org JSON-LD + content briefs);
//        ADR-0007 (Draft constrained decoding deferred).

import { create } from "@bufbuild/protobuf";
import { type Timestamp, TimestampSchema } from "@bufbuild/protobuf/wkt";
import { type InterventionParams, InterventionParamsSchema } from "@engenox/contracts/entity/v1/intervention";
import {
  type DraftRequest,
  DraftResponseSchema,
  ModelFamily,
  type SeamMeta,
  SeamMetaSchema,
  SeamStatus
} from "@engenox/contracts/service/v1/gateway";
import type { DraftResponse } from "@engenox/contracts/service/v1/gateway";
import { SEAM_MODEL_SPECS } from "../client/litellm.js";
import type { LiteLLMClient } from "../client/litellm.js";
import type { CallInput, ModelSpec } from "../client/litellm.js";
import { type TokenBudgetStore, budgetGate, estimateTokensForSeam } from "../middleware/tokenBudget.js";

const spec: ModelSpec = SEAM_MODEL_SPECS.draft ?? { modelId: "unknown", family: ModelFamily.UNSPECIFIED, promptVersion: "unknown" };

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

function fallbackDraft(
  request: DraftRequest,
  traceId: string,
  modelId: string,
  family: ModelFamily,
  promptVersion: string,
  costTokens: number
): DraftResponse {
  return create(DraftResponseSchema, {
    params: create(InterventionParamsSchema, { params: { case: "schemaJsonLd", value: "{}" } }),
    schemaValidated: false,
    meta: createSeamMeta({
      status: SeamStatus.FALLBACK,
      modelId,
      family,
      promptVersion,
      grounded: false,
      costTokens,
      traceId,
      ranAt: new Date()
    })
  });
}

/**
 * Draft seam — generates intervention artifacts (schema.org JSON-LD, content brief, brand card edit).
 * M2-thin: no constrained decoding (deferred); returns FALLBACK from LLM call failures.
 */
export async function runDraft(
  request: DraftRequest,
  deps: {
    llm: LiteLLMClient;
    budget: TokenBudgetStore;
  }
): Promise<DraftResponse> {
  const traceId = request.idempotencyKey;
  const prompt = `You are a schema.org JSON-LD generator for tenant ${request.tenantId}.

BRAND CARD:
${JSON.stringify(request.brandCard, null, 2)}

INTERVENTION TYPE: ${request.interventionType}
TARGET CONFLICT: ${request.targetsConflictId}
TARGET SURFACE: ${request.targetSurface}
TARGET QUERY: ${request.targetQuery}
GAP ENTITIES: ${request.gapEntityIds.join(", ") || "(none)"}

Generate the InterventionParams artifact for the intervention type. Output ONLY valid JSON.`;

  // Budget gate
  const estimated = estimateTokensForSeam(spec, "Draft system prompt", prompt, 4096);
  const gate = await budgetGate(deps.budget, request.tenantId, estimated);
  if (!gate.ok) {
    return fallbackDraft(request, traceId, spec.modelId, spec.family, spec.promptVersion, 0);
  }

  // LLM call with retries
  let output: { content: string; usage: { totalTokens: number } } | null = null;
  for (let attempt = 0; attempt <= 2; attempt++) {
    const callInput: CallInput = {
      systemPrompt: "You generate schema.org JSON-LD and content artifacts. Output ONLY valid JSON.",
      userPrompt: prompt,
      maxTokens: 4096,
      temperature: 0.1,
      traceId
    };
    const result = await deps.llm.call(callInput, spec);
    if (result.isOk()) {
      output = result.value;
      break;
    }
    if (attempt === 2) {
      return fallbackDraft(request, traceId, spec.modelId, spec.family, spec.promptVersion, 0);
    }
  }

  if (!output) {
    return fallbackDraft(request, traceId, spec.modelId, spec.family, spec.promptVersion, 0);
  }

  // Parse and validate schema.org
  let params: InterventionParams;
  let schemaValidated = false;
  try {
    const parsed = JSON.parse(output.content);
    // M2-thin: basic shape check. Thickening: schema.org validator.
    schemaValidated = typeof parsed === "object" && parsed !== null;
    params = create(InterventionParamsSchema, parsed);
  } catch {
    return fallbackDraft(request, traceId, spec.modelId, spec.family, spec.promptVersion, output.usage.totalTokens);
  }

  await deps.budget.consume(request.tenantId, output.usage.totalTokens);

  return create(DraftResponseSchema, {
    params,
    schemaValidated,
    meta: createSeamMeta({
      status: SeamStatus.OK,
      modelId: spec.modelId,
      family: spec.family,
      promptVersion: spec.promptVersion,
      grounded: schemaValidated,
      costTokens: output.usage.totalTokens,
      traceId,
      ranAt: new Date()
    })
  });
}