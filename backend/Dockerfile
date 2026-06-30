FROM python:3.11-slim

WORKDIR /app

# Install dependencies first to leverage Docker layer caching.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensures the SQLite cache file has somewhere to live and persists via the
# mounted volume defined in docker-compose.yml.
RUN mkdir -p /app/data

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
