// web/src/lib/connect/connect-client.ts
// ConnectRPC client setup for web app - connects to control-plane and gateway via ConnectRPC
// Uses @connectrpc/connect-next for Next.js 16 App Router (server components + client components)

import { createClient, type Client } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-web';
import { ControlPlaneService } from '@engenox/contracts/service/v1/controlplane';
import { GatewayService } from '@engenox/contracts/service/v1/gateway';

// Transport configuration - in production these come from env vars
const CONTROL_PLANE_URL = process.env.NEXT_PUBLIC_CONTROL_PLANE_URL ?? 'http://localhost:8081';
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL ?? 'http://localhost:8080';

function createTransport(baseUrl: string) {
  return createConnectTransport({
    baseUrl,
    useBinaryFormat: false, // Connect-web: JSON for browser, binary for server
    // For Next.js server components, we use the same transport but with node fetch
    // The connect-next adapter handles this automatically
  });
}

// Server-side clients (for Server Components / API routes)
let serverControlPlaneClient: Client<typeof ControlPlaneService> | null = null;
let serverGatewayClient: Client<typeof GatewayService> | null = null;

export function getServerControlPlaneClient() {
  if (!serverControlPlaneClient) {
    serverControlPlaneClient = createClient(
      ControlPlaneService,
      createTransport(CONTROL_PLANE_URL),
    );
  }
  return serverControlPlaneClient;
}

export function getServerGatewayClient() {
  if (!serverGatewayClient) {
    serverGatewayClient = createClient(
      GatewayService,
      createTransport(GATEWAY_URL),
    );
  }
  return serverGatewayClient;
}

// Client-side Transport (for 'use client' components)
let clientTransport: ReturnType<typeof createConnectTransport> | null = null;

function getClientTransport(baseUrl: string) {
  if (!clientTransport) {
    clientTransport = createConnectTransport({
      baseUrl,
      useBinaryFormat: false,
    });
  }
  return clientTransport;
}

let clientControlPlaneClient: Client<typeof ControlPlaneService> | null = null;
let clientGatewayClient: Client<typeof GatewayService> | null = null;

export function getClientControlPlaneClient() {
  if (!clientControlPlaneClient) {
    clientControlPlaneClient = createClient(
      ControlPlaneService,
      getClientTransport(CONTROL_PLANE_URL),
    );
  }
  return clientControlPlaneClient;
}

export function getClientGatewayClient() {
  if (!clientGatewayClient) {
    clientGatewayClient = createClient(
      GatewayService,
      getClientTransport(GATEWAY_URL),
    );
  }
  return clientGatewayClient;
}

// Type exports for convenience
export type { ControlPlaneService, GatewayService };