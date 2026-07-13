// crypto.ts — the WORM signature half of the dual-canonical two-fence.
//
// The two spines of integrity (15 §3): (a) the KEK → per-tenant DEK envelope encryption (a DB
// clone w/o the KEK is unintelligible), and (b) the WORM signature (an R2 Object-Lock clone
// w/o the signer's key is UNVERIFIABLE — the data is intact but its provenance is lost). This
// lib implements (b): ed25519 sign/verify over a DETERMINISTIC canonical serialization. (a) —
// the envelope encryption — is THICKENING (ADR-0007 Thinning Rule: the launch-first thin-M0
// defers the envelope layer; the WORM signature lands now so the corpus row the cycle writes
// is signed from day one — the signature is the candor-floor asset, not deferred).
// TODO(A1→thickening, crypto): the HSM-backed KEK unwrap + the per-tenant DEK envelope — the
// `signerFromPrivateKey` path already loads a key Object (the HSM unwrap drops in here).
//
// ed25519 via node:crypto (Node 22 stdlib) — NO third-party crypto (15 §3 — the crypto is
// stdlib or an HSM, never a hand-rolled or npm-fetched primitive). The signer holds the
// private key; the verifier holds ONLY the public key. The canonical serialization is caller-
// owned (the verifier + the corpus writer supply the canonical bytes; crypto signs whatever
// bytes it's handed — a true leaf, no contract dep, 24 §3).
//
// Cites: 15 §3 (HSM KEK → DEK envelope + the WORM signature) + ADR-0003 (the dual-canonical
//        two-fence); CLAUDE.md §2 (the crypto row) + §6 (stdlib-only crypto, Result over throw);
//        ADR-0007 (the envelope is thickening, the WORM signature is now).

import { err, ok, type Result } from "neverthrow";
import {
  createHash,
  createPublicKey,
  generateKeyPairSync,
  sign as ed25519Sign,
  verify as ed25519Verify,
  type KeyObject,
} from "node:crypto";

export type CryptoError =
  | { readonly kind: "empty-payload" }
  | { readonly kind: "empty-signature" }
  | { readonly kind: "bad-signature" }
  | { readonly kind: "bad-key" };

// A canonical byte-payload + its ed25519 signature. The bytes are the CANONICAL serialization
// (the caller's responsibility — see canonicalize() below for a deterministic JSON form); the
// signature is over those exact bytes. The WORM row is { bytes, signature, keyFingerprint };
// the fingerprint lets a verifier pick the right public key from the key archive (rotation:
// multiple fingerprints resolve to multiple keys).
export interface SignedRecord {
  readonly bytes: Uint8Array;
  readonly signature: Uint8Array;
  readonly keyFingerprint: string;
}

// The ed25519 signer — holds the private KeyObject + the public-key fingerprint. A process
// constructs one at startup (the deployed process loads the HSM-backed KEK; the dev process
// generates an ephemeral pair — the signature still verifies within + across restarts that
// persist the public key).
export interface WormSigner {
  /** Sign canonical bytes; returns the SignedRecord (bytes + signature + fingerprint). */
  sign(bytes: Uint8Array): Result<SignedRecord, CryptoError>;
  /** The public-key fingerprint this signer signs under (binds verification to this key). */
  readonly keyFingerprint: string;
}

// Construct a dev signer — a fresh ed25519 pair. Tests + the dev process. The deployed process
// loads the key from the HSM/KEK instead (the signerFromPrivateKey path).
export function devSigner(): WormSigner {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  return signerFromPrivateKey(privateKey, publicKey);
}

// Construct a signer from an existing private key (the deployed path — the key material is the
// HSM-backed KEK unwrap, not a generate call). The fingerprint is derived from the public key
// so a signer + its verifier key share the identifier.
export function signerFromPrivateKey(
  privateKey: KeyObject,
  publicKey: KeyObject,
): WormSigner {
  const fp = fingerprintOf(publicKey);
  return {
    keyFingerprint: fp,
    sign(bytes: Uint8Array): Result<SignedRecord, CryptoError> {
      if (bytes.length === 0) return err({ kind: "empty-payload" });
      try {
        // ed25519 ignores the algorithm arg; pass null (the node:crypto API requires a value).
        const signature = ed25519Sign(null, bytes, privateKey);
        return ok({ bytes, signature, keyFingerprint: fp });
      } catch {
        return err({ kind: "bad-key" });
      }
    },
  };
}

