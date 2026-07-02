import { useState, useEffect } from 'react';
import MovieCard from './components/MovieCard.jsx';
import MovieModal from './components/MovieModal.jsx';
import { fetchMovieTitles, recommendByTitle, recommendByPreferences } from './api.js';

const QUIZ_STEPS = [
  {
    id: 'mood',
    question: "How are you feeling today?",
    subtitle: "We'll match movies to your current vibe",
    type: 'single',
    options: [
      { id: 'happy', emoji: '😄', label: 'Happy', genres: ['Comedy', 'Animation', 'Family'] },
      { id: 'adventurous', emoji: '🔥', label: 'Adventurous', genres: ['Action', 'Adventure', 'Fantasy'] },
      { id: 'emotional', emoji: '😢', label: 'Emotional', genres: ['Drama', 'Romance'] },
      { id: 'curious', emoji: '🌀', label: 'Curious', genres: ['Science Fiction', 'Mystery', 'Thriller'] },
      { id: 'scared', emoji: '👻', label: 'Want Thrills', genres: ['Horror', 'Thriller'] },
      { id: 'neutral', emoji: '😐', label: 'Neutral', genres: ['Drama', 'Comedy', 'Action'] },
    ],
  },
  {
    id: 'occasion',
    question: "Who are you watching with?",
    subtitle: "This helps us pick the right tone",
    type: 'single',
    options: [
      { id: 'solo', emoji: '🧘', label: 'Just Me' },
      { id: 'date', emoji: '💑', label: 'Date Night' },
      { id: 'friends', emoji: '👯', label: 'Friends' },
      { id: 'family', emoji: '👨‍👩‍👧', label: 'Family' },
    ],
  },
  {
    id: 'era',
    question: "How old should the movie be?",
    subtitle: "Pick your preferred era",
    type: 'single',
    options: [
      { id: 'any', emoji: '🎬', label: 'Any Era', years: null },
      { id: 'recent', emoji: '🆕', label: 'Last 5 Years', years: 5 },
      { id: 'decade', emoji: '📅', label: 'Last 10 Years', years: 10 },
      { id: 'classic', emoji: '🎞️', label: 'Classics Only', years: 25, classic: true },
    ],
  },
  {
    id: 'special',
    question: "Anything special you're in the mood for?",
    subtitle: "Optional — skip if nothing stands out",
    type: 'single',
    optional: true,
    options: [
      { id: 'none', emoji: '🎲', label: 'Surprise Me' },
      { id: 'true', emoji: '📖', label: 'True Story', genres: ['History', 'Documentary'] },
      { id: 'mindbend', emoji: '🧠', label: 'Mind-Bending', genres: ['Science Fiction', 'Mystery'] },
      { id: 'space', emoji: '🚀', label: 'Space / Sci-Fi', genres: ['Science Fiction'] },
      { id: 'heist', emoji: '💰', label: 'Heist / Crime', genres: ['Crime', 'Thriller'] },
      { id: 'superhero', emoji: '🦸', label: 'Superhero', genres: ['Action', 'Science Fiction'] },
      { id: 'war', emoji: '⚔️', label: 'War / Epic', genres: ['War', 'History', 'Drama'] },
      { id: 'music', emoji: '🎵', label: 'Music / Dance', genres: ['Music', 'Comedy'] },
    ],
  },
];

const CURRENT_YEAR = new Date().getFullYear();

