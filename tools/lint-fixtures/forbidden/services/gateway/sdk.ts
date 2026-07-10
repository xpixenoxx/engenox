// DELIBERATELY FORBIDDEN FIXTURE — do not import, do not fix.
// The leaf target of the gateway-leaf-only negative test. In the real tree, gateway is
// the SOLE importer of the provider/LiteLLM SDK (24 §3, CLAUDE.md §5); nothing imports
// gateway's internals. This stand-in resolves the forbidden import from services/decision
// below (proving gateway-leaf-only fires, vs "unresolved").
export const sdk = { provider: "fixture-gateway-leaf" };
