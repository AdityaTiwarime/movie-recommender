# Installation Guide

## Prerequisites

- **Docker Desktop** (or Docker Engine + Docker Compose).
- ~1 GB free disk for images.
- Ports **3000**, **8000**, and **5432** free on your host.

Verify Docker:

```bash
docker --version
docker-compose --version
```

## 1. Get the code

```bash
git clone https://github.com/AdityaTiwarime/movie-recommender.git
cd movie-recommender
```

## 2. (Optional) configure your own TMDB key

A working TMDB API key is already bundled in `backend/.env`, so posters work
immediately with zero setup. If you'd rather use your own free key:

```bash
cp backend/.env.example backend/.env
# then edit backend/.env with your key from https://www.themoviedb.org/settings/api
```

The app works fully either way — without a valid key, movies missing a
built-in poster just show a gradient placeholder instead of real art.

## 3. Build and run

```bash
docker-compose up --build
```

What happens on first boot:

1. **postgres** starts and becomes healthy (`pg_isready`).
2. **backend** waits for Postgres, creates the `movies` table, and loads
   `backend/data/movies_dataset.csv` (~10,000 rows) into it.
3. **frontend** serves the app and talks to the backend over the REST API.

The first boot takes a little longer while Postgres initializes and the
backend loads the dataset. Every boot after that is instant, since the data
is cached in the Postgres volume.

When you see `Uvicorn running on http://0.0.0.0:8000`, open:

- App: **http://localhost:3000**
- API docs (Swagger): **http://localhost:8000/docs**

## 4. Stop / reset

```bash
# Stop (Ctrl-C if running in foreground), then:
docker-compose down

# Wipe the Postgres volume too (forces a fresh reload of the dataset):
docker-compose down -v
```

## Regenerating the dataset (optional)

The committed `backend/data/movies_dataset.csv` is already the merged,
ready-to-use file. To rebuild it from the two raw source datasets instead:

```bash
cd backend/scripts
python build_dataset.py
```

See `build_dataset.py`'s docstring and the README's
[Data source](../README.md#data-source) section for exactly what it does and
why the merge exists.

## Troubleshooting

- **"Container name already in use"** — a leftover container from a previous
  run. Remove it and try again:
  ```bash
  docker rm -f movie-recommender-backend movie-recommender-frontend movie-recommender-db
  docker-compose up --build
  ```
- **Backend can't reach Postgres** — the backend only starts once Postgres
  reports healthy (see the `depends_on` healthcheck in `docker-compose.yml`);
  if it still fails, run `docker-compose down -v` and try again.
- **Posters not loading** — confirm your key is actually inside the running
  container:
  ```bash
  docker exec -it movie-recommender-backend printenv TMDB_API_KEY
  ```
  If that's empty, check `backend/.env` exists and rebuild.
- **Docker Desktop "read-only file system" errors** — this is a Docker Desktop
  storage issue unrelated to the project. Restarting Docker Desktop, or
  running `wsl --shutdown` (Windows) and reopening it, usually resolves it.
