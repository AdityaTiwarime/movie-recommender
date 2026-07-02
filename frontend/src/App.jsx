import { useState, useEffect } from 'react';
import MovieCard from './components/MovieCard.jsx';
import MovieModal from './components/MovieModal.jsx';
import { recommendByPreferences } from './api.js';

// Content type tabs — Movies, Web Series, Hindi Movies
const CONTENT_TABS = [
  { id: 'movie', label: '🎬 Movies', type: 'movie' },
  { id: 'web_series', label: '📺 Web Series', type: 'web_series' },
  { id: 'hindi_movie', label: '🎭 Hindi Movies', type: 'hindi_movie' },
];

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
  const [contentTab, setContentTab] = useState('movie');
  const [phase, setPhase] = useState('quiz');
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [results, setResults] = useState([]);
  const [resultIndex, setResultIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [animating, setAnimating] = useState(false);

  const step = QUIZ_STEPS[currentStep];

  const handleTabChange = (tabId) => {
    setContentTab(tabId);
    handleRestart();
  };

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

      let movies = await recommendByPreferences(genres, 20, contentTab);

      // Apply era filter
      const eraOption = QUIZ_STEPS[2].options.find(o => o.id === finalAnswers.era);
      if (eraOption?.years && !eraOption?.classic) {
        const cutoff = CURRENT_YEAR - eraOption.years;
        movies = movies.filter(m => parseInt(m.release_year || 0) >= cutoff);
      }
      if (eraOption?.classic) {
        const cutoff = CURRENT_YEAR - 25;
        movies = movies.filter(m => parseInt(m.release_year || 0) <= cutoff);
      }

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
      {/* Hero Header */}
      <header className="hero">
        <h1>Find Your <span>Perfect Watch</span></h1>
        <p>Answer a few quick questions and we'll find exactly what you're in the mood for.</p>
      </header>

      {/* Content Type Tabs */}
      <div className="content-tabs">
        {CONTENT_TABS.map(tab => (
          <button
            key={tab.id}
            className={`content-tab ${contentTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="app-container">

        {/* QUIZ PHASE */}
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

        {/* LOADING */}
        {loading && (
          <div className="loading-wrapper">
            <div className="spinner" />
            <p>Finding your perfect match...</p>
          </div>
        )}

        {/* ERROR */}
        {error && !loading && (
          <div className="error-message">
            ⚠️ {error}
            <button className="back-btn" onClick={handleRestart} style={{ marginTop: '12px' }}>Try Again</button>
          </div>
        )}

        {/* RESULT PHASE */}
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
              {resultIndex < results.length - 1 && (
                <button className="next-movie-btn" onClick={handleNextMovie}>
                  👎 Not this one — Next
                </button>
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

      {selectedMovie && (
        <MovieModal movie={selectedMovie} onClose={() => setSelectedMovie(null)} />
      )}
    </>
  );
}
