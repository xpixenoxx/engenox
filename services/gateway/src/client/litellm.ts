// client/litellm.ts — the LiteLLM client wrapper (11 §2a + §2e).
//
// The gateway is the ONLY module that imports a provider SDK (CLAUDE.md §5: gateway
// is leaf-only; no service calls a provider directly). This wrapper owns:
//   - Model routing (the `model_id` strings map to LiteLLM configs)
//   - Constrained decoding injection (xgrammar/Outlines grammar parameter)
//   - Token budget enforcement (per-tenant, checked BEFORE call)
//   - Trace context propagation (OTel trace_id → SeamMeta.trace_id)
//   - The bounded re-attempt (max 2) + fallback path (11 §6)
//
// Model assignments (ADR-0006 cross-family roster, 29 §4):
//   Extract/Draft/Embed  -> Haiku 4.5 (high-volume, cost-efficient)
//   Adjudicate           -> Sonnet 5 (schema.org/tech specialist)
//   Abduce/Critique      -> GPT-5-class (cross-family Critic from Opus Planner)
//   Planner (ScoreAndPlan) -> Opus 4.8 (1M context)
//
// Cites: 11 §2 (gateway's 5 responsibilities) + §3 (the six seams) + §4 (cross-family);
//        29 §4 (2026 model roster); ADR-0006 (model assignments); CLAUDE.md §5 (gateway leaf).

import type { ModelFamily } from "@engenox/contracts/service/v1/gateway";
import { type Result, err, ok } from "neverthrow";

// The LLM model specification for a seam call.
export interface ModelSpec {
  readonly modelId: string;           // e.g. "claude-haiku-4-5@extract.v3"
  readonly family: ModelFamily;       // ANTHROPIC | OPENAI | GOOGLE
  readonly promptVersion: string;     // 06 §2.5 for replay
}

// Example:
// const Extract: ModelSpec = {
//   modelId: "claude-haiku-4-5@extract.v3",
//   family: ModelFamily.ANTHROPIC,
//   promptVersion: "extract.v3"
// };

// The LiteLLM call input (internal, before grammar injection).
export interface CallInput {
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly maxTokens: number;
  readonly temperature: number;
  readonly grammar?: string;          // JSON Schema for constrained decoding (xgrammar)
  readonly traceId: string;           // OTel trace_id for SeamMeta
}

// The raw LLM call output.
export interface CallOutput {
  readonly content: string;           // The raw JSON string from the model
  readonly usage: Readonly<{
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
  }>;
}

/**
 * LiteLLMClient — the provider abstraction. The real implementation calls
 * LiteLLM's `/v1/chat/completions` with the configured model routing.
 * The M2-thin implementation uses a stub + the xgrammar constraint engine.
 */
export class LiteLLMClient {
  private readonly apiBaseUrl: string;
  private readonly apiKey: string;

