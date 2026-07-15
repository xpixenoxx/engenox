// index.ts — the DecisionService entry point (M3-thin, ADR-0007).
//
// The Decision layer is the Planner: for each conflict, it orchestrates
// Adjudicate (constrained ConflictType choice) → Draft (artifact) → Critique (cross-family).
// It NEVER touches a provider SDK directly — gateway is the ONLY model-touching surface.
// The ControlPlane calls DecisionService.ProposeInterventions via generated gRPC client.
//
// Cites: 11 §2/§3/§4 (Planner + cross-family Critic), 24 §3 (service boundary), CLAUDE.md §5.

import { serve } from "@hono/node-server";
import { createConnectRouter } from "@connectrpc/connect";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import { Hono } from "hono";
import type { IncomingMessage, ServerResponse } from "node:http";

import { DecisionService } from "@engenox/contracts/service/v1/decision";
import {
  proposeInterventionsHandler,
  getDecisionTraceHandler,
} from "./server/decisionService.js";
import type { MessageInitShape } from "@bufbuild/protobuf";
import { ProposeInterventionsRequestSchema, GetDecisionTraceRequestSchema } from "@engenox/contracts/service/v1/decision";

const PORT = Number(process.env.PORT) ?? 8082;
const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:8080";

// Create Connect router with DecisionService implementation (function handlers)
// The handlers close over GATEWAY_URL via closure
const router = createConnectRouter();
router.service(DecisionService, {
  proposeInterventions: (req: MessageInitShape<typeof ProposeInterventionsRequestSchema>) => proposeInterventionsHandler(req, GATEWAY_URL),
  getDecisionTrace: (req: MessageInitShape<typeof GetDecisionTraceRequestSchema>) => getDecisionTraceHandler(req),
});

// Build the Connect handler (Node.js http handler)
const connectHandler = connectNodeAdapter({
  routes: (r) => r.service(DecisionService, {
    proposeInterventions: (req: MessageInitShape<typeof ProposeInterventionsRequestSchema>) => proposeInterventionsHandler(req, GATEWAY_URL),
    getDecisionTrace: (req: MessageInitShape<typeof GetDecisionTraceRequestSchema>) => getDecisionTraceHandler(req),
  }),
});

type NodeBindings = {
  incoming: IncomingMessage;
  outgoing: ServerResponse;
};

const app = new Hono<{ Bindings: NodeBindings }>();

// Mount ConnectRPC handlers - use the Node.js incoming/outgoing from env
app.all("/engenox.service.v1.DecisionService/*", async (c) => {
  const env = c.env;

  // Call the Connect handler with Node.js request/response
  await new Promise<void>((resolve, reject) => {
    try {
      connectHandler(env.incoming, env.outgoing);
      env.outgoing.on("finish", () => resolve());
      env.outgoing.on("close", () => resolve());
      env.outgoing.on("error", (err: Error) => reject(err));
    } catch (err) {
      reject(err);
    }
  });

  // Return empty response - the Connect handler wrote to env.outgoing directly
  return c.body(null, 200);
});

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok", service: "decision" }));

// Start server
serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`[decision] listening on :${PORT}`);
console.log(`[decision] gateway: ${GATEWAY_URL}`);