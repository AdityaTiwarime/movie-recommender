"""
ORM model for movies cached from the TMDB API (or loaded from the Kaggle
fallback dataset). Storing a local cache means the recommender can compute
similarity without hitting the external API on every request, and the app
still works if TMDB is temporarily unreachable.
"""

from sqlalchemy import Column, Integer, String, Float, Text
from app.database import Base


class Movie(Base):
    __tablename__ = "movies"

    id = Column(Integer, primary_key=True, index=True)
    tmdb_id = Column(Integer, unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    overview = Column(Text, default="")
    genres = Column(String(255), default="")       # comma-separated genre names
    cast = Column(String(255), default="")          # comma-separated top-billed actors
    release_year = Column(String(4), default="")
    vote_average = Column(Float, default=0.0)
    poster_path = Column(String(255), default="")

    def combined_features(self) -> str:
        """
        Builds a single text blob from this movie's metadata for vectorization.
        Genres and cast are repeated to give them more weight relative to the
        free-text overview when computing TF-IDF similarity.
        """
        return f"{self.overview} {self.genres} {self.genres} {self.cast} {self.cast}"
