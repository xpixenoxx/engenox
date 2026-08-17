// workflows/atlasCycle.ts — the AtlasCycle Temporal workflow (ADR-0007 M3-thin).
//
// The closed-loop orchestration: Perception → Decision → Action → Measurement.
// Temporal owns the loop state — NO workflow state in Redis, setTimeout, or agent frameworks.
// The workflow is the single source of truth for the AtlasCycle execution.
//
// Tenant isolation: workflowId = tenantId + cycleId (Temporal deduplication key).
// Trace propagation: traceId = workflow runId → SeamMeta.trace_id (11 §2e).
//
// The workflow carries NO tenant data in its own state — every activity call
// receives tenantId explicitly (RLS-by-activity, 13 §2 + CLAUDE.md §8).
//
// Cites: 11 §2 (control-plane responsibilities) + 00 §2 inv 3 (Temporal owns loop)
//        + ADR-0007 (thin column: typed plan DAG, one real activity per phase).

import { create, toJson } from "@bufbuild/protobuf";
import type { JsonObject } from "@bufbuild/protobuf";
import { timestampFromDate } from "@bufbuild/protobuf/wkt";
import { type BrandCard, BrandCardSchema, BuyerQuery, BuyerQuerySchema, type Competitor, CompetitorSchema, type Organization, OrganizationSchema, PostalAddressSchema, Product, ProductSchema } from "@engenox/contracts/entity/v1/brand";
import { QueryIntent, Surface } from "@engenox/contracts/entity/v1/surface";
import {
  CancelAtlasCycleRequest,
  CancelAtlasCycleResponse,
  GetAtlasCycleStatusRequest,
  GetAtlasCycleStatusResponse,
  type StartAtlasCycleRequest,
  StartAtlasCycleResponse,
} from "@engenox/contracts/service/v1/controlplane";
import { StartAtlasCycleResponseSchema } from "@engenox/contracts/service/v1/controlplane";
import * as wf from "@temporalio/workflow";

// M3-thin: Use type-only imports for activities to prevent webpack bundling.
// Activity implementations run in the worker process, not in the workflow bundle.
import type * as activities from "../activities/atlasCycleActivities.js";

const {
  runPerceptionPhase: _runPerceptionPhase,
  runDecisionPhase: _runDecisionPhase,
  runActionPhase: _runActionPhase,
  runMeasurementPhase: _runMeasurementPhase,
} = wf.proxyActivities<typeof activities>({
  startToCloseTimeout: "10 minutes",
  retry: { maximumAttempts: 2 },
});

type Phase =
  | "PERCEPTION_RUNNING"
  | "DECISION_RUNNING"
  | "ACTION_RUNNING"
  | "MEASUREMENT_RUNNING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";

interface AtlasCycleState {
  phase: Phase;
  currentActivity: string;
  completedSurfaces: string[];
  traceId: string;
  errorMessage: string | null;
  startedAt: string;
  updatedAt: string;
}

// Define query and signal
const getStatusQuery = wf.defineQuery<AtlasCycleState>("getStatus");
const cancelSignal = wf.defineSignal<[string]>("cancel");

/**
 * Create a minimal BrandCard for M3-thin from the optional override.
 * Uses proto3 defaults (empty strings) for unknown fields - preserving honest
 * unknowns per the candor floor (CLAUDE.md §12). M4-thicken will fetch the
 * real BrandCard from the KG.
 */
function createMinimalBrandCard(tenantId: string, override?: JsonObject): BrandCard {
  const legalName = (override?.name as string) ?? "";
  const primaryUrl = (override?.domain as string) ?? "";
  const foundedDate = "";

  const org = create(OrganizationSchema, {
    id: `${tenantId}-org`,
    tenantId,
    legalName,
    alternateNames: [],
    parentOrgId: "", // empty = no parent (root), not self-reference
    category: "",
    foundedDate,
    voice: "",
    primaryUrl,
    hq: create(PostalAddressSchema, {
      street: "",
      locality: "",
      region: "",
      postalCode: "",
      country: "",
    }),
    differentiators: [],
    founders: [],
  });

  const productName = (override?.productName as string) ?? "";
  const product = create(ProductSchema, {
    id: `${tenantId}-product-1`,
    tenantId,
    name: productName,
    sku: "",
    parentOrgId: `${tenantId}-org`,
    category: "",
    icp: "",
    features: [],
    docsUrl: "",
    changelogUrl: "",
  });

  const sampleQuery = (override?.sampleQuery as string) ?? "";
  const buyerQuery = create(BuyerQuerySchema, {
    id: `${tenantId}-query-1`,
    tenantId,
    queryText: sampleQuery,
    intent: QueryIntent.INFORMATIONAL,
    targetEntityId: productName ? `${tenantId}-product-1` : "",
    targetSurface: [Surface.CHATGPT],
  });

  const competitors: Competitor[] = [];

  return create(BrandCardSchema, {
    id: `${tenantId}-brand-card`,
    tenantId,
    organization: org,
    products: productName ? [product] : [],
    buyerQueries: sampleQuery ? [buyerQuery] : [],
    competitors,
    updatedAt: timestampFromDate(new Date()),
  });
}

