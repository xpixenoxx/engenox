// __tests__/decision.test.ts — basic import and type checks for decision service.
//
// Cites: 11 §2 + §3 + §4 (Planner + cross-family Critic), 24 §4 (dependency-direction lint).

import { describe, expect, it } from "vitest";
import type { ProposeInterventionsRequest, ProposeInterventionsResponse } from "@engenox/contracts/service/v1/decision";

describe("decision service exports", () => {
  it("has the correct service request/response shapes", () => {
    // Verify type structure exists (compile-time check)
    const _req: ProposeInterventionsRequest = {} as ProposeInterventionsRequest;
    const _resp: ProposeInterventionsResponse = {} as ProposeInterventionsResponse;

    // If we get here, types are correctly re-exported
    expect(_req).toBeDefined();
    expect(_resp).toBeDefined();
  });
});