export default function App() {
  const [phase, setPhase] = useState('quiz'); // quiz | result | detail
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [allMovies, setAllMovies] = useState([]);
  const [results, setResults] = useState([]);
  const [resultIndex, setResultIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [animating, setAnimating] = useState(false);

  // Fetch all cached movies on mount for filtering.
  useEffect(() => {
    fetchMovieTitles().then(setAllMovies).catch(() => {});
  }, []);

  const step = QUIZ_STEPS[currentStep];

  const handleOptionSelect = (optionId) => {
    const newAnswers = { ...answers, [step.id]: optionId };
    setAnswers(newAnswers);

    // Animate transition to next step.
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
      // Collect genres from mood + special category answers.
      const moodOption = QUIZ_STEPS[0].options.find(o => o.id === finalAnswers.mood);
      const specialOption = QUIZ_STEPS[3].options.find(o => o.id === finalAnswers.special);

      let genres = [...(moodOption?.genres || [])];
      if (specialOption?.genres && finalAnswers.special !== 'none') {
        genres = [...new Set([...genres, ...specialOption.genres])];
      }

      // Adjust genres based on occasion.
      if (finalAnswers.occasion === 'family') {
        genres = [...new Set([...genres, 'Animation', 'Family'])];
        genres = genres.filter(g => !['Horror', 'Thriller'].includes(g));
      }
      if (finalAnswers.occasion === 'date') {
        genres = [...new Set([...genres, 'Romance'])];
      }

      // Fetch recommendations from our API.
      let movies = await recommendByPreferences(genres, 20);

      // Apply year filter on the client side.
      const eraOption = QUIZ_STEPS[2].options.find(o => o.id === finalAnswers.era);
      if (eraOption?.years && !eraOption?.classic) {
        const cutoff = CURRENT_YEAR - eraOption.years;
        movies = movies.filter(m => parseInt(m.release_year || 0) >= cutoff);
      }
      if (eraOption?.classic) {
        const cutoff = CURRENT_YEAR - 25;
        movies = movies.filter(m => parseInt(m.release_year || 0) <= cutoff);
      }

      // Shuffle slightly so repeated runs feel fresh.
      movies = movies.sort(() => Math.random() - 0.3);

      setResults(movies);
      setResultIndex(0);
      setPhase('result');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleNextMovie = () => {
    if (resultIndex < results.length - 1) {
      setAnimating(true);
      setTimeout(() => {
        setResultIndex(prev => prev + 1);
        setAnimating(false);
      }, 200);
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
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const currentMovie = results[resultIndex];
  const progress = ((currentStep) / QUIZ_STEPS.length) * 100;

  return (
    <>
      {/* Hero Header */}
      <header className="hero">
        <div className="hero-badge">🎬 Smart Movie Discovery</div>
        <h1>Find Your <span>Perfect Movie</span></h1>
        <p>Answer a few quick questions and we'll find exactly what you're in the mood for.</p>
      </header>

      <div className="app-container">

        {/* QUIZ PHASE */}
        {phase === 'quiz' && (
          <div className={`quiz-wrapper ${animating ? 'fade-out' : 'fade-in'}`}>
            {/* Progress Bar */}
            <div className="progress-bar-wrapper">
              <div className="progress-bar-track">
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
              </div>
              <span className="progress-label">Step {currentStep + 1} of {QUIZ_STEPS.length}</span>
            </div>

            {/* Question */}
            <div className="quiz-question-block">
              <h2 className="quiz-question">{step.question}</h2>
              <p className="quiz-subtitle">{step.subtitle}</p>
            </div>

            {/* Options Grid */}
            <div className="quiz-options-grid">
              {step.options.map(option => (
                <div
                  key={option.id}
                  className={`quiz-option ${answers[step.id] === option.id ? 'selected' : ''}`}
                  onClick={() => handleOptionSelect(option.id)}
                >
                  <span className="option-emoji">{option.emoji}</span>
                  <span className="option-label">{option.label}</span>
                </div>
              ))}
            </div>

            {/* Back Button */}
            {currentStep > 0 && (
              <button className="back-btn" onClick={handleBack}>
                ← Back
              </button>
            )}
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div className="loading-wrapper">
            <div className="spinner" />
            <p>Finding your perfect movie...</p>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="error-message">
            ⚠️ {error}
            <button className="back-btn" onClick={handleRestart} style={{ marginTop: '12px' }}>
              Try Again
            </button>
          </div>
        )}

        {/* RESULT PHASE */}
        {phase === 'result' && currentMovie && !loading && (
          <div className={`result-wrapper ${animating ? 'fade-out' : 'fade-in'}`}>
            <div className="result-header">
              <h2>Here's your pick</h2>
              <span className="result-counter">{resultIndex + 1} of {results.length}</span>
            </div>

            {/* Single Movie Card - Full Size */}
            <MovieCard
              movie={currentMovie}
              onClick={() => setSelectedMovie(currentMovie)}
              fullSize={true}
            />

            {/* Action Buttons */}
            <div className="result-actions">
              {resultIndex < results.length - 1 && (
                <button className="next-movie-btn" onClick={handleNextMovie}>
                  👎 Not this one — Next Movie
                </button>
              )}
              <button className="restart-btn" onClick={handleRestart}>
                🔄 Start Over
              </button>
            </div>

            {resultIndex === results.length - 1 && (
              <p className="no-more-msg">You've seen all recommendations for this mood! Try starting over with different choices.</p>
            )}
          </div>
        )}

        {/* No Results */}
        {phase === 'result' && results.length === 0 && !loading && (
          <div className="empty-message">
            😕 No movies found for your selections. Try different choices!
            <button className="back-btn" onClick={handleRestart} style={{ marginTop: '16px' }}>
              Try Again
            </button>
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
