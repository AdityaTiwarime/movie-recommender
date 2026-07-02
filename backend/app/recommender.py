from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.models import Movie


class MovieRecommender:
    def __init__(self, db):
        self.db = db
        self.items = []
        self.sim = None
        self._build()

    def _build(self):
        self.items = self.db.query(Movie).all()
        if not self.items:
            return
        docs = [f"{m.overview} {m.genres} {m.genres} {m.cast} {m.cast}" for m in self.items]
        vec = TfidfVectorizer(stop_words="english")
        mat = vec.fit_transform(docs)
        self.sim = cosine_similarity(mat)

    def recommend_by_title(self, title, top_n=10):
        if self.sim is None:
            return []
        t = title.strip().lower()
        idx = next((i for i, m in enumerate(self.items) if m.title.lower() == t), None)
        if idx is None:
            idx = next((i for i, m in enumerate(self.items) if t in m.title.lower()), None)
        if idx is None:
            return []
        scores = sorted(enumerate(self.sim[idx]), key=lambda x: x[1], reverse=True)
        top = [i for i, _ in scores if i != idx][:top_n]
        return [self.items[i] for i in top]

    def recommend_by_preferences(self, genres, top_n=10, content_type=None):
        if not self.items:
            return []
        wanted = {g.strip().lower() for g in genres if g.strip()}

        def score(m):
            mg = {g.strip().lower() for g in m.genres.replace(",", " ").split()}
            return len(wanted & mg)

        pool = self.items if not content_type else [m for m in self.items if m.content_type == content_type]
        ranked = sorted(pool, key=score, reverse=True)
        ranked = [m for m in ranked if score(m) > 0]
        if not ranked:
            ranked = sorted(pool, key=lambda m: m.vote_average, reverse=True)
        return ranked[:top_n]
