// exports.test.ts - the A0 contract-package public-surface seal.
//
// The `exports` map in package.json is the clean import path the libs + services reach the
// contracts through: `import { LiftDistributionSchema } from "@engenox/contracts/entity/v1
// /intervention"`. A0 extended that map additively for the new MVP entity sub-packages +
// the GatewayService seam surface (surface/brand/conflict/intervention/integrity +
// service/v1/gateway). A typo'd target path would not surface until A1 (the first cross-
// package consumer) - a candor gap on the process. This test asserts, in-vitro at A0, that
// every declared subpath target exists on disk: the failing mode (a dangling export) fails
// here, not at A1 import time.
//
// This does NOT prove the targets resolve at runtime through pnpm + a TS-aware resolver
// (that is the A1 consumer's exercise); it proves the structural invariant the contracts
// package publishes a well-formed surface - every path it advertises points at a real
// generated file. The runtime-resolution exercise lands with the first libs/ consumer.
//
// package.json is read via node:fs + JSON.parse (not a JSON module import) so the test has
// zero extra deps; the parsed `unknown` is refined to Record<string,string> at the parse
// boundary - the sanctioned system-boundary JSON escape hatch (CLAUDE.md §6).
//
// Cites: 24 §2 (pkg/contracts root) + §4 (the contract -> service/client boundary); the
//        strict-add-only exports extension (ADR-0008); CLAUDE.md §12 (the candor floor on
//        the engineering process - a public-surface change carries a structural-seal test).

import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// The exports map targets are relative to the package.json directory (pkg/contracts). The
// test file lives in pkg/contracts/__tests__, so the package root is one level up.
const packageRoot = resolve(here, "..");

// Refine the parsed JSON at the system boundary (CLAUDE.md §6 - the sanctioned `as` for a
// DB/JSON row refined on read). The exports map is { "./subpath": "./path/to/file.ts", ... }
// plus the "./package.json" self-entry; values are strings.
type ExportsMap = Record<string, string>;
const parsed: unknown = JSON.parse(readFileSync(join(packageRoot, "package.json"), "utf8"));
const exportsMap = (parsed as { exports?: unknown }).exports as ExportsMap | undefined;

describe("@engenox/contracts exports map (A0)", () => {
  // The self-describing ./package.json entry points at package.json itself (obviously real);
  // skip it so the existence check stays meaningful on the generated-type targets only.
  const subpaths = Object.entries(exportsMap ?? {}).filter(([k]) => k !== "./package.json");

  it("declares the A0 subpaths (the MVP entity sub-packages + the gateway seam surface)", () => {
    const keys = subpaths.map(([k]) => k).sort();
    // The T02 baseline (entity/event/service/policy v1) + the A0 additions. Additive only -
    // every original entry is still present (strict-add-only, 14 §5).
    expect(keys).toEqual(
      [
        "./entity/v1",
        "./entity/v1/brand",
        "./entity/v1/conflict",
        "./entity/v1/integrity",
        "./entity/v1/intervention",
        "./entity/v1/surface",
        "./event/v1",
        "./policy/v1",
        "./service/v1",
        "./service/v1/gateway",
      ].sort(),
    );
  });

  it("every declared subpath target resolves to a real file on disk", () => {
    // The failing mode this seals: a typo'd or stale target (e.g. a renamed proto whose
    // exports entry wasn't updated) dangles a public import path. Every target must exist.
    for (const [subpath, target] of subpaths) {
      const targetPath = join(packageRoot, target);
      expect(
        existsSync(targetPath),
        `export ${subpath} -> ${target} (missing: ${targetPath})`,
      ).toBe(true);
    }
  });
});