export async function atlasCycle(request: StartAtlasCycleRequest): Promise<ReturnType<typeof create<typeof StartAtlasCycleResponseSchema>>> {
  const { tenantId, idempotencyKey, surfaceIds, brandCardOverride } = request;

  const state: AtlasCycleState = {
    phase: "PERCEPTION_RUNNING",
    currentActivity: "runPerceptionPhase",
    completedSurfaces: [],
    traceId: "",
    errorMessage: null,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  wf.setHandler(getStatusQuery, () => state);
  wf.setHandler(cancelSignal, (reason: string) => {
    state.phase = "CANCELLED";
    state.errorMessage = reason;
    state.updatedAt = new Date().toISOString();
  });

  const traceId = `${tenantId}-${idempotencyKey}`;
  state.traceId = traceId;

  try {
    // ====================================================================
    // PHASE 1: Perception — probe surfaces, extract assertions, find conflicts
    // ====================================================================
    state.currentActivity = "runPerceptionPhase";
    state.updatedAt = new Date().toISOString();

    const perceptionResult = await _runPerceptionPhase({
      tenantId,
      surfaceIds: surfaceIds.length > 0 ? surfaceIds : ["default-surface"],
      idempotencyKey: `${traceId}-perception`,
    });

    state.completedSurfaces = perceptionResult.conflictIds;
    state.traceId = perceptionResult.traceId;
    state.phase = "DECISION_RUNNING";
    state.currentActivity = "runDecisionPhase";
    state.updatedAt = new Date().toISOString();

    // ====================================================================
    // PHASE 2: Decision — Adjudicate → Draft → Critique per conflict
    // ====================================================================
    const brandCardProto = createMinimalBrandCard(tenantId, brandCardOverride);
    // Convert protobuf message to plain JSON for Temporal payload serialization
    // Cast to any: Temporal serializes this through its payload converter; the activity
    // reconstructs the protobuf via fromJson() on the other side.
    const brandCard = toJson(BrandCardSchema, brandCardProto) as any;

    const decisionResult = await _runDecisionPhase({
      tenantId,
      conflictIds: perceptionResult.conflictIds,
      brandCard,
      idempotencyKey: `${traceId}-decision`,
    });

    state.phase = "ACTION_RUNNING";
    state.currentActivity = "runActionPhase";
    state.updatedAt = new Date().toISOString();

    // ====================================================================
    // PHASE 3: Action — InterventionSaga (Cedar + diff-review + dial + PR)
    // ====================================================================
    const actionResult = await _runActionPhase({
      tenantId,
      interventionIds: decisionResult.interventionIds,
      idempotencyKey: `${traceId}-action`,
    });

    state.phase = "MEASUREMENT_RUNNING";
    state.currentActivity = "runMeasurementPhase";
    state.updatedAt = new Date().toISOString();

    // ====================================================================
    // PHASE 4: Measurement — start measurement windows for merged PRs
    // ====================================================================
    const measurementResult = await _runMeasurementPhase({
      tenantId,
      proposalIds: actionResult.proposalIds,
      idempotencyKey: `${traceId}-measurement`,
    });

    // ====================================================================
    // COMPLETED
    // ====================================================================
    state.phase = "COMPLETED";
    state.currentActivity = "";
    state.updatedAt = new Date().toISOString();

    return create(StartAtlasCycleResponseSchema, {
      workflowId: traceId,
      runId: traceId,
    });
  } catch (error) {
    state.phase = "FAILED";
    state.errorMessage = error instanceof Error ? error.message : "Unknown error";
    state.updatedAt = new Date().toISOString();
    throw error;
  }
}