// src/screens/HomeScreen.js
import React, {useState, useEffect} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  ScrollView,
  DeviceEventEmitter,
  Linking,
  Platform,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import CategoryTabs from '../../components/CategoryTabs';
import CleverTap from 'clevertap-react-native';

import MenuIcon from '../../assets/Menu.svg';
import InboxIcon from '../../components/InboxIcon';

const {width} = Dimensions.get('window');
const CARD_W = (width - 48) / 3;

const SECTION_CONFIG = {
  men: [
    {
      key: 'feature',
      label: 'Feature Products',
      categories: ['mens-shirts', 'mens-watches', 'mens-shoes'],
    },
    {key: 'mens-shirts', label: 'Shirts', categories: ['mens-shirts']},
    {key: 'tops', label: 'T-Shirts', categories: ['tops']},
    {key: 'mens-watches', label: 'Watches', categories: ['mens-watches']},
    {key: 'mens-shoes', label: 'Shoes', categories: ['mens-shoes']},
  ],
  women: [
    {
      key: 'feature',
      label: 'Feature Products',
      categories: [
        'womens-dresses',
        'womens-watches',
        'womens-shoes',
        'womens-jewellery',
      ],
    },
    {key: 'womens-dresses', label: 'Dresses', categories: ['womens-dresses']},
    {key: 'tops', label: 'T-Shirts', categories: ['tops']},
    {key: 'womens-shoes', label: 'Shoes', categories: ['womens-shoes']},
    {
      key: 'womens-jewellery',
      label: 'Jewellery',
      categories: ['womens-jewellery'],
    },
  ],
  accessories: [
    {key: 'feature', label: 'Feature Products', categories: ['sunglasses']},
    {key: 'sunglasses', label: 'Sunglasses', categories: ['sunglasses']},
    {key: 'smartphones', label: 'Phones', categories: ['smartphones']},
    {key: 'tops', label: 'T-Shirts', categories: ['tops']},
    {key: 'mens-watches', label: 'Watches', categories: ['mens-watches']},
  ],
  beauty: [
    {
      key: 'feature',
      label: 'Feature Products',
      categories: ['skincare', 'fragrances'],
    },
    {key: 'skincare', label: 'Skincare', categories: ['skincare']},
    {key: 'fragrances', label: 'Fragrances', categories: ['fragrances']},
    {key: 'lighting', label: 'Lighting', categories: ['lighting']},
    {
      key: 'home-decoration',
      label: 'Home Decor',
      categories: ['home-decoration'],
    },
  ],
};

