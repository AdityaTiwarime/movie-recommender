import { useState } from 'react';
import MovieCard from './MovieCard.jsx';
import { searchByActor } from '../api.js';

export default function SearchView({ onSelectMovie }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  const runSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const matches = await searchByActor(query.trim());
      setResults(matches);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-view">
      <form onSubmit={runSearch} className="search-form">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by actor name, e.g. Tom Hanks"
        />
        <button type="submit">Search</button>
      </form>

      {/* only about half the catalog has cast data attached - see
          backend/scripts/build_dataset.py for why - so a well-known actor
          not turning up any results here is expected, not a bug */}
      {searched && !loading && results.length === 0 && (
        <p className="search-empty">No matches - this actor may not be in the movies that have cast data attached.</p>
      )}

      {loading && <p className="search-empty">Searching...</p>}

      <div className="search-results-grid">
        {results.map(movie => (
          <MovieCard key={movie.tmdb_id} movie={movie} onClick={() => onSelectMovie(movie)} />
        ))}
      </div>
    </div>
  );
}
