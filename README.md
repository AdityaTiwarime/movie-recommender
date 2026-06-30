# Movie Matching & Recommendation Service

A content-based movie recommendation web application built for the JTP 2026 recruitment project. Users either type the title of a movie they already enjoy, or select genre preferences from a checklist, and the service returns a ranked list of similar movies.

## Why this project

I chose a recommendation system over a matching or image-recognition system for two reasons. First, recommendation engines have a well-understood, explainable core algorithm (TF-IDF + cosine similarity) that I can confidently walk through and justify line by line during review, without depending on an opaque pretrained model. Second, the movie domain let me build and test the app with data I'm personally familiar with, which made debugging and quality-checking the results much easier than working with an unfamiliar dataset.

## What's special about it

- **Dual input modes**: the same recommender backs two different ways of expressing preference — "find me something like X" (title-based) and "I like these genres" (preference-based) — covering both example patterns from the project brief (Netflix-style suggestion and form-based preference matching).
- **Two data source paths**: the app can pull live data from the TMDB API, or run entirely offline using a Kaggle-downloaded dataset, satisfying the "open API or Kaggle" requirement either way and giving the app resilience if the API key isn't configured.
- **No model training required**: TF-IDF vectorization plus cosine similarity is computed at request time from cached metadata, keeping the container lightweight and the algorithm fully transparent.

## Architecture

```
┌─────────────────┐        HTTP/JSON        ┌──────────────────┐
│  frontend        │ ───────────────────────▶│  backend          │
│  React (Vite)     │◀───────────────────────│  FastAPI + sklearn │
│  container :3000  │                         │  container :8000   │
└─────────────────┘                         └────────┬─────────┘
                                                       │
                                              ┌────────▼─────────┐
                                              │  SQLite (volume)  │
                                              │  movie cache       │
                                              └───────────────────┘

       both containers connected via the "recommender-network"
                   custom Docker bridge network
```

- **Frontend**: React (plain JavaScript) built with Vite. Talks to the backend only via REST calls, no shared code or filesystem with the backend container.
- **Backend**: FastAPI (Python). Exposes a REST API for fetching cached movies, syncing fresh data from TMDB, and generating recommendations.
- **Database**: SQLite, stored on a Docker volume so the cache survives container restarts. Swappable for Postgres via the `DATABASE_URL` environment variable without code changes (all access goes through SQLAlchemy).
- **Recommendation algorithm**: each movie's overview, genres, and top-billed cast are combined into one text blob, vectorized with TF-IDF (`scikit-learn`), and compared with cosine similarity to rank the most similar titles.

## Data source

Primary: [TMDB API](https://www.themoviedb.org/documentation/api) (The Movie Database), a free, open, well-documented movie metadata API. Declared here per the project's data-source disclosure requirement.

Fallback/offline: [TMDB 5000 Movie Dataset on Kaggle](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata), loadable via `backend/scripts/load_kaggle_data.py` when no API key is available.

### Data preparation steps

1. Movies are fetched from TMDB's `/movie/popular` endpoint (or read from the Kaggle CSVs).
2. Genre IDs are resolved to genre names via TMDB's `/genre/movie/list` endpoint.
3. The top 3 billed cast members are fetched per movie via `/movie/{id}/credits`.
4. All fields are normalized into the `Movie` SQLAlchemy model and cached in SQLite.
5. At recommendation time, `overview + genres (x2) + cast (x2)` is combined into one string per movie (genres/cast repeated to weight them more heavily than free-text overview), then vectorized and compared.

## Tools used

| Purpose | Tool |
|---|---|
| Backend framework | FastAPI |
| Recommendation engine | scikit-learn (TfidfVectorizer, cosine_similarity) |
| ORM / database | SQLAlchemy + SQLite |
| Frontend framework | React 18 + Vite |
| Containerization | Docker, Docker Compose |
| Data source | TMDB API / Kaggle TMDB 5000 dataset |

## Running the project

### 1. Configure environment variables

```bash
cp backend/.env.example backend/.env
# then edit backend/.env and add your free TMDB API key
# (sign up at https://www.themoviedb.org/settings/api)
```

If you don't want to use the live API, skip this and use the Kaggle fallback instead (see below).

### 2. Start everything

```bash
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API docs (Swagger): http://localhost:8000/docs

### 3. Load movie data

**Option A — live TMDB sync** (requires API key in `.env`):
```bash
curl -X POST "http://localhost:8000/api/movies/sync?pages=5"
```

**Option B — offline Kaggle dataset**:
1. Download `tmdb_5000_movies.csv` and `tmdb_5000_credits.csv` from the [Kaggle dataset page](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata).
2. Place both files in `backend/app/data/`.
3. Run inside the backend container:
   ```bash
   docker exec -it movie-recommender-backend python -m scripts.load_kaggle_data
   ```

### 4. Use the app

Open http://localhost:3000, then either type a movie title you like or select genre checkboxes, and submit to see ranked recommendations.

## API reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/movies` | List cached movies |
| POST | `/api/movies/sync` | Sync fresh data from TMDB |
| POST | `/api/recommend/by-title` | Get recommendations similar to a given title |
| POST | `/api/recommend/by-preferences` | Get recommendations matching a list of genres |

Full interactive docs available at `/docs` once the backend is running (FastAPI's auto-generated Swagger UI).

## Project structure

```
movie-recommender/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app entrypoint
│   │   ├── database.py        # SQLAlchemy session/engine setup
│   │   ├── models.py          # Movie ORM model
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── recommender.py     # TF-IDF cosine similarity engine
│   │   ├── tmdb_client.py     # TMDB API integration
│   │   └── routers/           # API route definitions
│   ├── scripts/
│   │   └── load_kaggle_data.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx
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

- Movie metadata sourced from TMDB (live API) and the Kaggle TMDB 5000 dataset (offline fallback), as declared above. No third-party templates, modules, or other candidates' code were used.
- This README, the code comments, and docstrings reflect the actual design decisions made while building this project, and I can walk through and justify any part of the implementation in review.