export default function HomeScreen({navigation}) {
  const [selectedTab, setSelectedTab] = useState('men');
  const [sectionsData, setSectionsData] = useState({});
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // --- Native Display state ---
  const [displayUnits, setDisplayUnits] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // helper: pull urls out of each unit
  const extractUrls = units =>
    units.reduce((acc, u) => {
      (u.content || []).forEach(c => {
        if (c.media?.url) acc.push(c.media.url);
      });
      return acc;
    }, []);

  // 1) listen for fresh units  2) fire HomeScreen Launched  3) grab any cached
  useEffect(() => {
    const listener = DeviceEventEmitter.addListener(
      'CleverTapDisplayUnitsLoaded',
      units => {
        if (Array.isArray(units) && units.length) {
          setDisplayUnits(units);
          setImageUrls(extractUrls(units));

          // 🔥 viewed the first unit immediately:
          const firstId = units[0].wzrk_id;
          CleverTap.pushDisplayUnitViewedEventForID(firstId);
          console.log('Viewed unit id:', firstId);
        }
      },
    );

    CleverTap.recordEvent('HomeScreen Launched');

    CleverTap.getAllDisplayUnits((_, cached) => {
      if (Array.isArray(cached) && cached.length) {
        setDisplayUnits(cached);
        setImageUrls(extractUrls(cached));

        const firstId = cached[0].wzrk_id;
        CleverTap.pushDisplayUnitViewedEventForID(firstId);
        console.log('Viewed (cached) unit id:', firstId);
      }
    });

    return () => listener.remove();
  }, []);

  // auto‐cycle every 3s
  useEffect(() => {
    if (imageUrls.length < 2) return;
    const iv = setInterval(() => {
      setActiveIndex(i => (i + 1) % imageUrls.length);
    }, 3000);
    return () => clearInterval(iv);
  }, [imageUrls]);

  // Firebase user
  useEffect(() => {
    setUser(auth().currentUser);
  }, []);

  // fetch your product sections
  useEffect(() => {
    let alive = true;
    setLoading(true);

    Promise.all(
      SECTION_CONFIG[selectedTab].map(section =>
        Promise.all(
          section.categories.map(cat =>
            fetch(`https://dummyjson.com/products/category/${cat}?limit=50`)
              .then(r => r.json())
              .then(j => j.products),
          ),
        ).then(arrays => ({
          key: section.key,
          label: section.label,
          items: arrays.flat(),
        })),
      ),
    )
      .then(results => {
        if (!alive) return;
        const map = {};
        results.forEach(s => (map[s.key] = s.items));
        setSectionsData(map);
      })
      .catch(console.error)
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [selectedTab]);

  const renderCard = ({item}) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Product', {product: item})}>
      <Image source={{uri: item.thumbnail}} style={styles.image} />
      <Text style={styles.name} numberOfLines={1}>
        {item.title}
      </Text>
      <Text style={styles.price}>₹{item.price.toFixed(2)}</Text>
    </TouchableOpacity>
  );

  const sections = SECTION_CONFIG[selectedTab];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.getParent()?.openDrawer()}>
          <MenuIcon width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.title}>GemStore</Text>
        <InboxIcon style={styles.iconWrapper} />
      </View>

      {/* Welcome */}
      <Text style={styles.header}>
        {user?.displayName
          ? `Welcome, ${user.displayName}`
          : 'Welcome to CT-ecom'}
      </Text>

      {/* Tabs */}
      <CategoryTabs selectedKey={selectedTab} onSelect={setSelectedTab} />

      {/* Content */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 🎯 Native Display Banner */}
        <TouchableOpacity
          style={styles.bannerWrap}
          activeOpacity={0.8}
          onPress={() => {
            const unit = displayUnits[activeIndex];
            const unitId = unit?.wzrk_id;
            if (!unitId) return;

            // 🔥 clicked
            CleverTap.pushDisplayUnitClickedEventForID(unitId);
            console.log('Clicked unit id:', unitId);

            // open the click-through URL if any
            if (unit.action?.url?.android) {
              Linking.openURL(unit.action.url.android);
            }
          }}>
          {imageUrls.length > 0 ? (
            <Image
              source={{uri: imageUrls[activeIndex]}}
              style={styles.banner}
              resizeMode="cover"
            />
          ) : (
            <Image
<<<<<<< HEAD
              source={require('../../assets/Banner_main.jpeg')}
=======
              source={require('../../assets/Banner1.png')}
>>>>>>> 998e10f626c0e501c5ab730dfcd0c6eaeed3e309
              style={styles.banner}
              resizeMode="cover"
            />
          )}
          <Text style={styles.bannerText}>Autumn Collection 2022</Text>
        </TouchableOpacity>

        {/* Products */}
        {loading ? (
          <ActivityIndicator style={{margin: 24}} />
        ) : (
          sections.map(sec => (
            <View key={sec.key}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{sec.label}</Text>
                <TouchableOpacity>
                  <Text style={styles.showAll}>See all</Text>
                </TouchableOpacity>
              </View>
              <FlatList
                data={sectionsData[sec.key] || []}
                keyExtractor={i => String(i.id)}
                renderItem={renderCard}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.list}
              />
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff'},
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginTop: Platform.OS === 'ios' ? 16 : 0,
  },
  title: {fontSize: 18, fontWeight: '700'},
  iconWrapper: {padding: 8},
  header: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 32,
  },
  scrollContent: {paddingBottom: 32},
  bannerWrap: {marginTop: 16, paddingHorizontal: 24, alignItems: 'center'},
  banner: {width: '100%', height: 160, borderRadius: 16},
  bannerText: {
    position: 'absolute',
    bottom: 16,
    left: 32,
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {fontSize: 18, fontWeight: '700', color: '#1A1A1A'},
  showAll: {fontSize: 14, color: '#007AFF'},
  list: {paddingLeft: 24, paddingTop: 16, paddingBottom: 24},
  card: {width: CARD_W, marginRight: 16},
  image: {width: CARD_W, height: CARD_W, borderRadius: 8},
  name: {marginTop: 8, fontSize: 14, color: '#1A1A1A'},
  price: {marginTop: 4, fontSize: 14, fontWeight: '600', color: '#30241F'},
});
