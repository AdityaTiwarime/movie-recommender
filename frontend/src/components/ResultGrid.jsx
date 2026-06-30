const POSTER_BASE_URL = 'https://image.tmdb.org/t/p/w342';

// Renders the list of recommended movies returned by the backend as a
// responsive card grid.
export default function ResultGrid({ movies }) {
  if (!movies || movies.length === 0) return null;

  return (
    <div className="result-grid">
      {movies.map((movie) => (
        <div className="movie-card" key={movie.title}>
          {movie.poster_path ? (
            <img
              src={`${POSTER_BASE_URL}${movie.poster_path}`}
              alt={`${movie.title} poster`}
              loading="lazy"
            />
          ) : (
            <div className="poster-placeholder">No Poster</div>
          )}
          <div className="movie-card-body">
            <h3>{movie.title} {movie.release_year && `(${movie.release_year})`}</h3>
            <p className="genres">{movie.genres}</p>
            <p className="overview">{movie.overview}</p>
            <p className="rating">⭐ {movie.vote_average.toFixed(1)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
