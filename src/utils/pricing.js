/**
 * Per-title pricing (in Indian Rupees) — deterministic prices derived from
 * each title's rating, release year, and TMDB ID so every movie/series has
 * its own price instead of a flat price for everything.
 *
 * Rules:
 *  - Higher rated titles cost more (rating drives the base)
 *  - New releases (≤1yr) carry a premium; recent (≤3yr) a smaller one
 *  - Older catalog titles (≥15yr) are discounted
 *  - A small ID-based offset spreads titles apart so nothing looks identical
 *  - All prices end in 99 (₹299, ₹1499, …), clamped between ₹499 and ₹2499
 */

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// Round to the nearest ₹100, then drop a rupee → x99 price points (e.g. ₹299)
const to99 = v => Math.max(99, Math.round(v / 100) * 100 - 1);

/**
 * Buy price for a title, in whole rupees.
 * @param {object} p
 * @param {number} p.id           TMDB ID
 * @param {number} p.rating       TMDB vote_average (0–10)
 * @param {string} p.releaseDate  'YYYY-MM-DD'
 */
export function getBuyPrice({id = 0, rating = 0, releaseDate = ''} = {}) {
  const year = parseInt(String(releaseDate).slice(0, 4), 10);
  const age = isNaN(year) ? 10 : Math.max(0, new Date().getFullYear() - year);

  let price = 700 + clamp(rating, 0, 10) * 90; // ₹700–₹1600 from rating

  if (age <= 1) price += 400; // new release premium
  else if (age <= 3) price += 200; // recent release
  else if (age >= 15) price -= 200; // catalog discount

  price += (Number(id) % 100) * 2; // ₹0–198 per-title spread

  return to99(clamp(price, 499, 2499));
}

/**
 * Rental plans scaled off the buy price:
 * 7 days ≈ 20%, 1 month ≈ 45%, 3 months ≈ 75% of buying.
 */
export function getRentalPlans(buyPrice) {
  const tier = f => to99(clamp(buyPrice * f, 99, buyPrice));
  return [
    {key: '7d', label: '7 Days', price: tier(0.2)},
    {key: '1m', label: '1 Month', price: tier(0.45)},
    {key: '3m', label: '3 Months', price: tier(0.75)},
  ];
}

/** Format a rupee price for display: 1499 → "₹1,499" */
export const formatPrice = v => `₹${Number(v).toLocaleString('en-IN')}`;
