// tokenBudget.ts — the per-tenant token budget gate (11 §2d).
//
// Every LLM call consumes from the tenant's budget. When exhausted, seams return
// FALLBACK (never silently fail). The budget is reset per billing cycle (Stripe
// subscription period). The gate uses an in-memory store for M2-thin; thickening
// swaps for Redis (Valkey) with atomic decrement.
//
// Cites: 11 §2d (cost control) + CLAUDE.md §8 (budget gate is a watchdog invariant).

import type { ModelSpec } from "../client/litellm.js";

export interface TokenBudget {
  tenantId: string;
  limit: number;        // monthly token limit (from plan)
  used: number;         // tokens consumed this cycle
  resetAt: Date;        // next billing cycle reset
}

export interface BudgetCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: Date;
}

/**
 * In-memory token budget store (M2-thin). Thickening: Valkey with
 * atomic decrement + TTL aligned to billing cycle.
 */
export class TokenBudgetStore {
  private readonly budgets = new Map<string, TokenBudget>();

  constructor(
    private readonly defaultLimit = 100_000,  // Starter plan default
    private readonly getPlanLimit: (tenantId: string) => number = () => 100_000
  ) {}

  async check(tenantId: string, estimatedTokens: number): Promise<BudgetCheckResult> {
    let budget = this.budgets.get(tenantId);
    const now = new Date();

    if (!budget || budget.resetAt <= now) {
      // New cycle or first time
      const limit = this.getPlanLimit(tenantId);
      budget = {
        tenantId,
        limit,
        used: 0,
        resetAt: new Date(now.getFullYear(), now.getMonth() + 1, 1) // monthly
      };
      this.budgets.set(tenantId, budget);
    }

    const remaining = budget.limit - budget.used;
    const allowed = remaining >= estimatedTokens;

    return {
      allowed,
      remaining: Math.max(0, remaining),
      limit: budget.limit,
      resetAt: budget.resetAt
    };
  }

  async consume(tenantId: string, tokens: number): Promise<void> {
    const budget = this.budgets.get(tenantId);
    if (budget) {
      budget.used += tokens;
    }
  }

  async getStatus(tenantId: string): Promise<BudgetCheckResult | null> {
    const budget = this.budgets.get(tenantId);
    if (!budget) return null;
    return {
      allowed: budget.used < budget.limit,
      remaining: Math.max(0, budget.limit - budget.used),
      limit: budget.limit,
      resetAt: budget.resetAt
    };
  }
}

/**
 * Estimate tokens for a seam call. M2-thin: heuristic based on model spec.
 * Thickening: tiktoken exact count.
 */
export function estimateTokensForSeam(
  spec: ModelSpec,
  systemPrompt: string,
  userPrompt: string,
  maxOutputTokens = 2048
): number {
  // 4 chars ≈ 1 token (English). Buffer for grammar overhead.
  const inputChars = systemPrompt.length + userPrompt.length;
  const estimatedInput = Math.ceil(inputChars / 4);
  return estimatedInput + maxOutputTokens;
}

// Budget gate middleware result (for router composition)
export interface BudgetGateResult {
  ok: boolean;
  budget: BudgetCheckResult | null;
  error?: string;
}

/**
 * The budget gate function — call before any LLM seam.
 * Returns FALLBACK-inducing result if budget exceeded.
 */
export async function budgetGate(
  store: TokenBudgetStore,
  tenantId: string,
  estimatedTokens: number
): Promise<BudgetGateResult> {
  const budget = await store.check(tenantId, estimatedTokens);
  if (!budget.allowed) {
    const used = budget.limit - budget.remaining;
    return {
      ok: false,
      budget,
      error: `Token budget exhausted (${used}/${budget.limit}). Resets ${budget.resetAt.toISOString()}. Seam will run in FALLBACK mode.`
    };
  }
  return { ok: true, budget };
}