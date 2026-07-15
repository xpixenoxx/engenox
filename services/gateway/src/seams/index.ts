// seams/index.ts — public seam exports (11 §3).
//
// Each seam exports its run function + deps interface. The gateway router
// (router/index.ts) consumes these. The control-plane (via libs/verifier) calls
// reGroundExtract/reGroundCritique/reGroundHypothesis as the independent
// second opinion (11 §2c). The fallback* functions are internal seam
// implementation details — not part of the public API.

export type { ExtractDeps } from "./extract.js";
export { runExtract, reGroundExtract } from "./extract.js";
export { DEFAULT_PREDICATES, buildExtractPrompt, runExtractWithConstraints } from "../constraints/extract.js";

export { runDraft } from "./draft.js";

export type { AdjudicateDeps } from "./adjudicate.js";
export { runAdjudicate } from "./adjudicate.js";

export { runEmbed } from "./embed.js";

export { runAbduce, reGroundHypothesis } from "./abduce.js";

export type { CritiqueDeps } from "./critique.js";
export { runCritique } from "./critique.js";

// Seam names for routing / telemetry
export const SEAM_NAMES = [
  "extract",
  "draft",
  "adjudicate",
  "embed",
  "abduce",
  "critique"
] as const;

export type SeamName = typeof SEAM_NAMES[number];