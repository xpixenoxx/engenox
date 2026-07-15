// router/index.ts — the Hono HTTP router for the GatewayService (24 §3, CLAUDE.md §5).
//
// The gateway is the ONLY model-touching surface (leaf-only pattern). It exposes
// the six seams as HTTP endpoints called by the control-plane via the generated
// gRPC client (pkg/contracts/proto/engenox/service/v1/gateway.proto). The web
// client NEVER calls these directly — the control-plane is the trusted edge.
//
// Auth: WorkOS JWT validated by the control-plane; tenant_id injected from
// validated session. The gateway NEVER trusts client-supplied tenant_id
// (watchdog cat-4 + CLAUDE.md §7/§8).
//
// OTel: every request opens a span; trace_id propagates to SeamMeta (11 §2e).

import { create } from "@bufbuild/protobuf";
import {
  AbduceRequestSchema,
  AdjudicateRequestSchema,
  CritiqueRequestSchema,
  DraftRequestSchema,
  EmbedRequestSchema,
  ExtractRequestSchema
} from "@engenox/contracts/service/v1/gateway";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { LiteLLMClient } from "../client/litellm.js";
import type { TokenBudgetStore } from "../middleware/tokenBudget.js";
import { runAbduce } from "../seams/abduce.js";
import { AdjudicateDeps, runAdjudicate } from "../seams/adjudicate.js";
import { type CritiqueDeps, runCritique } from "../seams/critique.js";
import { runDraft } from "../seams/draft.js";
import { runEmbed } from "../seams/embed.js";
import { type ExtractDeps, runExtract } from "../seams/extract.js";

export interface GatewayEnv {
  llm: LiteLLMClient;
  budget: TokenBudgetStore;
  predicateWhitelist: string[];
}

const app = new Hono<{ Variables: { traceId: string } }>();

// Middleware: extract trace_id from header for OTel propagation
app.use("*", async (c, next) => {
  const traceId = c.req.header("x-trace-id") ?? crypto.randomUUID();
  c.set("traceId", traceId);
  await next();
});

// Zod schemas for input validation (match the protobuf messages)
const ExtractRequestZod = z.object({
  tenantId: z.string().uuid(),
  answer: z.object({}).passthrough(), // AnswerEvent - validated downstream
  knownEntityIds: z.array(z.string()).default([]),
  idempotencyKey: z.string().min(1)
});

const DraftRequestZod = z.object({
  tenantId: z.string().uuid(),
  brandCard: z.object({}).passthrough(),
  interventionType: z.number().int(),
  gapEntityIds: z.array(z.string()).default([]),
  targetsConflictId: z.string().min(1),
  targetSurface: z.number().int(),
  targetQuery: z.string().min(1),
  idempotencyKey: z.string().min(1)
});

const AdjudicateRequestZod = z.object({
  tenantId: z.string().uuid(),
  brandTruthNodeId: z.string().min(1),
  surfaceAssertionId: z.string().min(1),
  candidateTypes: z.array(z.number().int()).min(1),
  idempotencyKey: z.string().min(1)
});

const EmbedRequestZod = z.object({
  tenantId: z.string().uuid(),
  texts: z.array(z.string()).min(1),
  idempotencyKey: z.string().min(1)
});

const AbduceRequestZod = z.object({
  tenantId: z.string().uuid(),
  conflictIds: z.array(z.string()).min(1),
  idempotencyKey: z.string().min(1)
});

const CritiqueRequestZod = z.object({
  tenantId: z.string().uuid(),
  intervention: z.object({}).passthrough(),
  plannerFamily: z.number().int().min(1).max(3),
  idempotencyKey: z.string().min(1)
});

