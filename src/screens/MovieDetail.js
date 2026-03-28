/**
 * MovieDetail — full detail view for a movie or TV show.
 *
 * ─── LAYOUT (top to bottom) ──────────────────────────────────────────────────
 *  1. Backdrop + poster header with title and meta (type, release date, overview)
 *  2. Full overview text section
 *  3. Cast horizontal scroll — fetched from TMDB /credits endpoint
 *  4. Trailer section — inline YouTube iframe player with paywall overlay
 *     • Premium users: full trailer playback
 *     • Free users: playback auto-pauses at trailer_preview_duration (from Remote Config)
 *       and a glassmorphism paywall overlay appears with lock icon + CTA
 *  5. Rent options — 7 Days ($2.99) / 1 Month ($5.99) / 3 Months ($12.99)
 *  6. Add to Cart button ($14.99)
 *
 * ─── CLEVERTAP EVENTS FIRED HERE ────────────────────────────────────────────
 *  Dashboard 1 (Primary):
 *    'Content Viewed'      → on mount
 *    'Trailer Viewed'      → once when trailerKey resolves
 *    'Movie Rented'        → after rental confirmation
 *    'Add to Cart'         → when user taps cart button
 *
 *  Dashboard 2 (Secondary — via CleverTapSecondary):
 *    'Trailer Started'     → when YouTube playback begins
 *    'Paywall Shown'       → when the paywall overlay renders for free users
 *    'Subscription Clicked'→ when the CTA button on the paywall is tapped
 */
import React, {useEffect, useState, useRef, useCallback} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Animated,
  StatusBar,
  Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import CleverTap from 'clevertap-react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import {POSTER, PROFILE as PROFILE_IMG, fetchCredits, fetchTrailerKey} from '../services/tmdb';
import {useMovieCart} from '../context/MovieCartContext';
import {useUser} from '../context/UserContext';
import {useTheme} from '../context/ThemeContext';
import CleverTapSecondary from '../services/CleverTapSecondary';

const {width} = Dimensions.get('window');
const PLAYER_HEIGHT = Math.round((width * 9) / 16); // 16:9 aspect ratio

// Duration in milliseconds for each rental plan
const DURATIONS_MS = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  '1m': 30 * 24 * 60 * 60 * 1000,
  '3m': 90 * 24 * 60 * 60 * 1000,
};

const RENTAL_PLANS = [
  {key: '7d', label: '7 Days', price: 2.99},
  {key: '1m', label: '1 Month', price: 5.99},
  {key: '3m', label: '3 Months', price: 12.99},
];

const BUY_PRICE = 14.99;

// ─── Custom Toast Component ─────────────────────────────────────────
function Toast({visible, message, type, onDismiss}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(fadeAnim, {toValue: 1, duration: 300, useNativeDriver: true}),
        Animated.delay(2200),
        Animated.timing(fadeAnim, {toValue: 0, duration: 300, useNativeDriver: true}),
      ]).start(() => onDismiss?.());
    }
  }, [visible]);

  if (!visible) return null;

  const bg = type === 'success' ? '#2E7D32' : type === 'error' ? '#C62828' : '#333';
  const icon = type === 'success' ? 'checkmark-circle' : type === 'error' ? 'alert-circle' : 'information-circle';

  return (
    <Animated.View style={[toastStyles.container, {opacity: fadeAnim, backgroundColor: bg}]}>
      <Ionicons name={icon} size={20} color="#FFF" />
      <Text style={toastStyles.text}>{message}</Text>
    </Animated.View>
  );
}

const toastStyles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    zIndex: 999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  text: {color: '#FFF', fontSize: 14, fontWeight: '600', flex: 1},
});

