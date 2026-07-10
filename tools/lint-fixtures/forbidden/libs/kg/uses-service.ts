// DELIBERATELY FORBIDDEN FIXTURE — do not import, do not fix.
// A libs/* file importing a service — the forbidden libs->service arrow (24 §3). libs sit
// BELOW the service layer (libs depend on contracts + stdlib, never on a producer). This
// trips dependency-cruiser's `libs-import-no-service` rule.
import { plan } from "../../services/decision/plan.js";

export const fromLib = () => plan;
