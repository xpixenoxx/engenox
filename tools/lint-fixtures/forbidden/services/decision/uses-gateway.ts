// DELIBERATELY FORBIDDEN FIXTURE — do not import, do not fix.
// A non-gateway service (decision) importing services/gateway's internals — the forbidden
// leaf-only breach (24 §3). Gateway is leaf-only: only gateway imports gateway. This trips
// dependency-cruiser's `gateway-leaf-only` rule.
import { sdk } from "../gateway/sdk.js";

export const useGateway = () => sdk;