export default function MovieDetail({route, navigation}) {
  const {
    id,
    title = '',
    image = '',
    release_date = '',
    overview = '',
    type = 'movie',
    backdrop = '',
  } = route?.params || {};

  const {addToCart} = useMovieCart();
  const {mockSubscriptionTier} = useUser();
  const insets = useSafeAreaInsets();
  const {colors, strings, paywall} = useTheme();

  const isPremium = mockSubscriptionTier === 'Premium';

  const [cast, setCast] = useState([]);
  const [trailerKey, setTrailerKey] = useState(null);
  const [loadingCast, setLoadingCast] = useState(true);
  const [selectedRental, setSelectedRental] = useState(null);
  const [trailerEventFired, setTrailerEventFired] = useState(false);

  // ─── YouTube Player State ───────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [trailerStartedFired, setTrailerStartedFired] = useState(false);
  const [paywallShownFired, setPaywallShownFired] = useState(false);

  // Refs for time tracking (avoids re-renders on every interval tick)
  const elapsedRef = useRef(0);
  const intervalRef = useRef(null);
  const playerRef = useRef(null);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({visible: false, plan: null});

  // Toast state
  const [toast, setToast] = useState({visible: false, message: '', type: 'success'});

  const showToast = (message, toastType = 'success') => {
    setToast({visible: true, message, type: toastType});
  };

  // ─── Fetch cast + trailer ──────────────────────────────────────
  useEffect(() => {
    if (!id || !type) {
      setCast([]);
      setTrailerKey(null);
      setLoadingCast(false);
      return;
    }

    CleverTap.recordEvent('Content Viewed', {
      Title: title,
      Type: type,
      ID: id,
      'Release Date': release_date,
    });

    const ctrl = new AbortController();

    setLoadingCast(true);
    fetchCredits(type, id, ctrl.signal)
      .then(setCast)
      .catch(() => setCast([]))
      .finally(() => setLoadingCast(false));

    fetchTrailerKey(type, id, ctrl.signal)
      .then(setTrailerKey)
      .catch(() => setTrailerKey(null));

    return () => ctrl.abort();
  }, [id, type]);

  // ─── Fire Trailer Viewed when trailer loads ────────────────────
  useEffect(() => {
    if (trailerKey && !trailerEventFired) {
      const youtubeUrl = `https://www.youtube.com/watch?v=${trailerKey}`;
      CleverTap.recordEvent('Trailer Viewed', {
        Title: title,
        Type: type,
        ID: id,
        'Trailer Link': youtubeUrl,
      });
      setTrailerEventFired(true);
    }
  }, [trailerKey, trailerEventFired]);

  // ─── Cleanup interval on unmount ───────────────────────────────
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  // ─── YouTube player state change handler ───────────────────────
  const onPlayerStateChange = useCallback(
    (state) => {
      if (state === 'playing') {
        setIsPlaying(true);

        // Fire Trailer Started event once (Dashboard 2)
        if (!trailerStartedFired) {
          CleverTapSecondary?.recordEventWithProps?.('Trailer Started', {
            Title: title,
            Type: type,
            ID: id,
            'Subscription Tier': mockSubscriptionTier,
          });
          setTrailerStartedFired(true);
        }

        // Start time-tracking interval for free users
        if (!isPremium && !showPaywall) {
          if (intervalRef.current) clearInterval(intervalRef.current);

          intervalRef.current = setInterval(() => {
            elapsedRef.current += 1;

            if (elapsedRef.current >= paywall.previewDuration) {
              // Time's up — pause and show paywall
              clearInterval(intervalRef.current);
              intervalRef.current = null;
              setIsPlaying(false);
              setShowPaywall(true);
            }
          }, 1000);
        }
      } else if (state === 'paused' || state === 'ended') {
        setIsPlaying(false);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    },
    [isPremium, showPaywall, paywall.previewDuration, title, type, id, mockSubscriptionTier, trailerStartedFired],
  );

  // ─── Fire Paywall Shown event when overlay appears ─────────────
  useEffect(() => {
    if (showPaywall && !paywallShownFired) {
      CleverTapSecondary?.recordEventWithProps?.('Paywall Shown', {
        Title: title,
        Type: type,
        ID: id,
        'Preview Duration': paywall.previewDuration,
        'CTA Text': strings.paywallCta,
      });
      setPaywallShownFired(true);
    }
  }, [showPaywall, paywallShownFired]);

  // ─── Reset paywall when user switches to Premium ───────────────
  useEffect(() => {
    if (isPremium && showPaywall) {
      setShowPaywall(false);
      elapsedRef.current = 0;
    }
  }, [isPremium]);

  // ─── Subscription CTA handler ──────────────────────────────────
  const handleSubscriptionClick = useCallback(() => {
    CleverTapSecondary?.recordEventWithProps?.('Subscription Clicked', {
      Title: title,
      Type: type,
      ID: id,
      'CTA Text': strings.paywallCta,
      'Subscription Tier': mockSubscriptionTier,
    });
    showToast('Upgrade flow would open here', 'info');
  }, [title, type, id, strings.paywallCta, mockSubscriptionTier]);

  // ─── Rent: show confirmation ───────────────────────────────────
  const promptRent = (plan) => {
    setConfirmModal({visible: true, plan});
  };

  // ─── Rent: confirmed ──────────────────────────────────────────
  const confirmRent = () => {
    const plan = confirmModal.plan;
    if (!plan) return;

    setConfirmModal({visible: false, plan: null});
    setSelectedRental(plan.key);

    const now = Date.now();
    const expiryEpoch = now + DURATIONS_MS[plan.key];

    CleverTap.recordEvent('Movie Rented', {
      Title: title,
      Type: type,
      ID: id,
      'Release Date': release_date,
      'Rental Plan': plan.label,
      'Rental Duration': plan.key,
      Price: plan.price,
      'Rented At': '$D_' + Math.floor(now / 1000),
      'Expiry Date': '$D_' + Math.floor(expiryEpoch / 1000),
    });

    CleverTap.profileSet({
      'Last Rented Title': title,
      'Last Rented Type': type,
      'Last Rental Plan': plan.label,
      'Last Rental Price': plan.price,
      'Last Rental Date': '$D_' + Math.floor(now / 1000),
      'Last Rental Expiry': '$D_' + Math.floor(expiryEpoch / 1000),
    });

    showToast(`Rented "${title}" for ${plan.label} at $${plan.price.toFixed(2)}`);
  };

  // ─── Add to Cart handler ───────────────────────────────────────
  const handleAddToCart = () => {
    const cartItem = {
      id,
      title,
      type,
      posterPath: image,
      releaseDate: release_date,
      overview,
      price: BUY_PRICE,
      backdrop,
    };

    addToCart(cartItem);

    CleverTap.recordEvent('Add to Cart', {
      Title: title,
      Type: type,
      ID: id,
      Price: BUY_PRICE,
      MovieDetails: {
        'Release Date': release_date,
        Overview: overview ? overview.substring(0, 200) : '',
        PosterURL: image || '',
      },
    });

    showToast(`"${title}" added to cart`);
    setTimeout(() => navigation.navigate('Cart'), 800);
  };

  // ─── Cast card ─────────────────────────────────────────────────
  const renderCast = ({item}) => (
    <View style={styles.castCard}>
      <Image source={{uri: PROFILE_IMG(item.profile_path)}} style={styles.castImg} />
      <Text numberOfLines={1} style={styles.castName}>{item.name}</Text>
      <Text numberOfLines={1} style={styles.castRole}>
        {item.character || item.role || ''}
      </Text>
    </View>
  );

  // Whether free trailers are allowed at all (from Remote Config)
  const trailersAllowed = isPremium || paywall.allowFreeTrailers;

  return (
    <View style={{flex: 1, backgroundColor: colors.background}}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView style={[styles.container, {backgroundColor: colors.background}]} contentContainerStyle={{paddingBottom: insets.bottom + 24}}>
        {/* ─── Back button ─────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.backBtn, {top: insets.top + 12}]}
          onPress={() => navigation.canGoBack() && navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.text} />
        </TouchableOpacity>

        {/* ─── Header ──────────────────────────────────────── */}
        <View style={styles.header}>
          <Image source={{uri: backdrop || image}} style={styles.backdrop} />
          <View style={styles.headerOverlay} />
          <View style={styles.headerContent}>
            <Image source={{uri: image}} style={styles.poster} />
            <View style={styles.headerText}>
              <Text style={[styles.title, {color: colors.text}]}>{title}</Text>
              <Text style={styles.meta}>
                {(type || '').toUpperCase()}{' '}
                {release_date ? `\u2022 ${release_date}` : ''}
              </Text>
              <Text numberOfLines={4} style={styles.overviewShort}>
                {overview || ''}
              </Text>
            </View>
          </View>
        </View>

        {/* ─── Overview ────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Overview</Text>
          <Text style={[styles.overviewFull, {color: colors.textSecondary}]}>
            {overview || 'No overview available.'}
          </Text>
        </View>

        {/* ─── Cast ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>Cast</Text>
          {loadingCast ? (
            <ActivityIndicator style={{marginTop: 8}} color={colors.primary} />
          ) : cast.length > 0 ? (
            <FlatList
              data={cast}
              horizontal
              keyExtractor={it => String(it.cast_id || it.id || it.credit_id)}
              renderItem={renderCast}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{paddingVertical: 8}}
            />
          ) : (
            <Text style={styles.emptyText}>No cast information available</Text>
          )}
        </View>

        {/* ─── Trailer (YouTube Iframe Player + Paywall) ──── */}
        {trailerKey ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, {color: colors.text}]}>Trailer</Text>
            {trailersAllowed ? (
              <View style={[styles.playerContainer, {backgroundColor: colors.surface}]}>
                <YoutubePlayer
                  ref={playerRef}
                  height={PLAYER_HEIGHT}
                  videoId={trailerKey}
                  play={isPlaying}
                  onChangeState={onPlayerStateChange}
                  webViewProps={{
                    allowsInlineMediaPlayback: true,
                    mediaPlaybackRequiresUserAction: false,
                  }}
                />

                {/* ─── Glassmorphism Paywall Overlay ─── */}
                {showPaywall && !isPremium && (
                  <View style={paywallStyles.overlay}>
                    <View style={paywallStyles.glass}>
                      <View style={[paywallStyles.lockCircle, {backgroundColor: colors.primaryLight, borderColor: colors.primary + '4D'}]}>
                        <Ionicons name="lock-closed" size={32} color={colors.primary} />
                      </View>
                      <Text style={[paywallStyles.title, {color: colors.text}]}>Preview Ended</Text>
                      <Text style={paywallStyles.subtitle}>
                        Upgrade to watch the full trailer and unlock all content
                      </Text>
                      <TouchableOpacity
                        style={[paywallStyles.ctaBtn, {backgroundColor: colors.primary}]}
                        activeOpacity={0.85}
                        onPress={handleSubscriptionClick}>
                        <Ionicons name="diamond" size={18} color={colors.ctaText} />
                        <Text style={[paywallStyles.ctaText, {color: colors.ctaText}]}>
                          {strings.paywallCta}
                        </Text>
                      </TouchableOpacity>
                      <Text style={paywallStyles.hint}>
                        Free preview: {paywall.previewDuration}s
                      </Text>
                    </View>
                  </View>
                )}

                {/* Tier badge */}
                <View style={[styles.tierBadge, isPremium ? {backgroundColor: colors.primary + 'D9'} : styles.tierFree]}>
                  <Ionicons
                    name={isPremium ? 'diamond' : 'time-outline'}
                    size={12}
                    color={isPremium ? colors.ctaText : '#FFF'}
                  />
                  <Text style={styles.tierText}>
                    {isPremium ? 'Premium' : `Free (${paywall.previewDuration}s)`}
                  </Text>
                </View>
              </View>
            ) : (
              /* Trailers disabled for free users via Remote Config */
              <View style={[styles.trailerDisabled, {borderColor: colors.border}]}>
                <Ionicons name="lock-closed" size={40} color={colors.primary} />
                <Text style={styles.trailerDisabledText}>
                  Trailers are only available for Premium users
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {/* ─── Rent Options ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, {color: colors.text}]}>
            Rent this {type === 'tv' ? 'Series' : 'Movie'}
          </Text>
          <Text style={styles.rentHint}>Choose a rental duration</Text>
          <View style={styles.rentalRow}>
            {RENTAL_PLANS.map(plan => {
              const isSelected = selectedRental === plan.key;
              return (
                <TouchableOpacity
                  key={plan.key}
                  style={[styles.rentalCard, {borderColor: colors.border, backgroundColor: colors.surface}, isSelected && {borderColor: colors.primary, backgroundColor: colors.primary}]}
                  activeOpacity={0.8}
                  onPress={() => promptRent(plan)}>
                  <Ionicons
                    name="time-outline"
                    size={24}
                    color={isSelected ? colors.ctaText : colors.primary}
                  />
                  <Text style={[styles.rentalDuration, isSelected && {color: colors.ctaText}]}>
                    {plan.label}
                  </Text>
                  <Text style={[styles.rentalPrice, {color: colors.primary}, isSelected && {color: colors.ctaText}]}>
                    ${plan.price.toFixed(2)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ─── Add to Cart ─────────────────────────────────── */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.addToCartBtn, {backgroundColor: colors.primary}]}
            activeOpacity={0.85}
            onPress={handleAddToCart}>
            <Ionicons name="cart-outline" size={20} color={colors.ctaText} />
            <Text style={[styles.addToCartText, {color: colors.ctaText}]}>
              Add to Cart — ${BUY_PRICE.toFixed(2)}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ─── Toast ─────────────────────────────────────────── */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({...prev, visible: false}))}
      />

      {/* ─── Rent Confirmation Modal ───────────────────────── */}
      <Modal
        visible={confirmModal.visible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModal({visible: false, plan: null})}>
        <View style={modalStyles.overlay}>
          <View style={[modalStyles.card, {backgroundColor: colors.surface, borderColor: colors.border}]}>
            <View style={modalStyles.iconCircle}>
              <Ionicons name="time-outline" size={32} color={colors.primary} />
            </View>
            <Text style={[modalStyles.title, {color: colors.text}]}>Confirm Rental</Text>
            <Text style={modalStyles.subtitle}>
              Rent "{title}" for{' '}
              <Text style={{fontWeight: '700'}}>
                {confirmModal.plan?.label}
              </Text>
              ?
            </Text>
            <View style={modalStyles.priceRow}>
              <Text style={modalStyles.priceLabel}>Price</Text>
              <Text style={modalStyles.priceValue}>
                ${confirmModal.plan?.price.toFixed(2)}
              </Text>
            </View>
            <View style={modalStyles.priceRow}>
              <Text style={modalStyles.priceLabel}>Expires</Text>
              <Text style={modalStyles.priceValue}>
                {confirmModal.plan
                  ? new Date(
                      Date.now() + DURATIONS_MS[confirmModal.plan.key],
                    ).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : ''}
              </Text>
            </View>
            <View style={modalStyles.btnRow}>
              <TouchableOpacity
                style={modalStyles.cancelBtn}
                onPress={() => setConfirmModal({visible: false, plan: null})}>
                <Text style={modalStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[modalStyles.confirmBtn, {backgroundColor: colors.primary}]} onPress={confirmRent}>
                <Text style={[modalStyles.confirmText, {color: colors.ctaText}]}>Yes, Rent</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Paywall overlay styles (glassmorphism) ───────────────────────────
const paywallStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  glass: {
    width: '85%',
    backgroundColor: 'rgba(30, 30, 38, 0.85)',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    // iOS blur-like shadow
    shadowColor: '#7C4DFF',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 20,
  },
  lockCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(94, 53, 177, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#AAA',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFD700',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    shadowColor: '#FFD700',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0D0D0D',
  },
  hint: {
    fontSize: 11,
    color: '#666',
    marginTop: 12,
  },
});

