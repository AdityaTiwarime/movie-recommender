from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.recommender import MovieRecommender
from app.schemas import TitleRecommendRequest, PreferenceRecommendRequest, MovieOut

router = APIRouter(prefix="/api/recommend", tags=["recommendations"])


@router.post("/by-title", response_model=List[MovieOut])
def by_title(payload: TitleRecommendRequest, db: Session = Depends(get_db)):
    rec = MovieRecommender(db)
    res = rec.recommend_by_title(payload.title, payload.top_n)
    if not res:
        raise HTTPException(status_code=404, detail="Title not found in database")
    return res


@router.post("/by-preferences", response_model=List[MovieOut])
def by_preferences(payload: PreferenceRecommendRequest, db: Session = Depends(get_db)):
    rec = MovieRecommender(db)
    res = rec.recommend_by_preferences(payload.genres, payload.top_n, payload.content_type)
    if not res:
        raise HTTPException(status_code=404, detail="Nothing matched your preferences")
    return res
