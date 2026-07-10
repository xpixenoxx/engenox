// DELIBERATELY FORBIDDEN FIXTURE — do not import, do not fix.
// A services/perception file importing services/decision's INTERNAL package — the
// forbidden cross-service arrow (24 §4). The correct form routes through the contract
// gRPC client (@engenox/contracts/service/v1), never a sibling's internals. This file
// trips dependency-cruiser's `no-cross-service-internal` rule.
import { plan } from "../decision/plan.js";

export const exec = () => plan; // eslint-disable-next-line — N/A (no eslint here; fixture)
