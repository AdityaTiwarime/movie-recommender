const POSTER_BASE = 'https://image.tmdb.org/t/p/w780';
const PALETTES = [
  ['#1a0533', '#6a0dad'], ['#0a1628', '#1e3a5f'],
  ['#1a0a00', '#7a3500'], ['#001a0a', '#005a2a'],
  ['#1a001a', '#6a006a'], ['#0a0a1a', '#2a2a7a'],
];

function palette(title) {
  let s = 0;
  for (let c of title) s += c.charCodeAt(0);
  return PALETTES[s % PALETTES.length];
}

function initials(title) {
  return title.split(' ').filter(w => w.length > 2).slice(0, 2).map(w => w[0].toUpperCase()).join('') || title[0];
}

export default function MovieModal({ movie, onClose }) {
  if (!movie) return null;
  const [dark, light] = palette(movie.title);
  const q = encodeURIComponent(`where to watch ${movie.title} ${movie.release_year} streaming`);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        {movie.poster_path ? (
          <img className="modal-poster" src={`${POSTER_BASE}${movie.poster_path}`} alt={movie.title} />
        ) : (
          <div className="modal-poster-placeholder" style={{ background: `linear-gradient(135deg, ${dark}, ${light})` }}>
            {initials(movie.title)}
          </div>
        )}
        <div className="modal-body">
          <h2 className="modal-title">{movie.title}</h2>
          <div className="modal-meta">
            {movie.release_year && <span>{movie.release_year}</span>}
            {movie.vote_average > 0 && <span className="rating">⭐ {movie.vote_average.toFixed(1)}</span>}
            {movie.genres && <span className="genres">{movie.genres}</span>}
          </div>
          {movie.overview && <p className="modal-overview">{movie.overview}</p>}
          {movie.cast && <div className="modal-cast"><h4>Cast</h4><p>{movie.cast}</p></div>}
          <div className="modal-actions">
            <a href={`https://www.google.com/search?q=${q}`} target="_blank" rel="noopener noreferrer" className="modal-watch-btn">
              🎬 Where to Watch
            </a>
            <button className="modal-close-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}
