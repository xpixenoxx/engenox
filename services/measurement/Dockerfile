# Measurement Service - Python/FastAPI with uv
FROM python:3.12-slim AS builder
WORKDIR /app

# Install uv for fast package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

# Create virtual environment
RUN uv venv

# Install build dependencies
RUN uv pip install setuptools wheel

# Copy contracts package
COPY pkg/contracts/pyproject.toml ./pkg/contracts/

# Copy measurement service
COPY services/measurement/pyproject.toml ./services/measurement/
COPY services/measurement/uv.lock ./services/measurement/

# Copy source code first
COPY pkg/contracts/ ./pkg/contracts/
COPY libs/kg/ ./libs/kg/
COPY services/measurement/src/ ./services/measurement/src/

# Install contracts first (as standard dep)
RUN uv pip install --no-build-isolation ./pkg/contracts

# Install measurement service dependencies into the global /app/.venv
ENV UV_PROJECT_ENVIRONMENT=/app/.venv
RUN uv sync --frozen --no-dev --no-editable --directory services/measurement

# Install measurement package (standard install)
RUN uv pip install --no-deps ./services/measurement

FROM python:3.12-slim AS runner
WORKDIR /app
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Copy virtual env from builder
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

EXPOSE 8003
CMD ["python", "-m", "uvicorn", "engenox.measurement.main:app", "--host", "0.0.0.0", "--port", "8003"]