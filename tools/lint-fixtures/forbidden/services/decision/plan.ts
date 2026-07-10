// DELIBERATELY FORBIDDEN FIXTURE — do not import, do not fix.
// The target of the cross-service negative test. A real services/decision owns its plan;
// this stand-in exists so dependency-cruiser can RESOLVE the forbidden import from
// services/perception below (proving the no-cross-service-internal rule fires, vs merely
// reporting "unresolved"). 24 §4 / T03.
export const plan = { id: "fixture-decision-plan" };
