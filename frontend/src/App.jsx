import { useState } from 'react';
import PreferenceForm from './components/PreferenceForm.jsx';
import ResultGrid from './components/ResultGrid.jsx';
import { recommendByTitle, recommendByPreferences } from './api.js';

export default function App() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const runRecommendation = async (apiCall) => {
    setLoading(true);
    setError('');
    setHasSearched(true);
    try {
      const results = await apiCall();
      setMovies(results);
    } catch (err) {
      setMovies([]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTitleSubmit = (title) => runRecommendation(() => recommendByTitle(title));
  const handleGenreSubmit = (genres) => runRecommendation(() => recommendByPreferences(genres));

  return (
    <div className="app-container">
      <header>
        <h1>🎬 Movie Matching &amp; Recommendation Service</h1>
        <p>Tell us a movie you like, or pick your favorite genres, and we'll find your next watch.</p>
      </header>

      <PreferenceForm
        onSubmitTitle={handleTitleSubmit}
        onSubmitGenres={handleGenreSubmit}
        loading={loading}
      />

      {error && <p className="error-message">{error}</p>}

      {hasSearched && !loading && !error && movies.length === 0 && (
        <p className="empty-message">No matches found. Try a different title or genre combination.</p>
      )}

      <ResultGrid movies={movies} />
    </div>
  );
}
