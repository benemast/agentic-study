FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

# Copy application code
COPY . .

# Create logs directory
RUN mkdir -p /app/logs

EXPOSE 8000

# Production: Multiple workers, no reload
CMD ["sh", "-c", "uvicorn app.main:app --host ${UVICORN_HOST:-0.0.0.0} --port ${UVICORN_PORT:-8000} --workers ${UVICORN_WORKERS:-3}"]