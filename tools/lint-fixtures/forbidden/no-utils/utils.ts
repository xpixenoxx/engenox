// DELIBERATELY FORBIDDEN FIXTURE — do not import, do not fix.
// The banned catch-all filename `utils.ts` (22 §6 / CODING_STANDARDS §4). A module is a
// domain vertical, not a bucket. This trips dependency-cruiser's `no-utils-ts` rule (the
// import edge) and `tools/check-no-utils` (the filename — though check-no-utils scans the
// real tree services/libs/pkg/web, not tools/, so it stays clean here by design).
export const u = 42;
