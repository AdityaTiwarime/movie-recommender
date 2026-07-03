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


def fetch_poster_path(tmdb_id: int) -> str:
    """Looks up just the poster for one movie by tmdb id - used to backfill
    posters on movies loaded from the Kaggle CSV, which don't come with one."""
    if not TMDB_API_KEY:
        return ""
    try:
        r = requests.get(f"{TMDB_BASE_URL}/movie/{tmdb_id}", params={"api_key": TMDB_API_KEY}, timeout=8)
        r.raise_for_status()
        return r.json().get("poster_path") or ""
    except requests.RequestException:
        return ""


def fill_posters(movies, db):
    """Backfills poster_path on the way out of an endpoint, only for rows
    that don't have one yet. Lazy on purpose - fetching all 4800 posters up
    front on first boot would take forever and burn API quota on movies
    nobody ends up looking at."""
    touched = False
    for m in movies:
        if not m.poster_path:
            p = fetch_poster_path(m.tmdb_id)
            if p:
                m.poster_path = p
                touched = True
    if touched:
        db.commit()
    return movies


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
