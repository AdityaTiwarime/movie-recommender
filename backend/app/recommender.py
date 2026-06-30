"""
Content-based recommendation engine.

Approach: each movie's overview, genres, and cast are combined into one text
blob, vectorized with TF-IDF, and compared using cosine similarity. This is
a well-established, lightweight technique that needs no model training step,
making it fast to run and easy to explain and justify in a project review.
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
        """Loads all cached movies and pre-computes the similarity matrix."""
        self.movies = self.db.query(Movie).all()
        if not self.movies:
            return

        corpus = [movie.combined_features() for movie in self.movies]
        vectorizer = TfidfVectorizer(stop_words="english")
        tfidf_matrix = vectorizer.fit_transform(corpus)
        self.similarity_matrix = cosine_similarity(tfidf_matrix)

    def recommend_by_title(self, title: str, top_n: int = 10) -> list[Movie]:
        """Returns the top_n movies most similar to the given title."""
        if self.similarity_matrix is None:
            return []

        title_lower = title.strip().lower()
        index = next(
            (i for i, m in enumerate(self.movies) if m.title.lower() == title_lower),
            None,
        )
        if index is None:
            # Fall back to a partial match if no exact title match is found.
            index = next(
                (i for i, m in enumerate(self.movies) if title_lower in m.title.lower()),
                None,
            )
        if index is None:
            return []

        scores = list(enumerate(self.similarity_matrix[index]))
        scores.sort(key=lambda pair: pair[1], reverse=True)
        top_indices = [i for i, score in scores if i != index][:top_n]
        return [self.movies[i] for i in top_indices]

    def recommend_by_preferences(self, genres: list[str], top_n: int = 10) -> list[Movie]:
        """
        Returns movies ranked by how many of the requested genres they match,
        used when the user fills the preference form instead of naming a movie.
        """
        if not self.movies:
            return []

        wanted = {g.strip().lower() for g in genres if g.strip()}

        def match_score(movie: Movie) -> int:
            movie_genres = {g.strip().lower() for g in movie.genres.split(",")}
            return len(wanted & movie_genres)

        ranked = sorted(self.movies, key=match_score, reverse=True)
        ranked = [m for m in ranked if match_score(m) > 0]
        return ranked[:top_n]
