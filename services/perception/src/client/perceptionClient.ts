// client/perceptionClient.ts — ConnectRPC client for PerceptionService.
//
// The control-plane (and Temporal activities) call PerceptionService via this client.
// Generated from contracts/proto/engenox/service/v1/service.proto.

import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import { PerceptionService } from "@engenox/contracts/service/v1/perception";

const PERCEPTION_URL = process.env.PERCEPTION_URL ?? "http://localhost:9090";

const transport = createConnectTransport({
  baseUrl: PERCEPTION_URL,
  httpVersion: "1.1",
});

export const perceptionClient = createClient(PerceptionService as any, transport);

// Helper to call ProbeSurface
export async function probeSurface(input: {
  tenantId: string;
  surface: number; // Surface enum
  idempotencyKey: string;
}) {
  return (perceptionClient as any).probeSurface({
    tenantId: input.tenantId,
    surface: input.surface,
    idempotencyKey: input.idempotencyKey,
  });
}

// Helper to call Assert (direct KG write)
export async function assertNode(input: {
  node: any; // AssertedNode
  idempotencyKey: string;
}) {
  return (perceptionClient as any).assert({
    node: input.node,
    idempotencyKey: input.idempotencyKey,
  });
}