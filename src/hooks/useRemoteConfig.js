/**
 * useRemoteConfig — Custom hook for CleverTap Product Experiences (Variables).
 *
 * Uses the CleverTap Variables API (defineVariables → fetchVariables →
 * onVariablesChanged / getVariables) as per the official docs:
 * https://developer.clevertap.com/docs/react-native-remote-config
 *
 * ─── VARIABLES ──────────────────────────────────────────────────────────────
 *
 *  PAYWALL VARIABLES:
 *   Key                        Type      Default
 *   ────────────────────────  ────────  ──────────────────────
 *   allow_free_trailers        Boolean   true
 *   trailer_preview_duration   Number    15
 *   paywall_cta_text           String    "Upgrade to Premium"
 *
 *  THEME COLOR VARIABLES:
 *   primary_color              String    "#5E35B1"
 *   accent_color               String    "#7C4DFF"
 *   background_color           String    "#0D0D0D"
 *   surface_color              String    "#161618"
 *   header_color               String    "#111114"
 *   text_color                 String    "#FFFFFF"
 *   text_secondary_color       String    "#AAA"
 *   border_color               String    "#1E1E22"
 *   cta_text_color             String    "#FFFFFF"
 *
 *  STRING VARIABLES (CTA labels, section titles):
 *   hero_tag_text              String    "FEATURED"
 *   watch_cta_text             String    "Watch Now"
 *   buy_cta_text               String    "Buy Now"
 *   browse_cta_text            String    "Browse Content"
 *   trending_movies_title      String    "Trending Movies"
 *   trending_tv_title          String    "Trending TV Series"
 *   cart_title                 String    "My Cart"
 *   greeting_text              String    "Hey there"
 *
 * ─── HOW IT WORKS ──────────────────────────────────────────────────────────
 * 1. On mount → defineVariables with defaults, then fetchVariables
 * 2. onVariablesChanged fires whenever values update → merges into state
 * 3. refetch() can be called after tier change to re-evaluate segments
 */
import {useState, useEffect, useRef, useCallback} from 'react';
import CleverTap from 'clevertap-react-native';

// Flat defaults used by ThemeContext and the rest of the app
const DEFAULTS = {
  // Paywall
  allow_free_trailers: true,
  trailer_preview_duration: 15,
  paywall_cta_text: 'Upgrade to Premium',

  // Theme colors
  primary_color: '#5E35B1',
  accent_color: '#7C4DFF',
  background_color: '#0D0D0D',
  surface_color: '#161618',
  header_color: '#111114',
  text_color: '#FFFFFF',
  text_secondary_color: '#AAA',
  border_color: '#1E1E22',
  cta_text_color: '#FFFFFF',

  // Strings
  hero_tag_text: 'FEATURED',
  watch_cta_text: 'Watch Now',
  buy_cta_text: 'Buy Now',
  browse_cta_text: 'Browse Content',
  trending_movies_title: 'Trending Movies',
  trending_tv_title: 'Trending TV Series',
  cart_title: 'My Cart',
  greeting_text: 'Hey there',
};

// Variables on the dashboard are inside the "movie" folder,
// so defineVariables must use a nested map to match.
const VARIABLES = {
  movie: {...DEFAULTS},
};

// Helper: validate and normalize hex color
const normalizeHex = (v) => {
  if (typeof v !== 'string' || v.length === 0) return null;
  const trimmed = v.trim();
  if (/^#([0-9A-Fa-f]{3,8})$/.test(trimmed)) return trimmed;
  if (/^([0-9A-Fa-f]{3,8})$/.test(trimmed)) return `#${trimmed}`;
  return null;
};

// Build config state from raw variables object, applying type checks and defaults
const buildConfig = (vars) => ({
  // Paywall
  allow_free_trailers:
    typeof vars.allow_free_trailers === 'boolean'
      ? vars.allow_free_trailers
      : DEFAULTS.allow_free_trailers,
  trailer_preview_duration:
    typeof vars.trailer_preview_duration === 'number' && vars.trailer_preview_duration > 0
      ? vars.trailer_preview_duration
      : DEFAULTS.trailer_preview_duration,
  paywall_cta_text: vars.paywall_cta_text || DEFAULTS.paywall_cta_text,

  // Colors
  primary_color: normalizeHex(vars.primary_color) || DEFAULTS.primary_color,
  accent_color: normalizeHex(vars.accent_color) || DEFAULTS.accent_color,
  background_color: normalizeHex(vars.background_color) || DEFAULTS.background_color,
  surface_color: normalizeHex(vars.surface_color) || DEFAULTS.surface_color,
  header_color: normalizeHex(vars.header_color) || DEFAULTS.header_color,
  text_color: normalizeHex(vars.text_color) || DEFAULTS.text_color,
  text_secondary_color: normalizeHex(vars.text_secondary_color) || DEFAULTS.text_secondary_color,
  border_color: normalizeHex(vars.border_color) || DEFAULTS.border_color,
  cta_text_color: normalizeHex(vars.cta_text_color) || DEFAULTS.cta_text_color,

  // Strings
  hero_tag_text: vars.hero_tag_text || DEFAULTS.hero_tag_text,
  watch_cta_text: vars.watch_cta_text || DEFAULTS.watch_cta_text,
  buy_cta_text: vars.buy_cta_text || DEFAULTS.buy_cta_text,
  browse_cta_text: vars.browse_cta_text || DEFAULTS.browse_cta_text,
  trending_movies_title: vars.trending_movies_title || DEFAULTS.trending_movies_title,
  trending_tv_title: vars.trending_tv_title || DEFAULTS.trending_tv_title,
  cart_title: vars.cart_title || DEFAULTS.cart_title,
  greeting_text: vars.greeting_text || DEFAULTS.greeting_text,
});

export default function useRemoteConfig() {
  const [config, setConfig] = useState(DEFAULTS);
  const mountedRef = useRef(true);

  // Force re-fetch — useful after tier/profile change for segment re-evaluation
  const refetch = useCallback(() => {
    CleverTap.fetchVariables((err, success) => {
      console.log('[RemoteConfig] refetch result:', success, err);
    });
  }, []);

  useEffect(() => {
    // Step 1: Define variables with defaults — nested under "movie" folder to match dashboard
    CleverTap.defineVariables(VARIABLES);

    // Step 2: Sync variables to the server (registers them on the dashboard)
    CleverTap.syncVariables();

    // Step 3: Listen for variable changes (fires after fetch resolves with new values)
    CleverTap.onVariablesChanged((variables) => {
      if (!mountedRef.current) return;
      console.log('[RemoteConfig] onVariablesChanged:', variables);
      // Extract the "movie" folder object; fall back to flat variables if not nested
      const movieVars = variables?.movie || variables;
      setConfig(buildConfig(movieVars));
    });

    // Step 4: Log individual variable changes for debugging (keys are "movie.variable_name")
    Object.keys(DEFAULTS).forEach((key) => {
      CleverTap.onValueChanged(`movie.${key}`, (variable) => {
        console.log(`[RemoteConfig] onValueChanged: movie.${key} =`, variable);
      });
    });

    // Step 5: Fetch latest variable values from the dashboard
    CleverTap.fetchVariables((err, success) => {
      if (err) {
        console.warn('[RemoteConfig] fetchVariables error:', err);
      }
      console.log('[RemoteConfig] fetchVariables success:', success);
    });

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {config, refetch};
}

export {DEFAULTS as REMOTE_CONFIG_DEFAULTS};
