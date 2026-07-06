// Centralized API client for the recommendation backend.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function handleResponse(response) {
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export async function fetchMovieTitles() {
  const response = await fetch(`${API_BASE_URL}/api/movies?limit=500`);
  return handleResponse(response);
}

export async function recommendByTitle(title, topN = 10) {
  const response = await fetch(`${API_BASE_URL}/api/recommend/by-title`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, top_n: topN }),
  });
  return handleResponse(response);
}

// filters is an optional object: { yearMin, yearMax, minRating, likedIds }
export async function recommendByPreferences(genres, topN = 10, contentType = null, filters = {}) {
  const response = await fetch(`${API_BASE_URL}/api/recommend/by-preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      genres,
      top_n: topN,
      content_type: contentType,
      year_min: filters.yearMin ?? null,
      year_max: filters.yearMax ?? null,
      min_rating: filters.minRating ?? null,
      liked_ids: filters.likedIds ?? [],
    }),
  });
  return handleResponse(response);
}

export async function recommendRandom(topN = 1, filters = {}) {
  const response = await fetch(`${API_BASE_URL}/api/recommend/random`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      top_n: topN,
      content_type: null,
      year_min: filters.yearMin ?? null,
      year_max: filters.yearMax ?? null,
      min_rating: filters.minRating ?? null,
    }),
  });
  return handleResponse(response);
}

export async function searchByActor(query) {
  const response = await fetch(`${API_BASE_URL}/api/movies/search?q=${encodeURIComponent(query)}`);
  return handleResponse(response);
}
