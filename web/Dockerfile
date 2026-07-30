FROM python:3.11-slim

WORKDIR /app

# Railway's build context has proven ambiguous between the repository root and
# web/, so copy whatever the context is and locate the backend sources at build
# time rather than assuming either layout.
COPY . /src

RUN set -eux; \
    echo "--- build context contents ---"; \
    ls -la /src; \
    if [ -f /src/web/app.py ]; then SRC=/src/web; else SRC=/src; fi; \
    echo "--- using backend sources from: $SRC ---"; \
    cp "$SRC/requirements-backend.txt" "$SRC/app.py" "$SRC/database.py" "$SRC/optimizers.py" /app/; \
    cp -r "$SRC/migrations" /app/migrations; \
    pip install --no-cache-dir -r /app/requirements-backend.txt; \
    rm -rf /src

ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=app.py

# Railway routes the public domain to 8080. It normally injects PORT, but
# defaulting to 8080 keeps the container correct even when it does not.
ENV PORT=8080
EXPOSE 8080

# flask db upgrade runs every deploy. The very first deploy after this change
# applies the single migration from Task 2 directly (production's users table
# predates any migration tool, so there is no earlier revision to reconcile -
# Alembic just finds no alembic_version row and runs the one migration that
# exists). Every deploy after that is a no-op since it's already at head.
# Shell form so $PORT expands and && chains correctly.
CMD flask db upgrade && gunicorn -w 4 -b 0.0.0.0:$PORT -t 120 app:app
