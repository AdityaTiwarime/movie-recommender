"""
Startup data loader — runs automatically when the backend container starts.

On first run, downloads the TMDB 5000 dataset from a public GitHub mirror
and also loads the bundled extra_content.csv (Hindi movies + web series).
This makes the project fully plug-and-play with docker-compose up.
"""

import os
import ast
import requests
import pandas as pd
from sqlalchemy.orm import Session

from app.database import SessionLocal, Base, engine
from app.models import Movie

MOVIES_URL = "https://raw.githubusercontent.com/vamshi121/TMDB-5000-Movie-Dataset/main/tmdb_5000_movies.csv"
CREDITS_URL = "https://raw.githubusercontent.com/vamshi121/TMDB-5000-Movie-Dataset/main/tmdb_5000_credits.csv"

DATA_DIR = "/app/data"
MOVIES_CSV = os.path.join(DATA_DIR, "tmdb_5000_movies.csv")
CREDITS_CSV = os.path.join(DATA_DIR, "tmdb_5000_credits.csv")
EXTRA_CSV = os.path.join(DATA_DIR, "extra_content.csv")


def parse_names(json_like: str, limit: int = None) -> str:
    """Parses Kaggle's stringified JSON list columns into a comma-separated string."""
    try:
        items = ast.literal_eval(json_like)
        names = [item["name"] for item in items]
        return ", ".join(names[:limit] if limit else names)
    except Exception:
        return ""


def download_file(url: str, dest: str) -> bool:
    """Downloads a file from a URL and saves it to disk."""
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


def load_tmdb_movies(db: Session) -> int:
    """Loads movies from the TMDB Kaggle CSV files into the database."""
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
            content_type="movie",
        ))
        inserted += 1

    db.commit()
    return inserted


def load_extra_content(db: Session) -> int:
    """Loads bundled Hindi movies and web series from extra_content.csv."""
    if not os.path.exists(EXTRA_CSV):
        print("extra_content.csv not found, skipping.")
        return 0

    df = pd.read_csv(EXTRA_CSV)
    inserted = 0

    for _, row in df.iterrows():
        tmdb_id = int(row["id"])
        if db.query(Movie).filter(Movie.tmdb_id == tmdb_id).first():
            continue
        db.add(Movie(
            tmdb_id=tmdb_id,
            title=row.get("title", "Untitled"),
            overview=row.get("overview", "") or "",
            genres=str(row.get("genres", "")) or "",
            cast=str(row.get("cast", "")) or "",
            release_year=str(row.get("release_year", "")) or "",
            vote_average=float(row.get("vote_average", 0.0) or 0.0),
            poster_path="",
            content_type=str(row.get("content_type", "movie")),
        ))
        inserted += 1

    db.commit()
    return inserted


def auto_setup():
    """
    Runs on backend startup. Skips if database already has content.
    Downloads TMDB data if needed, then loads bundled Hindi movies and web series.
    """
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        movie_count = db.query(Movie).count()
        if movie_count > 0:
            print(f"Database already has {movie_count} items. Skipping setup.")
            return

        print("Database is empty. Starting auto-setup...")

        if not os.path.exists(MOVIES_CSV):
            if not download_file(MOVIES_URL, MOVIES_CSV):
                print("Could not download movies CSV.")
                return

        if not os.path.exists(CREDITS_CSV):
            if not download_file(CREDITS_URL, CREDITS_CSV):
                print("Could not download credits CSV.")
                return

        print("Loading TMDB movies...")
        tmdb_count = load_tmdb_movies(db)
        print(f"Loaded {tmdb_count} TMDB movies.")

        print("Loading Hindi movies and web series...")
        extra_count = load_extra_content(db)
        print(f"Loaded {extra_count} extra items (Hindi movies + web series).")

        print(f"Auto-setup complete. Total: {tmdb_count + extra_count} items ready.")

    finally:
        db.close()
