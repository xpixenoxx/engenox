// activities/atlasCycleActivities.ts — AtlasCycle activity implementations (M3-thin).
//
// These activities are the REAL implementations that the AtlasWorkflow calls.
// They use the generated gRPC clients (never direct service imports).
// Each activity carries its own IdempotencyKey (CLAUDE.md §8).
//
// Cites: 11 §2 (control-plane responsibilities + six seams) + 00 §2 inv 3 (Temporal owns loop)
//        + ADR-0007 (thin column: typed plan DAG, one real activity per phase).

console.error("[ATLAS-ACTIVITY-DEBUG-12345] Module loaded");

import { type BrandCard } from "@engenox/contracts/entity/v1/brand";
import { Assertion } from "@engenox/contracts/event/v1";
import { probeSurface } from "../client/perceptionClient.js";
import { proposeInterventions } from "../client/decisionClient.js";
import { callStartMeasurement } from "../client/measurementClient.js";

import type { StartAtlasCycleRequest } from "@engenox/contracts/service/v1/controlplane";
import type { ProposedIntervention } from "@engenox/contracts/service/v1/decision";

// =============================================================================
// M3-thin: REAL gRPC client calls replacing stubs.
// The activity SIGNATURES are final; the implementation bodies call gateway seams.
// =============================================================================

interface PerceptionPhaseResult {
  conflictIds: string[];
  traceId: string;
}

interface DecisionPhaseResult {
  interventionIds: string[];
  traceId: string;
}

interface ActionPhaseResult {
  proposalIds: string[];
  traceId: string;
}

interface MeasurementPhaseResult {
  outcomeIds: string[];
  traceId: string;
}

// =============================================================================
// Phase 1: Perception — run GSC probes + Extract seam per surface
// =============================================================================

/**
 * Run the perception phase: probe surfaces, trigger Extract seam for each.
 * M3-thin: iterates surfaces, calls PerceptionService.ProbeSurface via gRPC client
 * then calls Gateway.Extract for each AnswerEvent to get typed assertions + conflicts.
 */
