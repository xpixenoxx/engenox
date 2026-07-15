// __tests__/control-plane.test.ts — minimal control-plane service tests (M3-thin).
//
// Tests that the control-plane service imports without errors and
// the ConnectRPC handlers are correctly wired.

import { describe, it, expect } from "vitest";
import { create } from "@bufbuild/protobuf";

describe("control-plane service imports", () => {
  it("should import the main entry point", async () => {
    // The main entry point should be importable without Temporal running
    // (we're just testing type safety and exports)
    // We need to set PORT env var to avoid NaN
    process.env.PORT = "8081";
    const mod = await import("../src/index.js");
    // If import succeeds, the service structure is correct
    expect(mod).toBeDefined();
  }, { timeout: 10000 });

  it("should have ControlPlaneService schema available", async () => {
    const { ControlPlaneService } = await import(
      "@engenox/contracts/service/v1/controlplane"
    );
    expect(ControlPlaneService).toBeDefined();
    expect(ControlPlaneService.typeName).toBe("engenox.service.v1.ControlPlaneService");
  });

  it("should have StartAtlasCycleRequest schema", async () => {
    const { StartAtlasCycleRequestSchema } = await import(
      "@engenox/contracts/service/v1/controlplane"
    );

    const request = create(StartAtlasCycleRequestSchema, {
      tenantId: "test-tenant",
      idempotencyKey: "test-key",
      surfaceIds: ["surface-1"],
      brandCardOverride: {},
    });

    expect(request.tenantId).toBe("test-tenant");
    expect(request.idempotencyKey).toBe("test-key");
    expect(request.surfaceIds).toEqual(["surface-1"]);
  });

  it("should have GetAtlasCycleStatusResponse phase enum", async () => {
    const { GetAtlasCycleStatusResponse_Phase } = await import(
      "@engenox/contracts/service/v1/controlplane"
    );

    expect(GetAtlasCycleStatusResponse_Phase.PERCEPTION_RUNNING).toBe(1);
    expect(GetAtlasCycleStatusResponse_Phase.COMPLETED).toBe(5);
    expect(GetAtlasCycleStatusResponse_Phase.CANCELLED).toBe(7);
  });
});