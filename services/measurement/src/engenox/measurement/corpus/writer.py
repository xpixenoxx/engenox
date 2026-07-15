"""Signed CIO Corpus Writer — M4-thin.

Writes intervention-outcome rows with WORM ed25519 signatures to Postgres.
The signature is the candor floor: every commit-to-state is reproducible
from a signed node. The R2 Object-Lock mirror thickens later.

References: 13 §4 (corpus), 15 §3 (WORM signature), 26 §2.4 (integrity tags).
"""

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import asyncpg
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from engenox.measurement.config.settings import get_settings


@dataclass(frozen=True, slots=True)
class SignedCorpusRow:
    """A signed CIO corpus row ready for database insertion."""

    intervention_id: str
    tenant_id: str
    estimator: str
    lift: float | None
    lift_ci_lower: float | None
    lift_ci_upper: float | None
    status: str
    integrity_tags: dict[str, Any]
    foreign_change_tags: dict[str, Any] | None
    estimated_at: str
    signature: bytes  # ed25519 signature of canonical representation
    canonical_json: str  # Canonical representation that was signed


def _canonicalize_row(row: dict[str, Any]) -> str:
    """
    Deterministic canonical JSON for signing.

    Sorted keys, no whitespace, bigint as decimal string.
    This MUST match the verification canonicalization in libs/crypto.
    """
    import json

    def default_serializer(obj: object) -> str:
        if isinstance(obj, datetime):
            return obj.astimezone(UTC).isoformat().replace("+00:00", "Z")
        raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")

    # Sort keys recursively
    def sort_dict(d: dict[str, Any]) -> dict[str, Any]:
        return {k: sort_dict(v) if isinstance(v, dict) else v for k, v in sorted(d.items())}

    canonical_dict = sort_dict(row)
    return json.dumps(canonical_dict, separators=(",", ":"), default=default_serializer)


def sign_corpus_row(
    row_data: dict[str, Any],
    signing_key_pem: str,
) -> SignedCorpusRow:
    """
    Sign a corpus row with ed25519 private key.

    Returns SignedCorpusRow with signature and canonical JSON.
    """
    # Load private key
    private_key = serialization.load_pem_private_key(
        signing_key_pem.encode(),
        password=None,
    )
    if not isinstance(private_key, Ed25519PrivateKey):
        raise ValueError("Signing key must be Ed25519 private key")

    # Canonicalize (deterministic)
    canonical = _canonicalize_row(row_data)

    # Sign
    signature = private_key.sign(canonical.encode("utf-8"))

    return SignedCorpusRow(
        intervention_id=row_data["intervention_id"],
        tenant_id=row_data["tenant_id"],
        estimator=row_data["estimator"],
        lift=row_data.get("lift"),
        lift_ci_lower=row_data.get("lift_ci_lower"),
        lift_ci_upper=row_data.get("lift_ci_upper"),
        status=row_data["status"],
        integrity_tags=row_data.get("integrity_tags", {}),
        foreign_change_tags=row_data.get("foreign_change_tags"),
        estimated_at=row_data.get(
            "estimated_at", datetime.now(UTC).isoformat().replace("+00:00", "Z")
        ),
        signature=signature,
        canonical_json=canonical,
    )


async def write_corpus_row(
    pool: asyncpg.Pool,
    row: SignedCorpusRow,
) -> str:
    """
    Insert signed corpus row into Postgres.

    Returns the inserted row ID (UUID).
    """
    async with pool.acquire() as conn:
        row_id = await conn.fetchval(
            """
            INSERT INTO measurement.cio_corpus (
                intervention_id, tenant_id, estimator,
                lift, lift_ci_lower, lift_ci_upper, status,
                integrity_tags, foreign_change_tags, estimated_at,
                canonical_json, signature
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING id
            """,
            row.intervention_id,
            row.tenant_id,
            row.estimator,
            row.lift,
            row.lift_ci_lower,
            row.lift_ci_upper,
            row.status,
            row.integrity_tags,
            row.foreign_change_tags,
            row.estimated_at,
            row.canonical_json,
            row.signature,
        )
        return str(row_id)


async def create_signed_corpus_row(
    intervention_id: str,
    tenant_id: str,
    estimator: str,
    lift: float | None,
    lift_ci_lower: float | None,
    lift_ci_upper: float | None,
    status: str,
    integrity_tags: dict[str, Any],
    signing_key_pem: str,
    foreign_change_tags: dict[str, Any] | None = None,
) -> SignedCorpusRow:
    """
    Create a signed corpus row from estimator results.

    Convenience function that constructs the row dict and signs it.
    """
    row_data = {
        "intervention_id": intervention_id,
        "tenant_id": tenant_id,
        "estimator": estimator,
        "lift": lift,
        "lift_ci_lower": lift_ci_lower,
        "lift_ci_upper": lift_ci_upper,
        "status": status,
        "integrity_tags": integrity_tags,
        "foreign_change_tags": foreign_change_tags,
        "estimated_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
    }

    return sign_corpus_row(row_data, signing_key_pem)


async def get_db_pool() -> asyncpg.Pool:
    """Get or create database connection pool."""
    settings = get_settings()
    return await asyncpg.create_pool(
        settings.database_url,
        min_size=2,
        max_size=10,
    )


async def initialize_schema(pool: asyncpg.Pool) -> None:
    """Create the corpus table if it doesn't exist (M4-thin idempotent)."""
    async with pool.acquire() as conn:
        await conn.execute(
            """
            CREATE TABLE IF NOT EXISTS measurement.cio_corpus (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                intervention_id TEXT NOT NULL,
                tenant_id TEXT NOT NULL,
                estimator TEXT NOT NULL,
                lift DOUBLE PRECISION,
                lift_ci_lower DOUBLE PRECISION,
                lift_ci_upper DOUBLE PRECISION,
                status TEXT NOT NULL CHECK (status IN ('ok', 'fallback', 'infeasible')),
                integrity_tags JSONB NOT NULL DEFAULT '{}',
                foreign_change_tags JSONB,
                estimated_at TIMESTAMPTZ NOT NULL,
                canonical_json TEXT NOT NULL,
                signature BYTEA NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            );
            """
        )
        # Index for tenant queries
        await conn.execute(
            """
            CREATE INDEX IF NOT EXISTS cio_corpus_tenant_estimated_idx
            ON measurement.cio_corpus (tenant_id, estimated_at DESC);
            """
        )
        # Index for intervention queries
        await conn.execute(
            """
            CREATE INDEX IF NOT EXISTS cio_corpus_intervention_idx
            ON measurement.cio_corpus (intervention_id);
            """
        )