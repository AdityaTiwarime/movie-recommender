from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Movie
from app.schemas import MovieOut
from app.tmdb_client import fill_posters

router = APIRouter(prefix="/api/movies", tags=["movies"])


@router.get("", response_model=List[MovieOut])
def list_movies(db: Session = Depends(get_db), limit: int = 50):
    rows = db.query(Movie).limit(limit).all()
    return fill_posters(rows, db)
