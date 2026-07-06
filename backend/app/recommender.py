import random
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.models import Movie


class MovieRecommender:
    """
    Content-based recommender using TF-IDF + cosine similarity.

    Note on scale: with the catalog now at ~10,000 movies, precomputing a
    full similarity matrix up front (10000 x 10000 floats) would need
    close to a gigabyte of RAM just sitting there, most of it for
    comparisons nobody asks for. Instead we keep the TF-IDF matrix itself
    (which stays small since it's sparse) and only compute similarity for
    one movie against the rest at the moment someone actually asks for a
    recommendation. Same math, far less memory.
    """

    def __init__(self, db):
        self.db = db
        self.items = []
        self.matrix = None
        self._build()

    def _build(self):
        self.items = self.db.query(Movie).all()
        if not self.items:
            return
        docs = [f"{m.overview} {m.genres} {m.genres} {m.cast} {m.cast}" for m in self.items]
        vectorizer = TfidfVectorizer(stop_words="english", max_features=20000)
        self.matrix = vectorizer.fit_transform(docs)

    def recommend_by_title(self, title, top_n=10):
        if self.matrix is None:
            return []
        needle = title.strip().lower()
        idx = next((i for i, m in enumerate(self.items) if m.title.lower() == needle), None)
        if idx is None:
            idx = next((i for i, m in enumerate(self.items) if needle in m.title.lower()), None)
        if idx is None:
            return []

        scores = cosine_similarity(self.matrix[idx], self.matrix).flatten()
        ranked = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)
        top = [i for i in ranked if i != idx][:top_n]
        return [self.items[i] for i in top]

    def recommend_by_preferences(self, genres, top_n=10, content_type=None,
                                  year_min=None, year_max=None, min_rating=None):
        if not self.items:
            return []
        wanted = {g.strip().lower() for g in genres if g.strip()}

        def genre_score(m):
            mg = {g.strip().lower() for g in (m.genres or "").replace(",", " ").split()}
            return len(wanted & mg)

        pool = self._apply_filters(self.items, content_type, year_min, year_max, min_rating)

        ranked = sorted(pool, key=genre_score, reverse=True)
        ranked = [m for m in ranked if genre_score(m) > 0]
        if not ranked:
            ranked = sorted(pool, key=lambda m: m.vote_average, reverse=True)
        return ranked[:top_n]

    def recommend_random(self, top_n=1, content_type=None, year_min=None, year_max=None, min_rating=None):
        """"Surprise me" - a random pick from whatever's left after filters,
        rather than always the same handful of highly-rated titles."""
        pool = self._apply_filters(self.items, content_type, year_min, year_max, min_rating)
        if not pool:
            return []
        n = min(top_n, len(pool))
        return random.sample(pool, n)

    def search_by_person(self, query, top_n=20):
        """Matches against the cast field. Movies pulled in from the larger
        supplementary dataset don't have cast data attached (see
        backend/scripts/build_dataset.py for why), so this will only ever
        surface results for the roughly half of the catalog that has real
        cast info - it just won't match the rest, rather than guessing."""
        needle = query.strip().lower()
        if not needle:
            return []
        matches = [m for m in self.items if m.cast and needle in m.cast.lower()]
        matches.sort(key=lambda m: m.vote_average, reverse=True)
        return matches[:top_n]

    @staticmethod
    def _apply_filters(items, content_type, year_min, year_max, min_rating):
        pool = items
        if content_type:
            pool = [m for m in pool if m.content_type == content_type]
        if min_rating is not None:
            pool = [m for m in pool if m.vote_average >= min_rating]
        if year_min is not None or year_max is not None:
            def in_range(m):
                try:
                    y = int(m.release_year)
                except (ValueError, TypeError):
                    return False
                if year_min is not None and y < year_min:
                    return False
                if year_max is not None and y > year_max:
                    return False
                return True
            pool = [m for m in pool if in_range(m)]
        return pool
