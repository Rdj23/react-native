/**
 * TMDB API service with proxy support.
 *
 * Uses a public proxy to bypass regional blocks on api.themoviedb.org.
 * All fetch helpers return parsed JSON and support AbortController signals.
 */

const TMDB_KEY = 'd08da567ee2d845d0801bd7ecce02317';

// Public TMDB proxy — swap this URL if the proxy changes or you self-host one
const BASE_URL = 'https://api.tmdb.org/3';

// Image URL helpers
const POSTER = (path, size = 'w342') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

const BACKDROP = (path, size = 'w780') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

const PROFILE = (path, size = 'w185') =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

/**
 * Generic TMDB fetcher with error handling.
 *
 * @param {string} endpoint  API path after /3/ (e.g. 'trending/movie/week')
 * @param {object} [opts]    Extra query params and fetch options
 * @param {AbortSignal} [opts.signal]  AbortController signal
 * @returns {Promise<object>} Parsed JSON response
 */
async function tmdbFetch(endpoint, {signal, ...params} = {}) {
  const qs = new URLSearchParams({api_key: TMDB_KEY, ...params}).toString();
  const url = `${BASE_URL}/${endpoint}?${qs}`;

  const res = await fetch(url, {signal});
  if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`);
  return res.json();
}

/** Fetch trending movies for the week */
const fetchTrendingMovies = (signal) =>
  tmdbFetch('trending/movie/week', {signal}).then(d => d.results || []);

/** Fetch trending TV shows for the week */
const fetchTrendingTV = (signal) =>
  tmdbFetch('trending/tv/week', {signal}).then(d => d.results || []);

/** Fetch trending all (movies + TV) for the day */
const fetchTrendingAll = (signal) =>
  tmdbFetch('trending/all/day', {signal}).then(d =>
    (d.results || []).filter(x => x.media_type !== 'person'),
  );

/** Fetch credits (cast) for a movie or TV show */
const fetchCredits = (type, id, signal) =>
  tmdbFetch(`${type}/${id}/credits`, {language: 'en-US', signal}).then(
    d => (d.cast || []).slice(0, 12),
  );

/** Fetch videos and return the best YouTube trailer key */
const fetchTrailerKey = (type, id, signal) =>
  tmdbFetch(`${type}/${id}/videos`, {language: 'en-US', signal}).then(d => {
    const videos = d.results || [];
    const yt =
      videos.find(v => v.site === 'YouTube' && /Official Trailer/i.test(v.name)) ||
      videos.find(v => v.site === 'YouTube' && /Trailer/i.test(v.name)) ||
      videos.find(v => v.site === 'YouTube');
    return yt ? yt.key : null;
  });

/** Search movies and TV shows by query */
const searchMulti = (query, signal) =>
  tmdbFetch('search/multi', {query, language: 'en-US', signal}).then(d =>
    (d.results || []).filter(x => x.media_type === 'movie' || x.media_type === 'tv'),
  );

export {
  TMDB_KEY,
  BASE_URL,
  POSTER,
  BACKDROP,
  PROFILE,
  tmdbFetch,
  fetchTrendingMovies,
  fetchTrendingTV,
  fetchTrendingAll,
  fetchCredits,
  fetchTrailerKey,
  searchMulti,
};
