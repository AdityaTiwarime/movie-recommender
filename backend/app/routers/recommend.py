"""API routes for recommendation operations."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.recommender import MovieRecommender
from app.schemas import TitleRecommendRequest, PreferenceRecommendRequest, MovieOut
from typing import List

router = APIRouter(prefix="/api/recommend", tags=["recommendations"])


@router.post("/by-title", response_model=List[MovieOut])
def recommend_by_title(payload: TitleRecommendRequest, db: Session = Depends(get_db)):
    """Recommends movies similar to a given title the user already likes."""
    engine = MovieRecommender(db)
    results = engine.recommend_by_title(payload.title, top_n=payload.top_n)
    if not results:
        raise HTTPException(
            status_code=404,
            detail="No matching title found in the database. Try a different title or run /api/movies/sync first.",
        )
    return results


@router.post("/by-preferences", response_model=List[MovieOut])
def recommend_by_preferences(payload: PreferenceRecommendRequest, db: Session = Depends(get_db)):
    """Recommends movies based on a list of preferred genres from the form."""
    engine = MovieRecommender(db)
    results = engine.recommend_by_preferences(payload.genres, top_n=payload.top_n)
    if not results:
        raise HTTPException(
            status_code=404,
            detail="No movies matched the selected preferences.",
        )
    return results
