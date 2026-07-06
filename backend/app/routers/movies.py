from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Movie
from app.recommender import MovieRecommender
from app.schemas import MovieOut
from app.tmdb_client import fill_posters

router = APIRouter(prefix="/api/movies", tags=["movies"])


@router.get("", response_model=List[MovieOut])
def list_movies(db: Session = Depends(get_db), limit: int = 50):
    rows = db.query(Movie).limit(limit).all()
    return fill_posters(rows, db)


@router.get("/search", response_model=List[MovieOut])
def search_by_person(q: str, db: Session = Depends(get_db)):
    """Search by actor name. Only matches the roughly half of the catalog
    that has real cast data attached - see build_dataset.py for why."""
    rec = MovieRecommender(db)
    results = rec.search_by_person(q)
    return fill_posters(results, db)
