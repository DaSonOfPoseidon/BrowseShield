FROM python:3.12-slim

WORKDIR /app

COPY Backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

COPY Backend/ /app/Backend/
COPY ML/ /app/ML/
COPY Detection/ /app/Detection/

ENV PYTHONPATH=/app

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "2", "Backend.app:create_app()"]
