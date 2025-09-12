// MovieDetail.js
import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');
const TMDB_KEY = 'd08da567ee2d845d0801bd7ecce02317';
const POSTER = p => (p ? `https://image.tmdb.org/t/p/w780${p}` : null);
const PROFILE = p => (p ? `https://image.tmdb.org/t/p/w185${p}` : null);

export default function MovieDetail({ route }) {
  const {
    id,
    title = '',
    image = '',
    release_date = '',
    overview = '',
    type = 'movie',
    backdrop = '',
  } = route?.params || {};

  const [cast, setCast] = useState([]);
  const [trailerKey, setTrailerKey] = useState(null);
  const [loadingCast, setLoadingCast] = useState(true);

  useEffect(() => {
    if (!id || !type) {
      setCast([]);
      setTrailerKey(null);
      setLoadingCast(false);
      return;
    }

    setLoadingCast(true);

    // credits
    fetch(`https://api.themoviedb.org/3/${type}/${id}/credits?api_key=${TMDB_KEY}&language=en-US`)
      .then(r => r.json())
      .then(json => {
        const list = (json.cast || []).slice(0, 12);
        setCast(list);
      })
      .catch(() => setCast([]))
      .finally(() => setLoadingCast(false));

    // videos -> find youtube trailer
    fetch(`https://api.themoviedb.org/3/${type}/${id}/videos?api_key=${TMDB_KEY}&language=en-US`)
      .then(r => r.json())
      .then(json => {
        const videos = json.results || [];
        // prefer Official Trailer then Trailer
        const yt =
          videos.find(v => v.site === 'YouTube' && /Official Trailer/i.test(v.name)) ||
          videos.find(v => v.site === 'YouTube' && /Trailer/i.test(v.name)) ||
          videos.find(v => v.site === 'YouTube');
        setTrailerKey(yt ? yt.key : null);
      })
      .catch(() => setTrailerKey(null));
  }, [id, type]);

  const openYoutube = key => {
    const url = `https://www.youtube.com/watch?v=${key}`;
    Linking.canOpenURL(url).then(supported => supported && Linking.openURL(url));
  };

  const renderCast = ({ item }) => (
    <View style={styles.castCard}>
      <Image source={{ uri: PROFILE(item.profile_path) }} style={styles.castImg} />
      <Text numberOfLines={1} style={styles.castName}>{item.name}</Text>
      <Text numberOfLines={1} style={styles.castRole}>{item.character || item.role || ''}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Image source={{ uri: backdrop || image }} style={styles.backdrop} />
        <View style={styles.headerOverlay} />
        <View style={styles.headerContent}>
          <Image source={{ uri: image }} style={styles.poster} />
          <View style={styles.headerText}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.meta}>{(type || '').toUpperCase()} • {release_date || ''}</Text>
            <Text numberOfLines={4} style={styles.overviewShort}>{overview || ''}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <Text style={styles.overviewFull}>{overview || 'No overview available.'}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Cast</Text>
        {loadingCast ? (
          <ActivityIndicator style={{ marginTop: 8 }} />
        ) : (
          <FlatList
            data={cast}
            horizontal
            keyExtractor={it => String(it.cast_id || it.id || it.credit_id)}
            renderItem={renderCast}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
          />
        )}
      </View>

      {trailerKey ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Trailer</Text>
          <View style={styles.trailerWrap}>
            {/* WebView for embedded trailer; fallback to external YouTube on press */}
            <WebView
              source={{ uri: `https://www.youtube.com/embed/${trailerKey}` }}
              style={styles.webview}
              javaScriptEnabled
              allowsInlineMediaPlayback
            />
            <TouchableOpacity style={styles.openBtn} onPress={() => openYoutube(trailerKey)}>
              <Text style={styles.openBtnText}>Open in YouTube</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { position: 'relative', width: '100%' },
  backdrop: { width: '100%', height: 200, opacity: 1 },
  headerOverlay: { position: 'absolute', left: 0, right: 0, top: 0, height: 200, backgroundColor: 'rgba(0,0,0,0.35)' },
  headerContent: { position: 'absolute', left: 16, right: 16, top: 40, flexDirection: 'row', alignItems: 'flex-start' },
  poster: { width: 120, height: 180, borderRadius: 8, elevation: 4, backgroundColor: '#eee' },
  headerText: { flex: 1, marginLeft: 12 },
  title: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  meta: { color: '#ddd', marginBottom: 8 },
  overviewShort: { color: '#eee', fontSize: 13, lineHeight: 18 },

  section: { paddingHorizontal: 16, paddingTop: 18 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginBottom: 8 },
  overviewFull: { color: '#333', lineHeight: 20 },

  castCard: { width: 100, marginRight: 12, alignItems: 'center' },
  castImg: { width: 82, height: 110, borderRadius: 6, backgroundColor: '#f0f0f0' },
  castName: { marginTop: 6, fontSize: 12, fontWeight: '700', color: '#111' },
  castRole: { fontSize: 11, color: '#666', marginTop: 2, textAlign: 'center' },

  trailerWrap: { marginTop: 8, borderRadius: 10, overflow: 'hidden', backgroundColor: '#000' },
  webview: { width: '100%', height: 210, backgroundColor: '#000' },
  openBtn: { padding: 10, backgroundColor: '#222', alignItems: 'center' },
  openBtnText: { color: '#fff', fontWeight: '700' },
});
