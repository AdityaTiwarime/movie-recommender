"""
FastAPI application entrypoint.

Exposes the movie recommendation API and serves as the backend container's
main process. CORS is open to the frontend container's origin so the React
app (running in its own container) can call this API directly.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import recommend, movies

# Creates the SQLite tables on startup if they don't already exist.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Movie Matching & Recommendation Service",
    description="Content-based movie recommender built for the JTP 2026 recruitment project.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Open for demo purposes; restrict to frontend origin in production.
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recommend.router)
app.include_router(movies.router)


@app.get("/")
def health_check():
    """Simple health check endpoint to confirm the API container is running."""
    return {"status": "ok", "service": "movie-recommender-backend"}
