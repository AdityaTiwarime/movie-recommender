import { useState } from 'react';
import MovieCard from './components/MovieCard.jsx';
import MovieModal from './components/MovieModal.jsx';
import FiltersPanel from './components/FiltersPanel.jsx';
import SearchView from './components/SearchView.jsx';
import FavoritesView from './components/FavoritesView.jsx';
import { recommendByPreferences, recommendRandom } from './api.js';
import { useFavorites } from './useFavorites.js';

// All moods mapped to genres
const MOODS = [
  { id: 'happy', emoji: '😄', name: 'Happy', desc: 'Feel good vibes', genres: ['Comedy', 'Animation', 'Family'] },
  { id: 'adventurous', emoji: '🔥', name: 'Adventurous', desc: 'Epic journeys', genres: ['Action', 'Adventure', 'Fantasy'] },
  { id: 'romantic', emoji: '❤️', name: 'Romantic', desc: 'Love stories', genres: ['Romance', 'Drama'] },
  { id: 'emotional', emoji: '😢', name: 'Emotional', desc: 'Touch your heart', genres: ['Drama'] },
  { id: 'curious', emoji: '🌀', name: 'Mind-Bending', desc: 'Make you think', genres: ['Science Fiction', 'Mystery', 'Thriller'] },
  { id: 'scared', emoji: '👻', name: 'Horror', desc: 'If you dare', genres: ['Horror', 'Mystery'] },
  { id: 'comedy', emoji: '😂', name: 'Comedy', desc: 'Just laugh', genres: ['Comedy'] },
  { id: 'action', emoji: '💥', name: 'Action', desc: 'Full on action', genres: ['Action', 'Crime', 'Thriller'] },
  { id: 'crime', emoji: '🔫', name: 'Crime', desc: 'Dark underworld', genres: ['Crime', 'Thriller'] },
  { id: 'scifi', emoji: '🚀', name: 'Sci-Fi', desc: 'Future worlds', genres: ['Science Fiction'] },
  { id: 'documentary', emoji: '🎥', name: 'Documentary', desc: 'Real stories', genres: ['Documentary', 'History'] },
  { id: 'family', emoji: '👨‍👩‍👧', name: 'Family', desc: 'Watch together', genres: ['Family', 'Animation'] },
  { id: 'music', emoji: '🎵', name: 'Music', desc: 'Rhythm and soul', genres: ['Music', 'Drama'] },
  { id: 'war', emoji: '⚔️', name: 'War / Epic', desc: 'Battle stories', genres: ['War', 'History', 'Drama'] },
  { id: 'mystery', emoji: '🕵️', name: 'Mystery', desc: 'Whodunit', genres: ['Mystery', 'Thriller'] },
  { id: 'neutral', emoji: '🎲', name: 'Surprise Me', desc: 'Anything goes', genres: ['Drama', 'Comedy', 'Action'] },
];

const QUIZ_STEPS = [
  {
    id: 'mood',
    question: "What are you in the mood for?",
    subtitle: "Pick a vibe and we'll find the perfect match",
    options: MOODS,
  },
  {
    id: 'occasion',
    question: "Who are you watching with?",
    subtitle: "This helps us pick the right tone",
    options: [
      { id: 'solo', emoji: '🧘', name: 'Just Me', desc: 'Solo session' },
      { id: 'date', emoji: '💑', name: 'Date Night', desc: 'Romantic evening' },
      { id: 'friends', emoji: '👯', name: 'Friends', desc: 'Squad night' },
      { id: 'family', emoji: '👨‍👩‍👧', name: 'Family', desc: 'All ages' },
    ],
  },
  {
    id: 'era',
    question: "How old should it be?",
    subtitle: "Pick your preferred era",
    options: [
      { id: 'any', emoji: '🎬', name: 'Any Era', desc: 'No preference', years: null },
      { id: 'recent', emoji: '🆕', name: 'Last 5 Years', desc: 'Fresh releases', years: 5 },
      { id: 'decade', emoji: '📅', name: 'Last 10 Years', desc: 'Modern classics', years: 10 },
      { id: 'classic', emoji: '🎞️', name: 'Classics', desc: '25+ years old', classic: true },
    ],
  },
  {
    id: 'special',
    question: "Any special preference?",
    subtitle: "Optional — pick one or skip",
    optional: true,
    options: [
      { id: 'none', emoji: '🎲', name: 'No Preference', desc: 'Just recommend', genres: [] },
      { id: 'true', emoji: '📖', name: 'True Story', desc: 'Based on reality', genres: ['History', 'Documentary'] },
      { id: 'mindbend', emoji: '🧠', name: 'Mind-Bending', desc: 'Twist endings', genres: ['Science Fiction', 'Mystery'] },
      { id: 'space', emoji: '🌌', name: 'Space', desc: 'Into the cosmos', genres: ['Science Fiction'] },
      { id: 'heist', emoji: '💰', name: 'Heist / Crime', desc: 'The perfect plan', genres: ['Crime', 'Thriller'] },
      { id: 'superhero', emoji: '🦸', name: 'Superhero', desc: 'Powers and fights', genres: ['Action', 'Science Fiction'] },
    ],
  },
];

