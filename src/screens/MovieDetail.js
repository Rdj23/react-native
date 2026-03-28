/**
 * MovieDetail — full detail view for a movie or TV show.
 *
 * ─── LAYOUT (top to bottom) ──────────────────────────────────────────────────
 *  1. Backdrop + poster header with title and meta (type, release date, overview)
 *  2. Full overview text section
 *  3. Cast horizontal scroll — fetched from TMDB /credits endpoint
 *  4. Trailer thumbnail — YouTube thumbnail image + tap to open YouTube app
 *  5. Rent options — 7 Days ($2.99) / 1 Month ($5.99) / 3 Months ($12.99)
 *       • Tapping a plan opens a confirmation modal showing price + expiry date
 *       • On confirm: fires 'Movie Rented' event + updates user profile
 *  6. Add to Cart button — adds item at BUY_PRICE ($14.99) to MovieCartContext
 *       • Fires 'Add to Cart' event with nested MovieDetails object
 *       • Navigates to CartScreen 800 ms after adding
 *
 * ─── DATA FETCHING ───────────────────────────────────────────────────────────
 *  fetchCredits(type, id)   → TMDB cast list; populates horizontal cast scroll
 *  fetchTrailerKey(type, id)→ TMDB video list; picks first YouTube trailer key
 *  Both use AbortController so inflight requests are cancelled on unmount/re-nav.
 *
 * ─── CLEVERTAP EVENTS FIRED HERE (Dashboard 1) ───────────────────────────────
 *  'Content Viewed'   → on mount (when the screen first loads)
 *                       props: Title, Type, ID, Release Date
 *  'Trailer Viewed'   → once when trailerKey resolves (fires only once per visit)
 *                       props: Title, Type, ID, Trailer Link (YouTube URL)
 *  'Movie Rented'     → after user confirms a rental plan
 *                       props: Title, Type, ID, Rental Plan, Duration, Price,
 *                              Rented At ($D_ epoch), Expiry Date ($D_ epoch)
 *  'Add to Cart'      → when user taps the cart button
 *                       props: Title, Type, ID, Price, nested MovieDetails object
 *
 * ─── PROFILE UPDATES (Dashboard 1) ──────────────────────────────────────────
 *  After a confirmed rental, CleverTap.profileSet() writes the rental details
 *  to the user's profile so they persist across sessions:
 *    Last Rented Title / Type / Plan / Price / Rental Date / Expiry
 *
 * ─── RENTAL PLAN CONSTANTS ───────────────────────────────────────────────────
 *  RENTAL_PLANS  — array of { key, label, price } for the 3 plan cards
 *  DURATIONS_MS  — maps each plan key to its duration in milliseconds
 *                  used to calculate the expiry epoch passed to profileSet()
 *  BUY_PRICE     — fixed price ($14.99) used for Add to Cart
 */
import React, {useEffect, useState, useRef} from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Modal,
  Animated,
  StatusBar,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import CleverTap from 'clevertap-react-native';
import {POSTER, PROFILE as PROFILE_IMG, fetchCredits, fetchTrailerKey} from '../services/tmdb';
import {useMovieCart} from '../context/MovieCartContext';

const {width} = Dimensions.get('window');

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
  const insets = useSafeAreaInsets();

  const [cast, setCast] = useState([]);
  const [trailerKey, setTrailerKey] = useState(null);
  const [loadingCast, setLoadingCast] = useState(true);
  const [selectedRental, setSelectedRental] = useState(null);
  const [trailerEventFired, setTrailerEventFired] = useState(false);

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

    // Record the rental event with epoch timestamps
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

    // Update user profile with rental info so it persists on the user record
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

  const openYoutube = key => {
    const url = `https://www.youtube.com/watch?v=${key}`;
    Linking.canOpenURL(url).then(ok => ok && Linking.openURL(url));
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

  return (
    <View style={{flex: 1, backgroundColor: '#0D0D0D'}}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: insets.bottom + 24}}>
        {/* ─── Back button ─────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.backBtn, {top: insets.top + 12}]}
          onPress={() => navigation.canGoBack() && navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#FFF" />
        </TouchableOpacity>

        {/* ─── Header ──────────────────────────────────────── */}
        <View style={styles.header}>
          <Image source={{uri: backdrop || image}} style={styles.backdrop} />
          <View style={styles.headerOverlay} />
          <View style={styles.headerContent}>
            <Image source={{uri: image}} style={styles.poster} />
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
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
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.overviewFull}>
            {overview || 'No overview available.'}
          </Text>
        </View>

        {/* ─── Cast ────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cast</Text>
          {loadingCast ? (
            <ActivityIndicator style={{marginTop: 8}} />
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

        {/* ─── Trailer ─────────────────────────────────────── */}
        {trailerKey ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trailer</Text>
            <TouchableOpacity
              style={styles.trailerWrap}
              activeOpacity={0.9}
              onPress={() => openYoutube(trailerKey)}>
              <Image
                source={{uri: `https://img.youtube.com/vi/${trailerKey}/hqdefault.jpg`}}
                style={styles.trailerThumb}
                resizeMode="cover"
              />
              <View style={styles.trailerOverlay}>
                <View style={styles.playCircle}>
                  <Ionicons name="play" size={32} color="#FFF" style={{marginLeft: 3}} />
                </View>
              </View>
              <View style={styles.youtubeBtn}>
                <Ionicons name="logo-youtube" size={20} color="#FF0000" />
                <Text style={styles.youtubeBtnText}>Watch on YouTube</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ─── Rent Options ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Rent this {type === 'tv' ? 'Series' : 'Movie'}
          </Text>
          <Text style={styles.rentHint}>Choose a rental duration</Text>
          <View style={styles.rentalRow}>
            {RENTAL_PLANS.map(plan => {
              const isSelected = selectedRental === plan.key;
              return (
                <TouchableOpacity
                  key={plan.key}
                  style={[styles.rentalCard, isSelected && styles.rentalCardSelected]}
                  activeOpacity={0.8}
                  onPress={() => promptRent(plan)}>
                  <Ionicons
                    name="time-outline"
                    size={24}
                    color={isSelected ? '#FFF' : '#5E35B1'}
                  />
                  <Text style={[styles.rentalDuration, isSelected && styles.rentalTextSelected]}>
                    {plan.label}
                  </Text>
                  <Text style={[styles.rentalPrice, isSelected && styles.rentalTextSelected]}>
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
            style={styles.addToCartBtn}
            activeOpacity={0.85}
            onPress={handleAddToCart}>
            <Ionicons name="cart-outline" size={20} color="#FFF" />
            <Text style={styles.addToCartText}>
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
          <View style={modalStyles.card}>
            <View style={modalStyles.iconCircle}>
              <Ionicons name="time-outline" size={32} color="#5E35B1" />
            </View>
            <Text style={modalStyles.title}>Confirm Rental</Text>
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
              <TouchableOpacity style={modalStyles.confirmBtn} onPress={confirmRent}>
                <Text style={modalStyles.confirmText}>Yes, Rent</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

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

  trailerWrap: {borderRadius: 14, overflow: 'hidden', backgroundColor: '#161618', elevation: 3},
  trailerThumb: {width: '100%', height: 210, backgroundColor: '#222'},
  trailerOverlay: {
    ...StyleSheet.absoluteFillObject,
    height: 210,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  playCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  youtubeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#1A1A1A',
  },
  youtubeBtnText: {color: '#fff', fontWeight: '600', fontSize: 14},

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
