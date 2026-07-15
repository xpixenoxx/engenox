"""Measurement Service FastAPI App — M4-thin entry point."""

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from engenox.measurement.api import router
from engenox.measurement.config.settings import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Startup: DB pool, etc.
    yield
    # Shutdown: close pools


def create_app() -> FastAPI:
    get_settings()  # Validate settings on startup

    app = FastAPI(
        title="Engenox Measurement Service",
        description="M4-thin: SCM + DML + Foreign Change Detection + Signed CIO Corpus",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.include_router(router)

    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "engenox.measurement.main:app",
        host="0.0.0.0",
        port=get_settings().service_port,
        reload=True,
    )