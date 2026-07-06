import os
import pandas as pd
from app.database import SessionLocal, Base, engine
from app.models import Movie

DATA_DIR = "/app/data"
DATASET_CSV = os.path.join(DATA_DIR, "movies_dataset.csv")


def load_dataset(db):
    """
    Loads the pre-built movies_dataset.csv straight into the database.
    Unlike the old two-file TMDB setup, this file is already merged and
    cleaned ahead of time (see backend/scripts/build_dataset.py for how
    it was put together), so this is just a straight insert - no JSON
    parsing or CSV joins needed at boot.
    """
    df = pd.read_csv(DATASET_CSV)
    df = df.fillna("")  # pandas NaN is truthy in Python, "x or default" won't catch it
    count = 0
    for _, row in df.iterrows():
        tid = int(row["tmdb_id"])
        if db.query(Movie).filter(Movie.tmdb_id == tid).first():
            continue
        db.add(Movie(
            tmdb_id=tid,
            title=row.get("title", ""),
            overview=row.get("overview", ""),
            genres=row.get("genres", ""),
            cast=row.get("cast", ""),
            release_year=str(row.get("release_year", ""))[:4],
            vote_average=float(row.get("vote_average") or 0),
            poster_path=row.get("poster_path", ""),
            content_type="movie",
        ))
        count += 1
    db.commit()
    return count


def auto_setup():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(Movie).count()
        if existing > 0:
            print(f"Already have {existing} items, skipping setup")
            return

        print("First run - setting up database...")
        if not os.path.exists(DATASET_CSV):
            print(f"Dataset file missing at {DATASET_CSV}, nothing to load")
            return

        total = load_dataset(db)
        with_cast = db.query(Movie).filter(Movie.cast != "").count()
        print(f"Done! {total} movies loaded, {with_cast} with cast data")
    finally:
        db.close()
