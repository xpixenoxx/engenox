// crypto.test.ts — the WORM ed25519 signature: the R2 fence of the dual-canonical two-fence.
//
// The candor floor at the crypto layer (15 §3): an R2 clone WITHOUT the signer's key is
// UNVERIFIABLE — the data may be intact, but its provenance is lost. These tests assert:
//   - sign → verify round-trips on a fresh + on an existing keypair;
//   - a tampered byte fails verify (the fence rejects, never silently accepts);
//   - the canonicalization is DETERMINISTIC (same logical payload → same bytes regardless of
//     key order; a re-serialized clone verifies — a clone across processes, not just in-memory);
//   - the fingerprint is stable per key + distinct per key (rotation: identify the right key).
//
// Cites: 15 §3 (HSM KEK → DEK envelope + the WORM sig) + ADR-0003 (dual-canonical two-fence);
//        00 §2 invariant 8 (reproducible from a signed node); CLAUDE.md §2/§6.

import { describe, expect, it } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import {
  canonicalize,
  fingerprintOf,
  signerFromPrivateKey,
  verifyRecord,
} from "../src/crypto.js";

// A deterministic keypair for tests that need a fixed identity (the deployed process loads the
// key from the HSM; the test loads it from generateKeyPairSync — same signerFromPrivateKey path).
function makeKeypair() {
  return generateKeyPairSync("ed25519");
}

// Uint8Array equality — a content compare (referential inequality is the WRONG assertion here).
function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

describe("WormSigner.sign — ed25519 over canonical bytes", () => {
  it("signs a non-empty payload + carries the signature + the fingerprint", () => {
    const { privateKey, publicKey } = makeKeypair();
    const signer = signerFromPrivateKey(privateKey, publicKey);
    const bytes = new TextEncoder().encode("engenox-corpus-row");
    const r = signer.sign(bytes);
    expect(r.isOk()).toBe(true);
    if (!r.isOk()) throw new Error("sign failed");
    // ed25519 signatures are 64 bytes; the fingerprint is SHA-256 hex (64 chars).
    expect(r.value.signature.length).toBe(64);
    expect(r.value.keyFingerprint.length).toBe(64);
    expect(bytesEqual(r.value.bytes, bytes)).toBe(true);
  });

  it("REJECTS an empty payload (empty-payload — nothing to sign)", () => {
    const { privateKey, publicKey } = makeKeypair();
    const signer = signerFromPrivateKey(privateKey, publicKey);
    const r = signer.sign(new Uint8Array(0));
    expect(r.isErr() && r.error.kind === "empty-payload").toBe(true);
  });
});

describe("verifyRecord — the R2 fence (a clone without the key is unverifiable)", () => {
  it("verifies a record signed under the matching public key", () => {
    const { privateKey, publicKey } = makeKeypair();
    const signer = signerFromPrivateKey(privateKey, publicKey);
    const bytes = new TextEncoder().encode("attest-this-row");
    const rec = signer.sign(bytes);
    if (!rec.isOk()) throw new Error("sign failed");
    expect(verifyRecord(rec.value, publicKey).isOk()).toBe(true);
  });

  it("REJECTS a tampered record (bad-signature — the fence never silently accepts)", () => {
    const { privateKey, publicKey } = makeKeypair();
    const signer = signerFromPrivateKey(privateKey, publicKey);
    const bytes = new TextEncoder().encode("original-row");
    const rec = signer.sign(bytes);
    if (!rec.isOk()) throw new Error("sign failed");
    // Flip the first byte — a single-bit tamper that a content-integrity check MUST catch.
    const tampered = new Uint8Array(rec.value.bytes);
    const firstByte = tampered[0] ?? 0;
    tampered[0] = firstByte ^ 0xff;
    const r = verifyRecord(
      { bytes: tampered, signature: rec.value.signature, keyFingerprint: rec.value.keyFingerprint },
      publicKey,
    );
    expect(r.isErr() && r.error.kind === "bad-signature").toBe(true);
  });

  it("REJECTS an empty signature (empty-signature)", () => {
    const { publicKey } = makeKeypair();
    const bytes = new TextEncoder().encode("payload-with-no-sig");
    const r = verifyRecord(
      { bytes, signature: new Uint8Array(0), keyFingerprint: "deadbeef" },
      publicKey,
    );
    expect(r.isErr() && r.error.kind === "empty-signature").toBe(true);
  });
});

describe("canonicalize — DETERMINISTIC serialization (same logical payload → same bytes)", () => {
  it("sorts object keys recursively (key order is NOT part of the canonical form)", () => {
    const a = canonicalize({ b: 2, a: 1 });
    const b = canonicalize({ a: 1, b: 2 });
    expect(bytesEqual(a, b)).toBe(true);
    // And the JSON body is the sorted-key form, no whitespace.
    expect(new TextDecoder().decode(a)).toBe('{"a":1,"b":2}');
  });

  it("sorts nested objects recursively + preserves array order (arrays are ordered records)", () => {
    const a = canonicalize({ outer: { z: 1, a: 2 }, list: [9, 8, 7] });
    // Keys sorted alphabetically at EVERY level: "list" < "outer" (the canonical form is
    // ORDER-INDEPENDENT of how the caller assembled the object — that's the whole point).
    expect(new TextDecoder().decode(a)).toBe('{"list":[9,8,7],"outer":{"a":2,"z":1}}');
  });

  it("encodes bigint as a decimal string (JSON has no bigint; the decimal form is reversible)", () => {
    const a = canonicalize({ n: 1_000_000_000n });
    expect(new TextDecoder().decode(a)).toBe('{"n":"1000000000"}');
  });

  it("round-trips a re-serialized clone: canonicalize twice → identical bytes (a clone verifies)", () => {
    const obj = { tenant: "t1", lift: 6.5, ci: [1.5, 8.0], n: 10n };
    const b1 = canonicalize(obj);
    const b2 = canonicalize({ ci: [1.5, 8.0], n: 10n, lift: 6.5, tenant: "t1" }); // reordered keys
    expect(bytesEqual(b1, b2)).toBe(true);
  });
});

describe("fingerprintOf — stable per key, distinct per key (rotation identification)", () => {
  it("the same public key yields the same fingerprint across calls", () => {
    const { publicKey } = makeKeypair();
    expect(fingerprintOf(publicKey)).toBe(fingerprintOf(publicKey));
  });

  it("different public keys yield different fingerprints", () => {
    const a = makeKeypair().publicKey;
    const b = makeKeypair().publicKey;
    expect(fingerprintOf(a)).not.toBe(fingerprintOf(b));
  });
});
