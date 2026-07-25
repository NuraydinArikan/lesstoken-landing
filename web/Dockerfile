FROM python:3.11-slim

WORKDIR /app

# Build context is the repository root (see railway.json), so paths are
# repo-relative rather than relative to this file.
COPY web/requirements-backend.txt .
RUN pip install --no-cache-dir -r requirements-backend.txt

COPY web/app.py web/database.py web/optimizers.py ./

ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py

# Railway routes the public domain to 8080. It normally injects PORT, but
# defaulting to 8080 keeps the container correct even when it does not.
ENV PORT=8080
EXPOSE 8080

# Shell form so $PORT expands.
CMD gunicorn -w 4 -b 0.0.0.0:$PORT -t 120 app:app
