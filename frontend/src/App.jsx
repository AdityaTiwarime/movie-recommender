import { useState, useEffect, useRef } from 'react';
import MovieCard from './components/MovieCard.jsx';
import MovieModal from './components/MovieModal.jsx';
import { fetchMovieTitles, recommendByTitle, recommendByPreferences } from './api.js';

// Mood-to-genre mapping: user picks a mood and we translate it
// into genre combinations the recommender understands.
const MOODS = [
  { id: 'feel-good', emoji: '😄', name: 'Feel Good', desc: 'Light & uplifting', genres: ['Comedy', 'Animation', 'Family'] },
  { id: 'thrilling', emoji: '🔥', name: 'Thrilling', desc: 'Edge of your seat', genres: ['Action', 'Thriller', 'Crime'] },
  { id: 'emotional', emoji: '😢', name: 'Emotional', desc: 'Touch your heart', genres: ['Drama', 'Romance'] },
  { id: 'mind-bending', emoji: '🌀', name: 'Mind-Bending', desc: 'Make you think', genres: ['Science Fiction', 'Mystery', 'Thriller'] },
  { id: 'adventure', emoji: '🗺️', name: 'Adventure', desc: 'Epic journeys', genres: ['Adventure', 'Action', 'Fantasy'] },
  { id: 'scary', emoji: '👻', name: 'Scary', desc: 'If you dare', genres: ['Horror', 'Mystery'] },
];

const GENRE_OPTIONS = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music',
  'Mystery', 'Romance', 'Science Fiction', 'Thriller', 'War',
];

