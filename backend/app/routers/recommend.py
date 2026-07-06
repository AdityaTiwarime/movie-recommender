from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Movie
from app.recommender import MovieRecommender
from app.schemas import TitleRecommendRequest, PreferenceRecommendRequest, RandomRequest, MovieOut
from app.tmdb_client import fill_posters

router = APIRouter(prefix="/api/recommend", tags=["recommendations"])


@router.post("/by-title", response_model=List[MovieOut])
def by_title(payload: TitleRecommendRequest, db: Session = Depends(get_db)):
    rec = MovieRecommender(db)
    res = rec.recommend_by_title(payload.title, payload.top_n)
    if not res:
        raise HTTPException(status_code=404, detail="Title not found in database")
    return fill_posters(res, db)


@router.post("/by-preferences", response_model=List[MovieOut])
def by_preferences(payload: PreferenceRecommendRequest, db: Session = Depends(get_db)):
    genres = list(payload.genres)

    # fold in genres from whatever the user already liked this session -
    # this is the "rate a pick to refine future recommendations" feature.
    # kept simple on purpose: no separate ratings table, just genre
    # reinforcement based on ids the frontend already tracked
    if payload.liked_ids:
        liked_movies = db.query(Movie).filter(Movie.tmdb_id.in_(payload.liked_ids)).all()
        for m in liked_movies:
            genres.extend(g.strip() for g in m.genres.split(",") if g.strip())

    rec = MovieRecommender(db)
    res = rec.recommend_by_preferences(
        genres, payload.top_n, payload.content_type,
        payload.year_min, payload.year_max, payload.min_rating,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Nothing matched your preferences")
    return fill_posters(res, db)


@router.post("/random", response_model=List[MovieOut])
def random_pick(payload: RandomRequest, db: Session = Depends(get_db)):
    rec = MovieRecommender(db)
    res = rec.recommend_random(
        payload.top_n, payload.content_type,
        payload.year_min, payload.year_max, payload.min_rating,
    )
    if not res:
        raise HTTPException(status_code=404, detail="Nothing matched those filters")
    return fill_posters(res, db)
