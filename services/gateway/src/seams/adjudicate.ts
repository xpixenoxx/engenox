// seams/adjudicate.ts — Seam 3: Adjudicate (11 §3).
//
// Constrained choice among the ConflictType classes the symbolic Reconciler
// already enumerated (06 §2.3 + 06 §5 step 4). Never free-generates a class.
//
// Cites: 11 §3 seam 3 + 06 §2.3 (ConflictType) + ADR-0007 M2-thin.

import { create } from "@bufbuild/protobuf";
import { type Timestamp, TimestampSchema } from "@bufbuild/protobuf/wkt";
import { ConflictType } from "@engenox/contracts/entity/v1/conflict";
import {
  type AdjudicateRequest,
  AdjudicateResponseSchema,
  ModelFamily,
  type SeamMeta,
  SeamMetaSchema,
  SeamStatus
} from "@engenox/contracts/service/v1/gateway";
import type { AdjudicateResponse } from "@engenox/contracts/service/v1/gateway";
import { type CallInput, type CallOutput, type LiteLLMClient, type ModelSpec, SEAM_MODEL_SPECS } from "../client/litellm.js";
import { type TokenBudgetStore, budgetGate } from "../middleware/tokenBudget.js";

export interface AdjudicateDeps {
  llm: LiteLLMClient;
  budget: TokenBudgetStore;
}

const spec: ModelSpec = SEAM_MODEL_SPECS.adjudicate ?? { modelId: "unknown", family: ModelFamily.UNSPECIFIED, promptVersion: "unknown" };

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
  }) as SeamMeta;
}

function timestampFromDate(date: Date): Timestamp {
  return create(TimestampSchema, {
    seconds: BigInt(Math.floor(date.getTime() / 1000)),
    nanos: date.getMilliseconds() * 1_000_000
  });
}

function fallbackAdjudicate(
  request: AdjudicateRequest,
  traceId: string,
  modelId: string,
  family: ModelFamily,
  promptVersion: string,
  tokens: number
): AdjudicateResponse {
  return create(AdjudicateResponseSchema, {
    conflictType: request.candidateTypes[0] ?? ConflictType.UNSPECIFIED,
    severity: 0.5,
    explainer: "Adjudication fell back to symbolic default — LLM unavailable/budget exhausted.",
    meta: createSeamMeta({
      status: SeamStatus.FALLBACK,
      modelId,
      family,
      promptVersion,
      grounded: false,
      costTokens: tokens,
      traceId,
      ranAt: new Date()
    })
  });
}

export async function runAdjudicate(
  deps: AdjudicateDeps,
  request: AdjudicateRequest
): Promise<AdjudicateResponse> {
  const estimate = 1024;
  const gate = await budgetGate(deps.budget, request.tenantId, estimate);
  if (!gate.ok) {
    return fallbackAdjudicate(request, request.idempotencyKey, spec.modelId, spec.family, spec.promptVersion, 0);
  }

  const prompt = `You adjudicate a knowledge conflict. Choose ONE conflict type from the candidates.

CANDIDATE CONFLICT TYPES:
${request.candidateTypes.map((ct, i) => `${i + 1}. ${ct}`).join("\n")}

BRAND-TRUTH NODE: ${request.brandTruthNodeId}
SURFACE ASSERTION: ${request.surfaceAssertionId}

Output ONLY valid JSON:
{
  "conflict_type": <chosen enum value>,
  "severity": <0.0 to 1.0>,
  "explainer": "<one paragraph>"
}`;

  let output: CallOutput | null = null;

  for (let attempt = 0; attempt <= 2; attempt++) {
    const callInput: CallInput = {
      systemPrompt: "You adjudicate conflicts. Output ONLY valid JSON matching the schema.",
      userPrompt: prompt,
      maxTokens: 1024,
      temperature: 0.0,
      traceId: request.idempotencyKey
    };
    const result = await deps.llm.call(callInput, spec);
    if (result.isOk()) {
      output = result.value;
      break;
    }
    if (attempt === 2) {
      return fallbackAdjudicate(request, request.idempotencyKey, spec.modelId, spec.family, spec.promptVersion, 0);
    }
  }

  if (!output) {
    return fallbackAdjudicate(request, request.idempotencyKey, spec.modelId, spec.family, spec.promptVersion, 0);
  }

  try {
    const parsed = JSON.parse(output.content) as {
      conflict_type: ConflictType;
      severity: number;
      explainer: string;
    };

    if (!request.candidateTypes.includes(parsed.conflict_type)) {
      return fallbackAdjudicate(request, request.idempotencyKey, spec.modelId, spec.family, spec.promptVersion, output.usage.totalTokens);
    }

    await deps.budget.consume(request.tenantId, output.usage.totalTokens);

    return create(AdjudicateResponseSchema, {
      conflictType: parsed.conflict_type,
      severity: Math.max(0, Math.min(1, parsed.severity)),
      explainer: parsed.explainer ?? "No explainer provided.",
      meta: createSeamMeta({
        status: SeamStatus.OK,
        modelId: spec.modelId,
        family: spec.family,
        promptVersion: spec.promptVersion,
        grounded: true,
        costTokens: output.usage.totalTokens,
        traceId: request.idempotencyKey,
        ranAt: new Date()
      })
    });
  } catch {
    return fallbackAdjudicate(request, request.idempotencyKey, spec.modelId, spec.family, spec.promptVersion, output.usage.totalTokens);
  }
}