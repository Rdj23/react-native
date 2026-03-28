/**
 * CartScreen — displays movies/series added to cart with a Buy button.
 *
 * ─── LAYOUT ──────────────────────────────────────────────────────────────────
 *  1. Cart items list — poster + title + type + price + trash icon (remove)
 *  2. Order summary card — line items + divider + bold total
 *  3. "Buy Now" button — triggers the Charged event then shows success modal
 *  4. "You May Also Like" horizontal scroll — trending content of the same type
 *     as the first cart item (movie → trending movies, tv → trending TV series);
 *     items already in the cart are filtered out
 *
 *  Empty state: shows a friendly illustration + "Browse Content" CTA that
 *  navigates back to HomeMain.
 *
 * ─── CLEVERTAP EVENTS FIRED HERE (Dashboard 1) ───────────────────────────────
 *  'Removed from Cart'  → when user taps trash on an item
 *                         props: Title, Type, ID, Price
 *  'Content Viewed'     → when user taps a "You May Also Like" card
 *                         props: Title, Type, ID, Source: 'Cart Similar'
 *  recordChargedEvent() → on "Buy Now" tap; CleverTap's reserved purchase event
 *                         charge details: Amount, Payment Mode, Charged ID,
 *                         Items Count, nested CartSummary object
 *                         items array: one entry per cart item with
 *                         Title, Type, ID, Price, Release Date
 *
 * ─── CART STATE ──────────────────────────────────────────────────────────────
 *  All cart state lives in MovieCartContext (src/context/MovieCartContext.js).
 *  CartScreen reads: cartItems, removeFromCart, clearCart, totalAmount, cartCount
 *
 * ─── MODALS ──────────────────────────────────────────────────────────────────
 *  successModal  → shown after a successful purchase; "Continue Browsing" clears
 *                  the cart and navigates back to HomeMain
 *  clearModal    → confirmation before wiping the entire cart
 */
import React, {useEffect, useState, useCallback} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Modal,
  Animated,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import CleverTap from 'clevertap-react-native';
import {useMovieCart} from '../context/MovieCartContext';
import {useTheme} from '../context/ThemeContext';
import {fetchTrendingMovies, fetchTrendingTV, POSTER, BACKDROP} from '../services/tmdb';

const {width} = Dimensions.get('window');
const SIMILAR_CARD_W = (width - 48) / 2.8;
const SIMILAR_POSTER_H = Math.round(SIMILAR_CARD_W * 1.5);

