// client/decisionClient.ts — ConnectRPC client for DecisionService.
//
// The control-plane (and Temporal activities) call DecisionService via this client.
// Generated from contracts/proto/engenox/service/v1/decision.proto.

import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-node";
import { DecisionService } from "@engenox/contracts/service/v1/decision";

const DECISION_URL = process.env.DECISION_URL ?? "http://localhost:9091";

const transport = createConnectTransport({
  baseUrl: DECISION_URL,
  httpVersion: "1.1",
});

export const decisionClient = createClient(DecisionService, transport);

// Helper to call ProposeInterventions
export async function proposeInterventions(input: {
  tenantId: string;
  conflictIds: string[];
  brandCard: { /* BrandCard structure */ };
  idempotencyKey: string;
}) {
  return decisionClient.proposeInterventions({
    tenantId: input.tenantId,
    conflictIds: input.conflictIds,
    brandCard: input.brandCard as any, // cast - proper typing when generated
    idempotencyKey: input.idempotencyKey,
  });
}

// Helper to call GetDecisionTrace
export async function getDecisionTrace(input: { traceId: string }) {
  return decisionClient.getDecisionTrace({
    traceId: input.traceId,
  });
}