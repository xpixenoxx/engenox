// client/measurementClient.ts — REST client for MeasurementService (M4-thin).
//
// The temporal activities call the measurement service via REST over HTTP/1.1.
// The measurement URL is configured via MEASUREMENT_URL env var (default: http://localhost:8083).
//
// In M4-thin, the measurement service only exposes a REST API (FastAPI).
// M4-thicken will add ConnectRPC gRPC service.
// The client uses the generated protobuf types for request/response shapes.
//
// Cites: 11 §2 (gateway is the single model-touching surface), 24 §3 (services only call
// via generated clients), 13 §4 (CIO corpus spine), ADR-0007 (thin-column-then-thicken).

import { create } from "@bufbuild/protobuf";
import type {
  ConformalCoverage,
  GetOutcomeRequest,
  GetOutcomeResponse,
  ListOutcomesRequest,
  ListOutcomesResponse,
  OutcomeSummary,
  RecordMeasurementRequest,
  RecordMeasurementResponse,
  StartMeasurementRequest,
  StartMeasurementResponse,
} from "@engenox/contracts/service/v1/measurement";
import type { Outcome } from "@engenox/contracts/entity/v1/intervention";
import {
  ConformalCoverageSchema,
  GetOutcomeRequestSchema,
  ListOutcomesRequestSchema,
  RecordMeasurementRequestSchema,
  StartMeasurementRequestSchema,
} from "@engenox/contracts/service/v1/measurement";
import { OutcomeSchema } from "@engenox/contracts/entity/v1/intervention";

// Response type interfaces for REST API (M4-thin)

interface StartMeasurementResponseData {
  outcomeId: string;
  treatmentTime?: { seconds: string | number; nanos: string | number };
}

interface RecordMeasurementResponseData {
  recorded: boolean;
  foreignChangeDetected: boolean;
  foreignChangeReason: string;
}

interface GetOutcomeResponseData {
  outcome?: Outcome;
  coverage?: ConformalCoverage;
}

interface ListOutcomesResponseData {
  outcomes: OutcomeSummary[];
  nextPageToken: string;
}

const MEASUREMENT_URL = process.env.MEASUREMENT_URL ?? "http://localhost:8083";

// ============================================================================
// StartMeasurement — starts a measurement window for an intervention (M4-thin)
// Maps to POST /v1/measurements/start
// ============================================================================

export interface StartMeasurementInput {
  tenantId: string;
  interventionId: string;
  mergeCommitSha: string;
  idempotencyKey: string;
}

export interface StartMeasurementOutput {
  outcomeId: string;
  treatmentTime: Date;
}

