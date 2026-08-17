// workflows/interventionSaga.ts — the InterventionSaga Temporal workflow (ADR-0007 M3-thin).
//
// The action-layer saga: proposes intervention via GitHub PR with the full gate chain:
// Allow-list-glob → Diff-review blocker (rule-based) → Cedar two-pass → Dial ledger at `propose`.
// Every external side-effect uses a typed IdempotencyKey (CI-blocked, CLAUDE.md §8).
//
// The dial is at `propose` (default DENY escalation) — no auto-merge (26 §6).
// Thin content: one trivial policy + hard-coded allow-list-glob. NEVER thin the GATE MECHANISM.

import { create } from "@bufbuild/protobuf";
import type { ProposeInterventionRequest } from "@engenox/contracts/service/v1/action";
import { DialDecision, ProposeInterventionResponseSchema } from "@engenox/contracts/service/v1/action";
import * as wf from "@temporalio/workflow";

const { checkAllowList, runDiffReview, runCedarGate, createGitHubPr } = wf.proxyActivities<typeof import("../activities/interventionSagaActivities.js")>({
  startToCloseTimeout: "30 seconds",
  retry: { maximumAttempts: 2, nonRetryableErrorTypes: ["AllowListDenied", "DiffReviewBlocked", "CedarGateRejected"] },
});

function asRecord(params: unknown): Record<string, unknown> {
  return (params ?? {}) as Record<string, unknown>;
}

export async function interventionSaga(request: ProposeInterventionRequest): Promise<ReturnType<typeof create<typeof ProposeInterventionResponseSchema>>> {
  const { tenantId, params, conflictId, idempotencyKey, githubRepo, baseBranch } = request;

  // STEP 1: Allow-list-glob check (hard-coded in M3-thin).
  // Thin content = one glob. NEVER skip this mechanism.
  const allowListResult = await checkAllowList({ tenantId, params: asRecord(params), githubRepo });

  if (!allowListResult.allowed) {
    return create(ProposeInterventionResponseSchema, {
      proposalId: "",
      prUrl: "",
      dialDecision: DialDecision.ESCALATION_REFUSED,
      cedarAudit: [],
      diffReview: { blocked: true, reasons: ["Allow-list denied"], matchedGlob: allowListResult.matchedGlob },
    });
  }

  // STEP 2: Rule-based diff-review blocker (NO LLM).
  // Thin = the rule set. NEVER skip this mechanism.
  const diffReviewResult = await runDiffReview({ tenantId, params: asRecord(params) });

  if (diffReviewResult.blocked) {
    return create(ProposeInterventionResponseSchema, {
      proposalId: "",
      prUrl: "",
      dialDecision: DialDecision.ESCALATION_REFUSED,
      cedarAudit: [],
      diffReview: diffReviewResult,
    });
  }

  // STEP 3: Cedar two-pass gate (REAL @cedar-policy/cedar-wasm engine).
  // Pass 1: structural (policy exists + schema valid).
  // Pass 2: isAuthorized (the policy decision).
  // Thin = one trivial policy. NEVER skip the MECHANISM.
  const cedarResult = await runCedarGate({ tenantId, params: asRecord(params) });

  if (!cedarResult.authorized) {
    return create(ProposeInterventionResponseSchema, {
      proposalId: "",
      prUrl: "",
      dialDecision: DialDecision.ESCALATION_REFUSED,
      cedarAudit: cedarResult.auditTrail,
      diffReview: { blocked: false, reasons: [], matchedGlob: allowListResult.matchedGlob },
    });
  }

  // STEP 4: Dial decision — default PROPOSE (1); escalation requires 3 axes (ADR-0007).
  // The dial ledger records REFUSED escalations, NEVER erases them (26 §4).
  // M3-thin: axisCount not implemented; default to PROPOSE.
  const dialDecision = DialDecision.PROPOSE;

  // STEP 5: Create GitHub PR (the ONLY external side-effect).
  // Typed IdempotencyKey REQUIRED (CLAUDE.md §8 watchdog).
  const prResult = await createGitHubPr({
    tenantId,
    params: asRecord(params),
    githubRepo,
    baseBranch,
    idempotencyKey,
  });

  // SUCCESS: Proposal created at dial = PROPOSE.
  return create(ProposeInterventionResponseSchema, {
    proposalId: prResult.proposalId,
    prUrl: prResult.prUrl,
    dialDecision: dialDecision,
    cedarAudit: cedarResult.auditTrail,
    diffReview: { blocked: false, reasons: [], matchedGlob: allowListResult.matchedGlob },
  });
}