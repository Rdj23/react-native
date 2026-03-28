/**
 * HomeScreen — OTT-style home with immersive hero, search, trending content.
 *
 * ─── LAYOUT ──────────────────────────────────────────────────────────────────
 *  1. Immersive Hero section (full-width backdrop of the #1 trending movie)
 *       • "Watch Now" and "More Info" CTAs both navigate to MovieDetail
 *       • Top bar: hamburger (opens drawer), greeting, InboxIcon (badge + tap)
 *  2. Search bar with live debounced search via TMDB API (400 ms debounce)
 *       • Results dropdown shows up to 6 items; dismissed on clear / result tap
 *  3. Filter chips (All / Movies / TV Series) to toggle which sections appear
 *  4. Trending Movies horizontal scroll (from TMDB /trending/movie/week)
 *  5. Trending TV Series horizontal scroll (from TMDB /trending/tv/week)
 *  6. Test button at the bottom for the secondary CleverTap instance
 *
 * ─── CLEVERTAP EVENTS FIRED HERE (Dashboard 1) ───────────────────────────────
 *  'HomeScreen Launched'   → on mount; signals home visit in analytics
 *  'Trending Loaded'       → after TMDB fetch succeeds; includes movie/TV counts
 *  'Content Viewed'        → when user taps any card or search result;
 *                            carries Title, Type (movie/tv), and TMDB ID
 *
 * ─── SECONDARY INSTANCE USAGE ────────────────────────────────────────────────
 *  CleverTapSecondary.recordEvent('test instance') is wired to the "Test
 *  Secondary Instance" button at the bottom. This validates that Dashboard 2
 *  (secondary account) is receiving events correctly before building PE on it.
 */
import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  Platform,
  StatusBar,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import CleverTap from 'clevertap-react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import InboxIcon from '../../components/InboxIcon';
import CleverTapSecondary from '../../services/CleverTapSecondary';
import {useTheme} from '../../context/ThemeContext';
import {
  fetchTrendingMovies,
  fetchTrendingTV,
  searchMulti,
  POSTER,
  BACKDROP,
} from '../../services/tmdb';

const {width, height: SCREEN_H} = Dimensions.get('window');
const HERO_H = SCREEN_H * 0.62;
const CARD_W = width * 0.33;
const POSTER_H = Math.round(CARD_W * 1.5);

const FILTERS = [
  {key: 'all', label: 'All'},
  {key: 'movie', label: 'Movies'},
  {key: 'tv', label: 'TV Series'},
];

const DEBOUNCE_MS = 400;