export async function runPerceptionPhase(input: {
  tenantId: string;
  surfaceIds: string[];
  idempotencyKey: string;
}): Promise<PerceptionPhaseResult> {
  const { tenantId, surfaceIds, idempotencyKey } = input;

  // Write to file in worker's working directory to prove execution
  try {
    const fs = require('fs');
    const path = require('path');
    const logPath = path.join(process.cwd(), 'activity-execution.log');
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] runPerceptionPhase pid=${process.pid} worker_cwd=${process.cwd()} tenantId=${tenantId}\n`);
  } catch (e) {
    console.error('[ATLAS-ACTIVITY] File write failed:', e);
  }

  console.error(`[ATLAS-ACTIVITY] runPerceptionPhase START pid=${process.pid} tenantId=${tenantId} surfaces=${surfaceIds.join(",")} idempotencyKey=${idempotencyKey}`);

  if (!tenantId) throw new Error("NO TENANT ID - function not executing properly");

  const conflictIds: string[] = [];

  for (const surfaceId of surfaceIds) {
    // M3-thin: call PerceptionService.ProbeSurface via gRPC client
    const surfaceEnum = surfaceId === "CHATGPT" ? 1 : surfaceId === "PERPLEXITY" ? 2 : 0; // Surface enum values
    console.error(`[ATLAS-ACTIVITY] Probing surface: ${surfaceId} (enum: ${surfaceEnum})`);
    const probeResp = await probeSurface({
      tenantId,
      surface: surfaceEnum,
      idempotencyKey: `${idempotencyKey}-perception-${surfaceId}`,
    });

    console.error(`[ATLAS-ACTIVITY] Probe response: ${probeResp?.assertions?.length ?? 0} assertions, probeResp=${JSON.stringify(probeResp)}`);
    // For each assertion in probeResp.assertions, create a conflict ID.
    // M4-thicken: DecisionService.ProposeInterventions will adjudicate these
    for (const assertion of probeResp.assertions) {
      // Each assertion pointing to a gap becomes a conflict
      if (assertion.subjectId) {
        const conflictId = `${tenantId}-${surfaceId}-conflict-${assertion.subjectId}-${Date.now()}`;
        conflictIds.push(conflictId);
      }
      // Assertion.object is a oneof: objectLiteral | objectId
      if (assertion.object?.case === "objectId" && assertion.object.value) {
        const conflictId = `${tenantId}-${surfaceId}-conflict-${assertion.object.value}-${Date.now()}`;
        conflictIds.push(conflictId);
      }
    }
  }

  return { conflictIds, traceId: idempotencyKey };
}

// =============================================================================
// Phase 2: Decision — call DecisionService.ProposeInterventions (orchestrates Adejudicate → Draft → Critique)
// =============================================================================

/**
 * Run the decision phase: call DecisionService.ProposeInterventions via gRPC client.
 * M3-thin: DecisionService internally orchestrates Adjudicate → Draft → Critique seams.
 * Returns intervention IDs for accepted interventions.
 */
export async function runDecisionPhase(input: {
  tenantId: string;
  conflictIds: string[];
  brandCard: BrandCard; // from tenant's BrandCard (M4: fetch from KG)
  idempotencyKey: string;
}): Promise<DecisionPhaseResult> {
  const { tenantId, conflictIds, brandCard, idempotencyKey } = input;

  // M3-thin: call DecisionService.ProposeInterventions via gRPC client
  // This internally runs Adjudicate → Draft → Critique for each conflict
  const decisionResp = await proposeInterventions({
    tenantId,
    conflictIds,
    brandCard,
    idempotencyKey,
  });

  // Extract intervention IDs from the proposed interventions (use conflict_id as the identifier)
  const interventionIds = decisionResp.interventions
    .filter((i) => i.critiquePassed)
    .map((i) => `${tenantId}-${i.conflictId}-intervention`);

  return { interventionIds, traceId: decisionResp.traceId };
}

// =============================================================================
// Phase 3: Action — propose interventions via InterventionSaga (Cedar + diff-review + dial)
// =============================================================================

/**
 * Run the action phase: for each intervention, execute the InterventionSaga.
 * The saga handles allow-list-glob → diff-review → Cedar two-pass → dial → GitHub PR.
 */
export async function runActionPhase(input: {
  tenantId: string;
  interventionIds: string[];
  idempotencyKey: string;
}): Promise<ActionPhaseResult> {
  const { tenantId, interventionIds, idempotencyKey } = input;

  const proposalIds: string[] = [];

  // TODO(M3-thicken): for each intervention, start InterventionSaga workflow via Temporal client
  // const sagaHandle = await temporalClient.workflow.start(interventionSaga, {
  //   taskQueue: "action",
  //   workflowId: `${tenantId}-${interventionId}-saga-${idempotencyKey}`,
  //   args: [{ tenant_id: tenantId, params: interventionParams, ... }],
  // });
  // const result = await sagaHandle.result();

  // M3-thin stub: one proposal per intervention, dial = PROPOSE
  for (const interventionId of interventionIds) {
    const proposalId = `${tenantId}-${interventionId}-proposal-${Date.now()}`;
    proposalIds.push(proposalId);
  }

  return { proposalIds, traceId: idempotencyKey };
}

// =============================================================================
// Phase 4: Measurement — start measurement windows for merged interventions
// =============================================================================
// Phase 4: Measurement — start measurement windows for merged interventions
// =============================================================================

/**
 * Run the measurement phase: start measurement windows for successfully merged PRs.
 * M3-thin: one activity per proposal, calls MeasurementService.StartMeasurement.
 */
export async function runMeasurementPhase(input: {
  tenantId: string;
  proposalIds: string[];
  idempotencyKey: string;
}): Promise<MeasurementPhaseResult> {
  const { tenantId, proposalIds, idempotencyKey } = input;

  const outcomeIds: string[] = [];

  // M3-thin: call MeasurementService.StartMeasurement via gRPC client for each proposal
  for (const proposalId of proposalIds) {
    // Extract intervention_id from proposal_id format: {tenantId}-{interventionId}-proposal-{timestamp}
    const interventionId = proposalId.replace(`${tenantId}-`, "").replace(`-proposal-${Date.now()}`, "");
    // For M3-thin, use a synthetic merge commit SHA
    const mergeCommitSha = `merge-${proposalId}-${Date.now()}`;

    const measurementResp = await callStartMeasurement({
      tenantId,
      interventionId,
      mergeCommitSha,
      idempotencyKey: `${idempotencyKey}-measurement-${proposalId}`,
    });

    outcomeIds.push(measurementResp.outcomeId);
  }

  return { outcomeIds, traceId: idempotencyKey };
}

// =============================================================================
// Phase 4 (M4-thin): Full Measurement Pipeline — runs SCM/DML/Conformal/FC/Quarantine/Corpus
// =============================================================================

export interface RunMeasurementPipelineInput {
  tenantId: string;
  interventionId: string;
  idempotencyKey: string;
  // Pre-treatment outcome data
  treatedPreSeries: Array<{ timestamp: string; value: number }>;
  controlPrePanel: Record<string, Array<{ timestamp: string; value: number }>>;
  // Post-treatment outcome data
  treatedPostSeries: Array<{ timestamp: string; value: number }>;
  controlPostPanel: Record<string, Array<{ timestamp: string; value: number }>>;
  treatmentStartIndex: number;
  // DML covariates (post-treatment)
  dmlOutcome: number[];
  dmlTreatment: number[];
  dmlCovariates: number[][];
  // Foreign change series (e.g., daily impressions)
  foreignChangeSeries?: Array<{ timestamp: string; value: number }>;
}

export interface RunMeasurementPipelineOutput {
  outcomeId: string;
  scmResult?: {
    status: string;
    ate: number | null;
    ate_ci_lower: number | null;
    ate_ci_upper: number | null;
    weights: Record<string, number> | null;
    pre_fit_rmse: number | null;
    pre_fit_max_abs_error: number | null;
    reason: string | null;
    integrity_tags: Record<string, unknown>;
  } | null;
  dmlResult?: {
    status: string;
    lift: number | null;
    lift_se: number | null;
    lift_ci_lower: number | null;
    lift_ci_upper: number | null;
    reason: string | null;
    integrity_tags: Record<string, unknown>;
  } | null;
  conformalCoverage?: Record<string, unknown> | null;
  foreignChangeResult?: Record<string, unknown> | null;
  quarantineDecision?: {
    status: string;
    allowed: boolean;
    reason: string;
    integrity_tags: Record<string, unknown>;
  } | null;
  corpusWritten: boolean;
  corpusRowId: number | null;
  error?: string;
}

/**
 * Run the full M4-thin measurement pipeline for an intervention.
 * Pipeline: SCM + DML estimation → Conformal calibration → Foreign change detection
 * → Quarantine check → Signed corpus row write (if allowed).
 *
 * This is the thick M4 activity that orchestrates the full measurement signal
 * with WORM provenance from day one (ADR-0007).
 */
export async function runMeasurementPipeline(
  input: RunMeasurementPipelineInput
): Promise<RunMeasurementPipelineOutput> {
  const { callRunMeasurementPipeline } = await import("../client/measurementClient.js");
  return callRunMeasurementPipeline(input);
}