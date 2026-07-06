"""
One-time script used to build backend/data/movies_dataset.csv.

We started with our original TMDB 5000 dataset (has real cast names, but
only ~4800 titles) and wanted a bigger catalog without losing that cast
data. The bigger public "45k movies" mirror has way more titles and
already-working poster paths, but no matching credits file we could find
a working copy of anywhere. So this script merges both: keep every movie
from the original set with its real cast, then top up to 10,000 total
using the highest vote-count movies from the bigger set (those just get
an empty cast field - the search-by-actor feature only searches movies
that actually have cast data, and simply won't match the rest, rather
than fake something we don't actually know).

This isn't run automatically on boot - it already ran once, and the
output is what's committed at backend/data/movies_dataset.csv. Kept here
so the process is documented and reproducible, not a black box.
"""

import ast
import pandas as pd

TARGET_TOTAL = 10000


def parse_names(raw, limit=None):
    try:
        items = ast.literal_eval(raw)
        names = [i["name"] for i in items]
        return ", ".join(names[:limit] if limit else names)
    except Exception:
        return ""


def build(small_movies_csv, small_credits_csv, big_metadata_csv, output_csv):
    small = pd.read_csv(small_movies_csv)
    credits = pd.read_csv(small_credits_csv)
    merged = small.merge(credits, left_on="id", right_on="movie_id", suffixes=("", "_c"))

    rows = []
    for _, r in merged.iterrows():
        rows.append({
            "tmdb_id": int(r["id"]),
            "title": r.get("title", ""),
            "overview": r.get("overview", "") or "",
            "genres": parse_names(r.get("genres", "[]")),
            "cast": parse_names(r.get("cast", "[]"), 3),
            "release_year": str(r.get("release_date", ""))[:4],
            "vote_average": float(r.get("vote_average", 0) or 0),
            "poster_path": "",  # filled in lazily via TMDB API at request time
        })

    big = pd.read_csv(big_metadata_csv, low_memory=False)
    big = big[pd.to_numeric(big["id"], errors="coerce").notna()]
    big["id"] = big["id"].astype(int)

    already_have = {row["tmdb_id"] for row in rows}
    big = big[~big["id"].isin(already_have)]
    big = big[big["overview"].notna() & (big["overview"].str.len() > 20)]
    big = big[big["poster_path"].notna() & big["poster_path"].str.startswith("/")]
    big["vote_count"] = pd.to_numeric(big["vote_count"], errors="coerce").fillna(0)
    big = big.sort_values("vote_count", ascending=False).head(TARGET_TOTAL - len(rows))

    for _, r in big.iterrows():
        rows.append({
            "tmdb_id": int(r["id"]),
            "title": r.get("title", "") or r.get("original_title", ""),
            "overview": r.get("overview", "") or "",
            "genres": parse_names(r.get("genres", "[]")),
            "cast": "",  # not available for this half of the merged set
            "release_year": str(r.get("release_date", ""))[:4],
            "vote_average": float(r.get("vote_average", 0) or 0),
            "poster_path": r.get("poster_path", "") or "",  # already real, no API call needed
        })

    final = pd.DataFrame(rows).drop_duplicates(subset="tmdb_id")
    final.to_csv(output_csv, index=False)
    return len(final)


if __name__ == "__main__":
    total = build(
        small_movies_csv="tmdb_5000_movies.csv",
        small_credits_csv="tmdb_5000_credits.csv",
        big_metadata_csv="movies_metadata.csv",
        output_csv="movies_dataset.csv",
    )
    print(f"wrote {total} movies to movies_dataset.csv")
