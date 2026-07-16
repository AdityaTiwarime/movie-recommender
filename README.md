# 🎬 Movie Matching & Recommendation Service

A content-based movie recommender built for the JTP 2026 recruitment project.
Instead of a plain form, you answer a short **mood / occasion / era quiz** —
or search for a movie by actor — and the engine finds the closest matches
from a catalog of roughly **10,000 movies**, one pick at a time, with the
option to save it, skip to the next, or tell the app to show more like it.

It is a fully containerized, plug-and-play project: one command brings up a
React frontend, a FastAPI backend, and a PostgreSQL database, each in its own
container on a shared Docker network.

```bash
docker-compose up --build
```

Then open **http://localhost:3000**.

---

## Table of contents

- [Why this project](#why-this-project)
- [What makes it unique](#what-makes-it-unique)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Data source](#data-source)
- [How to install](#how-to-install)
- [How to use](#how-to-use)
- [API reference](#api-reference)
- [How the recommender works](#how-the-recommender-works)
- [Project layout](#project-layout)
- [Implementation process](#implementation-process)
- [Declarations](#declarations)

---

## Why this project

I chose a recommendation system over a matching or image-recognition system
for two reasons. First, recommendation engines have a well-understood,
explainable core algorithm — TF-IDF combined with cosine similarity — that I
can walk through and justify line by line during review, without depending
on an opaque pretrained model. Second, the movie domain let me build and test
the app with data I'm personally familiar with, which made debugging and
quality-checking the results much easier than working with an unfamiliar
dataset.

## What makes it unique

- **Quiz-driven preference flow.** Instead of a plain form, the frontend
  walks you through four quick steps — mood, who you're watching with, era,
  and an optional special preference — and turns those answers into a genre
  list under the hood.
- **~10,000-movie catalog, not a toy dataset.** Built by merging the original
  cast-rich TMDB set with a much larger public metadata source (see
  [Data source](#data-source) for exactly how and why, including the
  tradeoff involved).
- **Search by actor, a random "surprise me" pick, year-range and
  minimum-rating filters, a browser-persisted favorites list, and a
  lightweight rating-feedback loop** that leans future picks toward genres
  of movies you've already liked — all layered on top of the same core
  recommender rather than being separate bolted-on systems.
- **Three real containers.** Frontend, backend, and a genuine PostgreSQL
  database container — not SQLite in a folder pretending to be a database
  service.
- **No model training required.** TF-IDF vectorization plus cosine
  similarity is computed at request time from cached metadata, keeping the
  container lightweight and the algorithm fully transparent.
- **Real posters, minimal setup.** About half the catalog ships with a
  working poster path baked directly into the dataset; the rest are fetched
  live from the TMDB API **in parallel** rather than one at a time, and
  cached after first use.

## Architecture

```
                         ┌─────────────────────────────────────────┐
   Browser  ──http──▶    │  frontend (React + Vite) :3000           │
                         │   • quiz / search / favorites UI          │
                         └───────────────┬─────────────────────────┘
                                         │  /api (HTTP, JSON)
                         ┌───────────────▼─────────────────────────┐
                         │  backend (FastAPI + scikit-learn) :8000  │
                         │   • REST API                             │
                         │   • TF-IDF + cosine similarity engine    │
                         └───────────────┬─────────────────────────┘
                                         │  SQL (psycopg2 / SQLAlchemy)
                         ┌───────────────▼─────────────────────────┐
                         │  postgres :5432                          │
                         │   • movies table, seeded on first run   │
                         └─────────────────────────────────────────┘

     All three services share the custom bridge network `recommender-network`.
```

The frontend and backend are **logically separated** and communicate **only**
through the REST API — no shared code or filesystem between containers.

## Tech stack

| Layer      | Technology                                              |
|------------|----------------------------------------------------------|
| Frontend   | React 18 (plain JavaScript), Vite                        |
| Backend    | **Python**, FastAPI, uvicorn, Pydantic                   |
| ML / data  | scikit-learn (TF-IDF, cosine similarity), pandas         |
| Database   | PostgreSQL 16                                             |
| Infra      | Docker, docker-compose, custom bridge network             |

## Data source

The catalog is built from two sources, merged once ahead of time into a
single committed file (`backend/data/movies_dataset.csv`, ~10,000 rows):

1. Our original **TMDB 5000 Movie Dataset**
   ([Kaggle](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata)) — kept
   in full because it has real, per-movie cast data, which the search-by-actor
   feature depends on.
2. **"The Movies Dataset"**
   ([Kaggle](https://www.kaggle.com/datasets/rounakbanik/the-movies-dataset),
   ~45,000 titles) — topped up to reach 10,000 total, prioritizing the
   most-voted (best-known) movies. This source already includes real poster
   paths, but no matching cast/credits file could be found from any working
   public mirror, so movies pulled from this half have an empty cast field.

This is a **deliberate, disclosed tradeoff**, not an oversight: search-by-actor
only ever matches the roughly half of the catalog that has real cast data,
and simply won't return a result for the rest instead of guessing. The exact
merge logic lives in `backend/scripts/build_dataset.py`, committed in the repo
so the process is reproducible and not a black box.

**Regenerating the dataset (optional).** The merge script takes the two raw
source CSVs and writes `movies_dataset.csv`:

```bash
cd backend/scripts
python build_dataset.py
```

The committed `movies_dataset.csv` is the already-merged file the app
actually loads; the raw source CSVs aren't needed at runtime.

## How to install

See **[docs/INSTALL.md](docs/INSTALL.md)** for the full guide. The short version:

**Prerequisites:** Docker and Docker Compose.

```bash
git clone https://github.com/AdityaTiwarime/movie-recommender.git
cd movie-recommender
docker-compose up --build
```

That's it. On first boot Postgres initializes, the backend loads the
committed dataset (~10,000 movies) and fits the recommender.

Open **http://localhost:3000**.

## How to use

See **[docs/USAGE.md](docs/USAGE.md)** for a full walkthrough with examples. Briefly:

1. **Quiz** — answer four quick steps (mood, who you're watching with, era,
   an optional special preference) to get a ranked pick.
2. **Search Actor** — search by an actor's name to find movies they're in.
3. **Favorites** — save any pick to a browser-persisted watchlist.
4. **Surprise Me** — get a random pick, respecting whatever filters you've set.
5. **Filters** — narrow results by year range and minimum rating from any mode.

Every result card shows the poster, genres, cast (where available), rating,
and a "Like — show me more like this" button that nudges future picks toward
that movie's genres.

📸 **[Screenshot Walkthrough (PDF)](docs/Screenshots.pdf)** — a visual tour
of the quiz flow, results, filters, favorites, and detail view.

## API reference

Interactive docs are available at **http://localhost:8000/docs** (FastAPI's
auto-generated Swagger UI).

| Method | Path                             | Purpose                                              |
|--------|-----------------------------------|-------------------------------------------------------|
| GET    | `/`                                | Health check                                          |
| GET    | `/api/movies?limit=N`              | List cached movies (posters backfilled lazily)       |
| GET    | `/api/movies/search?q=`            | Search by actor name                                  |
| POST   | `/api/recommend/by-title`          | Recommendations similar to a given title              |
| POST   | `/api/recommend/by-preferences`    | Recommendations matching genres, with optional filters and rating-feedback via `liked_ids` |
| POST   | `/api/recommend/random`            | A random pick, with the same optional filters          |

Example:

```bash
curl -X POST http://localhost:8000/api/recommend/by-preferences \
  -H "Content-Type: application/json" \
  -d '{"genres":["Comedy","Adventure"],"top_n":10,"min_rating":6.5}'
```

## How the recommender works

See **[docs/TECHNICAL.md](docs/TECHNICAL.md)** for the deep dive. In summary:

Each movie's overview, genres, and top-billed cast (where available) are
combined into one text blob, vectorized with **TF-IDF**, and compared with
**cosine similarity** to rank the most similar titles.

- **Similar movies:** cosine similarity between the seed movie's vector and
  every other movie, computed per-query rather than precomputed for the whole
  catalog — at 10,000 movies, a full similarity matrix would need close to a
  gigabyte of memory sitting idle for comparisons nobody asked for.
- **Preference-based recommendations:** filter movies by the quiz's genre
  list (plus optional year/rating filters), score by genre overlap, and fall
  back to highest-rated movies if nothing matches.
- **Rating feedback:** liking a pick folds that movie's genres into the next
  request, gently biasing future results without needing a separate ratings
  table.

## Project layout

```
movie-recommender/
├── docker-compose.yml
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   ├── data/
│   │   └── movies_dataset.csv     # committed, pre-merged dataset (~10k rows)
│   ├── scripts/
│   │   └── build_dataset.py       # documents how movies_dataset.csv was built
│   └── app/
│       ├── main.py                # FastAPI entrypoint, wires up startup + routers
│       ├── startup.py             # loads the dataset into Postgres on boot
│       ├── database.py            # SQLAlchemy session/engine setup
│       ├── models.py              # Movie ORM model (database schema definition)
│       ├── schemas.py             # Pydantic request/response models
│       ├── recommender.py         # TF-IDF cosine similarity engine + filters/search/random
│       ├── tmdb_client.py         # parallel poster lookups
│       └── routers/                # API route definitions
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── App.jsx                # quiz flow, nav, result screen
│       ├── api.js                 # typed-ish fetch client
│       ├── useFavorites.js        # localStorage-backed favorites hook
│       ├── styles.css
│       └── components/
│           ├── SearchView.jsx
│           ├── FavoritesView.jsx
│           ├── FiltersPanel.jsx
│           ├── MovieCard.jsx
│           └── MovieModal.jsx
└── docs/
    ├── INSTALL.md
    ├── USAGE.md
    ├── TECHNICAL.md
    └── Screenshots.pdf         # visual walkthrough of the app
```

## Implementation process

1. **Data** — started from the real Kaggle TMDB 5000 dataset, then wrote a
   merge script (`build_dataset.py`) that tops the catalog up to ~10,000
   movies using a larger public metadata source, disclosing the cast-data
   tradeoff that comes with it.
2. **Recommender** — built the TF-IDF + cosine similarity engine, then
   verified it end-to-end (data loading, similarity ranking, filters, search,
   random pick) before wiring it into the API.
3. **Database** — moved from SQLite to a real PostgreSQL container; the code
   didn't need to change since `DATABASE_URL` was already just an environment
   variable read by SQLAlchemy.
4. **API** — wrapped the engine in FastAPI with Pydantic request/response
   models and a startup hook that loads the dataset once.
5. **Frontend** — built the quiz flow, search view, favorites list, filters
   panel, and rating-feedback loop in React, talking to the API through a
   small fetch-based client.
6. **Containers** — Dockerized each service and connected them on a custom
   bridge network with a Postgres healthcheck so the backend doesn't start
   before the database is ready.

## Declarations

- Movie metadata sourced from the Kaggle TMDB 5000 dataset and Kaggle's "The
  Movies Dataset", merged as described above; poster images from the TMDB
  API. No third-party templates, pretrained models, or other candidates' code
  or modules were used.
- LLM assistance was used during development (Claude and ChatGPT). Approximate
  AI-assistance breakdown: **Frontend ~67%, Backend ~40%, Docker ~8%.**
- This project was built and tested on Windows only. I did not have access to
  a Mac to verify cross-platform behavior, so macOS compatibility is untested.
- This README and the accompanying docs reflect the actual design decisions
  made while building this project, and I can walk through and justify any
  part of the implementation in review.
