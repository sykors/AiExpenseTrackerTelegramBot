# ==================================
# Multi-stage Dockerfile for Expense Bot AI
# ==================================

# Build arguments for flexibility
ARG PYTHON_VERSION=3.11
ARG APP_PORT=8000

# ==================================
# Stage 1: Base Image
# ==================================
FROM python:${PYTHON_VERSION}-slim as base

# Prevent Python from writing pyc files and buffering stdout/stderr
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# ==================================
# Stage 2: Dependencies Builder
# ==================================
FROM base as builder

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    make \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ==================================
# Stage 3: Development Target
# ==================================
FROM base as development

# Install runtime and development dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Database clients
    postgresql-client \
    # Image processing (for receipt OCR)
    libimage-exiftool-perl \
    imagemagick \
    # Audio processing (for voice messages)
    ffmpeg \
    libsndfile1 \
    # Utilities for debugging
    curl \
    wget \
    procps \
    htop \
    vim \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install development tools
RUN pip install --no-cache-dir \
    pytest==7.4.3 \
    pytest-asyncio==0.21.1 \
    pytest-cov==4.1.0 \
    black==23.12.1 \
    mypy==1.7.1 \
    flake8==6.1.0 \
    ipython==8.18.1

# Copy application code
COPY ./app /app/app
COPY ./alembic.ini /app/alembic.ini
COPY ./migrations /app/migrations

# Create directories for uploads and logs
RUN mkdir -p /app/uploads /app/logs && chmod -R 755 /app

# Expose port
ARG APP_PORT
EXPOSE ${APP_PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${APP_PORT}/health || exit 1

# Run with hot-reload for development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# ==================================
# Stage 4: Production Target
# ==================================
FROM base as production

# Install only runtime dependencies (minimal)
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Database client
    postgresql-client \
    # Image processing
    libimage-exiftool-perl \
    imagemagick \
    # Audio processing
    ffmpeg \
    libsndfile1 \
    # Health check utility
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create non-root user for security
RUN useradd -m -u 1000 -s /bin/bash botuser && \
    mkdir -p /app/uploads /app/logs && \
    chown -R botuser:botuser /app

# Copy application code
COPY --chown=botuser:botuser ./app /app/app
COPY --chown=botuser:botuser ./alembic.ini /app/alembic.ini
COPY --chown=botuser:botuser ./migrations /app/migrations

# Switch to non-root user
USER botuser

# Expose port
ARG APP_PORT
EXPOSE ${APP_PORT}

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${APP_PORT}/api/v1/health || exit 1

# Volume mounts for persistent data
VOLUME ["/app/uploads", "/app/logs"]

# Graceful shutdown signal
STOPSIGNAL SIGTERM

# Run with Gunicorn for production (better performance)
CMD ["gunicorn", "app.main:app", \
     "--workers", "4", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "120", \
     "--graceful-timeout", "30", \
     "--access-logfile", "/app/logs/access.log", \
     "--error-logfile", "/app/logs/error.log", \
     "--log-level", "info"]

# ==================================
# Default target is production
# ==================================
