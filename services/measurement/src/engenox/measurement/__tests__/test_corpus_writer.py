"""Tests for Signed CIO Corpus Writer — M4-thin.

Cites: 13 §4 (corpus), 15 §3 (WORM signature), 26 §2.4 (integrity tags).
"""

import json
from dataclasses import FrozenInstanceError
from typing import Any

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from engenox.measurement.corpus.writer import (
    SignedCorpusRow,
    _canonicalize_row,
    create_signed_corpus_row,
    sign_corpus_row,
)


class TestCanonicalization:
    """Tests for deterministic canonical JSON serialization."""

    def test_canonicalize_sorts_keys(self) -> None:
        """Dictionary keys are sorted alphabetically."""
        row: dict[str, Any] = {"z": 1, "a": 2, "m": 3}
        canonical = _canonicalize_row(row)
        parsed = json.loads(canonical)
        keys = list(parsed.keys())
        assert keys == ["a", "m", "z"]

    def test_canonicalize_nested_dict_sorted(self) -> None:
        """Nested dicts also sorted."""
        row: dict[str, Any] = {"outer": {"z": 1, "a": 2}}
        canonical = _canonicalize_row(row)
        parsed = json.loads(canonical)
        assert list(parsed["outer"].keys()) == ["a", "z"]

    def test_canonicalize_no_whitespace(self) -> None:
        """No whitespace in canonical output."""
        row = {"a": 1, "b": 2}
        canonical = _canonicalize_row(row)
        assert canonical == '{"a":1,"b":2}'

    def test_canonicalize_bigint_as_decimal_string(self) -> None:
        """Big integers serialized as decimal strings (not scientific notation)."""
        row = {"big": 12345678901234567890}
        canonical = _canonicalize_row(row)
        assert '"big":12345678901234567890' in canonical

    def test_canonicalize_datetime_utc_z(self) -> None:
        """Datetime serialized as UTC with Z suffix."""
        from datetime import UTC, datetime
        dt = datetime(2026, 7, 15, 12, 0, 0, tzinfo=UTC)
        row = {"ts": dt}
        canonical = _canonicalize_row(row)
        assert canonical.endswith('"ts":"2026-07-15T12:00:00Z"}')


