FROM python:3.11-slim

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./backend/
COPY frontend/ ./frontend/

#RUN mkdir -p ./models
COPY models/ ./models/

# Debug — print what actually got copied
RUN echo "=== /app contents ===" && ls -la /app && \
    echo "=== /app/frontend ===" && ls -la /app/frontend

WORKDIR /app/backend

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]