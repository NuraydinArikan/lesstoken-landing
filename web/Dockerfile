FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements-backend.txt .
RUN pip install --no-cache-dir -r requirements-backend.txt

# Copy application
COPY app.py .
COPY database.py .
COPY optimizers.py .

# Environment
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py

# Railway injects PORT at runtime; default to 5000 locally.
ENV PORT=5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import os,requests; requests.get(f\"http://localhost:{os.environ.get('PORT','5000')}/api/v1/health\")"

# Run with gunicorn (shell form so $PORT expands)
EXPOSE 5000
CMD gunicorn -w 4 -b 0.0.0.0:$PORT -t 120 app:app