const CURRENT_YEAR = new Date().getFullYear();

export default function App() {
  const [view, setView] = useState('quiz'); // quiz | search | favorites
  const [phase, setPhase] = useState('quiz'); // quiz | result
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [resultIndex, setResultIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ yearMin: null, yearMax: null, minRating: null });
  const [likedIds, setLikedIds] = useState([]);

  const { favorites, isFavorite, toggleFavorite } = useFavorites();

  const step = QUIZ_STEPS[currentStep];

  const handleOptionSelect = (optionId) => {
    const newAnswers = { ...answers, [step.id]: optionId };
    setAnswers(newAnswers);
    setAnimating(true);
    setTimeout(() => {
      if (currentStep < QUIZ_STEPS.length - 1) {
        setCurrentStep(prev => prev + 1);
      } else {
        buildRecommendations(newAnswers);
      }
      setAnimating(false);
    }, 300);
  };

  const buildRecommendations = async (finalAnswers) => {
    setLoading(true);
    setError('');

    try {
      const moodOption = MOODS.find(m => m.id === finalAnswers.mood);
      const specialOption = QUIZ_STEPS[3].options.find(o => o.id === finalAnswers.special);

      let genres = [...(moodOption?.genres || [])];
      if (specialOption?.genres?.length > 0 && finalAnswers.special !== 'none') {
        genres = [...new Set([...genres, ...specialOption.genres])];
      }

      if (finalAnswers.occasion === 'family') {
        genres = [...new Set([...genres, 'Animation', 'Family'])];
        genres = genres.filter(g => !['Horror'].includes(g));
      }
      if (finalAnswers.occasion === 'date') {
        genres = [...new Set([...genres, 'Romance'])];
      }

      // fold in the quiz's own era answer alongside whatever the user
      // set in the filters panel - quiz answer only applies if the user
      // hasn't manually overridden the year range themselves
      const eraOption = QUIZ_STEPS[2].options.find(o => o.id === finalAnswers.era);
      let yearMin = filters.yearMin;
      let yearMax = filters.yearMax;
      if (!yearMin && !yearMax && eraOption?.years && !eraOption?.classic) {
        yearMin = CURRENT_YEAR - eraOption.years;
      }
      if (!yearMin && !yearMax && eraOption?.classic) {
        yearMax = CURRENT_YEAR - 25;
      }

      const movies = await recommendByPreferences(genres, 20, null, {
        yearMin, yearMax, minRating: filters.minRating, likedIds,
      });

      setResults(movies.sort(() => Math.random() - 0.3));
      setResultIndex(0);
      setPhase('result');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSurpriseMe = async () => {
    setView('quiz');
    setLoading(true);
    setError('');
    try {
      const picks = await recommendRandom(20, filters);
      setResults(picks);
      setResultIndex(0);
      setPhase('result');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = (movie) => {
    // "rate a pick to refine future recommendations" - just tracks liked
    // ids for this session, folded into genre weighting on the next fetch
    setLikedIds(prev => prev.includes(movie.tmdb_id) ? prev : [...prev, movie.tmdb_id]);
    handleNextMovie();
  };

  const handleNextMovie = () => {
    if (resultIndex < results.length - 1) {
      setAnimating(true);
      setTimeout(() => { setResultIndex(prev => prev + 1); setAnimating(false); }, 200);
    }
  };

  const handleRestart = () => {
    setPhase('quiz');
    setCurrentStep(0);
    setAnswers({});
    setResults([]);
    setResultIndex(0);
    setError('');
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  const currentMovie = results[resultIndex];
  const progress = (currentStep / QUIZ_STEPS.length) * 100;

  return (
    <>
      <header className="hero">
        <div className="hero-film-strip" />
        <h1>Find Your <span>Perfect Watch</span></h1>
        <p>Answer a few quick questions and we'll find exactly what you're in the mood for.</p>
        <div className="hero-stats">
          <div className="hero-stat"><strong>10,000+</strong><span>Movies</span></div>
        </div>

        <nav className="main-nav">
          <button className={view === 'quiz' ? 'active' : ''} onClick={() => { setView('quiz'); }}>🎯 Quiz</button>
          <button className={view === 'search' ? 'active' : ''} onClick={() => setView('search')}>🔎 Search Actor</button>
          <button className={view === 'favorites' ? 'active' : ''} onClick={() => setView('favorites')}>
            ♥ Favorites {favorites.length > 0 && `(${favorites.length})`}
          </button>
          <button onClick={handleSurpriseMe}>🎲 Surprise Me</button>
          <button onClick={() => setShowFilters(s => !s)}>⚙️ Filters</button>
        </nav>

        {showFilters && (
          <FiltersPanel filters={filters} onChange={setFilters} onClose={() => setShowFilters(false)} />
        )}
      </header>

      {view === 'search' && <SearchView onSelectMovie={setSelectedMovie} />}
      {view === 'favorites' && <FavoritesView favorites={favorites} onSelectMovie={setSelectedMovie} />}

      {view === 'quiz' && (
        <div className="app-container">

          {phase === 'quiz' && (
            <div className={`quiz-wrapper ${animating ? 'fade-out' : 'fade-in'}`}>
              <div className="progress-bar-wrapper">
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="progress-label">Step {currentStep + 1} of {QUIZ_STEPS.length}</span>
              </div>

              <div className="quiz-question-block">
                <h2 className="quiz-question">{step.question}</h2>
                <p className="quiz-subtitle">{step.subtitle}</p>
              </div>

              <div className="quiz-options-grid">
                {step.options.map(option => (
                  <div
                    key={option.id}
                    className={`quiz-option ${answers[step.id] === option.id ? 'selected' : ''}`}
                    onClick={() => handleOptionSelect(option.id)}
                  >
                    <span className="option-emoji">{option.emoji}</span>
                    <span className="option-label">{option.name}</span>
                    <span className="option-desc">{option.desc}</span>
                  </div>
                ))}
              </div>

              {currentStep > 0 && (
                <button className="back-btn" onClick={handleBack}>← Back</button>
              )}
            </div>
          )}

          {loading && (
            <div className="loading-wrapper">
              <div className="spinner" />
              <p>Finding your perfect match...</p>
            </div>
          )}

          {error && !loading && (
            <div className="error-message">
              ⚠️ {error}
              <button className="back-btn" onClick={handleRestart} style={{ marginTop: '12px' }}>Try Again</button>
            </div>
          )}

          {phase === 'result' && currentMovie && !loading && (
            <div className={`result-wrapper ${animating ? 'fade-out' : 'fade-in'}`}>
              <div className="result-header">
                <h2>Here's your pick</h2>
                <span className="result-counter">{resultIndex + 1} of {results.length}</span>
              </div>

              <MovieCard
                movie={currentMovie}
                onClick={() => setSelectedMovie(currentMovie)}
                fullSize={true}
              />

              <div className="result-actions">
                <button className="favorite-btn" onClick={() => toggleFavorite(currentMovie)}>
                  {isFavorite(currentMovie.tmdb_id) ? '♥ Saved' : '♡ Save to Favorites'}
                </button>
                {resultIndex < results.length - 1 && (
                  <>
                    <button className="like-btn" onClick={() => handleLike(currentMovie)}>
                      👍 Like — show me more like this
                    </button>
                    <button className="next-movie-btn" onClick={handleNextMovie}>
                      👎 Not this one — Next
                    </button>
                  </>
                )}
                <button className="restart-btn" onClick={handleRestart}>🔄 Start Over</button>
              </div>

              {resultIndex === results.length - 1 && (
                <p className="no-more-msg">You've seen all recommendations! Try starting over with different choices.</p>
              )}
            </div>
          )}

          {phase === 'result' && results.length === 0 && !loading && (
            <div className="empty-message">
              😕 No matches found. Try different choices!
              <button className="back-btn" onClick={handleRestart} style={{ marginTop: '16px' }}>Try Again</button>
            </div>
          )}
        </div>
      )}

      {selectedMovie && (
        <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </>
  );
}
