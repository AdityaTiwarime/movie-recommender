from pydantic import BaseModel
from typing import List, Optional


class MovieOut(BaseModel):
    tmdb_id: int
    title: str
    overview: str
    genres: str
    cast: str
    release_year: str
    vote_average: float
    poster_path: str
    content_type: str = "movie"

    class Config:
        from_attributes = True


class TitleRecommendRequest(BaseModel):
    title: str
    top_n: int = 10


class PreferenceRecommendRequest(BaseModel):
    genres: List[str]
    top_n: int = 10
    content_type: Optional[str] = None
    year_min: Optional[int] = None
    year_max: Optional[int] = None
    min_rating: Optional[float] = None
    # ids of movies the user already gave a thumbs-up to in this session -
    # their genres get folded in on top of the explicit genre picks, so
    # later results lean toward what they've actually liked so far
    liked_ids: List[int] = []


class RandomRequest(BaseModel):
    top_n: int = 1
    content_type: Optional[str] = None
    year_min: Optional[int] = None
    year_max: Optional[int] = None
    min_rating: Optional[float] = None


class SyncResponse(BaseModel):
    inserted: int
    message: str
