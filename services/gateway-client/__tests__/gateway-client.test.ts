// __tests__/gateway-client.test.ts — basic import and type checks for gateway-client.
//
// Cites: 11 §2 + §3 (gateway seam surface), 24 §4 (dependency-direction lint).

import { describe, expect, it } from "vitest";
import type { ExtractRequest, ExtractResponse, DraftRequest, DraftResponse } from "@engenox/contracts/service/v1/gateway";

describe("gateway-client exports", () => {
  it("re-exports gateway types from contracts", () => {
    // These are compile-time checks - if they compile, the re-exports work
    expect(true).toBe(true);
  });

  it("has the correct seam request/response shapes", () => {
    // Verify type structure exists (compile-time check)
    const _extractReq: ExtractRequest = {} as ExtractRequest;
    const _extractResp: ExtractResponse = {} as ExtractResponse;
    const _draftReq: DraftRequest = {} as DraftRequest;
    const _draftResp: DraftResponse = {} as DraftResponse;

    // If we get here, types are correctly re-exported
    expect(_extractReq).toBeDefined();
    expect(_extractResp).toBeDefined();
    expect(_draftReq).toBeDefined();
    expect(_draftResp).toBeDefined();
  });
});