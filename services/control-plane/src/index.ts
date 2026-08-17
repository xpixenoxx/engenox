// index.ts — the control-plane service entry point (ADR-0007 M3-thin).
//
// The control-plane is the Temporal client that starts and manages the AtlasCycle.
// It NEVER touches a provider SDK directly — gateway is the ONLY model-touching surface.
// The control-plane calls the gateway's six seams via the generated ConnectRPC client.
//
// Tenant isolation: workflowId = tenantId + idempotencyKey (Temporal deduplication key).
// Trace propagation: traceId = workflow runId → SeamMeta.trace_id (11 §2e).
//
// Cites: 11 §2 (control-plane responsibilities) + 00 §2 inv 3 (Temporal owns loop)
//        + ADR-0007 (thin column: typed plan DAG, one real activity per phase).

import { create } from "@bufbuild/protobuf";
import type { MessageInitShape } from "@bufbuild/protobuf";
import { createConnectRouter } from "@connectrpc/connect";
import { connectNodeAdapter } from "@connectrpc/connect-node";
import { serve } from "@hono/node-server";
import { Client, Connection } from "@temporalio/client";
import { Hono } from "hono";

import {
  type CancelAtlasCycleRequestSchema,
  CancelAtlasCycleResponseSchema,
  ControlPlaneService,
  type GetAtlasCycleStatusRequestSchema,
  GetAtlasCycleStatusResponseSchema,
  GetAtlasCycleStatusResponse_Phase,
  type StartAtlasCycleRequestSchema,
  StartAtlasCycleResponseSchema,
} from "@engenox/contracts/service/v1/controlplane";

import type { IncomingMessage, ServerResponse } from "node:http";

const PORT = Number(process.env.PORT) || 8081;
const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS ?? "localhost:7233";
const GATEWAY_URL = process.env.GATEWAY_URL ?? "http://localhost:8080";
const TASK_QUEUE = "atlas-cycle";

// Temporal client (singleton)
let temporalClient: Client | null = null;

async function getTemporalClient(): Promise<Client> {
  if (!temporalClient) {
    const connection = await Connection.connect({ address: TEMPORAL_ADDRESS });
    temporalClient = new Client(connection);
  }
  return temporalClient;
}

// ============================================================================
// ConnectRPC handlers for ControlPlaneService
// ============================================================================

async function startAtlasCycleHandler(
  request: MessageInitShape<typeof StartAtlasCycleRequestSchema>,
): Promise<MessageInitShape<typeof StartAtlasCycleResponseSchema>> {
  const { tenantId, idempotencyKey, surfaceIds, brandCardOverride } = request;

  // Temporal workflowId = tenantId + idempotencyKey (deduplication key)
  const workflowId = `${tenantId}-${idempotencyKey}`;

  const client = await getTemporalClient();

  // Start the AtlasCycle workflow
  const handle = await client.workflow.start("atlasCycle", {
    taskQueue: TASK_QUEUE,
    workflowId,
    args: [request],
  });

  return create(StartAtlasCycleResponseSchema, {
    workflowId: handle.workflowId,
    runId: handle.firstExecutionRunId,
  });
}

async function getAtlasCycleStatusHandler(
  request: MessageInitShape<typeof GetAtlasCycleStatusRequestSchema>,
): Promise<MessageInitShape<typeof GetAtlasCycleStatusResponseSchema>> {
  const workflowId = request.workflowId ?? "";

  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);

  // Query the workflow for status
  const status = await handle.query<{
    phase: string;
    currentActivity: string;
    completedSurfaces: string[];
    traceId: string;
    errorMessage: string | null;
    startedAt: string;
    updatedAt: string;
  }>("getStatus");

  // Map workflow phase to protobuf enum
  const phaseMap: Record<string, GetAtlasCycleStatusResponse_Phase> = {
    PERCEPTION_RUNNING: GetAtlasCycleStatusResponse_Phase.PERCEPTION_RUNNING,
    DECISION_RUNNING: GetAtlasCycleStatusResponse_Phase.DECISION_RUNNING,
    ACTION_RUNNING: GetAtlasCycleStatusResponse_Phase.ACTION_RUNNING,
    MEASUREMENT_RUNNING: GetAtlasCycleStatusResponse_Phase.MEASUREMENT_RUNNING,
    COMPLETED: GetAtlasCycleStatusResponse_Phase.COMPLETED,
    FAILED: GetAtlasCycleStatusResponse_Phase.FAILED,
    CANCELLED: GetAtlasCycleStatusResponse_Phase.CANCELLED,
  };

  return create(GetAtlasCycleStatusResponseSchema, {
    phase: phaseMap[status.phase] ?? GetAtlasCycleStatusResponse_Phase.UNSPECIFIED,
    currentActivity: status.currentActivity,
    completedSurfaces: status.completedSurfaces,
    startedAt: { seconds: BigInt(Math.floor(new Date(status.startedAt).getTime() / 1000)), nanos: 0 },
    updatedAt: { seconds: BigInt(Math.floor(new Date(status.updatedAt).getTime() / 1000)), nanos: 0 },
    errorMessage: status.errorMessage ?? "",
  });
}

async function cancelAtlasCycleHandler(
  request: MessageInitShape<typeof CancelAtlasCycleRequestSchema>,
): Promise<MessageInitShape<typeof CancelAtlasCycleResponseSchema>> {
  const workflowId = request.workflowId ?? "";
  const reason = request.reason ?? "cancelled by control-plane";

  const client = await getTemporalClient();
  const handle = client.workflow.getHandle(workflowId);

  // Send cancel signal to workflow
  await handle.signal("cancel", reason);

  return create(CancelAtlasCycleResponseSchema, {
    cancelled: true,
  });
}

// ============================================================================
// Hono server setup with ConnectRPC
// ============================================================================

// Create Connect router with ControlPlaneService implementation
const router = createConnectRouter();
router.service(ControlPlaneService, {
  startAtlasCycle: startAtlasCycleHandler,
  getAtlasCycleStatus: getAtlasCycleStatusHandler,
  cancelAtlasCycle: cancelAtlasCycleHandler,
});

// Build the Connect handler (Node.js http handler)
const connectHandler = connectNodeAdapter({
  routes: (r) => r.service(ControlPlaneService, {
    startAtlasCycle: startAtlasCycleHandler,
    getAtlasCycleStatus: getAtlasCycleStatusHandler,
    cancelAtlasCycle: cancelAtlasCycleHandler,
  }),
});

// Type for the env bindings from @hono/node-server
type NodeBindings = {
  incoming: IncomingMessage;
  outgoing: ServerResponse;
};

const app = new Hono<{ Bindings: NodeBindings }>();

// Mount ConnectRPC handlers - use the Node.js incoming/outgoing from env
app.all("/controlplane.ControlPlaneService/*", async (c) => {
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
app.get("/health", (c) => c.json({ status: "ok", service: "control-plane" }));
app.get("/ready", (c) => c.json({ status: "ok", service: "control-plane" }));

// Start server
async function start(): Promise<void> {
	serve({
		fetch: app.fetch,
		port: PORT,
	});

	console.log(`[control-plane] listening on :${PORT}`);
	console.log(`[control-plane] Temporal: ${TEMPORAL_ADDRESS}`);
	console.log(`[control-plane] Gateway: ${GATEWAY_URL}`);
}

// Export for testing
export { start, app, getTemporalClient };

// Only start the server if this module is run directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
	start().catch((err) => {
		console.error("Failed to start server:", err);
		process.exit(1);
	});
}