class TestEd25519Signing:
    """Tests for ed25519 corpus row signing."""

    def generate_test_key(self) -> str:
        """Generate a test Ed25519 private key in PEM format."""
        private_key = Ed25519PrivateKey.generate()
        pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        )
        return pem.decode()

    def test_sign_corpus_row_returns_signed_row(self) -> None:
        """sign_corpus_row produces SignedCorpusRow with valid fields."""
        key_pem = self.generate_test_key()
        row_data = {
            "intervention_id": "test-int-1",
            "tenant_id": "test-tenant",
            "estimator": "scm",
            "lift": 2.5,
            "lift_ci_lower": 1.0,
            "lift_ci_upper": 4.0,
            "status": "ok",
            "integrity_tags": {"estimator": "scm", "status": "ok"},
            "foreign_change_tags": None,
            "estimated_at": "2026-07-15T12:00:00Z",
        }

        result = sign_corpus_row(row_data, key_pem)

        assert isinstance(result, SignedCorpusRow)
        assert result.intervention_id == "test-int-1"
        assert result.tenant_id == "test-tenant"
        assert result.estimator == "scm"
        assert result.lift == 2.5
        assert result.signature is not None
        assert len(result.signature) == 64  # ed25519 signature length
        assert result.canonical_json is not None

    def test_signature_deterministic_for_same_input(self) -> None:
        """Same input + same key = same signature."""
        key_pem = self.generate_test_key()
        row_data = {"intervention_id": "det", "tenant_id": "t", "estimator": "scm", "lift": 1.0,
                    "lift_ci_lower": 0.5, "lift_ci_upper": 1.5, "status": "ok",
                    "integrity_tags": {}, "foreign_change_tags": None,
                    "estimated_at": "2026-07-15T12:00:00Z"}

        sig1 = sign_corpus_row(row_data, key_pem).signature
        sig2 = sign_corpus_row(row_data, key_pem).signature

        assert sig1 == sig2  # Deterministic signing

    def test_different_keys_produce_different_signatures(self) -> None:
        """Different keys produce different signatures."""
        key1 = self.generate_test_key()
        key2 = self.generate_test_key()
        row_data = {"intervention_id": "diff", "tenant_id": "t", "estimator": "scm", "lift": 1.0,
                    "lift_ci_lower": 0.5, "lift_ci_upper": 1.5, "status": "ok",
                    "integrity_tags": {}, "foreign_change_tags": None,
                    "estimated_at": "2026-07-15T12:00:00Z"}

        sig1 = sign_corpus_row(row_data, key1).signature
        sig2 = sign_corpus_row(row_data, key2).signature

        assert sig1 != sig2

    def test_canonical_json_matches_signed_payload(self) -> None:
        """The canonical_json field matches what was actually signed."""
        key_pem = self.generate_test_key()
        row_data = {"intervention_id": "payload", "tenant_id": "t", "estimator": "scm", "lift": 1.0,
                    "lift_ci_lower": 0.5, "lift_ci_upper": 1.5, "status": "ok",
                    "integrity_tags": {}, "foreign_change_tags": None,
                    "estimated_at": "2026-07-15T12:00:00Z"}

        result = sign_corpus_row(row_data, key_pem)

        # Verify the signature against the canonical_json
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
        private_key = serialization.load_pem_private_key(key_pem.encode(), password=None)
        public_key = private_key.public_key()
        assert isinstance(public_key, Ed25519PublicKey)

        # This should not raise
        public_key.verify(result.signature, result.canonical_json.encode("utf-8"))

    def test_invalid_key_raises(self) -> None:
        """Non-Ed25519 key raises ValueError."""
        from cryptography.hazmat.primitives.asymmetric import rsa
        rsa_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        pem = rsa_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode()

        row_data = {"intervention_id": "bad", "tenant_id": "t", "estimator": "scm", "lift": 1.0,
                    "lift_ci_lower": 0.5, "lift_ci_upper": 1.5, "status": "ok",
                    "integrity_tags": {}, "foreign_change_tags": None,
                    "estimated_at": "2026-07-15T12:00:00Z"}

        with pytest.raises(ValueError, match="must be Ed25519"):
            sign_corpus_row(row_data, pem)


class TestSignedCorpusRow:
    """Tests for SignedCorpusRow dataclass."""

    def test_signed_corpus_row_frozen(self) -> None:
        """SignedCorpusRow is frozen (immutable)."""
        key_pem = Ed25519PrivateKey.generate().private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode()

        row = sign_corpus_row(
            {"intervention_id": "f", "tenant_id": "t", "estimator": "scm", "lift": 1.0,
             "lift_ci_lower": 0.5, "lift_ci_upper": 1.5, "status": "ok",
             "integrity_tags": {}, "foreign_change_tags": None,
             "estimated_at": "2026-07-15T12:00:00Z"},
            key_pem,
        )

        with pytest.raises(FrozenInstanceError):
            row.lift = 2.0


class TestCreateSignedCorpusRow:
    """Tests for create_signed_corpus_row convenience function."""

    async def test_create_signed_corpus_row_builds_row_data(self) -> None:
        """Convenience function builds row_data dict and signs."""
        key_pem = Ed25519PrivateKey.generate().private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption(),
        ).decode()

        row = await create_signed_corpus_row(
            intervention_id="conv-1",
            tenant_id="tenant-1",
            estimator="dml",
            lift=3.0,
            lift_ci_lower=1.5,
            lift_ci_upper=4.5,
            status="ok",
            integrity_tags={"estimator": "dml", "status": "ok"},
            signing_key_pem=key_pem,
            foreign_change_tags=None,
        )

        assert row.intervention_id == "conv-1"
        assert row.tenant_id == "tenant-1"
        assert row.estimator == "dml"
        assert row.lift == 3.0
        assert row.signature is not None