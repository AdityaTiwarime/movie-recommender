"""
ORM model for cached movie and web series data.
content_type field distinguishes between movies, web series, and Hindi movies.
"""

from sqlalchemy import Column, Integer, String, Float, Text
from app.database import Base


class Movie(Base):
    __tablename__ = "movies"

    id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    overview = Column(Text, default="")
    genres = Column(String(255), default="")
    cast = Column(String(255), default="")
    release_year = Column(String(4), default="")
    vote_average = Column(Float, default=0.0)
    poster_path = Column(String(255), default="")
    content_type = Column(String(50), default="movie")  # movie | web_series | hindi_movie

    def combined_features(self) -> str:
        """Builds a text blob for TF-IDF vectorization. Genres and cast weighted higher."""
        return f"{self.overview} {self.genres} {self.genres} {self.cast} {self.cast}"