// Verify a SignedRecord against a public key. The bytes + signature + the verifier's public
// key are the three inputs; ed25519 verify is deterministic. A row whose signature does not
// verify under the fingerprint-named key is a tampered/cloned row — the R2 fence rejects it
// (the dual-canonical invariant: an R2 clone without the right key is unverifiable, never
// silently accepted — 15 §3).
export function verifyRecord(
  record: SignedRecord,
  publicKey: KeyObject,
): Result<void, CryptoError> {
  if (record.bytes.length === 0) return err({ kind: "empty-payload" });
  if (record.signature.length === 0) return err({ kind: "empty-signature" });
  try {
    // node:crypto verify(algorithm, data, key, signature) — the KEY is the 3rd arg, the SIGNATURE
    // is the 4th (NOT the reverse — an easy order to invert). A record whose bytes+signature do
    // not verify under this key is the tampered/cloned row the R2 fence rejects (never silently
    // accepted — 15 §3). `publicKey` is a KeyObject (the verifier unwraps the archive's PEM via
    // createPublicKey upstream; a raw Uint8Array is NOT a node key input — narrow the type so a
    // caller can't pass one at the type level, no `as` cast at the boundary).
    const verified = ed25519Verify(null, record.bytes, publicKey, record.signature);
    return verified ? ok(undefined) : err({ kind: "bad-signature" });
  } catch {
    return err({ kind: "bad-key" });
  }
}

// The public-key fingerprint — a short, stable identifier for the key a record was signed
// under. SHA-256 over the SPKI DER (the canonical public form), hex-encoded. Two different
// keys → two different fingerprints; the same key → the same fingerprint across processes.
// Not a security boundary (the signature is the boundary); an identifier — a SHA-256 preimage
// would be needed to collide it.
export function fingerprintOf(publicKey: KeyObject): string {
  const spki = publicKey.export({ format: "der", type: "spki" });
  return createHash("sha256").update(spki).digest("hex");
}

// Re-export so a verifier loads the public key from the archive by fingerprint (the archive
// stores { fingerprint → spki-pem }; createPublicKey unwraps it for verifyRecord).
export { createPublicKey };

// The canonical serialization for the JSON-shaped payloads the cycle signs (the AssertionEvent
// row, the dial-ledger row, the corpus row). DETERMINISTIC: sorted keys (recursively) + no
// whitespace + UTF-8 + bigint-as-string (JSON has no bigint). A re-serialized clone produces
// the same bytes, so the signature verifies across processes + machines. The caller owns the
// schema; this is the blessed encoder for the JSON-shaped rows (a non-JSON row — e.g. a raw
// probe blob — passes its own bytes directly to sign() without this function).
export function canonicalize(value: unknown): Uint8Array {
  const encoded = stableStringify(value);
  // TextEncoder is the stdlib UTF-8 encoder (Node 22 global). utf-8 is the canonical wire form.
  return new TextEncoder().encode(encoded);
}

// A stable JSON stringify — keys sorted recursively, no optional whitespace. bigint → string
// (the wire Timestamp seconds is bigint; JSON has no bigint type; the canonical form is the
// decimal string, reversible by the consumer — NOT a lossy Number for values > 2^53). `null`
// sorts before all string keys (the JSON convention); arrays preserve order (arrays are
// ordered records; object keys are unordered → sorted).
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    // primitives — bigint → decimal string; everything else → JSON.stringify's native form.
    if (typeof value === "bigint") return `"${value.toString(10)}"`;
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  // An object — sort keys for determinism (recursively). `Object.keys` returns own-enumerable
  // string keys; the contracts rows are plain records (no symbols, no non-enumerable props).
  const keys = Object.keys(value as Record<string, unknown>).sort();
  const body = keys
    .map((k) => `${JSON.stringify(k)}:${stableStringify((value as Record<string, unknown>)[k])}`)
    .join(",");
  return `{${body}}`;
}