// Seam 1: Extract
app.post("/v1/extract", zValidator("json", ExtractRequestZod), async (c) => {
  const req = c.req.valid("json");
  const env = c.env as GatewayEnv;

  const request = create(ExtractRequestSchema, {
    tenantId: req.tenantId,
    answer: req.answer,
    knownEntityIds: req.knownEntityIds,
    idempotencyKey: req.idempotencyKey
  });

  const deps: ExtractDeps = {
    llm: env.llm,
    budget: env.budget,
    predicateWhitelist: env.predicateWhitelist
  };

  const response = await runExtract(request, deps);

  c.header("x-trace-id", response.meta?.traceId ?? "");
  return c.json(response);
});

// Seam 2: Draft
app.post("/v1/draft", zValidator("json", DraftRequestZod), async (c) => {
  const req = c.req.valid("json");
  const env = c.env as GatewayEnv;

  const request = create(DraftRequestSchema, {
    tenantId: req.tenantId,
    brandCard: req.brandCard,
    interventionType: req.interventionType,
    gapEntityIds: req.gapEntityIds,
    targetsConflictId: req.targetsConflictId,
    targetSurface: req.targetSurface,
    targetQuery: req.targetQuery,
    idempotencyKey: req.idempotencyKey
  });

  const response = await runDraft(request, {
    llm: env.llm,
    budget: env.budget
  });

  c.header("x-trace-id", response.meta?.traceId ?? "");
  return c.json(response);
});

// Seam 3: Adjudicate
app.post("/v1/adjudicate", zValidator("json", AdjudicateRequestZod), async (c) => {
  const req = c.req.valid("json");
  const env = c.env as GatewayEnv;

  const request = create(AdjudicateRequestSchema, {
    tenantId: req.tenantId,
    brandTruthNodeId: req.brandTruthNodeId,
    surfaceAssertionId: req.surfaceAssertionId,
    candidateTypes: req.candidateTypes,
    idempotencyKey: req.idempotencyKey
  });

  const response = await runAdjudicate(
    { llm: env.llm, budget: env.budget },
    request
  );

  c.header("x-trace-id", response.meta?.traceId ?? "");
  return c.json(response);
});

// Seam 4: Embed (deferred → FALLBACK)
app.post("/v1/embed", zValidator("json", EmbedRequestZod), async (c) => {
  const req = c.req.valid("json");
  const env = c.env as GatewayEnv;

  const request = create(EmbedRequestSchema, {
    tenantId: req.tenantId,
    texts: req.texts,
    idempotencyKey: req.idempotencyKey
  });

  const response = await runEmbed(request, { budget: env.budget });

  c.header("x-trace-id", response.meta?.traceId ?? "");
  return c.json(response);
});

// Seam 5: Abduce (deferred → FALLBACK)
app.post("/v1/abduce", zValidator("json", AbduceRequestZod), async (c) => {
  const req = c.req.valid("json");
  const env = c.env as GatewayEnv;

  const request = create(AbduceRequestSchema, {
    tenantId: req.tenantId,
    conflictIds: req.conflictIds,
    idempotencyKey: req.idempotencyKey
  });

  const response = await runAbduce(request, { budget: env.budget });

  c.header("x-trace-id", response.meta?.traceId ?? "");
  return c.json(response);
});

// Seam 6: Critique
app.post("/v1/critique", zValidator("json", CritiqueRequestZod), async (c) => {
  const req = c.req.valid("json");
  const env = c.env as GatewayEnv;

  const request = create(CritiqueRequestSchema, {
    tenantId: req.tenantId,
    intervention: req.intervention,
    plannerFamily: req.plannerFamily,
    idempotencyKey: req.idempotencyKey
  });

  const deps: CritiqueDeps = {
    llm: env.llm,
    budget: env.budget,
    plannerFamily: req.plannerFamily
  };

  const response = await runCritique(deps, request);

  c.header("x-trace-id", response.meta?.traceId ?? "");
  return c.json(response);
});

// Health check (no auth, used by infra)
app.get("/health", (c) => c.json({ status: "ok", service: "gateway" }));

export type AppType = typeof app;
export { app };