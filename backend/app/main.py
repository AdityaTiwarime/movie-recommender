"""
FastAPI application entrypoint.

On startup, auto_setup() is called to check if the database needs to be
populated. If it is empty, it automatically downloads the TMDB dataset
and loads it — making the project fully plug-and-play with docker-compose up.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.database import Base, engine
from app.routers import recommend, movies
from app.startup import auto_setup


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Runs auto_setup on startup so the database is always ready."""
    auto_setup()
    yield


app = FastAPI(
    title="Movie Matching & Recommendation Service",
    description="Content-based movie recommender built for the JTP 2026 recruitment project.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(recommend.router)
app.include_router(movies.router)


@app.get("/")
def health_check():
    """Simple health check endpoint to confirm the API container is running."""
    return {"status": "ok", "service": "movie-recommender-backend"}
