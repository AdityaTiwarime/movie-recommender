// Centralized API client for the recommendation backend.
// The base URL is read from an environment variable so it can be swapped
// between local development and the Docker network without changing component code.

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

export async function recommendByPreferences(genres, topN = 10) {
  const response = await fetch(`${API_BASE_URL}/api/recommend/by-preferences`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ genres, top_n: topN }),
  });
  return handleResponse(response);
}
