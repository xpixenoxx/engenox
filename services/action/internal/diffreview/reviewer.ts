// internal/diffreview/reviewer.ts — rule-based diff-review blocker (M3, TypeScript port).
//
// The P0 security gate: deterministic, non-LLM, structural diff analysis.
// Rules: no external URLs, no redirect chains, no package.json/scripts,
// scope to target_surface. Runs BEFORE Cedar gate.
//
// Cites: 15 §5b (P0), 09 §6 (Action layer gate), ADR-0007 #4 (mechanism NOT thinned).

export interface ReviewerConfig {
  allowExternalURLs: boolean;
  allowRedirects: boolean;
  allowPackageJSON: boolean;
}

export interface DiffHunk {
  path: string;
  oldContent: string;
  newContent: string;
  addedLines: string[];
  removedLines: string[];
}

export interface ReviewResult {
  blocked: boolean;
  reasons: string[];
  violatingFiles: string[];
  matchedGlob: string;
}

const DEFAULT_CONFIG: ReviewerConfig = {
  allowExternalURLs: false,
  allowRedirects: false,
  allowPackageJSON: false,
};

// Pre-compiled patterns (matching Go implementation exactly)
const URL_PATTERN = /https?:\/\/[^\s"'\]\)]+/;
const REDIRECT_PATTERN = /(?i)(location\.href\s*=|meta\s+http-equiv\s*=\s*["']refresh["']|window\.location\s*=)/;
const SCRIPT_PATTERN = /["']scripts["']\s*:/;
const PACKAGE_JSON_PATTERN = /["'](?:dependencies|devDependencies|peerDependencies|optionalDependencies)["']\s*:/;
const MANIFEST_FILES = ["go.mod", "Cargo.toml", "pyproject.toml", "package-lock.json", "yarn.lock", "pnpm-lock.yaml"];

export class Reviewer {
  private config: ReviewerConfig;

  constructor(config: Partial<ReviewerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  review(diff: string, targetSurface: string): ReviewResult {
    const hunks = this.parseDiff(diff);

    const reasons: string[] = [];
    const violatingFiles: string[] = [];

    for (const hunk of hunks) {
      // Rule 1: external URLs in added content
      if (!this.config.allowExternalURLs) {
        for (const line of hunk.addedLines) {
          if (URL_PATTERN.test(line) && !this.isAllowedURL(line)) {
            reasons.push(`External URL detected in added content: ${line}`);
            violatingFiles.push(hunk.path);
          }
        }
      }

      // Rule 2: redirect chains
      if (!this.config.allowRedirects) {
        for (const line of hunk.addedLines) {
          if (REDIRECT_PATTERN.test(line)) {
            reasons.push("Redirect chain detected in added content");
            violatingFiles.push(hunk.path);
          }
        }
      }

      // Rule 3: package.json / script changes
      if (!this.config.allowPackageJSON) {
        if (hunk.path.endsWith("package.json")) {
          for (const line of hunk.addedLines) {
            if (PACKAGE_JSON_PATTERN.test(line) || SCRIPT_PATTERN.test(line)) {
              reasons.push("Package.json or script change detected");
              violatingFiles.push(hunk.path);
            }
          }
        }
        // Also check for package.json in path
        for (const line of hunk.addedLines) {
          if (line.includes("package.json")) {
            reasons.push("Package.json reference in diff");
            violatingFiles.push(hunk.path);
          }
        }
        // Rule 3b: scripts/dependencies in ANY file (supply chain mutation prevention)
        for (const line of hunk.addedLines) {
          if (SCRIPT_PATTERN.test(line) || PACKAGE_JSON_PATTERN.test(line)) {
            reasons.push("Package.json or script change detected in non-package.json file");
            violatingFiles.push(hunk.path);
          }
        }
        // Rule 3c: dependency manifest files (go.mod, Cargo.toml, pyproject.toml, etc.)
        for (const manifest of MANIFEST_FILES) {
          if (hunk.path.endsWith(manifest)) {
            reasons.push(`Dependency manifest change detected: ${manifest}`);
            violatingFiles.push(hunk.path);
            break;
          }
        }
      }

      // Rule 4: scope to target_surface (thin: basic check)
      if (targetSurface && !hunk.path.includes(targetSurface)) {
        reasons.push(`Diff path outside target surface: ${hunk.path}`);
        violatingFiles.push(hunk.path);
      }
    }

    // Deduplicate
    const uniqueReasons = [...new Set(reasons)];
    const uniqueFiles = [...new Set(violatingFiles)];

    return {
      blocked: uniqueReasons.length > 0,
      reasons: uniqueReasons,
      violatingFiles: uniqueFiles,
      matchedGlob: "",
    };
  }

  private parseDiff(diff: string): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    const lines = diff.split("\n");

    let currentHunk: DiffHunk | null = null;
    for (const line of lines) {
      if (line.startsWith("diff --git")) {
        if (currentHunk !== null) {
          hunks.push(currentHunk);
        }
        // Extract path: diff --git a/path b/path
        const parts = line.split(/\s+/);
        let path = "";
        if (parts.length >= 4) {
          path = parts[3].replace(/^b\//, "");
        }
        currentHunk = {
          path,
          oldContent: "",
          newContent: "",
          addedLines: [],
          removedLines: [],
        };
      } else if (currentHunk !== null) {
        if (line.startsWith("+") && !line.startsWith("+++")) {
          currentHunk.addedLines.push(line.slice(1));
        } else if (line.startsWith("-") && !line.startsWith("---")) {
          currentHunk.removedLines.push(line.slice(1));
        }
      }
    }
    if (currentHunk !== null) {
      hunks.push(currentHunk);
    }
    return hunks;
  }

  private isAllowedURL(line: string): boolean {
    // Allow schema.org URLs in JSON-LD context
    if (line.includes("schema.org")) {
      return true;
    }
    return false;
  }
}

// Convenience function matching the test interface
export function runDiffReview(params: {
  tenantId: string;
  params: {
    content?: string;
    file?: string;
    schemaJsonLd?: string;
    contentBrief?: string;
  };
}): { blocked: boolean; reasons: string[] } {
  const { params: p } = params;
  const content = p.content ?? p.schemaJsonLd ?? p.contentBrief ?? "";
  const file = p.file ?? "unknown";

  // Create a minimal diff format
  const diff = `diff --git a/${file} b/${file}
--- a/${file}
+++ b/${file}
@@ -1 +1 @@
+${content}`;

  const reviewer = new Reviewer();
  const result = reviewer.review(diff, "");
  return {
    blocked: result.blocked,
    reasons: result.reasons,
  };
}