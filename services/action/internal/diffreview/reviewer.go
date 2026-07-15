// diffreview/reviewer.go — rule-based diff-review blocker (M3).
//
// The P0 security gate: deterministic, non-LLM, structural diff analysis.
// Rules: no external URLs, no redirect chains, no package.json/scripts,
// scope to target_surface. Runs BEFORE Cedar gate.
//
// Cites: 15 §5b (P0), 09 §6 (Action layer gate), ADR-0007 #4 (mechanism NOT thinned).

package diffreview

import (
	"regexp"
	"strings"
)

type Config struct {
	AllowExternalURLs bool
	AllowRedirects    bool
	AllowPackageJSON  bool
}

type Reviewer struct {
	config Config

	// Pre-compiled patterns
	urlPattern         *regexp.Regexp
	redirectPattern    *regexp.Regexp
	scriptPattern      *regexp.Regexp
	packageJSONPattern *regexp.Regexp
}

func NewReviewer(cfg Config) *Reviewer {
	return &Reviewer{
		config: cfg,
		urlPattern: regexp.MustCompile(
			`https?://[^\s"'>\)]+`,
		),
		redirectPattern: regexp.MustCompile(
			`(?i)(location\.href\s*=|meta\s+http-equiv\s*=\s*["']refresh["']|window\.location\s*=)`,
		),
		scriptPattern: regexp.MustCompile(
			`["']scripts["']\s*:`,
		),
		packageJSONPattern: regexp.MustCompile(
			`["'](?:dependencies|devDependencies|peerDependencies|optionalDependencies)["']\s*:`,
		),
	}
}

// DiffHunk represents a parsed diff hunk with file path and changes.
type DiffHunk struct {
	Path       string
	OldContent string
	NewContent string
	AddedLines []string
	RemovedLines []string
}

// ReviewResult captures the outcome of diff review.
type ReviewResult struct {
	Blocked  bool
	Reasons  []string
	ViolatingFiles []string
	MatchedGlob string
}

// Review parses a unified diff and applies the rule set.
func (r *Reviewer) Review(diff string, targetSurface string) ReviewResult {
	hunks := r.parseDiff(diff)

	var reasons []string
	var violatingFiles []string

	for _, hunk := range hunks {
		// Rule 1: external URLs in added content
		if !r.config.AllowExternalURLs {
			for _, line := range hunk.AddedLines {
				if r.urlPattern.MatchString(line) && !r.isAllowedURL(line) {
					reasons = append(reasons, "External URL detected in added content: "+line)
					violatingFiles = append(violatingFiles, hunk.Path)
				}
			}
		}

		// Rule 2: redirect chains
		if !r.config.AllowRedirects {
			for _, line := range hunk.AddedLines {
				if r.redirectPattern.MatchString(line) {
					reasons = append(reasons, "Redirect chain detected in added content")
					violatingFiles = append(violatingFiles, hunk.Path)
				}
			}
		}

		// Rule 3: package.json / script changes
		if !r.config.AllowPackageJSON {
			if strings.HasSuffix(hunk.Path, "package.json") {
				for _, line := range hunk.AddedLines {
					if r.packageJSONPattern.MatchString(line) || r.scriptPattern.MatchString(line) {
						reasons = append(reasons, "Package.json or script change detected")
						violatingFiles = append(violatingFiles, hunk.Path)
					}
				}
			}
			// Also check for package.json in path
			for _, line := range hunk.AddedLines {
				if strings.Contains(line, "package.json") {
					reasons = append(reasons, "Package.json reference in diff")
					violatingFiles = append(violatingFiles, hunk.Path)
				}
			}
			// Rule 3b: scripts/dependencies in ANY file (supply chain mutation prevention)
			for _, line := range hunk.AddedLines {
				if r.scriptPattern.MatchString(line) || r.packageJSONPattern.MatchString(line) {
					reasons = append(reasons, "Package.json or script change detected in non-package.json file")
					violatingFiles = append(violatingFiles, hunk.Path)
				}
			}
			// Rule 3c: dependency manifest files (go.mod, Cargo.toml, pyproject.toml, etc.)
			manifestFiles := []string{"go.mod", "Cargo.toml", "pyproject.toml", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"}
			for _, manifest := range manifestFiles {
				if strings.HasSuffix(hunk.Path, manifest) {
					reasons = append(reasons, "Dependency manifest change detected: "+manifest)
					violatingFiles = append(violatingFiles, hunk.Path)
					break
				}
			}
		}

		// Rule 4: scope to target_surface (thin: basic check)
		// In thickening: map targetSurface to actual path prefixes
		if targetSurface != "" && !strings.Contains(hunk.Path, targetSurface) {
			reasons = append(reasons, "Diff path outside target surface: "+hunk.Path)
			violatingFiles = append(violatingFiles, hunk.Path)
		}
	}

	// Deduplicate
	reasons = dedupe(reasons)
	violatingFiles = dedupe(violatingFiles)

	return ReviewResult{
		Blocked:        len(reasons) > 0,
		Reasons:        reasons,
		ViolatingFiles: violatingFiles,
	}
}

func (r *Reviewer) parseDiff(diff string) []DiffHunk {
	var hunks []DiffHunk
	lines := strings.Split(diff, "\n")

	var currentHunk *DiffHunk
	for _, line := range lines {
		if strings.HasPrefix(line, "diff --git") {
			if currentHunk != nil {
				hunks = append(hunks, *currentHunk)
			}
			// Extract path: diff --git a/path b/path
			parts := strings.Fields(line)
			var path string
			if len(parts) >= 4 {
				path = strings.TrimPrefix(parts[3], "b/")
			}
			currentHunk = &DiffHunk{Path: path}
		} else if currentHunk != nil {
			if strings.HasPrefix(line, "+") && !strings.HasPrefix(line, "+++") {
				currentHunk.AddedLines = append(currentHunk.AddedLines, strings.TrimPrefix(line, "+"))
			} else if strings.HasPrefix(line, "-") && !strings.HasPrefix(line, "---") {
				currentHunk.RemovedLines = append(currentHunk.RemovedLines, strings.TrimPrefix(line, "-"))
			}
		}
	}
	if currentHunk != nil {
		hunks = append(hunks, *currentHunk)
	}
	return hunks
}

func dedupe[T comparable](slice []T) []T {
	seen := make(map[T]bool)
	result := make([]T, 0, len(slice))
	for _, v := range slice {
		if !seen[v] {
			seen[v] = true
			result = append(result, v)
		}
	}
	return result
}

// isAllowedURL checks if a URL in the content is allowed (e.g., schema.org for JSON-LD)
func (r *Reviewer) isAllowedURL(line string) bool {
	// Allow schema.org URLs in JSON-LD context
	if strings.Contains(line, "schema.org") {
		return true
	}
	return false
}