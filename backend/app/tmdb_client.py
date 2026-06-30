"""
Thin client around the TMDB (The Movie Database) REST API.

TMDB is a free, well-documented open API for movie metadata. We declare it
openly here per the project's data-source disclosure requirement. An API key
must be supplied via the TMDB_API_KEY environment variable; sign up for a
free key at https://www.themoviedb.org/settings/api.
"""

import os
import requests
from sqlalchemy.orm import Session
from app.models import Movie

TMDB_BASE_URL = "https://api.themoviedb.org/3"
TMDB_API_KEY = os.getenv("TMDB_API_KEY", "")
IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w342"


def _genre_lookup() -> dict:
    """Fetches the TMDB genre id-to-name mapping (cached for the process lifetime)."""
    response = requests.get(
        f"{TMDB_BASE_URL}/genre/movie/list",
        params={"api_key": TMDB_API_KEY},
        timeout=10,
    )
    response.raise_for_status()
    return {g["id"]: g["name"] for g in response.json().get("genres", [])}


def fetch_popular_movies(pages: int = 5) -> list[dict]:
    """
    Pulls several pages of popular movies from TMDB, enriched with genre
    names and top-billed cast. Returns a list of plain dicts ready to be
    stored as Movie rows.
    """
    genres = _genre_lookup()
    results = []

    for page in range(1, pages + 1):
        response = requests.get(
            f"{TMDB_BASE_URL}/movie/popular",
            params={"api_key": TMDB_API_KEY, "page": page},
            timeout=10,
        )
        response.raise_for_status()

        for item in response.json().get("results", []):
            cast_names = _fetch_top_cast(item["id"])
            genre_names = ", ".join(genres.get(gid, "") for gid in item.get("genre_ids", []))

            results.append({
                "tmdb_id": item["id"],
                "title": item.get("title", "Untitled"),
                "overview": item.get("overview", ""),
                "genres": genre_names,
                "cast": cast_names,
                "release_year": (item.get("release_date") or "")[:4],
                "vote_average": item.get("vote_average", 0.0),
                "poster_path": item.get("poster_path") or "",
            })

    return results


def _fetch_top_cast(tmdb_id: int, limit: int = 3) -> str:
    """Returns a comma-separated string of the top N billed cast members for a movie."""
    try:
        response = requests.get(
            f"{TMDB_BASE_URL}/movie/{tmdb_id}/credits",
            params={"api_key": TMDB_API_KEY},
            timeout=10,
        )
        response.raise_for_status()
        cast = response.json().get("cast", [])[:limit]
        return ", ".join(member["name"] for member in cast)
    except requests.RequestException:
        # Cast enrichment is a nice-to-have; failure here shouldn't break ingestion.
        return ""


def sync_movies_to_db(db: Session, pages: int = 5) -> int:
    """
    Fetches popular movies from TMDB and upserts them into the local cache.
    Returns the number of new movies inserted.
    """
    movies = fetch_popular_movies(pages=pages)
    inserted = 0

    for data in movies:
        existing = db.query(Movie).filter(Movie.tmdb_id == data["tmdb_id"]).first()
        if existing:
            continue
        db.add(Movie(**data))
        inserted += 1

    db.commit()
    return inserted
