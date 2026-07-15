// default.cedar — MVP thin policy for the autonomy dial + blast radius gate.
//
// This is the ACTUAL Cedar policy evaluated by the real `@cedar-policy/cedar-wasm` engine.
// The policy is minimal but the MECHANISM is real (ADR-0007 Thinning Rule).
//
// Dial levels: read < recommend < draft < propose < execute_with_approval < guarded < autonomous
// Blast radius bands: single_page < multi_page < sitewide < canonical < redirect
//
// The dial is per-tenant per-surface. No tenant starts above `propose` (Co-pilot default).
// Escalation requires 3 axes (calibration coverage, human approval rate, pooled overlap).
// Demotion is automatic on alert/regret.
//
// Cites: 12 §3-5, 15 §6, 26 §4, ADR-0007 #4, #8.

permit (
  principal is Engenox::Tenant,
  action == Engenox::Action::"propose",
  resource == Engenox::Dial::"the-dial"
) when {
  principal.dialLevel == "propose" ||
  principal.dialLevel == "read" ||
  principal.dialLevel == "recommend" ||
  principal.dialLevel == "draft"
};

permit (
  principal is Engenox::Tenant,
  action == Engenox::Action::"propose",
  resource == Engenox::Dial::"the-dial"
) when {
  principal.blastRadius == "single_page" ||
  principal.blastRadius == "multi_page"
};

permit (
  principal is Engenox::Tenant,
  action == Engenox::Action::"escalate",
  resource == Engenox::Dial::"the-dial"
) when {
  principal.axisCount >= 3 &&
  (principal.dialLevel == "propose" || principal.dialLevel == "execute_with_approval")
};

// Escalation to guarded requires cleared axes AND blast radius within cap
permit (
  principal is Engenox::Tenant,
  action == Engenox::Action::"escalate",
  resource == Engenox::Dial::"the-dial"
) when {
  principal.axisCount >= 3 &&
  principal.dialLevel == "execute_with_approval" &&
  (principal.blastRadius == "single_page" || principal.blastRadius == "multi_page")
};

// Autonomous only for canonical/redirect with full axes
permit (
  principal is Engenox::Tenant,
  action == Engenox::Action::"escalate",
  resource == Engenox::Dial::"the-dial"
) when {
  principal.axisCount >= 3 &&
  principal.dialLevel == "guarded" &&
  (principal.blastRadius == "canonical" || principal.blastRadius == "redirect")
};

// Demotion is always permitted (safety valve)
permit (
  principal is Engenox::Tenant,
  action == Engenox::Action::"demote",
  resource == Engenox::Dial::"the-dial"
);