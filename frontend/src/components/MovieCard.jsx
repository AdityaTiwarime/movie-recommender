const POSTER_BASE = 'https://image.tmdb.org/t/p/w342';
const PALETTES = [
  ['#1a0533', '#6a0dad'], ['#0a1628', '#1e3a5f'],
  ['#1a0a00', '#7a3500'], ['#001a0a', '#005a2a'],
  ['#1a001a', '#6a006a'], ['#0a0a1a', '#2a2a7a'],
  ['#1a1000', '#6a4a00'], ['#001a1a', '#006a5a'],
];

function palette(title) {
  let s = 0;
  for (let c of title) s += c.charCodeAt(0);
  return PALETTES[s % PALETTES.length];
}

function initials(title) {
  return title.split(' ').filter(w => w.length > 2).slice(0, 2).map(w => w[0].toUpperCase()).join('') || title[0];
}

export default function MovieCard({ movie, onClick, fullSize = false }) {
  const [dark, light] = palette(movie.title);
  const q = encodeURIComponent(`where to watch ${movie.title} streaming`);

  return (
    <div className={`movie-card ${fullSize ? 'full-size' : ''}`} onClick={onClick}>
      <div className="poster-area">
        {movie.poster_path ? (
          <img src={`${POSTER_BASE}${movie.poster_path}`} alt={movie.title} loading="lazy" />
        ) : (
          <div className="poster-placeholder" style={{ background: `linear-gradient(135deg, ${dark}, ${light})` }}>
            <span className="poster-initials">{initials(movie.title)}</span>
            {movie.release_year && <span className="poster-year">{movie.release_year}</span>}
          </div>
        )}
        {movie.vote_average > 0 && (
          <div className="rating-badge">⭐ {movie.vote_average.toFixed(1)}</div>
        )}
      </div>
      <div className="card-body">
        <div>
          <div className="card-title">{movie.title}</div>
          {movie.genres && <div className="card-genres">{movie.genres}</div>}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
            {movie.release_year && <span className="card-year">{movie.release_year}</span>}
            {movie.content_type === 'web_series' && <span style={{ fontSize: '11px', color: '#4ecdc4' }}>📺 Series</span>}
            {movie.content_type === 'hindi_movie' && <span style={{ fontSize: '11px', color: '#ff6b6b' }}>🎭 Hindi</span>}
          </div>
        </div>
        {movie.overview && <p className="card-overview">{movie.overview}</p>}
        {movie.cast && fullSize && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>🎭 {movie.cast}</p>
        )}
        <div className="card-footer">
          <a href={`https://www.google.com/search?q=${q}`} target="_blank" rel="noopener noreferrer" className="watch-link" onClick={e => e.stopPropagation()}>
            🎬 Where to Watch
          </a>
          {fullSize && (
            <button style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              onClick={e => { e.stopPropagation(); onClick(); }}>
              Full Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
