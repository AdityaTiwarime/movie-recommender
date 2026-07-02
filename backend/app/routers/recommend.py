"""API routes for recommendation operations."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.recommender import MovieRecommender
from app.schemas import TitleRecommendRequest, PreferenceRecommendRequest, MovieOut
from app.models import Movie

router = APIRouter(prefix="/api/recommend", tags=["recommendations"])


@router.post("/by-title", response_model=List[MovieOut])
def recommend_by_title(payload: TitleRecommendRequest, db: Session = Depends(get_db)):
    """Recommends movies similar to a given title the user already likes."""
    engine = MovieRecommender(db)
    results = engine.recommend_by_title(payload.title, top_n=payload.top_n)
    if not results:
        raise HTTPException(status_code=404, detail="No matching title found.")
    return results


@router.post("/by-preferences", response_model=List[MovieOut])
def recommend_by_preferences(payload: PreferenceRecommendRequest, db: Session = Depends(get_db)):
    """Recommends content based on genres and optional content_type filter."""
    engine = MovieRecommender(db)
    results = engine.recommend_by_preferences(
        payload.genres,
        top_n=payload.top_n,
        content_type=payload.content_type
    )
    if not results:
        raise HTTPException(status_code=404, detail="No content matched the selected preferences.")
    return results
