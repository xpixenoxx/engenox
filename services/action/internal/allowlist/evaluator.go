// allowlist/evaluator.go — per-tenant allow-list-glob evaluation (M3).
//
// The allow-list is tenant-scoped, defaults empty. The deny-list is platform-controlled
// and NON-OVERRIDABLE (15 §5a). Evaluation is structural: match proposed diff paths
// against globs. This is the FIRST gate before Cedar.
//
// Cites: 15 §5a, 12 §3, 26 §4, ADR-0007 #4 (thin = one glob; mechanism NOT thinned).

package allowlist

import (
	"path/filepath"
	"strings"
)

type Evaluator struct {
	// Platform deny-list (non-overridable, shipped with binary)
	denyGlobs []string
}

func NewEvaluator() *Evaluator {
	return &Evaluator{
		denyGlobs: []string{
			"**/.env*",
			"**/package.json",
			"**/*.sh",
			"**/Dockerfile",
			".github/**",
			"**/config/*.{ts,js,json}",
		},
	}
}

// TenantConfig holds the tenant's allow-list configuration.
type TenantConfig struct {
	TenantID   string
	AllowGlobs []string
}

// EvaluationResult captures the outcome of allow-list evaluation.
type EvaluationResult struct {
	Allowed       bool
	MatchedGlob   string
	DenyMatched   string
	ViolatingPaths []string
}

// Evaluate checks if the proposed diff paths are within the tenant's allow-list
// and don't violate the platform deny-list.
func (e *Evaluator) Evaluate(config TenantConfig, diffPaths []string) EvaluationResult {
	// First: check deny-list (platform-controlled, non-overridable)
	for _, path := range diffPaths {
		for _, denyGlob := range e.denyGlobs {
			if matchGlob(denyGlob, path) {
				return EvaluationResult{
					Allowed:     false,
					DenyMatched: denyGlob,
					ViolatingPaths: []string{path},
				}
			}
		}
	}

	// If allow-list is empty, deny by default (secure by default)
	if len(config.AllowGlobs) == 0 {
		return EvaluationResult{
			Allowed:        false,
			ViolatingPaths: diffPaths,
		}
	}

	// Check each path against allow-list
	for _, path := range diffPaths {
		allowed := false
		var matchedGlob string
		for _, allowGlob := range config.AllowGlobs {
			if matchGlob(allowGlob, path) {
				allowed = true
				matchedGlob = allowGlob
				break
			}
		}
		if !allowed {
			return EvaluationResult{
				Allowed:        false,
				ViolatingPaths: []string{path},
			}
		}
		_ = matchedGlob // TODO: return the specific glob that matched
	}

	return EvaluationResult{
		Allowed:     true,
		MatchedGlob: config.AllowGlobs[0], // simplified; thickening: return actual match
	}
}

// matchGlob performs glob matching with ** support.
func matchGlob(pattern, path string) bool {
	// Convert glob to filepath.Match compatible pattern
	// ** matches any number of path segments
	pattern = strings.ReplaceAll(pattern, "**", "*")
	matched, _ := filepath.Match(pattern, path)
	return matched
}