// ─── Modal styles ────────────────────────────────────────────────────
const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#1A1A1E',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#252528',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#252528',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 8},
  subtitle: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#252528',
  },
  priceLabel: {fontSize: 15, color: '#888'},
  priceValue: {fontSize: 15, fontWeight: '700', color: '#FFF'},
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#333',
    alignItems: 'center',
  },
  cancelText: {fontSize: 15, fontWeight: '600', color: '#AAA'},
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#5E35B1',
    alignItems: 'center',
  },
  confirmText: {fontSize: 15, fontWeight: '700', color: '#FFF'},
});

// ─── Main styles ─────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0D0D0D'},

  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 22,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  header: {position: 'relative', width: '100%'},
  backdrop: {width: '100%', height: 240},
  headerOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 240,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  headerContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 55,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  poster: {width: 120, height: 180, borderRadius: 12, elevation: 6, backgroundColor: '#eee'},
  headerText: {flex: 1, marginLeft: 14},
  title: {color: '#fff', fontSize: 22, fontWeight: '800', marginBottom: 6},
  meta: {color: '#ddd', fontSize: 14, marginBottom: 8},
  overviewShort: {color: '#eee', fontSize: 13, lineHeight: 18},

  section: {paddingHorizontal: 16, paddingTop: 20},
  sectionTitle: {fontSize: 18, fontWeight: '700', color: '#FFF', marginBottom: 8},
  overviewFull: {color: '#AAA', lineHeight: 22, fontSize: 15},
  emptyText: {color: '#555', fontSize: 14, marginTop: 4},

  castCard: {width: 100, marginRight: 12, alignItems: 'center'},
  castImg: {width: 82, height: 110, borderRadius: 8, backgroundColor: '#222'},
  castName: {marginTop: 6, fontSize: 12, fontWeight: '700', color: '#FFF'},
  castRole: {fontSize: 11, color: '#666', marginTop: 2, textAlign: 'center'},

  // YouTube player container
  playerContainer: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#161618',
    elevation: 3,
    position: 'relative',
  },

  // Tier badge (top-right of player)
  tierBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    zIndex: 5,
  },
  tierPremium: {backgroundColor: 'rgba(94, 53, 177, 0.85)'},
  tierFree: {backgroundColor: 'rgba(0, 0, 0, 0.65)'},
  tierText: {fontSize: 11, fontWeight: '700', color: '#FFF'},

  // Trailers disabled state
  trailerDisabled: {
    height: PLAYER_HEIGHT,
    borderRadius: 14,
    backgroundColor: '#161618',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#252528',
  },
  trailerDisabledText: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  rentHint: {fontSize: 13, color: '#666', marginBottom: 12},
  rentalRow: {flexDirection: 'row', gap: 10},
  rentalCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#252528',
    backgroundColor: '#161618',
    gap: 8,
  },
  rentalCardSelected: {borderColor: '#5E35B1', backgroundColor: '#5E35B1'},
  rentalDuration: {fontSize: 13, fontWeight: '700', color: '#CCC'},
  rentalPrice: {fontSize: 17, fontWeight: '800', color: '#5E35B1'},
  rentalTextSelected: {color: '#FFF'},

  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#5E35B1',
    paddingVertical: 16,
    borderRadius: 14,
    elevation: 3,
  },
  addToCartText: {color: '#FFF', fontSize: 17, fontWeight: '700'},
});
