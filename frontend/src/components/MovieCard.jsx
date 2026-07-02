// Individual movie card rendered in the results grid.
// Clicking opens the full detail modal. Poster fallback uses
// a colored gradient with the movie's initials instead of a blank grey box.

const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';
const GRADIENT_PALETTES = [
  ['#1a0533', '#6a0dad'],
  ['#0a1628', '#1e3a5f'],
  ['#1a0a00', '#7a3500'],
  ['#001a0a', '#005a2a'],
  ['#1a001a', '#6a006a'],
  ['#0a0a1a', '#2a2a7a'],
];

function getPalette(title) {
  let sum = 0;
  for (let i = 0; i < title.length; i++) sum += title.charCodeAt(i);
  return GRADIENT_PALETTES[sum % GRADIENT_PALETTES.length];
}

function getInitials(title) {
  return title
    .split(' ')
    .filter(w => w.length > 2)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || title[0].toUpperCase();
}

export default function MovieCard({ movie, onClick }) {
  const [dark, light] = getPalette(movie.title);
  const initials = getInitials(movie.title);
  const watchQuery = encodeURIComponent(`where to watch ${movie.title} streaming`);
  const watchUrl = `https://www.google.com/search?q=${watchQuery}`;

  return (
    <div className="movie-card" onClick={onClick}>
      <div className="poster-area">
        {movie.poster_path ? (
          <img
            src={`${POSTER_BASE}${movie.poster_path}`}
            alt={`${movie.title} poster`}
            loading="lazy"
          />
        ) : (
          <div
            className="poster-placeholder"
            style={{ background: `linear-gradient(135deg, ${dark} 0%, ${light} 100%)` }}
          >
            <span className="poster-initials">{initials}</span>
            {movie.release_year && (
              <span className="poster-year">{movie.release_year}</span>
            )}
          </div>
        )}
        {movie.vote_average > 0 && (
          <div className="rating-badge">⭐ {movie.vote_average.toFixed(1)}</div>
        )}
      </div>

      <div className="card-body">
        <div className="card-title">{movie.title}</div>
        {movie.genres && <div className="card-genres">{movie.genres}</div>}
        {movie.overview && <p className="card-overview">{movie.overview}</p>}
        <div className="card-footer">
          <a
            href={watchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="watch-link"
            onClick={e => e.stopPropagation()}
          >
            🎬 Watch
          </a>
          {movie.release_year && (
            <span className="card-year">{movie.release_year}</span>
          )}
        </div>
      </div>
    </div>
  );
}
