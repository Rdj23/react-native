// SearchScreen.js
import React, {useEffect, useRef, useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
// CleverTap optional. Wrapped in try/catch where used.
import CleverTap from 'clevertap-react-native';

const TMDB_KEY = 'd08da567ee2d845d0801bd7ecce02317';
const WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = Math.round((WIDTH - 48) / 3); // 3 per row with padding
const CARD_IMG_H = Math.round(CARD_WIDTH * 1.4);
const MIN_QUERY = 2;
const DEBOUNCE_MS = 450;

const IMG = p => (p ? `https://image.tmdb.org/t/p/w342${p}` : null);

export default function SearchScreen() {
  const navigation = useNavigation();

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'movie' | 'tv'
  const [trending, setTrending] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [noResults, setNoResults] = useState(false);

  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  // load trending once
  useEffect(() => {
    loadTrending();
    // cleanup on unmount
    return () => {
      if (abortRef.current) abortRef.current.abort();
      clearTimeout(debounceRef.current);
    };
  }, []);

  function safeFetch(url) {
    // abort previous if present
    if (abortRef.current) {
      try {
        abortRef.current.abort();
      } catch (e) {}
    }
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    return fetch(url, {signal: ctrl.signal}).then(r => {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  }

  function loadTrending() {
    setLoading(true);
    setNoResults(false);
    const url = `https://api.themoviedb.org/3/trending/all/day?api_key=${TMDB_KEY}`;
    safeFetch(url)
      .then(d => {
        const list = (d.results || []).filter(x => x.media_type !== 'person');
        setTrending(list);
        setItems(list);
        setNoResults(!(list && list.length));
      })
      .catch(e => {
        console.warn('trending error', e);
        setTrending([]);
        setItems([]);
        setNoResults(true);
      })
      .finally(() => setLoading(false));
  }

  function performSearch(q, currentFilter) {
    const trimmed = (q || query || '').trim();
    if (!trimmed || trimmed.length < MIN_QUERY) {
      // nothing to search
      setItems(
        currentFilter === 'all'
          ? trending
          : trending.filter(it => it.media_type === currentFilter),
      );
      setNoResults(false);
      return;
    }

    setLoading(true);
    setNoResults(false);
    // pick endpoint
    const type = currentFilter === 'all' ? 'multi' : currentFilter;
    const url = `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_KEY}&query=${encodeURIComponent(
      trimmed,
    )}`;

    safeFetch(url)
      .then(d => {
        let list = d.results || [];
        if (type === 'multi')
          list = list.filter(
            x => x.media_type === 'movie' || x.media_type === 'tv',
          );
        setItems(list);
        setNoResults(!(list && list.length));
      })
      .catch(e => {
        if (e.name === 'AbortError') return;
        console.warn('search error', e);
        setItems([]);
        setNoResults(true);
      })
      .finally(() => setLoading(false));
  }

  // Debounced search when typing (optional). We still only run when length >= MIN_QUERY.
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!query || query.trim().length < MIN_QUERY) {
      // show trending or filtered trending
      if (!query) {
        setItems(
          filter === 'all'
            ? trending
            : trending.filter(it => it.media_type === filter),
        );
      } else {
        setItems([]); // waiting for more chars
      }
      setNoResults(false);
      return;
    }
    debounceRef.current = setTimeout(
      () => performSearch(query, filter),
      DEBOUNCE_MS,
    );
    return () => clearTimeout(debounceRef.current);
  }, [query, filter, trending]);

  function onGoPress() {
    performSearch(query, filter);
  }

  function onFilterPress(newFilter) {
    setFilter(newFilter);
    // if search active perform a search with new filter
    if (query && query.trim().length >= MIN_QUERY) {
      performSearch(query, newFilter);
    } else {
      // otherwise show trending filtered
      const list =
        newFilter === 'all'
          ? trending
          : trending.filter(it => it.media_type === newFilter);
      setItems(list);
      setNoResults(!(list && list.length));
    }
  }

  function openDetail(item) {
    const title = item.title || item.name || '';
    const poster = IMG(item.poster_path);
    const release = item.release_date || item.first_air_date || '';
    // CleverTap event (single)
    try {
      if (CleverTap && CleverTap.recordEvent) {
        CleverTap.recordEvent('Movie Viewed', {
          'Movie Title': title,
          image: poster || '',
          release_date: release || '',
          type: item.media_type || '',
          id: item.id,
        });
      }
    } catch (e) {}
    navigation.navigate('MovieDetail', {
      id: item.id,
      title,
      image: poster,
      release_date: release,
      overview: item.overview || '',
      type: item.media_type || '',
    });
  }

  function renderCard({item}) {
    const title = item.title || item.name || '';
    const poster = IMG(item.poster_path);
    const meta =
      (item.media_type || '').toUpperCase() +
      (item.release_date
        ? ' • ' + (item.release_date || item.first_air_date || '').slice(0, 4)
        : '');
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openDetail(item)}
        activeOpacity={0.85}>
        <Image
          source={{uri: poster}}
          style={styles.poster}
          resizeMode="cover"
        />
        <View style={styles.cardBody}>
          <Text numberOfLines={1} style={styles.cardTitle}>
            {title}
          </Text>
          <Text numberOfLines={1} style={styles.cardMeta}>
            {meta}
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.headerRow}>
        <View style={styles.searchBox}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search movies or TV"
            placeholderTextColor="#9AA0A6"
            style={styles.input}
            returnKeyType="search"
            onSubmitEditing={onGoPress}
            autoCorrect={false}
            spellCheck={false}
            autoComplete="off"
          />
        </View>

        <TouchableOpacity style={styles.goBtn} onPress={onGoPress}>
          <Text style={styles.goTxt}>Go</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chipsRow}>
        <TouchableOpacity
          style={[styles.chip, filter === 'all' && styles.chipActive]}
          onPress={() => onFilterPress('all')}>
          <Text
            style={[
              styles.chipText,
              filter === 'all' && styles.chipTextActive,
            ]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, filter === 'movie' && styles.chipActive]}
          onPress={() => onFilterPress('movie')}>
          <Text
            style={[
              styles.chipText,
              filter === 'movie' && styles.chipTextActive,
            ]}>
            Movie
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.chip, filter === 'tv' && styles.chipActive]}
          onPress={() => onFilterPress('tv')}>
          <Text
            style={[styles.chipText, filter === 'tv' && styles.chipTextActive]}>
            TV
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>
        {query ? 'Results' : 'Trending now'}
      </Text>

      {loading && <ActivityIndicator style={{marginTop: 12}} />}

      {!loading && noResults && (
        <Text style={styles.noResults}>No results found.</Text>
      )}

      {!loading && !noResults && (
        <FlatList
          data={items}
          keyExtractor={it => String(it.id)}
          renderItem={renderCard}
          numColumns={3}
          contentContainerStyle={styles.gridList}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: '#fff'},
  headerRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    backgroundColor: '#f2f3f5',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  input: {fontSize: 15, color: '#111'},
  goBtn: {
    marginLeft: 10,
    backgroundColor: '#5E35B1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  goTxt: {color: '#fff', fontWeight: '600'},

  chipsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    marginRight: 8,
  },
  chipActive: {backgroundColor: '#5E35B1'},
  chipText: {color: '#222'},
  chipTextActive: {color: '#fff'},

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginTop: 6,
  },

  listContainer: {paddingHorizontal: 12, paddingTop: 12, paddingBottom: 24},
  card: {
    width: CARD_WIDTH,
    marginRight: 12,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#fff',
    elevation: 2,
  },
  poster: {width: CARD_WIDTH, height: CARD_IMG_H, backgroundColor: '#e6e7e8'},
  cardBody: {padding: 8},
  cardTitle: {fontSize: 13, fontWeight: '700', color: '#111'},
  cardMeta: {marginTop: 4, fontSize: 11, color: '#6b7280'},

  noResults: {textAlign: 'center', marginTop: 20, color: '#888'},

  gridList: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 24 },
card: {
  width: CARD_WIDTH,
  margin: 6,
  borderRadius: 10,
  overflow: 'hidden',
  backgroundColor: '#fff',
  elevation: 2,
},
poster: {
  width: CARD_WIDTH,
  height: CARD_IMG_H,
  backgroundColor: '#e6e7e8',
  borderTopLeftRadius: 10,
  borderTopRightRadius: 10,
},
cardBody: { padding: 6 },
cardTitle: { fontSize: 12, fontWeight: '700', color: '#111' },
cardMeta: { marginTop: 2, fontSize: 10, color: '#6b7280' },

});
