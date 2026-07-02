"""Pydantic schemas for request validation and response shaping."""

from pydantic import BaseModel
from typing import List, Optional


class MovieOut(BaseModel):
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
    content_type: Optional[str] = None  # None = all, "movie", "web_series", "hindi_movie"


class SyncResponse(BaseModel):
    inserted: int
    message: str
