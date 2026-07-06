import MovieCard from './MovieCard.jsx';

export default function FavoritesView({ favorites, onSelectMovie }) {
  if (favorites.length === 0) {
    return (
      <div className="search-view">
        <p className="search-empty">No favorites saved yet — tap the ♡ on a pick to save it here.</p>
      </div>
    );
  }

  return (
    <div className="search-view">
      <div className="search-results-grid">
        {favorites.map(movie => (
          <MovieCard key={movie.tmdb_id} movie={movie} onClick={() => onSelectMovie(movie)} />
        ))}
      </div>
    </div>
  );
}
