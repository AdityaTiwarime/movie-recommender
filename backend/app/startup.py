import os
import ast
import requests
import pandas as pd
from app.database import SessionLocal, Base, engine
from app.models import Movie

# these two only get used as a fallback - the actual dataset now ships
# committed inside the repo at backend/data/, which Docker copies into
# the image at build time. these urls just cover the edge case where
# someone deletes the csvs locally before building.
MOVIES_URL = "https://raw.githubusercontent.com/vamshi121/TMDB-5000-Movie-Dataset/main/tmdb_5000_movies.csv"
CREDITS_URL = "https://raw.githubusercontent.com/andandandand/CSV-datasets/master/tmdb_5000_credits.csv"

DATA_DIR = "/app/data"
MOVIES_CSV = os.path.join(DATA_DIR, "tmdb_5000_movies.csv")
CREDITS_CSV = os.path.join(DATA_DIR, "tmdb_5000_credits.csv")


def parse_names(s, limit=None):
    try:
        items = ast.literal_eval(s)
        names = [i["name"] for i in items]
        return ", ".join(names[:limit] if limit else names)
    except:
        return ""


def grab_file(url, dest):
    try:
        print(f"Downloading {os.path.basename(dest)}...")
        r = requests.get(url, timeout=60)
        r.raise_for_status()
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        with open(dest, "w", encoding="utf-8") as f:
            f.write(r.text)
        print(f"Got {os.path.basename(dest)}")
        return True
    except Exception as e:
        print(f"Failed: {e}")
        return False


def load_tmdb(db):
    mdf = pd.read_csv(MOVIES_CSV)
    cdf = pd.read_csv(CREDITS_CSV)
    merged = mdf.merge(cdf, left_on="id", right_on="movie_id", suffixes=("", "_c"))
    count = 0
    for _, row in merged.iterrows():
        tid = int(row["id"])
        if db.query(Movie).filter(Movie.tmdb_id == tid).first():
            continue
        db.add(Movie(
            tmdb_id=tid,
            title=row.get("title", ""),
            overview=row.get("overview", "") or "",
            genres=parse_names(row.get("genres", "[]")),
            cast=parse_names(row.get("cast", "[]"), 3),
            release_year=str(row.get("release_date", ""))[:4],
            vote_average=float(row.get("vote_average", 0) or 0),
            poster_path="",
            content_type="movie",
        ))
        count += 1
    db.commit()
    return count


def auto_setup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        n = db.query(Movie).count()
        if n > 0:
            print(f"Already have {n} items, skipping setup")
            return

        print("First run — setting up database...")

        # dataset ships committed inside the repo now, so this only
        # kicks in if someone deletes the csvs locally for some reason
        if not os.path.exists(MOVIES_CSV):
            if not grab_file(MOVIES_URL, MOVIES_CSV):
                return
        if not os.path.exists(CREDITS_CSV):
            if not grab_file(CREDITS_URL, CREDITS_CSV):
                return

        t = load_tmdb(db)
        print(f"Done! {t} movies loaded")
    finally:
        db.close()