export async function callStartMeasurement(
  input: StartMeasurementInput
): Promise<StartMeasurementOutput> {
  const request = create(StartMeasurementRequestSchema, {
    tenantId: input.tenantId,
    interventionId: input.interventionId,
    mergeCommitSha: input.mergeCommitSha,
    idempotencyKey: input.idempotencyKey,
  });

  try {
    const response = await fetch(`${MEASUREMENT_URL}/v1/measurements/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as StartMeasurementResponseData;

    // Protobuf timestamp to Date
    const treatmentTime = new Date(
      Number(data.treatmentTime?.seconds ?? 0) * 1000 +
        Math.floor((Number(data.treatmentTime?.nanos ?? 0)) / 1_000_000)
    );

    return {
      outcomeId: data.outcomeId,
      treatmentTime,
    };
  } catch (error) {
    console.warn(
      `[${input.idempotencyKey}] Measurement service unavailable, using fallback:`,
      error
    );
    // M4-thin fallback: synthetic outcome ID with current time
    return {
      outcomeId: `${input.tenantId}-${input.interventionId}-outcome-${input.idempotencyKey}`,
      treatmentTime: new Date(),
    };
  }
}

// ============================================================================
// RecordMeasurement — records a measurement point for an outcome (M4-thin)
// Maps to POST /v1/measurements/record
// ============================================================================

export interface RecordMeasurementInput {
  outcomeId: string;
  surfaceId: string;
  value: number;
  idempotencyKey: string;
}

export interface RecordMeasurementOutput {
  recorded: boolean;
  foreignChangeDetected: boolean;
  foreignChangeReason: string;
}

export async function callRecordMeasurement(
  input: RecordMeasurementInput
): Promise<RecordMeasurementOutput> {
  const request = create(RecordMeasurementRequestSchema, {
    outcomeId: input.outcomeId,
    surfaceId: input.surfaceId,
    value: input.value,
    idempotencyKey: input.idempotencyKey,
  });

  try {
    const response = await fetch(`${MEASUREMENT_URL}/v1/measurements/record`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as RecordMeasurementResponseData;
    return {
      recorded: data.recorded,
      foreignChangeDetected: data.foreignChangeDetected,
      foreignChangeReason: data.foreignChangeReason,
    };
  } catch (error) {
    console.warn(
      `[${input.idempotencyKey}] Measurement service unavailable, using fallback:`,
      error
    );
    return {
      recorded: true,
      foreignChangeDetected: false,
      foreignChangeReason: "measurement service unavailable (fallback)",
    };
  }
}

// ============================================================================
// GetOutcome — gets the full outcome with lift + CI + conformal + foreign-change (M4-thin)
// Maps to GET /v1/measurements/outcome/{outcomeId}
// ============================================================================

export interface GetOutcomeInput {
  outcomeId: string;
}

export interface GetOutcomeOutput {
  outcome: Outcome | undefined;
  coverage: ConformalCoverage | undefined;
}

export async function callGetOutcome(
  input: GetOutcomeInput
): Promise<GetOutcomeOutput> {
  const request = create(GetOutcomeRequestSchema, {
    outcomeId: input.outcomeId,
  });

  try {
    const response = await fetch(
      `${MEASUREMENT_URL}/v1/measurements/outcome/${encodeURIComponent(input.outcomeId)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { outcome: undefined, coverage: undefined };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as GetOutcomeResponseData;
    return {
      outcome: data.outcome
        ? create(OutcomeSchema, data.outcome)
        : undefined,
      coverage: data.coverage
        ? create(ConformalCoverageSchema, data.coverage)
        : undefined,
    };
  } catch (error) {
    console.warn(
      `[${input.outcomeId}] Measurement service unavailable, using fallback:`,
      error
    );
    return {
      outcome: undefined,
      coverage: undefined,
    };
  }
}

// ============================================================================
// ListOutcomes — lists outcomes for a tenant (M4-thin)
// Maps to GET /v1/measurements/outcomes?tenant_id={tenantId}
// ============================================================================

export interface ListOutcomesInput {
  tenantId: string;
  pageSize?: number;
  pageToken?: string;
}

export interface ListOutcomesOutput {
  outcomes: OutcomeSummary[];
  nextPageToken: string;
}

export async function callListOutcomes(
  input: ListOutcomesInput
): Promise<ListOutcomesOutput> {
  const request = create(ListOutcomesRequestSchema, {
    tenantId: input.tenantId,
    pageSize: input.pageSize ?? 50,
    pageToken: input.pageToken ?? "",
  });

  try {
    const params = new URLSearchParams();
    params.set("tenant_id", request.tenantId);
    if (request.pageSize) params.set("page_size", String(request.pageSize));
    if (request.pageToken) params.set("page_token", request.pageToken);

    const response = await fetch(
      `${MEASUREMENT_URL}/v1/measurements/outcomes?${params.toString()}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as ListOutcomesResponseData;
    return {
      outcomes: data.outcomes,
      nextPageToken: data.nextPageToken,
    };
  } catch (error) {
    console.warn(
      `[${input.tenantId}] Measurement service unavailable, using fallback:`,
      error
    );
    return {
      outcomes: [],
      nextPageToken: "",
    };
  }
}

// ============================================================================
// RunMeasurementPipeline — runs full M4-thin pipeline (SCM/DML/Conformal/FC/Quarantine/Corpus)
// Maps to POST /v1/measurements/pipeline
// ============================================================================

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

export async function callRunMeasurementPipeline(
  input: RunMeasurementPipelineInput
): Promise<RunMeasurementPipelineOutput> {
  try {
    const response = await fetch(`${MEASUREMENT_URL}/v1/measurements/pipeline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json() as RunMeasurementPipelineOutput;
  } catch (error) {
    console.warn(
      `[${input.idempotencyKey}] Measurement pipeline unavailable, returning fallback:`,
      error
    );
    // M4-thin fallback: return minimal outcome
    return {
      outcomeId: `${input.tenantId}-${input.interventionId}-outcome-${input.idempotencyKey}`,
      scmResult: null,
      dmlResult: null,
      conformalCoverage: null,
      foreignChangeResult: null,
      quarantineDecision: null,
      corpusWritten: false,
      corpusRowId: null,
      error: "measurement pipeline unavailable (fallback)",
    };
  }
}