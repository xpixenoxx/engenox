// index.ts — the gateway service entry point (CLAUDE.md §5: gateway is leaf-only).
//
// Server-to-server only: the control-plane calls these endpoints after validating
// the WorkOS JWT + injecting tenant_id from the session. The web client NEVER
// calls these directly (watchdog cat-4: client-supplied tenant_id).
//
// OTel: spans propagate trace_id → SeamMeta.trace_id (11 §2e).
// Budget: TokenBudgetStore enforces per-tenant limits (11 §2d).
// Constrained decoding: Extract seam uses grammar + post-hoc validation (ADR-0007 M2-thin).

import { serve } from "@hono/node-server";
import { LiteLLMClient, SEAM_MODEL_SPECS } from "./client/litellm.js";
import { DEFAULT_PREDICATES } from "./constraints/extract.js";
import { TokenBudgetStore } from "./middleware/tokenBudget.js";
import { type GatewayEnv, app } from "./router/index.js";

const PORT = Number(process.env.PORT) ?? 8080;
const LITELLM_BASE_URL = process.env.LITELLM_BASE_URL ?? "http://localhost:4000";
const LITELLM_API_KEY = process.env.LITELLM_API_KEY ?? "dev-key";

// Build the gateway environment
const env: GatewayEnv = {
  llm: new LiteLLMClient(LITELLM_BASE_URL, LITELLM_API_KEY),
  budget: new TokenBudgetStore(
    100_000, // default Starter limit
    (tenantId: string): number => {
      // Plan-based limits (MVP: Starter=100k, Growth=500k, Enterprise=2M)
      // Control-plane passes plan via header or env; M2-thin uses defaults.
      const planLimits: Record<string, number> = {
        starter: 100_000,
        growth: 500_000,
        enterprise: 2_000_000
      };
      const plan = process.env[`TENANT_${tenantId.toUpperCase()}_PLAN`] ?? "starter";
      return (planLimits[plan] ?? planLimits.starter) as number;
    }
  ),
  predicateWhitelist: [...DEFAULT_PREDICATES] // M2-thin: base predicates; thickening: per-tenant SHACL
};

// Inject env into Hono via middleware
app.use("*", async (c, next) => {
  c.env = env;
  await next();
});

serve({
  fetch: app.fetch,
  port: PORT
});

console.log(`[gateway] listening on :${PORT}`);
console.log(`[gateway] LiteLLM: ${LITELLM_BASE_URL}`);
console.log(`[gateway] Model assignments:`);
for (const [seam, spec] of Object.entries(SEAM_MODEL_SPECS)) {
  console.log(`  ${seam}: ${spec.modelId} (family=${spec.family})`);
}