"""API routes for listing cached movies and syncing fresh data from TMDB."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models import Movie
from app.schemas import MovieOut, SyncResponse
from app.tmdb_client import sync_movies_to_db, TMDB_API_KEY

router = APIRouter(prefix="/api/movies", tags=["movies"])


@router.get("", response_model=List[MovieOut])
def list_movies(db: Session = Depends(get_db), limit: int = 50):
    """Returns cached movies, used to populate the frontend's title search box."""
    return db.query(Movie).limit(limit).all()


@router.post("/sync", response_model=SyncResponse)
def sync_movies(db: Session = Depends(get_db), pages: int = 5):
    """
    Pulls fresh popular-movie data from the TMDB API into the local cache.
    Requires TMDB_API_KEY to be set in the environment.
    """
    if not TMDB_API_KEY:
        raise HTTPException(
            status_code=400,
            detail="TMDB_API_KEY is not configured. Set it in the backend .env file, "
                   "or load the Kaggle fallback dataset instead (see scripts/load_kaggle_data.py).",
        )
    inserted = sync_movies_to_db(db, pages=pages)
    return SyncResponse(inserted=inserted, message=f"Synced successfully, {inserted} new movies added.")
