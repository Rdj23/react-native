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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import MenuIcon from '../../assets/Menu.svg';
import InboxIcon from '../../components/InboxIcon';


const {width} = Dimensions.get('window');
const CARD_W = (width - 48) / 3;

const SECTION_CONFIG = {
  men: [
    {key: 'mens-shirts', label: 'Shirts', categories: ['mens-shirts']},
    {key: 'mens-watches', label: 'Watches', categories: ['mens-watches']},
    {key: 'mens-shoes', label: 'Shoes', categories: ['mens-shoes']},
  ],
  women: [
    {key: 'womens-dresses', label: 'Dresses', categories: ['womens-dresses']},
    {key: 'tops', label: 'Tops', categories: ['tops']},
    {key: 'womens-bags', label: 'Womens Bag', categories: ['womens-bags']},
    {key: 'womens-shoes', label: 'Shoes', categories: ['womens-shoes']},
    {key: 'womens-jewellery', label: 'Jewellery', categories: ['womens-jewellery']},
    {key: 'womens-watches', label: 'Women watches', categories: ['womens-watches']},
  ],
  accessories: [
    {key: 'feature', label: 'Feature Products', categories: ['sunglasses']},
    {key: 'laptops', label: 'Laptops', categories: ['laptops']},
    {key: 'smartphones', label: 'Phones', categories: ['smartphones']},
    {key: 'tablets', label: 'Tablets', categories: ['tablets']},
    {key: 'mobile-accessories', label: 'Mobile Accessories', categories: ['mobile-accessories']},
    {key: 'kitchen-accessories', label: 'Kitchen Accessories', categories: ['kitchen-accessories']},
  ],
  beauty: [
    {key: 'feature', label: 'Feature Products', categories: ['beauty']},
    {key: 'skincare', label: 'Skincare', categories: ['skin-care']},
    {key: 'fragrances', label: 'Fragrances', categories: ['fragrances']},
    {key: 'lighting', label: 'Lighting', categories: ['lighting']},
  ],
};

export default function HomeScreen({navigation}) {
  const insets = useSafeAreaInsets();
  const [selectedTab, setSelectedTab] = useState('men');
  const [sectionsData, setSectionsData] = useState({});
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  const [banners, setBanners] = useState([]);
  const [imageUrls, setImageUrls] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const listener = DeviceEventEmitter.addListener(
      'CleverTapDisplayUnitsLoaded',
      units => {
        if (Array.isArray(units) && units.length) {
          const parsed = units.flatMap(unit =>
            (unit.content || []).map(content => ({
              wzrk_id: unit.wzrk_id,
              image: content.media?.url,
              action: content.action,
            }))
          );
          setBanners(parsed);
          setImageUrls(parsed.map(b => b.image));

          CleverTap.pushDisplayUnitViewedEventForID(units[0].wzrk_id);
        }
      },
    );

    CleverTap.recordEvent('HomeScreen Launched');

    CleverTap.getAllDisplayUnits((_, cached) => {
      if (Array.isArray(cached) && cached.length) {
        const parsed = cached.flatMap(unit =>
          (unit.content || []).map(content => ({
            wzrk_id: unit.wzrk_id,
            image: content.media?.url,
            action: content.action,
          }))
        );
        setBanners(parsed);
        setImageUrls(parsed.map(b => b.image));

        CleverTap.pushDisplayUnitViewedEventForID(cached[0].wzrk_id);
      }
    });

    return () => listener.remove();
  }, []);

  // auto-cycle carousel every 5 seconds
  useEffect(() => {
    if (imageUrls.length < 2) return;
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % imageUrls.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [imageUrls]);

  useEffect(() => {
    setUser(auth().currentUser);
  }, []);

  // fetch product sections from dummyjson.com
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

    return () => { alive = false; };
  }, [selectedTab]);

  const renderCard = ({item}) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => navigation.navigate('Product', {product: item})}>
      <Image source={{uri: item.thumbnail}} style={styles.image} />
      <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.price}>₹{item.price.toFixed(2)}</Text>
    </TouchableOpacity>
  );

  const sections = SECTION_CONFIG[selectedTab];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={[styles.headerBar, { paddingTop: insets.top }]}>

        <TouchableOpacity onPress={() => navigation.getParent()?.openDrawer()}>
          <MenuIcon width={24} height={24} />
        </TouchableOpacity>
        <Text style={styles.title}>GemStore</Text>
        <InboxIcon style={styles.iconWrapper} />
      </View>

      {/* Welcome Message */}
      <Text style={styles.header}>
        {user?.displayName ? `Welcome, ${user.displayName}` : 'Welcome to Shop'}
      </Text>

      {/* Gender Tabs */}
      <CategoryTabs selectedKey={selectedTab} onSelect={setSelectedTab} />

      {/* Content Scroll */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 🔥 Native Display Carousel */}
        <TouchableOpacity
          style={styles.bannerWrap}
          activeOpacity={0.8}
          onPress={() => {
            const currentBanner = banners[activeIndex];
            const unitId = currentBanner?.wzrk_id;
            if (!unitId) return;

            CleverTap.pushDisplayUnitClickedEventForID(unitId);

            const url =
              currentBanner?.action?.url?.android?.text ||
              currentBanner?.action?.url?.ios?.text ||
              currentBanner?.action?.url?.text;

            console.log('👉 Clicked banner URL:', url);

            if (url) {
              Linking.openURL(url)
                .then(() => console.log('✅ Opened URL:', url))
                .catch(err => console.error('❌ Failed to open URL:', err));
            } else {
              alert('❌ No valid URL found');
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
              source={require('../../assets/Banner_main.jpeg')}
              style={styles.banner}
              resizeMode="cover"
            />
          )}
          <Text style={styles.bannerText}>Autumn Collection 2022</Text>

          {/* Dots */}
          <View style={styles.dotContainer}>
            {imageUrls.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  activeIndex === index ? styles.activeDot : null,
                ]}
              />
            ))}
          </View>
        </TouchableOpacity>

        {/* Product Sections */}
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
  dotContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: '#30241F',
    width: 10,
    height: 10,
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
