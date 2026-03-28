/**
 * useRemoteConfig — Custom hook for CleverTap Product Experiences (Remote Config).
 *
 * ─── DASHBOARD ──────────────────────────────────────────────────────────────
 * Product Experiences is available ONLY on Dashboard 2 (secondary instance).
 * This hook uses CleverTapSecondary native module for all Product Config calls.
 *
 * ─── VARIABLES (declared on CleverTap Dashboard 2, inside "movie" folder) ───
 * The folder name IS part of the key — keys are "movie.variable_name".
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
 * 1. On mount → fetchAndActivate to pull the latest values
 * 2. After a short delay → reads each key via promise-based native methods
 * 3. Listens to CleverTapProductConfigDidFetch events to re-read on updates
 * 4. Uses mountedRef guard to avoid setState after unmount
 */
import {useState, useEffect, useRef, useCallback} from 'react';
import {NativeModules, NativeEventEmitter, Platform} from 'react-native';
import CleverTap from 'clevertap-react-native';

const {CleverTapSecondary} = NativeModules;

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

// Helper: read a string key with fallback
// Keys are prefixed with "movie." — the folder name IS part of the key.
const getString = (key, fallback) =>
  CleverTapSecondary.productConfigGetString(`movie.${key}`)
    .then(v => (typeof v === 'string' && v.length > 0 ? v : fallback))
    .catch(() => fallback);

