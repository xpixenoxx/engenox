// internal/probe/config.go — Probe fleet configuration (M5-thin).
//
// Central config for timeouts, retries, cooldowns, fan-out parameters.
// Thickening: load from DB/per-tenant config, env-specific defaults.
//
// Cites: 11 §3 (per-surface timeouts/retries), ADR-0007 Thinning Rule.

package probe

import (
	"time"

	entityv1 "github.com/engenox/contracts/generated/go/engenox/entity/v1"
)

// ProbeConfig holds per-surface probe settings.
type ProbeConfig struct {
	// Timeout is the maximum time for a single probe call (surface + gateway).
	Timeout time.Duration
	// MaxRetries is the number of retry attempts on transient failure.
	MaxRetries int
	// Cooldown is the minimum interval between probes for same tenant+surface.
	Cooldown time.Duration
	// SamplesPerQuery is the number of independent samples per query (M×N×K fan-out).
	SamplesPerQuery int
}

// DefaultProbeConfig returns the M5-thin defaults.
func DefaultProbeConfig() ProbeConfig {
	return ProbeConfig{
		Timeout:         30 * time.Second,
		MaxRetries:      2,
		Cooldown:        5 * time.Minute,
		SamplesPerQuery: 3,
	}
}

// FanOutConfig controls the M×N×K probe fan-out.
type FanOutConfig struct {
	// Tenants is the set of tenant IDs to probe (empty = all active).
	Tenants []string
	// Surfaces is the set of surfaces to probe (empty = all 5).
	Surfaces []entityv1.Surface
	// QueryTemplates is the set of query intents per tenant.
	// M5-thin: hardcoded fixture. Thickening: from BuyerQuery KG.
	QueryTemplates map[string][]QueryTemplate
	// SamplesPerQuery overrides ProbeConfig if set > 0.
	SamplesPerQuery int
}

// QueryTemplate represents a buyer intent query per 06 §2.5.
type QueryTemplate struct {
	Intent  string
	Surface entityv1.Surface
	Text    string
}

// DefaultFanOutConfig returns M5-thin fixture configuration.
func DefaultFanOutConfig() FanOutConfig {
	return FanOutConfig{
		Tenants: []string{"tenant-a", "tenant-b", "tenant-c"},
		Surfaces: []entityv1.Surface{
			entityv1.Surface_SURFACE_CHATGPT,
			entityv1.Surface_SURFACE_PERPLEXITY,
			entityv1.Surface_SURFACE_GEMINI,
			entityv1.Surface_SURFACE_GROK,
			entityv1.Surface_SURFACE_CLAUDE,
		},
		QueryTemplates: map[string][]QueryTemplate{
			"tenant-a": {
				{Intent: "commercial", Surface: entityv1.Surface_SURFACE_CHATGPT, Text: "best CRM for small business"},
				{Intent: "informational", Surface: entityv1.Surface_SURFACE_CHATGPT, Text: "what is CRM software"},
			},
			"tenant-b": {
				{Intent: "commercial", Surface: entityv1.Surface_SURFACE_PERPLEXITY, Text: "top project management tools"},
			},
			"tenant-c": {
				{Intent: "navigational", Surface: entityv1.Surface_SURFACE_GEMINI, Text: "Engenox pricing"},
			},
		},
		SamplesPerQuery: 3,
	}
}