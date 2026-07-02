"""
Startup data loader that runs automatically when the backend container starts.

On first run it checks if the database is empty. If so, it downloads the
TMDB 5000 dataset from a public GitHub mirror and loads it — making the
project truly plug-and-play with just docker-compose up.

Data source: TMDB 5000 Movie Dataset (publicly mirrored on GitHub)
Original source: Kaggle - https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata
"""

import os
import ast
import requests
import pandas as pd
from io import StringIO
from sqlalchemy.orm import Session

from app.database import SessionLocal, Base, engine
from app.models import Movie

# Public GitHub mirror of the TMDB 5000 dataset (no login required).
MOVIES_URL = "https://raw.githubusercontent.com/vamshi121/TMDB-5000-Movie-Dataset/main/tmdb_5000_movies.csv"
CREDITS_URL = "https://raw.githubusercontent.com/vamshi121/TMDB-5000-Movie-Dataset/main/tmdb_5000_credits.csv"

DATA_DIR = "/app/data"
MOVIES_CSV = os.path.join(DATA_DIR, "tmdb_5000_movies.csv")
CREDITS_CSV = os.path.join(DATA_DIR, "tmdb_5000_credits.csv")


def parse_names(json_like: str, limit: int = None) -> str:
    """Parses Kaggle's stringified JSON list columns into a comma-separated string."""
    try:
        items = ast.literal_eval(json_like)
        names = [item["name"] for item in items]
        return ", ".join(names[:limit] if limit else names)
    except Exception:
        return ""


def download_file(url: str, dest: str) -> bool:
    """Downloads a file from a URL and saves it to disk. Returns True on success."""
    try:
        print(f"Downloading {os.path.basename(dest)}...")
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w", encoding="utf-8") as f:
            f.write(response.text)
        print(f"Downloaded {os.path.basename(dest)} successfully.")
        return True
    except Exception as e:
        print(f"Failed to download {url}: {e}")
        return False


def load_movies_into_db(db: Session) -> int:
    """Loads movies from the local CSV files into the database. Returns count inserted."""
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
            genres=parse_names(row.get("genres", "[]")),
            cast=parse_names(row.get("cast", "[]"), limit=3),
            release_year=str(row.get("release_date", ""))[:4],
            vote_average=float(row.get("vote_average", 0.0) or 0.0),
            poster_path="",
        ))
        inserted += 1

    db.commit()
    return inserted


def auto_setup():
    """
    Main startup function. Called once when the backend starts.
    Skips everything if the database already has movies loaded.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        movie_count = db.query(Movie).count()
        if movie_count > 0:
            print(f"Database already has {movie_count} movies. Skipping setup.")
            return

        print("Database is empty. Starting auto-setup...")

        # Download CSVs if not already present (e.g. mounted via volume).
        if not os.path.exists(MOVIES_CSV):
            if not download_file(MOVIES_URL, MOVIES_CSV):
                print("Could not download movies CSV. Place it manually in backend/app/data/")
                return

        if not os.path.exists(CREDITS_CSV):
            if not download_file(CREDITS_URL, CREDITS_CSV):
                print("Could not download credits CSV. Place it manually in backend/app/data/")
                return

        print("Loading movies into database...")
        inserted = load_movies_into_db(db)
        print(f"Auto-setup complete. Loaded {inserted} movies.")

    finally:
        db.close()
