# Movie Matching & Recommendation Service

A content-based movie recommendation web app built for the JTP 2026 recruitment project. The user answers a short mood/occasion/era quiz, and the service returns a ranked list of matching movies, one at a time, with the option to skip to the next pick.

## Why this project

I chose a recommendation system over a matching or image-recognition system for two reasons. First, recommendation engines have a well-understood, explainable core algorithm (TF-IDF + cosine similarity) that I can confidently walk through and justify line by line during review, without depending on an opaque pretrained model. Second, the movie domain let me build and test the app with data I'm personally familiar with, which made debugging and quality-checking the results much easier than working with an unfamiliar dataset.

## What's special about it

- **Quiz-driven preference flow**: instead of a plain form, the frontend walks the user through four quick steps (mood, who they're watching with, era, an optional special preference) and turns those answers into a genre list under the hood, then calls the same preference-matching endpoint a simpler form would use.
- **Fully automatic data setup**: the backend downloads the TMDB 5000 dataset itself on first boot and builds the SQLite cache — nothing to download or place manually. This is what makes `docker-compose up` genuinely plug-and-play.
- **No model training required**: TF-IDF vectorization plus cosine similarity is computed at request time from cached metadata, keeping the container lightweight and the algorithm fully transparent.
- **Real posters, zero extra setup**: real TMDB poster art loads automatically using a bundled API key, with a graceful gradient-placeholder fallback if that key is ever removed or rate-limited.

## Architecture

```
┌─────────────────┐        HTTP/JSON        ┌──────────────────┐
│  frontend         │ ───────────────────────▶│  backend           │
│  React (Vite)      │◀───────────────────────│  FastAPI + sklearn  │
│  container :3000   │                         │  container :8000    │
└─────────────────┘                         └────────┬─────────┘
                                                       │
                                              ┌────────▼─────────┐
                                              │  SQLite (volume)  │
                                              │  movie cache        │
                                              └───────────────────┘

       both containers connected via the "recommender-network"
                   custom Docker bridge network
```

- **Frontend**: React (plain JavaScript) built with Vite. Talks to the backend only via REST calls, no shared code or filesystem with the backend container.
- **Backend**: FastAPI (Python). On startup it auto-downloads and loads the movie dataset, then exposes a small REST API for listing cached movies and generating recommendations.
- **Database**: SQLite, stored on a Docker volume so the cache survives container restarts. Swappable for Postgres via the `DATABASE_URL` environment variable without code changes (all access goes through SQLAlchemy).
- **Recommendation algorithm**: each movie's overview, genres, and top-billed cast are combined into one text blob, vectorized with TF-IDF (`scikit-learn`), and compared with cosine similarity to rank the most similar titles.

## Data source

[TMDB 5000 Movie Dataset on Kaggle](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata) — downloaded automatically by the backend on first container boot from public GitHub CSV mirrors of the same dataset, so no manual download or Kaggle login is needed to run the app.

Poster images are fetched live from the [TMDB API](https://www.themoviedb.org/documentation/api) per-movie, lazily, the first time each movie is shown, then cached in the database.

### Data preparation steps

1. On first boot, the backend downloads `tmdb_5000_movies.csv` and `tmdb_5000_credits.csv` and merges them on movie id.
2. Genre and cast fields, stored as stringified Python lists in the raw CSV, are parsed and flattened into plain comma-separated strings.
3. Each row is normalized into the `Movie` SQLAlchemy model and inserted into SQLite (duplicate `tmdb_id`s are skipped on subsequent boots, so this only runs once).
4. At recommendation time, `overview + genres (x2) + cast (x2)` is combined into one string per movie (genres/cast repeated to weight them more heavily than the free-text overview), then vectorized with TF-IDF and compared with cosine similarity.
5. Poster art isn't part of the CSV, so it's backfilled separately: the first time a movie is returned by any endpoint, its poster is looked up by TMDB id and saved, so it only needs fetching once.

## Tools used

| Purpose | Tool |
|---|---|
| Backend framework | FastAPI |
| Recommendation engine | scikit-learn (TfidfVectorizer, cosine_similarity) |
| ORM / database | SQLAlchemy + SQLite |
| Frontend framework | React 18 + Vite |
| Containerization | Docker, Docker Compose |
| Data source | Kaggle TMDB 5000 dataset (auto-downloaded) + TMDB API (posters) |

## Running the project

Nothing to configure — just clone and run:

```bash
git clone https://github.com/AdityaTiwarime/movie-recommender.git
cd movie-recommender
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API docs (Swagger): http://localhost:8000/docs

The first boot takes a little longer while the backend downloads and loads ~4,800 movies. Every boot after that is instant since the data is cached in the Docker volume.

Open http://localhost:3000 and answer the quiz — mood, who you're watching with, era, and an optional special preference — to get a ranked movie pick, with the option to skip to the next one or start over.

**Optional — bring your own TMDB key:** a working key is already bundled in `backend/.env` so posters work immediately for reviewers. If you'd rather use your own, get a free key at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) and replace the value in `backend/.env` (see `backend/.env.example` for the format).

## API reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/api/movies?limit=N` | List cached movies (posters backfilled lazily) |
| POST | `/api/recommend/by-title` | Get recommendations similar to a given title |
| POST | `/api/recommend/by-preferences` | Get recommendations matching a list of genres, optionally filtered by content type |

Full interactive docs available at `/docs` once the backend is running (FastAPI's auto-generated Swagger UI).

## Project structure

```
movie-recommender/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app entrypoint, wires up startup + routers
│   │   ├── startup.py         # Auto-downloads and loads the dataset on boot
│   │   ├── database.py        # SQLAlchemy session/engine setup
│   │   ├── models.py          # Movie ORM model
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── recommender.py     # TF-IDF cosine similarity engine
│   │   ├── tmdb_client.py     # TMDB poster lookups
│   │   └── routers/           # API route definitions
│   ├── scripts/
│   │   └── load_kaggle_data.py  # Manual loader, for local CSVs if ever needed
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Quiz flow + result screen
│   │   ├── api.js
│   │   ├── components/
│   │   └── styles.css
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
└── README.md
```

## Declarations

- Movie metadata sourced from the Kaggle TMDB 5000 dataset (auto-downloaded from public GitHub mirrors), poster images from the TMDB API, as declared above. No third-party templates, modules, or other candidates' code were used.
- This README, the code comments, and docstrings reflect the actual design decisions made while building this project, and I can walk through and justify any part of the implementation in review.
