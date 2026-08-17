// modules/r2/auth-proxy.js — Cloudflare Worker for stage auth proxy (M7 T01).
//
// Validates WorkOS JWT (JWKS from WorkOS), evaluates Cedar policy via Vault-backed Cedar endpoint,
// proxies authorized requests to the gateway. The Worker runs on Cloudflare's edge; the Cedieval
// call is a sub-request to the Cedar gate service (or Vault auth method).

import { validateJWT } from "workos-jwt"; // hypothetical import; actual lib TBD at M2

const CEDAR_ENDPOINT = "https://stage-cedar.engenox.workers.dev/decide"; // stage Cedar gate
const GATEWAY_ENDPOINT = "https://stage.api.engenox.dev"; // stage gateway

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Extract JWT from Authorization header
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized: missing Bearer token", { status: 401 });
    }
    const token = authHeader.slice(7);

    // 2. Validate JWT via WorkOS JWKS (cached in Worker KV)
    let claims;
    try {
      claims = await validateJWT(token, { jwksUri: env.WORKOS_JWKS_URI, audience: env.WORKOS_AUDIENCE });
    } catch (e) {
      return new Response(`Unauthorized: invalid JWT - ${e.message}`, { status: 401 });
    }

    const tenantId = claims.org_id || claims.tenant_id; // WorkOS org_id maps to Engenox tenant_id
    if (!tenantId) {
      return new Response("Unauthorized: missing tenant/org claim", { status: 401 });
    }

    // 3. Cedar authorization: tuple (principal, action, resource)
    const principal = `Tenant::"${tenantId}"`;
    const action = `Action::"${url.pathname.split('/')[1]}"`; // e.g., "atlas-cycle:Start"
    const resource = `Resource::"${tenantId}"`;

    const cedarResp = await fetch(CEDAR_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${env.CEDAR_API_TOKEN}` },
      body: JSON.stringify({ principal, action, resource, context: { dial: "propose" } }),
    });

    if (!cedarResp.ok) {
      const err = await cedarResp.text();
      return new Response(`Forbidden: Cedar policy denied - ${err}`, { status: 403 });
    }

    const { decision } = await cedarResp.json();
    if (decision !== "allow") {
      return new Response("Forbidden: Cedar policy denied", { status: 403 });
    }

    // 4. Proxy to gateway (preserve headers, add tenant context)
    const gatewayReq = new Request(`${GATEWAY_ENDPOINT}${url.pathname}${url.search}`, {
      method: request.method,
      headers: {
        ...Object.fromEntries(request.headers),
        "X-Engenox-Tenant": tenantId,
        "X-Engenox-Dial": "propose",
      },
      body: request.body,
      redirect: "manual",
    });

    return fetch(gatewayReq);
  },
};