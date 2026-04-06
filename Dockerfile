FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies first (cached layer unless requirements.txt changes)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./backend/

# Copy frontend and models — FastAPI serves these as static files
COPY frontend/ ./frontend/
COPY models/   ./models/

WORKDIR /app/backend

# Uvicorn listens on all interfaces inside the container
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]