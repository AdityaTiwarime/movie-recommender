# Movie Matching & Recommendation Service

A content-based movie recommendation web app built for the JTP 2026 recruitment project. The user answers a short mood/occasion/era quiz, and the service returns a ranked list of matching movies, one at a time, with the option to skip to the next pick, save it to a watchlist, or tell the app to show more like it.

## Why this project

I chose a recommendation system over a matching or image-recognition system for two reasons. First, recommendation engines have a well-understood, explainable core algorithm (TF-IDF + cosine similarity) that I can confidently walk through and justify line by line during review, without depending on an opaque pretrained model. Second, the movie domain let me build and test the app with data I'm personally familiar with, which made debugging and quality-checking the results much easier than working with an unfamiliar dataset.

## What's special about it

- **Quiz-driven preference flow**: instead of a plain form, the frontend walks the user through four quick steps (mood, who they're watching with, era, an optional special preference) and turns those answers into a genre list under the hood.
- **~10,000-movie catalog, not a toy dataset**: built by merging our original cast-rich TMDB set with a much larger public metadata source, kept to a size that still boots quickly (see [Data source](#data-source) for exactly how and why).
- **Search by actor**, a random "surprise me" pick, year-range and minimum-rating filters, a browser-persisted favorites list, and a lightweight rating-feedback loop that leans future picks toward genres of movies you've already liked - all layered on top of the same core recommender rather than being bolted-on separate systems.
- **Three real containers**: frontend, backend, and now a genuine PostgreSQL database container - not just SQLite in a folder pretending to be a database service.
- **No model training required**: TF-IDF vectorization plus cosine similarity is computed at request time from cached metadata, keeping the container lightweight and the algorithm fully transparent.
- **Real posters, zero extra setup**: real TMDB poster art loads automatically - about half the catalog already ships with a working poster path baked into the dataset, the rest are fetched live from the TMDB API in parallel (not one at a time) and cached after first use.

## Architecture

```
┌─────────────────┐   HTTP/JSON   ┌──────────────────┐   SQL   ┌────────────────┐
│  frontend         │──────────────▶│  backend           │────────▶│  postgres         │
│  React (Vite)      │◀──────────────│  FastAPI + sklearn  │◀────────│  container         │
│  container :3000   │               │  container :8000    │         │  (named volume)    │
└─────────────────┘               └──────────────────┘         └────────────────┘

          all three connected via the "recommender-network" custom Docker bridge network
```

- **Frontend**: React (plain JavaScript) built with Vite. Talks to the backend only via REST calls, no shared code or filesystem with the backend container.
- **Backend**: FastAPI (Python). On startup it loads the committed dataset into the database, then exposes a REST API for listing/searching movies and generating recommendations.
- **Database**: PostgreSQL, running in its own container with a named volume for persistence. `DATABASE_URL` is just an environment variable read by SQLAlchemy, so nothing in the Python code needed to change to move off SQLite.
- **Recommendation algorithm**: each movie's overview, genres, and top-billed cast (where available) are combined into one text blob, vectorized with TF-IDF (`scikit-learn`), and compared with cosine similarity to rank the most similar titles. At this catalog size, similarity is computed per-query against the stored TF-IDF matrix rather than precomputing a full similarity matrix up front, which would need on the order of a gigabyte of memory sitting idle for comparisons nobody actually asks for.

## Data source

The catalog is built from two sources, merged once ahead of time into a single committed file (`backend/data/movies_dataset.csv`, ~10,000 rows):

1. Our original **TMDB 5000 Movie Dataset** (from Kaggle) - kept in full because it has real, per-movie cast data, which the search-by-actor feature depends on.
2. A larger **public TMDB movies metadata mirror** (~45,000 titles) - topped up to reach 10,000 total, prioritizing the most-voted (best-known) titles. This source already includes real poster paths, but no matching cast/credits file could be found from any working public mirror, so movies pulled from this half have an empty cast field.

This is a deliberate, disclosed tradeoff rather than an oversight: search-by-actor only ever matches the roughly half of the catalog that has real cast data, and simply won't return a result for the rest instead of guessing or fabricating a cast list. The exact merge logic is in `backend/scripts/build_dataset.py`, kept in the repo so the process is reproducible and not a black box.

Poster images: about half the catalog already ships with a real poster path from source #2 above. For the rest, posters are fetched live from the [TMDB API](https://www.themoviedb.org/documentation/api), in parallel rather than one at a time, the first time each movie is shown, then cached in the database.

### Data preparation steps

1. `build_dataset.py` merges the two sources once, parses genre/cast fields (stored as stringified Python lists in the raw CSVs) into plain comma-separated strings, and writes the result to `movies_dataset.csv`.
2. That file is committed directly into the repo and copied into the Docker image at build time - no download step, no Kaggle login needed.
3. On container boot, `startup.py` reads the CSV once and inserts each row into Postgres, skipping any `tmdb_id` already present so restarts don't reload data that's already there.
4. At recommendation time, `overview + genres (x2) + cast (x2)` is combined into one string per movie (genres/cast repeated to weight them more heavily than the free-text overview), then vectorized with TF-IDF.
5. Any movie missing a poster gets one backfilled the first time it's returned by an endpoint, fetched by TMDB id and saved so it's only ever looked up once.

## Features

| Feature | How it works |
|---|---|
| Mood/occasion/era quiz | Maps quiz answers to a genre list, sent to the preference-matching endpoint |
| Search by actor | `GET /api/movies/search?q=` matches against the cast field |
| Surprise me | `POST /api/recommend/random`, with the same year/rating filters applied |
| Year range + minimum rating filters | Applied server-side before ranking, in `MovieRecommender._apply_filters` |
| Favorites / watchlist | Stored in the browser via `localStorage`, no login or backend table needed |
| Rating feedback loop | Liking a pick adds its `tmdb_id` to a session list; the next preference request folds that movie's genres in on top of the explicit quiz answers |

## Tools used

| Purpose | Tool |
|---|---|
| Backend framework | FastAPI |
| Recommendation engine | scikit-learn (TfidfVectorizer, cosine_similarity) |
| ORM / database | SQLAlchemy + PostgreSQL |
| Frontend framework | React 18 + Vite |
| Containerization | Docker, Docker Compose (3 services) |
| Data source | Merged TMDB 5000 + public TMDB metadata mirror (~10k movies) + TMDB API (posters) |

## Running the project

Nothing to configure — just clone and run:

```bash
git clone https://github.com/AdityaTiwarime/movie-recommender.git
cd movie-recommender
docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API docs (Swagger): http://localhost:8000/docs

The first boot takes a little longer while Postgres initializes and the backend loads ~10,000 movies. Every boot after that is instant since the data is cached in the Postgres volume.

**Optional — bring your own TMDB key:** a working key is already bundled in `backend/.env` so posters work immediately for reviewers. If you'd rather use your own, get a free key at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api) and replace the value in `backend/.env`.

## API reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | Health check |
| GET | `/api/movies?limit=N` | List cached movies (posters backfilled lazily) |
| GET | `/api/movies/search?q=` | Search by actor name |
| POST | `/api/recommend/by-title` | Recommendations similar to a given title |
| POST | `/api/recommend/by-preferences` | Recommendations matching genres, with optional year/rating filters and rating-feedback via `liked_ids` |
| POST | `/api/recommend/random` | A random pick, with the same optional filters |

Full interactive docs available at `/docs` once the backend is running (FastAPI's auto-generated Swagger UI).

## Project structure

```
movie-recommender/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI entrypoint, wires up startup + routers
│   │   ├── startup.py         # Loads the dataset into Postgres on boot
│   │   ├── database.py        # SQLAlchemy session/engine setup
│   │   ├── models.py          # Movie ORM model (database schema definition)
│   │   ├── schemas.py         # Pydantic request/response models
│   │   ├── recommender.py     # TF-IDF cosine similarity engine + filters/search/random
│   │   ├── tmdb_client.py     # Parallel poster lookups
│   │   └── routers/           # API route definitions
│   ├── data/
│   │   └── movies_dataset.csv # committed, pre-merged dataset (~10k rows)
│   ├── scripts/
│   │   └── build_dataset.py   # documents how movies_dataset.csv was built
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # Quiz flow, nav, result screen
│   │   ├── useFavorites.js            # localStorage-backed favorites hook
│   │   ├── api.js
│   │   ├── components/
│   │   │   ├── SearchView.jsx
│   │   │   ├── FavoritesView.jsx
│   │   │   ├── FiltersPanel.jsx
│   │   │   ├── MovieCard.jsx
│   │   │   └── MovieModal.jsx
│   │   └── styles.css
│   ├── package.json
│   ├── Dockerfile
│   └── .env.example
├── docker-compose.yml
└── README.md
```

## Declarations

- Movie metadata sourced from the Kaggle TMDB 5000 dataset and a public TMDB metadata mirror, merged as described above; poster images from the TMDB API. No third-party templates, pretrained models, or other candidates' code or modules were used.
- This README, the code comments, and docstrings reflect the actual design decisions made while building this project, and I can walk through and justify any part of the implementation in review.