// Helper: validate and normalize hex color
// Dashboard may return "#FFD700" or "FFD700" (without #) — handle both
const normalizeHex = (v) => {
  if (typeof v !== 'string' || v.length === 0) return null;
  const trimmed = v.trim();
  // Already has # prefix
  if (/^#([0-9A-Fa-f]{3,8})$/.test(trimmed)) return trimmed;
  // Missing # prefix — add it
  if (/^([0-9A-Fa-f]{3,8})$/.test(trimmed)) return `#${trimmed}`;
  return null;
};

export default function useRemoteConfig() {
  const [config, setConfig] = useState(DEFAULTS);
  const mountedRef = useRef(true);

  const readValues = useCallback(async () => {
    if (!mountedRef.current || !CleverTapSecondary) return;

    try {
      // Debug: dump all known keys to see what Dashboard 2 actually returns
      if (CleverTapSecondary.debugProductConfig) {
        const debugResult = await CleverTapSecondary.debugProductConfig();
        console.log('[RemoteConfig] DEBUG DUMP:\n' + debugResult);
      }

      // Activate fetched values first
      CleverTapSecondary.productConfigActivate?.();

      // Read all values in parallel
      const [
        // Paywall
        allowTrailers, previewDuration, paywallCta,
        // Colors
        primaryColor, accentColor, bgColor, surfaceColor,
        headerColor, textColor, textSecColor, borderColor, ctaTextColor,
        // Strings
        heroTag, watchCta, buyCta, browseCta,
        trendingMovies, trendingTv, cartTitle, greetingText,
      ] = await Promise.all([
        // Paywall
        CleverTapSecondary.productConfigGetBoolean('movie.allow_free_trailers').catch(() => DEFAULTS.allow_free_trailers),
        CleverTapSecondary.productConfigGetLong('movie.trailer_preview_duration').catch(() => DEFAULTS.trailer_preview_duration),
        getString('paywall_cta_text', DEFAULTS.paywall_cta_text),
        // Colors
        getString('primary_color', DEFAULTS.primary_color),
        getString('accent_color', DEFAULTS.accent_color),
        getString('background_color', DEFAULTS.background_color),
        getString('surface_color', DEFAULTS.surface_color),
        getString('header_color', DEFAULTS.header_color),
        getString('text_color', DEFAULTS.text_color),
        getString('text_secondary_color', DEFAULTS.text_secondary_color),
        getString('border_color', DEFAULTS.border_color),
        getString('cta_text_color', DEFAULTS.cta_text_color),
        // Strings
        getString('hero_tag_text', DEFAULTS.hero_tag_text),
        getString('watch_cta_text', DEFAULTS.watch_cta_text),
        getString('buy_cta_text', DEFAULTS.buy_cta_text),
        getString('browse_cta_text', DEFAULTS.browse_cta_text),
        getString('trending_movies_title', DEFAULTS.trending_movies_title),
        getString('trending_tv_title', DEFAULTS.trending_tv_title),
        getString('cart_title', DEFAULTS.cart_title),
        getString('greeting_text', DEFAULTS.greeting_text),
      ]);

      if (!mountedRef.current) return;

      // Debug: log raw fetched values to verify what Dashboard 2 returns
      console.log('[RemoteConfig] Raw values from Dashboard 2:', {
        allowTrailers, previewDuration, paywallCta,
        primaryColor, bgColor, watchCta,
      });

      setConfig({
        // Paywall
        allow_free_trailers: typeof allowTrailers === 'boolean' ? allowTrailers : DEFAULTS.allow_free_trailers,
        trailer_preview_duration: typeof previewDuration === 'number' && previewDuration > 0 ? previewDuration : DEFAULTS.trailer_preview_duration,
        paywall_cta_text: paywallCta,
        // Colors (validate + normalize hex, fallback to default if invalid)
        primary_color: normalizeHex(primaryColor) || DEFAULTS.primary_color,
        accent_color: normalizeHex(accentColor) || DEFAULTS.accent_color,
        background_color: normalizeHex(bgColor) || DEFAULTS.background_color,
        surface_color: normalizeHex(surfaceColor) || DEFAULTS.surface_color,
        header_color: normalizeHex(headerColor) || DEFAULTS.header_color,
        text_color: normalizeHex(textColor) || DEFAULTS.text_color,
        text_secondary_color: normalizeHex(textSecColor) || DEFAULTS.text_secondary_color,
        border_color: normalizeHex(borderColor) || DEFAULTS.border_color,
        cta_text_color: normalizeHex(ctaTextColor) || DEFAULTS.cta_text_color,
        // Strings
        hero_tag_text: heroTag,
        watch_cta_text: watchCta,
        buy_cta_text: buyCta,
        browse_cta_text: browseCta,
        trending_movies_title: trendingMovies,
        trending_tv_title: trendingTv,
        cart_title: cartTitle,
        greeting_text: greetingText,
      });
    } catch (e) {
      console.warn('useRemoteConfig: failed to read values from Dashboard 2', e);
    }
  }, []);

  // Force re-fetch: reset cache, trigger fetch (native listener auto-activates)
  const refetch = useCallback(() => {
    if (!CleverTapSecondary) return;
    CleverTapSecondary.productConfigReset?.();
    CleverTapSecondary.productConfigFetch?.();
    // Native CTProductConfigListener.onFetched() will auto-activate,
    // then onActivated() emits event → readValues fires via listener below
  }, []);

  useEffect(() => {
    if (!CleverTapSecondary) {
      console.warn('useRemoteConfig: CleverTapSecondary native module not available');
      return;
    }

    // Set minimum fetch interval and trigger fetch
    // Native listener will auto-activate when fetch completes
    CleverTapSecondary.productConfigSetMinimumFetchIntervalInSeconds?.(0);
    CleverTapSecondary.productConfigFetch?.();

    // Listen for our custom native event when activation completes on Dashboard 2
    const emitter = new NativeEventEmitter(NativeModules.CleverTapSecondary);
    const activatedSub = emitter.addListener(
      'CleverTapSecondaryProductConfigActivated',
      () => {
        console.log('[RemoteConfig] Native activation event received — reading values');
        readValues();
      },
    );

    // Also listen for primary SDK events as backup
    const subscriptions = [];
    try {
      const sub1 = CleverTap.addListener?.(
        'CleverTapProductConfigDidFetch',
        readValues,
      );
      if (sub1) subscriptions.push(sub1);

      const sub2 = CleverTap.addListener?.(
        'CleverTapProductConfigDidActivate',
        readValues,
      );
      if (sub2) subscriptions.push(sub2);
    } catch (e) {
      console.warn('useRemoteConfig: listener setup failed', e);
    }

    // Fallback: read after delay in case events don't fire
    const initialTimer = setTimeout(readValues, 5000);

    // Poll periodically as fallback (every 30s)
    const pollInterval = setInterval(readValues, 30000);

    return () => {
      mountedRef.current = false;
      clearTimeout(initialTimer);
      clearInterval(pollInterval);
      activatedSub?.remove?.();
      subscriptions.forEach(sub => sub?.remove?.());
    };
  }, [readValues]);

  return {config, refetch};
}

export {DEFAULTS as REMOTE_CONFIG_DEFAULTS};