export default function CartScreen({navigation}) {
  const insets = useSafeAreaInsets();
  const {colors, strings} = useTheme();
  const {cartItems, removeFromCart, clearCart, totalAmount, cartCount} =
    useMovieCart();
  const [similar, setSimilar] = useState([]);
  const [loadingSimilar, setLoadingSimilar] = useState(false);

  // Custom modal states
  const [successModal, setSuccessModal] = useState({visible: false, count: 0, amount: 0});
  const [clearModal, setClearModal] = useState(false);

  // ─── Fetch similar content based on cart items ─────────────────
  useEffect(() => {
    if (cartItems.length === 0) {
      setSimilar([]);
      return;
    }

    const ctrl = new AbortController();
    setLoadingSimilar(true);

    // Fetch trending of the same type as the first cart item
    const primaryType = cartItems[0]?.type || 'movie';
    const fetcher =
      primaryType === 'tv' ? fetchTrendingTV : fetchTrendingMovies;

    fetcher(ctrl.signal)
      .then(results => {
        // Filter out items already in cart
        const cartIds = new Set(cartItems.map(i => i.id));
        const filtered = results.filter(r => !cartIds.has(r.id)).slice(0, 10);
        setSimilar(filtered);
      })
      .catch(e => {
        if (e.name !== 'AbortError') console.warn('Similar fetch error:', e);
      })
      .finally(() => setLoadingSimilar(false));

    return () => ctrl.abort();
  }, [cartItems]);

  // ─── Buy handler → Charged event with nested objects ───────────
  const handleBuyNow = () => {
    if (cartItems.length === 0) return;

    // Build nested items array for CleverTap Charged event
    const chargedItems = cartItems.map(item => ({
      Title: item.title,
      Type: item.type,
      ID: item.id,
      Price: item.price,
      'Release Date': item.releaseDate || '',
    }));

    // Charged event with nested cart details
    CleverTap.recordChargedEvent(
      {
        Amount: totalAmount,
        'Payment Mode': 'In-App',
        'Charged ID': Date.now().toString(),
        'Items Count': cartItems.length,
        CartSummary: {
          TotalItems: cartItems.length,
          TotalAmount: totalAmount,
          PurchasedAt: new Date().toISOString(),
        },
      },
      chargedItems,
    );

    setSuccessModal({visible: true, count: cartItems.length, amount: totalAmount});
  };

  // ─── Open similar item detail ──────────────────────────────────
  const openSimilar = useCallback(
    item => {
      const itemTitle = item.title || item.name || '';
      const itemType = item.media_type || (item.first_air_date ? 'tv' : 'movie');

      CleverTap.recordEvent('Content Viewed', {
        Title: itemTitle,
        Type: itemType,
        ID: item.id,
        Source: 'Cart Similar',
      });

      navigation.navigate('MovieDetail', {
        id: item.id,
        title: itemTitle,
        image: POSTER(item.poster_path, 'w780'),
        release_date: item.release_date || item.first_air_date || '',
        overview: item.overview || '',
        type: itemType,
        backdrop: BACKDROP(item.backdrop_path),
      });
    },
    [navigation],
  );

  // ─── Render cart item ──────────────────────────────────────────
  const renderCartItem = ({item, index}) => (
    <View style={[styles.cartItem, {backgroundColor: colors.surface, borderColor: colors.border}]}>
      <Image source={{uri: item.posterPath}} style={styles.cartPoster} />
      <View style={styles.cartInfo}>
        <Text style={[styles.cartTitle, {color: colors.text}]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.cartType}>
          {(item.type || '').toUpperCase()}
          {item.releaseDate ? ` \u2022 ${item.releaseDate.slice(0, 4)}` : ''}
        </Text>
        <Text style={[styles.cartPrice, {color: colors.primary}]}>${item.price.toFixed(2)}</Text>
      </View>
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => {
          CleverTap.recordEvent('Removed from Cart', {
            Title: item.title,
            Type: item.type,
            ID: item.id,
            Price: item.price,
          });
          removeFromCart(index);
        }}>
        <Ionicons name="trash-outline" size={20} color="#E57373" />
      </TouchableOpacity>
    </View>
  );

  // ─── Render similar card ───────────────────────────────────────
  const renderSimilarCard = ({item}) => {
    const itemTitle = item.title || item.name || '';
    const year = (item.release_date || item.first_air_date || '').slice(0, 4);
    const rating = item.vote_average ? item.vote_average.toFixed(1) : '';

    return (
      <TouchableOpacity
        style={styles.similarCard}
        activeOpacity={0.85}
        onPress={() => openSimilar(item)}>
        <Image
          source={{uri: POSTER(item.poster_path)}}
          style={styles.similarPoster}
          resizeMode="cover"
        />
        {rating ? (
          <View style={styles.ratingBadge}>
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        ) : null}
        <Text style={styles.similarTitle} numberOfLines={1}>
          {itemTitle}
        </Text>
        <Text style={styles.similarMeta}>{year}</Text>
      </TouchableOpacity>
    );
  };

  // ─── Empty state ───────────────────────────────────────────────
  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={[styles.headerBar, {paddingTop: insets.top + 12, backgroundColor: colors.header, borderBottomColor: colors.border}]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, {color: colors.text}]}>{strings.cartTitle}</Text>
          <View style={{width: 24}} />
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color={colors.border} />
          <Text style={[styles.emptyTitle, {color: colors.text}]}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>
            Browse movies and series to add them here
          </Text>
          <TouchableOpacity
            style={[styles.browseBtn, {backgroundColor: colors.primary}]}
            onPress={() => navigation.navigate('HomeMain')}>
            <Text style={[styles.browseBtnText, {color: colors.ctaText}]}>{strings.browseCta}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, {backgroundColor: colors.background}]}>
      <StatusBar barStyle="light-content" backgroundColor={colors.header} />
      {/* ─── Header ──────────────────────────────────────── */}
      <View style={[styles.headerBar, {paddingTop: insets.top + 12, backgroundColor: colors.header, borderBottomColor: colors.border}]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, {color: colors.text}]}>
          {strings.cartTitle} ({cartCount})
        </Text>
        <TouchableOpacity onPress={() => setClearModal(true)}>
          <Ionicons name="trash-outline" size={22} color="#E57373" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={cartItems}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderCartItem}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <>
            {/* ─── Order Summary ───────────────────────── */}
            <View style={[styles.summaryCard, {backgroundColor: colors.surface, borderColor: colors.border}]}>
              <Text style={[styles.summaryTitle, {color: colors.text}]}>Order Summary</Text>
              {cartItems.map((item, i) => (
                <View key={`summary-${i}`} style={styles.summaryRow}>
                  <Text style={styles.summaryLabel} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.summaryValue}>
                    ${item.price.toFixed(2)}
                  </Text>
                </View>
              ))}
              <View style={styles.summaryDivider} />
              <View style={[styles.summaryRow]}>
                <Text style={[styles.summaryTotal, {color: colors.text}]}>Total</Text>
                <Text style={[styles.summaryTotalValue, {color: colors.primary}]}>
                  ${totalAmount.toFixed(2)}
                </Text>
              </View>
            </View>

            {/* ─── Buy Now ─────────────────────────────── */}
            <TouchableOpacity
              style={[styles.buyBtn, {backgroundColor: colors.primary}]}
              activeOpacity={0.85}
              onPress={handleBuyNow}>
              <Ionicons name="bag-check-outline" size={20} color={colors.ctaText} />
              <Text style={[styles.buyBtnText, {color: colors.ctaText}]}>
                {strings.buyCta} — ${totalAmount.toFixed(2)}
              </Text>
            </TouchableOpacity>

            {/* ─── Similar Content ─────────────────────── */}
            {loadingSimilar ? (
              <ActivityIndicator style={{marginTop: 24}} />
            ) : similar.length > 0 ? (
              <View style={styles.similarSection}>
                <Text style={styles.similarSectionTitle}>You May Also Like</Text>
                <FlatList
                  data={similar}
                  keyExtractor={i => `similar-${i.id}`}
                  renderItem={renderSimilarCard}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{paddingLeft: 20, paddingRight: 8}}
                />
              </View>
            ) : null}
          </>
        }
      />

      {/* ─── Purchase Success Modal ────────────────────── */}
      <Modal visible={successModal.visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, {backgroundColor: colors.surface, borderColor: colors.border}]}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="checkmark-circle" size={40} color={colors.primary} />
            </View>
            <Text style={[styles.modalTitle, {color: colors.text}]}>Purchase Complete</Text>
            <Text style={styles.modalSub}>
              You bought {successModal.count} item{successModal.count > 1 ? 's' : ''} for ${successModal.amount.toFixed(2)}
            </Text>
            <TouchableOpacity
              style={[styles.modalBtn, {backgroundColor: colors.primary}]}
              onPress={() => {
                setSuccessModal({visible: false, count: 0, amount: 0});
                clearCart();
                navigation.navigate('HomeMain');
              }}>
              <Text style={[styles.modalBtnText, {color: colors.ctaText}]}>Continue Browsing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Clear Cart Confirmation Modal ─────────────── */}
      <Modal visible={clearModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconCircle, {backgroundColor: '#2A1515'}]}>
              <Ionicons name="trash-outline" size={32} color="#EF5350" />
            </View>
            <Text style={styles.modalTitle}>Clear Cart?</Text>
            <Text style={styles.modalSub}>This will remove all items from your cart.</Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setClearModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, {backgroundColor: '#EF5350', flex: 1}]}
                onPress={() => { setClearModal(false); clearCart(); }}>
                <Text style={styles.modalBtnText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0D0D0D'},

  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#111114', borderBottomWidth: 1, borderBottomColor: '#1E1E22',
  },
  headerTitle: {fontSize: 18, fontWeight: '700', color: '#FFF'},

  listContent: {paddingBottom: 24},

  cartItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#161618', marginHorizontal: 16, marginTop: 12,
    borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#1E1E22',
  },
  cartPoster: {width: 65, height: 95, borderRadius: 10, backgroundColor: '#222'},
  cartInfo: {flex: 1, marginLeft: 14},
  cartTitle: {fontSize: 15, fontWeight: '700', color: '#FFF'},
  cartType: {fontSize: 12, color: '#666', marginTop: 4},
  cartPrice: {fontSize: 16, fontWeight: '800', color: '#5E35B1', marginTop: 6},
  removeBtn: {padding: 10},

  summaryCard: {
    backgroundColor: '#161618', marginHorizontal: 16, marginTop: 20,
    borderRadius: 14, padding: 20, borderWidth: 1, borderColor: '#1E1E22',
  },
  summaryTitle: {fontSize: 17, fontWeight: '700', color: '#FFF', marginBottom: 14},
  summaryRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8},
  summaryLabel: {flex: 1, fontSize: 14, color: '#888', marginRight: 12},
  summaryValue: {fontSize: 14, color: '#CCC', fontWeight: '600'},
  summaryDivider: {height: 1, backgroundColor: '#1E1E22', marginVertical: 10},
  summaryTotal: {fontSize: 16, fontWeight: '800', color: '#FFF'},
  summaryTotalValue: {fontSize: 18, fontWeight: '800', color: '#5E35B1'},

  buyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#5E35B1', marginHorizontal: 16, marginTop: 16,
    paddingVertical: 16, borderRadius: 14,
  },
  buyBtnText: {color: '#FFF', fontSize: 17, fontWeight: '700'},

  similarSection: {marginTop: 28},
  similarSectionTitle: {fontSize: 18, fontWeight: '700', color: '#FFF', paddingHorizontal: 20, marginBottom: 14},
  similarCard: {
    width: SIMILAR_CARD_W, marginRight: 14, borderRadius: 12,
    backgroundColor: '#161618', overflow: 'hidden',
  },
  similarPoster: {width: SIMILAR_CARD_W, height: SIMILAR_POSTER_H, backgroundColor: '#222'},
  ratingBadge: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8,
  },
  ratingText: {color: '#FFD700', fontSize: 11, fontWeight: '700'},
  similarTitle: {marginTop: 8, marginHorizontal: 8, fontSize: 13, fontWeight: '600', color: '#FFF'},
  similarMeta: {marginTop: 2, marginBottom: 8, marginHorizontal: 8, fontSize: 12, color: '#555'},

  emptyContainer: {flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40},
  emptyTitle: {fontSize: 20, fontWeight: '700', color: '#FFF', marginTop: 16},
  emptySubtitle: {
    fontSize: 14, color: '#666', textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  browseBtn: {
    marginTop: 24,
    backgroundColor: '#5E35B1',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  browseBtnText: {color: '#FFF', fontSize: 15, fontWeight: '600'},

  // Modals
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalCard: {
    width: '100%', backgroundColor: '#1A1A1E', borderRadius: 20,
    padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#252528',
  },
  modalIconCircle: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#1E1028',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  modalTitle: {fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 8},
  modalSub: {fontSize: 15, color: '#999', textAlign: 'center', lineHeight: 22, marginBottom: 24},
  modalBtn: {
    backgroundColor: '#5E35B1', paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', width: '100%',
  },
  modalBtnText: {color: '#FFF', fontSize: 15, fontWeight: '700'},
  modalBtnRow: {flexDirection: 'row', gap: 12, width: '100%'},
  modalCancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#333', alignItems: 'center',
  },
  modalCancelText: {color: '#AAA', fontSize: 15, fontWeight: '600'},
});
