"""
Content-based recommendation engine using TF-IDF and cosine similarity.

Each movie/series text blob (overview + genres + cast) is vectorized with
TF-IDF and compared using cosine similarity. No pretrained model is used —
this is our own implementation built on scikit-learn's mathematical tools.
"""

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session
from app.models import Movie


class MovieRecommender:
    def __init__(self, db: Session):
        self.db = db
        self.movies: list[Movie] = []
        self.similarity_matrix = None
        self._build_index()

    def _build_index(self):
        """Loads all cached content and pre-computes the TF-IDF similarity matrix."""
        self.movies = self.db.query(Movie).all()
        if not self.movies:
            return
        corpus = [m.combined_features() for m in self.movies]
        vectorizer = TfidfVectorizer(stop_words="english")
        tfidf_matrix = vectorizer.fit_transform(corpus)
        self.similarity_matrix = cosine_similarity(tfidf_matrix)

    def recommend_by_title(self, title: str, top_n: int = 10) -> list[Movie]:
        """Returns top_n items most similar to the given title."""
        if self.similarity_matrix is None:
            return []
        title_lower = title.strip().lower()
        index = next((i for i, m in enumerate(self.movies) if m.title.lower() == title_lower), None)
        if index is None:
            index = next((i for i, m in enumerate(self.movies) if title_lower in m.title.lower()), None)
        if index is None:
            return []
        scores = sorted(enumerate(self.similarity_matrix[index]), key=lambda x: x[1], reverse=True)
        top_indices = [i for i, _ in scores if i != index][:top_n]
        return [self.movies[i] for i in top_indices]

    def recommend_by_preferences(
        self,
        genres: list[str],
        top_n: int = 10,
        content_type: str = None
    ) -> list[Movie]:
        """
        Returns content ranked by genre match.
        content_type filters to: 'movie', 'web_series', 'hindi_movie', or None for all.
        """
        if not self.movies:
            return []

        wanted = {g.strip().lower() for g in genres if g.strip()}

        def match_score(movie: Movie) -> int:
            movie_genres = {g.strip().lower() for g in movie.genres.replace(",", " ").split()}
            return len(wanted & movie_genres)

        pool = self.movies
        if content_type:
            pool = [m for m in self.movies if m.content_type == content_type]

        ranked = sorted(pool, key=match_score, reverse=True)
        ranked = [m for m in ranked if match_score(m) > 0]

        # If nothing matches on genre, return top rated from the pool
        if not ranked:
            ranked = sorted(pool, key=lambda m: m.vote_average, reverse=True)

        return ranked[:top_n]
