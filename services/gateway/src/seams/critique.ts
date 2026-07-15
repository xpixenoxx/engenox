// seams/critique.ts — Seam 6: Critique (11 §3 + §4).
//
// Cross-family from the Planner's family; may VETO or DEMAND-REPLAN (11 §4).
// The Critic's surviving objections render on Panel 5 (19 §3). The verifier
// reGroundCritique enforces the cross-family invariant (Critic family != Planner family).
//
// M2-thin: constrained decoding on the Critique verdict enum; signature +
// FALLBACK present. Cross-family routing (GPT-class Critic vs Opus Planner).
//
// Cites: 11 §3 seam 6 + §4 (cross-family) + 19 §3 Panel 5 + ADR-0006 (Opus Planner, GPT-5 Critic).

import { create } from "@bufbuild/protobuf";
import { type Timestamp, TimestampSchema } from "@bufbuild/protobuf/wkt";
import {
  CriticObjectionSchema,
  CriticVerdict,
  type CritiqueRequest,
  CritiqueResponseSchema,
  ModelFamily,
  type SeamMeta,
  SeamMetaSchema,
  SeamStatus
} from "@engenox/contracts/service/v1/gateway";
import type { CriticObjection, CritiqueResponse } from "@engenox/contracts/service/v1/gateway";
import { reGroundCritique } from "@engenox/verifier/verifier";
import { type CallInput, type CallOutput, type LiteLLMClient, type ModelSpec, SEAM_MODEL_SPECS } from "../client/litellm.js";
import { type TokenBudgetStore, budgetGate } from "../middleware/tokenBudget.js";

export interface CritiqueDeps {
  llm: LiteLLMClient;
  budget: TokenBudgetStore;
  plannerFamily: ModelFamily;
}

const spec: ModelSpec = SEAM_MODEL_SPECS.critique ?? { modelId: "unknown", family: ModelFamily.UNSPECIFIED, promptVersion: "unknown" };

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

function fallbackCritique(request: CritiqueRequest, traceId: string, plannerFamily: ModelFamily): CritiqueResponse {
  return create(CritiqueResponseSchema, {
    verdict: CriticVerdict.ACCEPT_WITH_RESERVATIONS,
    objections: [],
    criticFamily: spec.family,
    summary: "Critique fell back to symbolic acceptor — Critic model unavailable/budget exhausted. Proceed with human review.",
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

/**
 * Critique seam — attacks an intervention; cross-family from Planner.
 * Returns VETO / DEMAND_REPLAN / ACCEPT_WITH_RESERVATIONS + objections (Panel 5).
 */
export async function runCritique(
  deps: CritiqueDeps,
  request: CritiqueRequest
): Promise<CritiqueResponse> {
  const traceId = request.idempotencyKey;

  // Budget gate
  const estimate = 4096; // Critique needs more tokens
  const gate = await budgetGate(deps.budget, request.tenantId, estimate);
  if (!gate.ok) {
    return fallbackCritique(request, traceId, deps.plannerFamily);
  }

  // Build the critique prompt with intervention details
  const intervention = request.intervention as Record<string, unknown>;
  const prompt = `You are the CRITIC — an adversarial reviewer from a DIFFERENT model family than the Planner.

PLANNER FAMILY: ${ModelFamily[deps.plannerFamily]}
YOUR FAMILY: ${ModelFamily[spec.family]} — MUST DIFFER from Planner (cross-family invariant, 11 §4).

INTERVENTION TO CRITIQUE:
${JSON.stringify(intervention, null, 2)}

Your task: Identify fatal flaws, counterfactuals the Planner missed, or demand a replan.
Consider perturbations from the SCM (11 §4): "What if Bing reindexes mid-window?", "What if the competitor updates their content?"

VERDICTS:
1 = ACCEPT_WITH_RESERVATIONS (survives; reservations render on Panel 5)
2 = DEMAND_REPLAN (redraft with specific objection)
3 = VETO (refuse; Planner redrafts OR human escalates — NEVER LLM tiebreaker, 11 §4)

Output ONLY valid JSON:
{
  "verdict": <1|2|3>,
  "objections": [
    {"perturbation": "...", "estimator_impact": "...", "symptom": "..."}
  ],
  "summary": "<one paragraph for PR preview>"
}`;

  let output: CallOutput | null = null;

  for (let attempt = 0; attempt <= 2; attempt++) {
    const callInput: CallInput = {
      systemPrompt: "You are the cross-family Critic. Output ONLY valid JSON matching the schema.",
      userPrompt: prompt,
      maxTokens: 4096,
      temperature: 0.2,
      traceId
    };
    const result = await deps.llm.call(callInput, spec);
    if (result.isOk()) {
      output = result.value;
      break;
    }
    if (attempt === 2) {
      return fallbackCritique(request, traceId, deps.plannerFamily);
    }
  }

  if (!output) {
    return fallbackCritique(request, traceId, deps.plannerFamily);
  }

  try {
    const parsed = JSON.parse(output.content) as {
      verdict: CriticVerdict;
      objections: Array<{
        perturbation: string;
        estimator_impact: string;
        symptom: string;
      }>;
      summary: string;
    };

    // Build proper CriticObjection array using create()
    const objections: CriticObjection[] = (parsed.objections ?? []).map((o) =>
      create(CriticObjectionSchema, {
        perturbation: o.perturbation,
        estimatorImpact: o.estimator_impact,
        symptom: o.symptom
      })
    );

    // Re-ground: cross-family invariant + family spec check
    const critiqueResponse = create(CritiqueResponseSchema, {
      verdict: parsed.verdict,
      objections,
      criticFamily: spec.family,
      summary: parsed.summary ?? "",
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

    const reground = reGroundCritique(critiqueResponse, deps.plannerFamily);

    if (reground.isErr()) {
      return fallbackCritique(request, traceId, deps.plannerFamily);
    }

    await deps.budget.consume(request.tenantId, output.usage.totalTokens);

    return critiqueResponse;
  } catch {
    return fallbackCritique(request, traceId, deps.plannerFamily);
  }
}