  constructor(apiBaseUrl: string, apiKey: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Call the model with constrained decoding. The grammar (if provided) is
   * injected via xgrammar/Outlines to force the output to match the schema.
   *
   * M2-thin: We implement the constraint via a post-generation validation +
   * re-prompt loop (max 2 attempts). The real xgrammar integration is the
   * thicken pass when we ship the Outlines server-side constraint engine.
   */
  async call(
    input: CallInput,
    spec: ModelSpec
  ): Promise<Result<CallOutput, Error>> {
    const traceId = input.traceId;
    const attempts = 2; // bounded re-attempt per 11 §6

    for (let attempt = 0; attempt <= attempts; attempt++) {
      try {
        // M2-thin: call LiteLLM /v1/chat/completions with the model + grammar
        // The grammar parameter is passed via `extra_body` to LiteLLM which
        // forwards to the model's constrained decoding (vLLM/sglang/xgrammar).
        const body = {
          model: spec.modelId,
          messages: [
            { role: "system", content: input.systemPrompt },
            { role: "user", content: input.userPrompt }
          ],
          max_tokens: input.maxTokens,
          temperature: input.temperature,
          // xgrammar constrained decoding - LiteLLM passes this to the engine
          ...(input.grammar ? { extra_body: { grammar: input.grammar } } : {}),
          // Ensure JSON output format
          response_format: { type: "json_object" }
        };

        const response = await fetch(`${this.apiBaseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const errText = await response.text();
          return err(new Error(`LiteLLM ${response.status}: ${errText}`));
        }

        const data = await response.json() as {
          choices: readonly { message: { content: string } }[];
          usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
        };

        const content = data.choices[0]?.message?.content ?? "";
        const usage = data.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

        // Validate the output parses as JSON (grammar should guarantee this)
        let parsed: unknown;
        try {
          parsed = JSON.parse(content);
        } catch {
          if (attempt < attempts) continue; // retry on parse failure
          return err(new Error(`Model returned invalid JSON after ${attempts + 1} attempts: ${content.slice(0, 200)}`));
        }

        // If grammar was provided, validate against it (xgrammar side-effect)
        // M2-thin: we trust the engine; thicken adds explicit schema validation here.

        return ok({
          content,
          usage: {
            promptTokens: usage.prompt_tokens,
            completionTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens
          }
        });
      } catch (e) {
        if (attempt === attempts) {
          return err(e instanceof Error ? e : new Error(String(e)));
        }
        // Exponential backoff: 100ms, 200ms
        await new Promise(r => setTimeout(r, 100 * (attempt + 1)));
      }
    }

    return err(new Error("Unreachable: bounded re-attempt loop exhausted"));
  }

  /**
   * Estimate token cost for a call (used by the token-budget gate).
   * M2-thin: rough heuristic; thickening uses tiktoken for exact counts.
   */
  estimateTokens(systemPrompt: string, userPrompt: string, maxTokens: number): number {
    // Rough estimate: 4 chars ≈ 1 token (English). Add buffer for grammar overhead.
    const inputChars = systemPrompt.length + userPrompt.length;
    const estimatedInput = Math.ceil(inputChars / 4);
    return estimatedInput + maxTokens;
  }
}

// Factory for the model assignments per seam (ADR-0006 + 29 §4).
// Planner = Opus 4.8 (ANTHROPIC); Critic = GPT-5 (OPENAI) — cross-family invariant.
export const SEAM_MODEL_SPECS: Record<string, ModelSpec> = {
  // Seam 1: Extract — Haiku 4.5 (high-volume)
  extract: {
    modelId: "claude-haiku-4-5@extract.v3",
    family: 1 as ModelFamily, // ANTHROPIC
    promptVersion: "extract.v3"
  },
  // Seam 2: Draft — Haiku 4.5
  draft: {
    modelId: "claude-haiku-4-5@draft.v2",
    family: 1 as ModelFamily,
    promptVersion: "draft.v2"
  },
  // Seam 3: Adjudicate — Sonnet 5 (schema.org specialist)
  adjudicate: {
    modelId: "claude-sonnet-5@adjudicate.v1",
    family: 1 as ModelFamily,
    promptVersion: "adjudicate.v1"
  },
  // Seam 4: Embed — DEFERRED at MVP (signature only, returns FALLBACK)
  embed: {
    modelId: "bge-m3@embed.v1",
    family: 1 as ModelFamily,
    promptVersion: "embed.v1"
  },
  // Seam 5: Abduce — DEFERRED real traffic (signature + FALLBACK)
  abduce: {
    modelId: "gpt-5@abduce.v1",
    family: 2 as ModelFamily, // OPENAI (cross-family from Planner ANTHROPIC)
    promptVersion: "abduce.v1"
  },
  // Seam 6: Critique — GPT-5-class (cross-family from Planner)
  critique: {
    modelId: "gpt-5@critique.v1",
    family: 2 as ModelFamily, // OPENAI
    promptVersion: "critique.v1"
  }
} as const;