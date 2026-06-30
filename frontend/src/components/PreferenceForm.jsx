import { useState } from 'react';

const GENRE_OPTIONS = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary',
  'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music',
  'Mystery', 'Romance', 'Science Fiction', 'Thriller', 'War',
];

// Lets the user either type a movie title they already like, or pick genre
// preferences from a checklist. This satisfies the "user inputs data using
// a form or selects preferences from a list" requirement.
export default function PreferenceForm({ onSubmitTitle, onSubmitGenres, loading }) {
  const [mode, setMode] = useState('title');
  const [title, setTitle] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);

  const toggleGenre = (genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (mode === 'title' && title.trim()) {
      onSubmitTitle(title.trim());
    } else if (mode === 'genres' && selectedGenres.length > 0) {
      onSubmitGenres(selectedGenres);
    }
  };

  return (
    <form className="preference-form" onSubmit={handleSubmit}>
      <div className="mode-toggle">
        <button
          type="button"
          className={mode === 'title' ? 'active' : ''}
          onClick={() => setMode('title')}
        >
          By Movie Title
        </button>
        <button
          type="button"
          className={mode === 'genres' ? 'active' : ''}
          onClick={() => setMode('genres')}
        >
          By Genre Preferences
        </button>
      </div>

      {mode === 'title' ? (
        <input
          type="text"
          placeholder="e.g. Interstellar"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      ) : (
        <div className="genre-grid">
          {GENRE_OPTIONS.map((genre) => (
            <label key={genre} className="genre-checkbox">
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

      <button type="submit" className="primary-button" disabled={loading}>
        {loading ? 'Finding matches...' : 'Get Recommendations'}
      </button>
    </form>
  );
}
