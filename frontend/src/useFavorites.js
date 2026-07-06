import { useState, useEffect } from 'react';

const STORAGE_KEY = 'movie-recommender-favorites';

// keeps a small watchlist of full movie objects in the browser so it
// survives a refresh without needing a login system or a backend table
export function useFavorites() {
  const [favorites, setFavorites] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const isFavorite = (tmdbId) => favorites.some(m => m.tmdb_id === tmdbId);

  const toggleFavorite = (movie) => {
    setFavorites(prev =>
      prev.some(m => m.tmdb_id === movie.tmdb_id)
        ? prev.filter(m => m.tmdb_id !== movie.tmdb_id)
        : [...prev, movie]
    );
  };

  return { favorites, isFavorite, toggleFavorite };
}
