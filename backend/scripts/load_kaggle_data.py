"""
Loads the "TMDB 5000 Movie Dataset" (Kaggle) into the local database as an
offline fallback data source, for use when no TMDB API key is available.

Dataset source (declared per project requirements):
https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata

Usage:
    1. Download tmdb_5000_movies.csv and tmdb_5000_credits.csv from the link
       above and place them in backend/app/data/.
    2. Run: python -m scripts.load_kaggle_data
"""

import ast
import os
import sys
import pandas as pd

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal, Base, engine
from app.models import Movie

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "app", "data")
MOVIES_CSV = os.path.join(DATA_DIR, "tmdb_5000_movies.csv")
CREDITS_CSV = os.path.join(DATA_DIR, "tmdb_5000_credits.csv")


def _parse_names(json_like_string: str, limit: int = None) -> str:
    """Parses Kaggle's stringified JSON list columns (genres, cast) into a comma-separated string."""
    try:
        items = ast.literal_eval(json_like_string)
        names = [item["name"] for item in items]
        if limit:
            names = names[:limit]
        return ", ".join(names)
    except (ValueError, SyntaxError, KeyError):
        return ""


def load_kaggle_dataset():
    if not os.path.exists(MOVIES_CSV) or not os.path.exists(CREDITS_CSV):
        print(f"CSV files not found in {DATA_DIR}. Download them from Kaggle first (see docstring).")
        return

    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    movies_df = pd.read_csv(MOVIES_CSV)
    credits_df = pd.read_csv(CREDITS_CSV)
    merged = movies_df.merge(credits_df, left_on="id", right_on="movie_id", suffixes=("", "_credit"))

    inserted = 0
    for _, row in merged.iterrows():
        tmdb_id = int(row["id"])
        if db.query(Movie).filter(Movie.tmdb_id == tmdb_id).first():
            continue

        db.add(Movie(
            tmdb_id=tmdb_id,
            title=row.get("title", "Untitled"),
            overview=row.get("overview", "") or "",
            genres=_parse_names(row.get("genres", "[]")),
            cast=_parse_names(row.get("cast", "[]"), limit=3),
            release_year=str(row.get("release_date", ""))[:4],
            vote_average=float(row.get("vote_average", 0.0) or 0.0),
            poster_path="",
        ))
        inserted += 1

    db.commit()
    db.close()
    print(f"Loaded {inserted} movies from the Kaggle dataset.")


if __name__ == "__main__":
    load_kaggle_dataset()
