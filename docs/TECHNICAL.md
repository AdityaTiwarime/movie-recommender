# Technical Documentation

## Overview

The recommender is a **content-based** system using **TF-IDF + cosine
similarity**. There's no model training and no pretrained model anywhere in
the pipeline — the vectorizer builds its vocabulary and weights fresh from
the project's own dataset every time the backend starts.

## Data model

The `movies` table (seeded from `backend/data/movies_dataset.csv`):

| Column        | Type    | Notes                                              |
|---------------|---------|------------------------------------------------------|
| id            | INT PK  | internal auto-increment key                          |
| tmdb_id       | INT     | TMDB's own id, unique, used for poster lookups        |
| title         | TEXT    |                                                       |
| overview      | TEXT    |                                                       |
| genres        | TEXT    | comma-separated, e.g. "Action, Adventure"             |
| cast          | TEXT    | comma-separated top-billed cast, empty for ~half the catalog |
| release_year  | TEXT    | 4-digit year, parsed from the release date            |
| vote_average  | FLOAT   | TMDB rating, 0–10                                     |
| poster_path   | TEXT    | TMDB poster path, backfilled lazily if empty          |
| content_type  | TEXT    | always "movie" currently                              |

## Feature representation

For each movie, `MovieRecommender._build()` concatenates:

```
doc = overview + " " + genres + " " + genres + " " + cast + " " + cast
```

Genres and cast are each repeated twice so they carry more weight than the
free-text overview when TF-IDF scores similarity — otherwise a long, wordy
overview could drown out the more meaningful genre/cast signal.

```python
vectorizer = TfidfVectorizer(stop_words="english", max_features=20000)
matrix = vectorizer.fit_transform(docs)
```

**Why similarity isn't precomputed for the whole catalog:** at ~10,000
movies, a full movie×movie cosine similarity matrix would be a
10,000×10,000 array of floats — around 800MB sitting in memory for
comparisons nobody actually asked for. Instead, the sparse TF-IDF matrix
(small, since most words don't appear in most documents) is kept as-is, and
similarity is computed **per query**, only for the one movie someone
actually asked about:

```python
scores = cosine_similarity(matrix[idx], matrix).flatten()
```

Same math as a full matrix, just computed on demand instead of upfront.

## Recommendation strategies

### 1. Content-based item-item (`recommend_by_title`)

```
idx      = index of the matching title (exact match, falling back to substring match)
scores   = cosine_similarity(matrix[idx], matrix)
ranked   = argsort(scores) descending, excluding idx itself
return   = top_n movies from ranked
```

### 2. Genre-overlap preferences (`recommend_by_preferences`)

This is a **different, simpler** algorithm from title-matching — plain
set-intersection scoring, not TF-IDF:

```
wanted        = set of requested genres (lowercased)
pool          = movies passing year/rating/content-type filters
genre_score   = |wanted ∩ movie's genres|
ranked        = pool sorted by genre_score, keeping only score > 0
fallback      = if nothing scores > 0, sort the filtered pool by rating instead
```

The fallback matters: if a genre combination matches nothing, the user still
gets sensible highest-rated results from the filtered pool rather than an
empty screen.

**Rating feedback loop.** The API layer (not the recommender itself) folds
in extra genres before calling `recommend_by_preferences`: if the frontend
sends `liked_ids` (movies the user already gave a thumbs-up to this
session), the router looks those movies up and appends their genres to the
requested genre list. No separate ratings table — it's just genre
reinforcement based on ids the frontend already tracked in memory.

### 3. Random pick (`recommend_random`)

Applies the same year/rating/content-type filters, then
`random.sample()`s from whatever's left. Used by the "Surprise Me" button.

### 4. Actor search (`search_by_person`)

A simple case-insensitive substring match against the `cast` field, sorted
by rating. Movies from the larger supplementary dataset (see the README's
[Data source](../README.md#data-source) section) don't have cast data
attached, so this only ever surfaces results from the roughly half of the
catalog that does — it returns nothing for the rest rather than guessing.

## Dataset build process

`backend/scripts/build_dataset.py` documents how `movies_dataset.csv` was
built (this script isn't run automatically — it already ran once, and its
output is the committed CSV):

1. Load the original TMDB 5000 movies + credits CSVs, merge them on movie id,
   and parse genre/cast fields (stored as stringified Python lists) into
   plain comma-separated strings via `ast.literal_eval`.
2. Load the larger public metadata source, drop any movie already present
   from step 1, drop rows with no usable overview or poster, then keep the
   highest-vote-count movies up to a 10,000 total.
3. Write the combined result to `movies_dataset.csv`. Movies from step 2 get
   an empty `cast` field, since no matching credits file could be found for
   that source.

## Backend structure

- `app/recommender.py` — the `MovieRecommender` class described above. Pure
  Python/scikit-learn, no web dependencies.
- `app/startup.py` — reads `movies_dataset.csv` and inserts rows into
  Postgres on boot, skipping any `tmdb_id` already present so restarts don't
  reload data that's already there.
- `app/tmdb_client.py` — `fill_posters()` backfills `poster_path` for
  whichever movies don't have one yet, using a `ThreadPoolExecutor` to fire
  up to 10 TMDB lookups in parallel instead of one at a time (fetching 20
  posters sequentially at ~300ms each was the original, noticeably slower
  approach).
- `app/models.py` — the `Movie` SQLAlchemy model (the database schema
  definition — not to be confused with a machine-learning model).
- `app/schemas.py` — Pydantic request/response models, including the
  optional filter fields (`year_min`, `year_max`, `min_rating`) and
  `liked_ids` for the rating-feedback loop.
- `app/main.py` — FastAPI app + a `lifespan` handler that loads the dataset
  before the app serves traffic.

## Frontend structure

- `src/api.js` — fetch-based API client; every call includes the optional
  filters object (`yearMin`, `yearMax`, `minRating`, `likedIds`).
- `src/App.jsx` — the quiz flow, nav bar (Quiz / Search Actor / Favorites /
  Surprise Me / Filters), and result screen.
- `src/useFavorites.js` — a small hook that persists the favorites list to
  `localStorage`, so it survives a page refresh without needing a login
  system or a backend table.
- `src/components/SearchView.jsx` / `FavoritesView.jsx` / `FiltersPanel.jsx`
  — the three secondary views, each a self-contained component.
- `src/components/MovieCard.jsx` / `MovieModal.jsx` — the result card and
  detail modal.

## Container topology

Defined in `docker-compose.yml`:

- **postgres** — `postgres:16-alpine`, named volume `postgres_data`,
  healthcheck via `pg_isready`.
- **backend** — built from `backend/Dockerfile`, `depends_on` postgres's
  healthcheck (`condition: service_healthy`), so it won't try to connect
  before the database is actually ready.
- **frontend** — built from `frontend/Dockerfile`, depends on backend.

All three join the custom bridge network **`recommender-network`**; services
address each other by name (`postgres`, `backend`) via Docker's internal DNS.

## Extending

- **Cast data for the full catalog:** find or build a matching credits file
  for the larger supplementary dataset, so actor search covers all ~10,000
  movies instead of roughly half.
- **Persistent ratings:** replace the in-memory `liked_ids` feedback loop
  with an actual `ratings` table, so preferences survive across sessions
  rather than resetting on page reload.
- **Larger catalogs:** if the dataset grows well past 10,000, an
  approximate-nearest-neighbour index (e.g. FAISS) would scale the per-query
  similarity lookup better than scikit-learn's dense `cosine_similarity`.