export default function HomeScreen({navigation}) {
  const insets = useSafeAreaInsets();
  const {colors, strings} = useTheme();
  const [user, setUser] = useState(null);
  const [filter, setFilter] = useState('all');

  const [movies, setMovies] = useState([]);
  const [tvShows, setTvShows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);
  const searchAbortRef = useRef(null);

  const bottomPad = insets.bottom + 16;

  useEffect(() => { CleverTap.recordEvent('HomeScreen Launched'); }, []);
  useEffect(() => { setUser(auth().currentUser); }, []);

  // ─── TMDB Trending ────────────────────────────────────────────────
  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    Promise.all([fetchTrendingMovies(ctrl.signal), fetchTrendingTV(ctrl.signal)])
      .then(([m, tv]) => {
        setMovies(m);
        setTvShows(tv);
        CleverTap.recordEvent('Trending Loaded', {movieCount: m.length, tvCount: tv.length});
      })
      .catch(e => { if (e.name !== 'AbortError') console.warn('TMDB error:', e); })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  // ─── Search ───────────────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    debounceRef.current = setTimeout(() => {
      if (searchAbortRef.current) searchAbortRef.current.abort();
      const ctrl = new AbortController();
      searchAbortRef.current = ctrl;
      searchMulti(trimmed, ctrl.signal)
        .then(r => { setSearchResults(r); setSearching(false); })
        .catch(e => { if (e.name !== 'AbortError') { setSearchResults([]); setSearching(false); } });
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // ─── Navigation ───────────────────────────────────────────────────
  const openDetail = useCallback(item => {
    const t = item.title || item.name || '';
    const tp = item.media_type || (item.first_air_date ? 'tv' : 'movie');
    CleverTap.recordEvent('Content Viewed', {Title: t, Type: tp, ID: item.id});
    setQuery(''); setSearchResults([]);
    navigation.navigate('MovieDetail', {
      id: item.id, title: t,
      image: POSTER(item.poster_path, 'w780'),
      release_date: item.release_date || item.first_air_date || '',
      overview: item.overview || '', type: tp,
      backdrop: BACKDROP(item.backdrop_path),
    });
  }, [navigation]);

  // ─── Renders ──────────────────────────────────────────────────────
  const renderSearchResult = ({item}) => {
    const t = item.title || item.name || '';
    const yr = (item.release_date || item.first_air_date || '').slice(0, 4);
    const tp = (item.media_type || '').toUpperCase();
    return (
      <TouchableOpacity style={st.searchRow} onPress={() => openDetail(item)}>
        <Image source={{uri: POSTER(item.poster_path, 'w92')}} style={st.searchPoster} />
        <View style={{flex: 1}}>
          <Text style={st.searchItemTitle} numberOfLines={1}>{t}</Text>
          <Text style={st.searchItemMeta}>{tp}{yr ? ` \u2022 ${yr}` : ''}{item.vote_average ? ` \u2022 ${item.vote_average.toFixed(1)}` : ''}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color="#444" />
      </TouchableOpacity>
    );
  };

  const renderCard = ({item}) => {
    const t = item.title || item.name || '';
    const yr = (item.release_date || item.first_air_date || '').slice(0, 4);
    const r = item.vote_average ? item.vote_average.toFixed(1) : '';
    return (
      <TouchableOpacity style={st.card} activeOpacity={0.9} onPress={() => openDetail(item)}>
        <Image source={{uri: POSTER(item.poster_path)}} style={st.cardPoster} resizeMode="cover" />
        {r ? <View style={st.ratingBadge}><Text style={st.ratingText}>{r}</Text></View> : null}
        <View style={st.cardInfo}>
          <Text style={st.cardTitle} numberOfLines={1}>{t}</Text>
          <Text style={st.cardYear}>{yr}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const showMovies = filter === 'all' || filter === 'movie';
  const showTV = filter === 'all' || filter === 'tv';
  const isSearchActive = query.trim().length >= 2;
  const greeting = user?.displayName ? `Hey, ${user.displayName}` : strings.greeting;

  const featured = movies[0];
  const heroImg = featured ? BACKDROP(featured.backdrop_path) : null;
  const heroTitle = featured ? (featured.title || featured.name) : '';
  const heroSub = featured?.overview || '';

  return (
    <View style={[st.root, {backgroundColor: colors.background}]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        contentContainerStyle={{paddingBottom: bottomPad}}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ═══════════ HERO ═══════════ */}
        <View style={st.hero}>
          {heroImg ? (
            <Image source={{uri: heroImg}} style={st.heroImg} resizeMode="cover" />
          ) : (
            <Image source={require('../../assets/Banner_main.jpeg')} style={st.heroImg} resizeMode="cover" />
          )}

          {/* Smooth 5-layer gradient for seamless blend */}
          <View style={[st.gradLayer, {top: 0, height: '20%', backgroundColor: colors.background + '0D'}]} />
          <View style={[st.gradLayer, {top: '20%', height: '20%', backgroundColor: colors.background + '26'}]} />
          <View style={[st.gradLayer, {top: '40%', height: '20%', backgroundColor: colors.background + '66'}]} />
          <View style={[st.gradLayer, {top: '60%', height: '20%', backgroundColor: colors.background + 'BF'}]} />
          <View style={[st.gradLayer, {top: '80%', height: '20%', backgroundColor: colors.background + 'F2'}]} />

          {/* Top bar */}
          <View style={[st.topBar, {paddingTop: insets.top + 6}]}>
            <TouchableOpacity style={st.topIcon} onPress={() => navigation.getParent()?.openDrawer()}>
              <Ionicons name="menu" size={22} color={colors.text} />
            </TouchableOpacity>
            <Text style={[st.greeting, {color: colors.text}]} numberOfLines={1}>{greeting}</Text>
            <InboxIcon style={st.topIcon} />
          </View>

          {/* Hero content — overlaid on the image */}
          <View style={st.heroContent}>
            {heroTitle ? (
              <>
                <Text style={[st.heroTag, {color: colors.accent}]}>{strings.heroTag}</Text>
                <Text style={[st.heroTitle, {color: colors.text}]} numberOfLines={1}>{heroTitle}</Text>
                <Text style={st.heroSub} numberOfLines={2}>{heroSub}</Text>
              </>
            ) : null}
            <View style={st.heroBtns}>
              <TouchableOpacity style={[st.watchBtn, {backgroundColor: colors.primary}]} activeOpacity={0.85} onPress={() => featured && openDetail(featured)}>
                <Ionicons name="play" size={16} color={colors.ctaText} />
                <Text style={[st.watchBtnText, {color: colors.ctaText}]}>{strings.watchCta}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.infoBtn} activeOpacity={0.85} onPress={() => featured && openDetail(featured)}>
                <Ionicons name="information-circle-outline" size={18} color="#FFF" />
                <Text style={st.infoBtnText}>More Info</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ═══════════ CONTENT ═══════════ */}

        {/* Search */}
        <View style={st.searchWrap}>
          <View style={st.searchBar}>
            <Ionicons name="search-outline" size={18} color="#555" />
            <TextInput
              style={[st.searchInput, {color: colors.text}]}
              value={query}
              onChangeText={setQuery}
              placeholder="Search movies, TV series..."
              placeholderTextColor="#444"
              returnKeyType="search"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => { setQuery(''); setSearchResults([]); }}>
                <Ionicons name="close-circle" size={18} color="#444" />
              </TouchableOpacity>
            )}
          </View>
          {isSearchActive && (
            <View style={[st.searchDrop, {backgroundColor: colors.surface}]}>
              {searching ? (
                <ActivityIndicator style={{padding: 16}} color={colors.primary} />
              ) : searchResults.length > 0 ? (
                <FlatList
                  data={searchResults.slice(0, 6)}
                  keyExtractor={i => `s-${i.id}`}
                  renderItem={renderSearchResult}
                  keyboardShouldPersistTaps="handled"
                  scrollEnabled={false}
                />
              ) : (
                <Text style={st.noRes}>No results found</Text>
              )}
            </View>
          )}
        </View>

        {/* Filter chips */}
        <View style={st.chipRow}>
          {FILTERS.map(f => (
            <TouchableOpacity
              key={f.key}
              style={[st.chip, filter === f.key && {backgroundColor: colors.primary, borderColor: colors.primary}]}
              onPress={() => setFilter(f.key)}>
              <Text style={[st.chipText, filter === f.key && st.chipTextOn]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Trending */}
        {loading ? (
          <ActivityIndicator style={{marginTop: 40}} size="large" color={colors.primary} />
        ) : (
          <>
            {showMovies && movies.length > 0 && (
              <View style={st.section}>
                <Text style={[st.sectionTitle, {color: colors.text}]}>{strings.trendingMovies}</Text>
                <FlatList data={movies} keyExtractor={i => `m-${i.id}`} renderItem={renderCard} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.hList} />
              </View>
            )}
            {showTV && tvShows.length > 0 && (
              <View style={st.section}>
                <Text style={[st.sectionTitle, {color: colors.text}]}>{strings.trendingTv}</Text>
                <FlatList data={tvShows} keyExtractor={i => `t-${i.id}`} renderItem={renderCard} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.hList} />
              </View>
            )}
          </>
        )}

        {/* Test button */}
        <TouchableOpacity style={st.testBtn} activeOpacity={0.7} onPress={() => CleverTapSecondary.recordEvent('test instance')}>
          <Text style={st.testBtnText}>Test Secondary Instance</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#0D0D0D'},

  // ── Hero ──────────────────────────────────────────────
  hero: {width, height: HERO_H},
  heroImg: {width, height: HERO_H, position: 'absolute'},
  gradLayer: {position: 'absolute', left: 0, right: 0},

  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, zIndex: 5,
  },
  topIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  greeting: {
    flex: 1, textAlign: 'center',
    fontSize: 17, fontWeight: '700', color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 0, height: 1}, textShadowRadius: 4,
  },

  heroContent: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingBottom: 16,
  },
  heroTag: {
    fontSize: 11, fontWeight: '800', color: '#B39DDB',
    letterSpacing: 2, marginBottom: 6,
  },
  heroTitle: {
    fontSize: 28, fontWeight: '900', color: '#FFF',
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: {width: 0, height: 2}, textShadowRadius: 8,
  },
  heroSub: {
    fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 19, marginBottom: 16,
  },
  heroBtns: {flexDirection: 'row', gap: 12},
  watchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: '#5E35B1',
    paddingHorizontal: 22, paddingVertical: 11, borderRadius: 24,
  },
  watchBtnText: {color: '#FFF', fontSize: 14, fontWeight: '700'},
  infoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 18, paddingVertical: 11, borderRadius: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  infoBtnText: {color: '#FFF', fontSize: 14, fontWeight: '600'},

  // ── Search ────────────────────────────────────────────
  searchWrap: {marginHorizontal: 16, marginTop: 18, zIndex: 10},
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 4,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  searchInput: {flex: 1, fontSize: 14, color: '#FFF'},
  searchDrop: {
    backgroundColor: '#161618', borderRadius: 12, marginTop: 4,
    overflow: 'hidden', borderWidth: 1, borderColor: '#222',
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#1C1C1F', gap: 10,
  },
  searchPoster: {width: 36, height: 52, borderRadius: 5, backgroundColor: '#222'},
  searchItemTitle: {fontSize: 13, fontWeight: '600', color: '#EEE'},
  searchItemMeta: {fontSize: 11, color: '#666', marginTop: 2},
  noRes: {padding: 18, textAlign: 'center', color: '#444', fontSize: 13},

  // ── Chips ─────────────────────────────────────────────
  chipRow: {flexDirection: 'row', paddingHorizontal: 16, marginTop: 18, gap: 8},
  chip: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'transparent',
  },
  chipOn: {backgroundColor: '#5E35B1', borderColor: '#5E35B1'},
  chipText: {fontSize: 13, fontWeight: '600', color: '#777'},
  chipTextOn: {color: '#FFF'},

  // ── Sections ──────────────────────────────────────────
  section: {marginTop: 26},
  sectionTitle: {
    fontSize: 17, fontWeight: '700', color: '#FFF',
    paddingHorizontal: 16, marginBottom: 12,
  },
  hList: {paddingLeft: 16, paddingRight: 6},

  // ── Cards ─────────────────────────────────────────────
  card: {
    width: CARD_W, marginRight: 10, borderRadius: 10,
    backgroundColor: '#141416', overflow: 'hidden',
  },
  cardPoster: {width: CARD_W, height: POSTER_H, backgroundColor: '#1A1A1E'},
  ratingBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6,
  },
  ratingText: {color: '#FFD700', fontSize: 10, fontWeight: '800'},
  cardInfo: {paddingHorizontal: 8, paddingVertical: 8},
  cardTitle: {fontSize: 12, fontWeight: '600', color: '#DDD'},
  cardYear: {fontSize: 11, color: '#555', marginTop: 2},

  // ── Test ──────────────────────────────────────────────
  testBtn: {
    marginHorizontal: 16, marginTop: 30,
    paddingVertical: 12, borderRadius: 12, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  testBtnText: {color: '#444', fontSize: 13, fontWeight: '600'},
});
