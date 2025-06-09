import React, {useState, useEffect} from 'react';
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

import ArrowLeft from '../../assets/ArrowLeft.svg';
import SearchIcon from '../../assets/Search.svg';
import CloseIcon from '../../assets/close.svg';
import TrashIcon from '../../assets/Trash.svg';

const {width} = Dimensions.get('window');
const CARD_WIDTH = (width - 48 - 16) / 2; // 2 columns, 24px horizontal padding, 16px gap

export default function SearchScreen() {
  const navigation = useNavigation();

  const [recent, setRecent] = useState(['Sunglasses', 'Sweater', 'Hoodie']);
  const [query, setQuery] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetch('https://dummyjson.com/products?limit=100')
      .then(res => res.json())
      .then(data => {
        if (mounted) setAllProducts(data.products || []);
      })
      .catch(() => setAllProducts([]))
      .finally(() => setLoading(false));
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const results = allProducts.filter(prod =>
      prod.title.toLowerCase().includes(query.toLowerCase()),
    );
    setSearchResults(results);
  }, [query, allProducts]);

  const onSearch = text => {
    setQuery(text);
  };

  const onSubmitEditing = () => {
    if (query.trim() && !recent.includes(query.trim())) {
      setRecent([query.trim(), ...recent.slice(0, 5)]);
    }
  };

  <TextInput onSubmitEditing={onSubmitEditing} />;

  const onChipPress = chip => setQuery(chip);
  const removeRecent = item => setRecent(r => r.filter(x => x !== item));
  const clearAll = () => setRecent([]);

  const renderProduct = ({item}) => {
    if (!item.thumbnail) return null;
    return (
      <TouchableOpacity
        style={styles.productCard}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Product', {product: item})}>
        <Image
          source={{uri: item.thumbnail}}
          style={styles.productImage}
          resizeMode="cover"
        />
        <Text style={styles.productName}>{item.title}</Text>
        <Text style={styles.productPrice}>₹{item.price.toFixed(2)}</Text>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.canGoBack() && navigation.goBack()}>
          <ArrowLeft width={20} height={20} fill="#333" />
        </TouchableOpacity>
        <View style={styles.searchBox}>
          <SearchIcon width={18} height={18} fill="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search"
            placeholderTextColor="#999"
            value={query}
            onChangeText={onSearch}
            autoFocus
          />
        </View>
      </View>

      {recent.length > 0 && (
        <View style={styles.recentContainer}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Searches</Text>
            <TouchableOpacity onPress={clearAll}>
              <TrashIcon width={18} height={18} fill="#888" />
            </TouchableOpacity>
          </View>
          <View style={styles.chipsContainer}>
            {['Lipstick', 'Eyeshadow', 'Mascara'].map(item => (
              <View key={item} style={styles.chipWrapper}>
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => onChipPress(item)}>
                  <Text style={styles.chipText}>{item}</Text>
                </TouchableOpacity>
              </View>
            ))}

            {recent.map(item => (
              <View key={item} style={styles.chipWrapper}>
                <TouchableOpacity
                  style={[
                    styles.chip,
                    query === item && {backgroundColor: '#ddd'},
                  ]}
                  onPress={() => onChipPress(item)}>
                  <Text style={styles.chipText}>{item}</Text>
                  <TouchableOpacity onPress={() => removeRecent(item)}>
                    <CloseIcon width={10} height={10} fill="#555" />
                  </TouchableOpacity>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>
          {query ? `Results for "${query}"` : 'Popular this week'}
        </Text>
      </View>
    </>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {loading ? (
        <ActivityIndicator
          size="large"
          color="#30241F"
          style={{marginTop: 40}}
        />
      ) : (
        <FlatList
          data={query ? searchResults : allProducts.slice(0, 8)}
          keyExtractor={item => String(item.id)}
          renderItem={renderProduct}
          numColumns={2}
          contentContainerStyle={{paddingHorizontal: 16, paddingBottom: 24}}
          columnWrapperStyle={{gap: 16, paddingBottom: 16}}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={
            <Text style={styles.noResults}>
              {query
                ? 'No products found.'
                : 'Start typing to search for products.'}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {flex: 1, backgroundColor: '#fff'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBox: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
  },
  recentContainer: {paddingHorizontal: 24, paddingTop: 8},
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentTitle: {fontSize: 14, fontWeight: '600', color: '#222'},
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chipWrapper: {marginBottom: 8},
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipText: {fontSize: 12, marginRight: 6, color: '#333'},
  resultsHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  gridList: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 16,
    elevation: 1,
    alignItems: 'center',
  },
  productImage: {
    width: CARD_WIDTH - 16,
    height: CARD_WIDTH - 16,
    borderRadius: 8,
    backgroundColor: '#eee',
  },
  productName: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  productPrice: {
    fontSize: 13,
    color: '#30241F',
    fontWeight: '700',
    marginTop: 4,
  },
  noResults: {
    textAlign: 'center',
    marginTop: 40,
    color: '#999',
    fontSize: 14,
  },
});