export default function App() {
  const [mode, setMode] = useState('title');
  const [titleInput, setTitleInput] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allTitles, setAllTitles] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [minRating, setMinRating] = useState(0);
  const [sortBy, setSortBy] = useState('relevance');
  const [resultCount, setResultCount] = useState(10);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const autocompleteRef = useRef(null);

  // Load all movie titles on mount for the autocomplete dropdown.
  useEffect(() => {
    fetchMovieTitles()
      .then(data => setAllTitles(data))
      .catch(() => {});
  }, []);

  // Filter autocomplete suggestions as the user types.
  useEffect(() => {
    if (!titleInput.trim() || titleInput.length < 2) {
      setSuggestions([]);
      return;
    }
    const q = titleInput.toLowerCase();
    const matches = allTitles
      .filter(m => m.title.toLowerCase().includes(q))
      .slice(0, 8);
    setSuggestions(matches);
    setShowDropdown(matches.length > 0);
  }, [titleInput, allTitles]);

  // Close dropdown when clicking outside.
  useEffect(() => {
    const handleClick = (e) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleGenre = (genre) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const applyFiltersAndSort = (results) => {
    let filtered = results;

    // Apply minimum rating filter.
    if (minRating > 0) {
      filtered = filtered.filter(m => m.vote_average >= minRating);
    }

    // Apply sort order.
    if (sortBy === 'rating') {
      filtered = [...filtered].sort((a, b) => b.vote_average - a.vote_average);
    } else if (sortBy === 'year') {
      filtered = [...filtered].sort((a, b) =>
        parseInt(b.release_year || 0) - parseInt(a.release_year || 0)
      );
    }

    return filtered;
  };

  const runSearch = async (apiCall) => {
    setLoading(true);
    setError('');
    setHasSearched(true);
    try {
      const results = await apiCall();
      setMovies(applyFiltersAndSort(results));
    } catch (err) {
      setMovies([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'title' && titleInput.trim()) {
      runSearch(() => recommendByTitle(titleInput.trim(), resultCount));
    } else if (mode === 'genres' && selectedGenres.length > 0) {
      runSearch(() => recommendByPreferences(selectedGenres, resultCount));
    } else if (mode === 'mood' && selectedMood) {
      const moodGenres = MOODS.find(m => m.id === selectedMood)?.genres || [];
      runSearch(() => recommendByPreferences(moodGenres, resultCount));
    }
  };

  const canSubmit = () => {
    if (mode === 'title') return titleInput.trim().length > 0;
    if (mode === 'genres') return selectedGenres.length > 0;
    if (mode === 'mood') return selectedMood !== null;
    return false;
  };

  return (
    <>
      {/* Hero Header */}
      <header className="hero">
        <div className="hero-badge">🎬 AI-Powered Discovery</div>
        <h1>Find Your Next <span>Perfect Watch</span></h1>
        <p>Tell us what you love and we'll match you with movies you'll actually want to see.</p>
      </header>

      <div className="app-container">
        {/* Search Panel */}
        <div className="search-panel">
          {/* Mode Toggle */}
          <div className="mode-toggle">
            <button className={mode === 'title' ? 'active' : ''} onClick={() => setMode('title')}>
              By Title
            </button>
            <button className={mode === 'genres' ? 'active' : ''} onClick={() => setMode('genres')}>
              By Genre
            </button>
            <button className={mode === 'mood' ? 'active' : ''} onClick={() => setMode('mood')}>
              By Mood
            </button>
          </div>

          {/* Title Mode: Autocomplete Input */}
          {mode === 'title' && (
            <div className="autocomplete-wrapper" ref={autocompleteRef}>
              <input
                className="search-input"
                type="text"
                placeholder="Type a movie you love (e.g. Inception, Avatar...)"
                value={titleInput}
                onChange={e => { setTitleInput(e.target.value); setShowDropdown(true); }}
                onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
              />
              {showDropdown && suggestions.length > 0 && (
                <div className="autocomplete-dropdown">
                  {suggestions.map(movie => (
                    <div
                      key={movie.title}
                      className="autocomplete-item"
                      onClick={() => {
                        setTitleInput(movie.title);
                        setShowDropdown(false);
                      }}
                    >
                      {movie.title}
                      {movie.release_year && <span>{movie.release_year}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Genre Mode: Checkbox Grid */}
          {mode === 'genres' && (
            <div className="genre-grid">
              {GENRE_OPTIONS.map(genre => (
                <label
                  key={genre}
                  className={`genre-chip ${selectedGenres.includes(genre) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedGenres.includes(genre)}
                    onChange={() => toggleGenre(genre)}
                  />
                  {genre}
                </label>
              ))}
            </div>
          )}

          {/* Mood Mode: Mood Cards */}
          {mode === 'mood' && (
            <div className="mood-grid">
              {MOODS.map(mood => (
                <div
                  key={mood.id}
                  className={`mood-card ${selectedMood === mood.id ? 'selected' : ''}`}
                  onClick={() => setSelectedMood(mood.id)}
                >
                  <span className="mood-emoji">{mood.emoji}</span>
                  <div className="mood-name">{mood.name}</div>
                  <div className="mood-desc">{mood.desc}</div>
                </div>
              ))}
            </div>
          )}

          {/* Filters Row */}
          <div className="filters-row">
            <div className="filter-group">
              <span className="filter-label">Min Rating</span>
              <select
                className="filter-select"
                value={minRating}
                onChange={e => setMinRating(Number(e.target.value))}
              >
                <option value={0}>Any Rating</option>
                <option value={6}>6.0+</option>
                <option value={7}>7.0+</option>
                <option value={7.5}>7.5+</option>
                <option value={8}>8.0+</option>
              </select>
            </div>

            <div className="filter-group">
              <span className="filter-label">Sort By</span>
              <select
                className="filter-select"
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
              >
                <option value="relevance">Relevance</option>
                <option value="rating">Rating</option>
                <option value="year">Newest First</option>
              </select>
            </div>

            <div className="filter-group">
              <span className="filter-label">Results: {resultCount}</span>
              <input
                type="range"
                min={5}
                max={20}
                step={5}
                value={resultCount}
                onChange={e => setResultCount(Number(e.target.value))}
                className="count-slider"
              />
            </div>
          </div>

          <button
            className="primary-button"
            onClick={handleSubmit}
            disabled={loading || !canSubmit()}
          >
            {loading ? '⏳ Finding matches...' : '🔍 Get Recommendations'}
          </button>
        </div>

        {/* Loading Spinner */}
        {loading && (
          <div className="loading-wrapper">
            <div className="spinner" />
            <p>Analysing your taste and finding matches...</p>
          </div>
        )}

        {/* Error Message */}
        {error && !loading && (
          <div className="error-message">⚠️ {error}</div>
        )}

        {/* Results */}
        {!loading && movies.length > 0 && (
          <>
            <div className="results-header">
              <h2>Recommended for You</h2>
              <span>{movies.length} matches found</span>
            </div>
            <div className="movie-grid">
              {movies.map(movie => (
                <MovieCard
                  key={movie.title}
                  movie={movie}
                  onClick={() => setSelectedMovie(movie)}
                />
              ))}
            </div>
          </>
        )}

        {/* Empty State */}
        {hasSearched && !loading && !error && movies.length === 0 && (
          <div className="empty-message">
            😕 No matches found. Try different keywords, genres, or lower the minimum rating.
          </div>
        )}
      </div>

      {/* Movie Detail Modal */}
      {selectedMovie && (
        <MovieModal
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </>
  );
}
