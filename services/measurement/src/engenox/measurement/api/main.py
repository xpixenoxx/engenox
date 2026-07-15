"""Measurement Service API — M4-thin.

FastAPI service exposing SCM, DML, foreign change detection, and
signed corpus write endpoints. Per ADR-0007: thin signal (estimators)
with WORM provenance from day one.

References: 11 §3 (measurement seam), 13 §4 (corpus), 15 §3 (WORM),
26 §4 (foreign-change detector ships with loop), CLAUDE.md §8 (tenant from JWT,
IdempotencyKey required on mutations).
"""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from engenox.measurement.api.routes import router as api_router

# ---- Lifespan -


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Startup
    # Initialize DB pool (optional for M4-thin — allow running without DB)
    # await get_db_pool()
    yield
    # Shutdown
    # await close_db_pool()


# ---- App ----

app = FastAPI(
    title="Engenox Measurement Service",
    description="M4-thin: SCM + DML + Foreign Change Detection + Signed CIO Corpus",
    version="0.1.0",
    lifespan=lifespan,
)

app.include_router(api_router)


if __name__ == "__main__":
    import uvicorn

    from engenox.measurement.config.settings import get_settings

    uvicorn.run(app, host="0.0.0.0", port=get_settings().service_port)