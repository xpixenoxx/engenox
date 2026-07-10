// .dependency-cruiser.cjs — T03 the dependency-direction lint for the TS surface (24 §4).
//
// Stack-faithful choice (29 §6): the blueprint names "nx enforce-module-boundaries" for the
// TS arrows (24 §4), but that rule ships only via @nx/eslint-plugin, which pulls in ESLint
// — and ESLint is BANNED (Biome replaces ESLint+Prettier, CLAUDE.md §2; the stack-drift
// watchdog's eslint rule is non-overridable, CLAUDE.md §8). dependency-cruiser is
// eslint-FREE, standalone, and the SAME tool the ticket names for the contract-graph
// assertion (check-contract-graph below). One eslint-free tool carries BOTH the TS
// boundary rules AND the contract-graph leaf assertion — the architecture made physical,
// the stack kept clean. The boundary INTENT is the frozen invariant (24 §4: a forbidden
// import is a CI failure); the tool is implementation detail. ESLint is never the answer
// here (29 §6), so this is not an ADR-bearing swap of a documented technology — it is the
// documented technology's faithful eslint-free realization. Recorded for the reader + the
// watchdog, not litigated (CLAUDE.md §1: do not re-derive architecture).
//
// Boundary table mirrored from 24 §3 (each rule cites the section). A contributor whose
// import is blocked reads the rule comment + the dependency-rules.md doc, not just the error.
//
// Cites: 24 §4 (the dependency-direction lint) + §3 (the boundary table this mirrors);
//        22 §6 / CODING_STANDARDS §4 (the no-utils catch-all); 29 §6 (Biome, NOT ESLint);
//        ADR-0001 (the stack pin); T03; CLAUDE.md §4 + §5 (the contract-spine + boundaries).

module.exports = {
  // $schema pulled from the installed dependency-cruiser v18 schema (resolves via pnpm).
  $schema: "./node_modules/dependency-cruiser/schema/dependency-cruiser.schema.json",

  forbidden: [
    // — cross-service internal import (24 §3/§4). Each service reaches another service's
    //   internals ONLY via the contract gRPC client (@engenox/contracts/service/v1). The
    //   capture group ($1) in from.path is reused in to.pathNot so a SAME-service import
    //   (services/perception/x -> services/perception/y) is allowed — only the cross arrow
    //   fires. The cross arrow must route through the generated PerceptionService client.
    {
      name: "no-cross-service-internal",
      comment:
        "24 §4 — services call one another ONLY via the contract gRPC client (@engenox/contracts/service/v1); a direct internal-package import is forbidden.",
      severity: "error",
      from: { path: "^services/([^/]+)/" },
      to: { path: "^services/([^/]+)/", pathNot: "^services/$1/" },
    },

    // — gateway is leaf-only (24 §3). Only gateway imports gateway; the provider/LiteLLM
    //   SDK lives there and nowhere else (CLAUDE.md §5: gateway is the only module that
    //   imports LiteLLM/the provider SDK). The non-gateway -> gateway arrow is forbidden.
    {
      name: "gateway-leaf-only",
      comment:
        "24 §3 — gateway is leaf-only; nothing but gateway itself imports gateway internals (the provider SDK is gateway-private).",
      severity: "error",
      from: { pathNot: "^services/gateway/" },
      to: { path: "^services/gateway/" },
    },

    // — libs never import a service (24 §3). libs sit BELOW the service layer; a lib depends
    //   on contracts + stdlib + third-party, never on a producer service's package.
    {
      name: "libs-import-no-service",
      comment:
        "24 §3 — libs/* never depend on a service; they sit below the service layer (libs <- contracts, not libs <- services).",
      severity: "error",
      from: { path: "^libs/" },
      to: { path: "^services/" },
    },

    // — the no-utils catch-all (22 §6 + CODING_STANDARDS §4). A module is a domain-bounded
    //   vertical slice owning its types/persistence/boundary/tests; there is no
    //   utils/helpers/misc/shared bucket. The forbidden filename is caught at the import
    //   edge (and check-no-utils catches it at creation).
    {
      name: "no-utils-ts",
      comment:
        "22 §6 / CODING_STANDARDS §4 — no utils.ts/helpers.ts/misc.ts/shared.ts catch-alls; a module is a domain vertical, not a bucket.",
      severity: "error",
      from: {},
      to: { path: "(^|/)(utils|helpers|misc|shared)\\.[cm]?[tj]sx?$" },
    },

    // — control-plane -> the four worker services routes ONLY via the gRPC client (24 §4).
    //   Explicit (redundant with no-cross-service-internal) so the legibility is high: a
    //   reader searching for the control-plane arrow sees the named rule.
    {
      name: "control-plane-via-contracts-only",
      comment:
        "24 §4 — control-plane calls perception/decision/action/measurement via the generated gRPC client, never their internal packages.",
      severity: "error",
      from: { path: "^services/control-plane/" },
      to: { path: "^services/(perception|decision|action|measurement)/", pathNot: "^services/$1/" },
    },
  ],

  options: {
    // Scan the real tree only. Exclude the deliberately-forbidden fixtures (they are the
    // negative-test corpus, check-lint-fires scans them by name), the codegen output (the
    // git-ignored generated/ tree is produced, not linted), node_modules, dist, and the
    // non-TS leaves (infra is OpenTofu; the .keep placeholders are not source).
    exclude: {
      path: [
        "node_modules/.*",
        "\\.pnp\\..*",
        "pkg/contracts/generated/.*",
        "dist/.*",
        "build/.*",
        "tools/.*",
        "infra/.*",
        "e2e/.*",
        ".*/\\.storybook/.*",
        ".*\\.keep$",
      ],
    },
    doNotFollow: { path: ["node_modules", "dist", "build", "generated"] },
  },
};
