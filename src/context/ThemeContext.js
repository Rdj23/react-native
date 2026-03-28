/**
 * ThemeContext — Provides dynamic theme (colors + strings) driven by
 * CleverTap Product Experiences on Dashboard 2.
 *
 * All screens consume this via useTheme(). When Dashboard 2 serves
 * different values for Free vs Premium segments, the entire app's
 * look and feel updates automatically.
 *
 * Usage:
 *   import { useTheme } from '../context/ThemeContext';
 *   const { colors, strings } = useTheme();
 *   <View style={{ backgroundColor: colors.background }}>
 *   <Text style={{ color: colors.text }}>{strings.watchCta}</Text>
 */
import React, {createContext, useContext, useMemo} from 'react';
import useRemoteConfig, {REMOTE_CONFIG_DEFAULTS} from '../hooks/useRemoteConfig';

const ThemeContext = createContext(null);

export function ThemeProvider({children}) {
  const {config: rc, refetch} = useRemoteConfig();

  const theme = useMemo(() => ({
    colors: {
      primary: rc.primary_color,
      accent: rc.accent_color,
      background: rc.background_color,
      surface: rc.surface_color,
      header: rc.header_color,
      text: rc.text_color,
      textSecondary: rc.text_secondary_color,
      border: rc.border_color,
      ctaText: rc.cta_text_color,
      // Derived colors (computed from primary)
      primaryLight: rc.primary_color + '40', // 25% opacity
      primarySoft: rc.primary_color + '1A',  // 10% opacity
    },
    strings: {
      heroTag: rc.hero_tag_text,
      watchCta: rc.watch_cta_text,
      buyCta: rc.buy_cta_text,
      browseCta: rc.browse_cta_text,
      trendingMovies: rc.trending_movies_title,
      trendingTv: rc.trending_tv_title,
      cartTitle: rc.cart_title,
      greeting: rc.greeting_text,
      paywallCta: rc.paywall_cta_text,
    },
    paywall: {
      allowFreeTrailers: rc.allow_free_trailers,
      previewDuration: rc.trailer_preview_duration,
    },
    // Force re-fetch (call after tier switch so Dashboard 2 serves new segment values)
    refetch,
    // Raw config for direct access if needed
    raw: rc,
  }), [rc, refetch]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback if used outside provider (shouldn't happen)
    const d = REMOTE_CONFIG_DEFAULTS;
    return {
      colors: {
        primary: d.primary_color, accent: d.accent_color,
        background: d.background_color, surface: d.surface_color,
        header: d.header_color, text: d.text_color,
        textSecondary: d.text_secondary_color, border: d.border_color,
        ctaText: d.cta_text_color,
        primaryLight: d.primary_color + '40', primarySoft: d.primary_color + '1A',
      },
      strings: {
        heroTag: d.hero_tag_text, watchCta: d.watch_cta_text,
        buyCta: d.buy_cta_text, browseCta: d.browse_cta_text,
        trendingMovies: d.trending_movies_title, trendingTv: d.trending_tv_title,
        cartTitle: d.cart_title, greeting: d.greeting_text, paywallCta: d.paywall_cta_text,
      },
      paywall: {allowFreeTrailers: d.allow_free_trailers, previewDuration: d.trailer_preview_duration},
      raw: d,
    };
  }
  return ctx;
}
