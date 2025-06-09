import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {useWishlist} from '../context/WishlistContext';
import {useCart} from '../context/CartContext';
import ArrowLeft from '../../resources/icons/ArrowLeft.svg';



export default function WishlistScreen({navigation}) {
  const {wishlist} = useWishlist();
  const {cartItems, addToCart, incrementItem, decrementItem, removeItem} =
    useCart();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // <TouchableOpacity
  //   style={styles.qtyBtn}
  //   onPress={() => {
  //     if (cartEntry.quantity === 1) {
  //       removeItem(cartEntry);
  //     } else {
  //       decrementItem(cartEntry);
  //     }
  //   }}>
  //   <Text style={styles.qtySign}>–</Text>
  // </TouchableOpacity>;

  // Fetch product details for all items in wishlist
  useEffect(() => {
    let alive = true;
    if (!wishlist.length) {
      setProducts([]);
      return;
    }
    setLoading(true);
    Promise.all(
      wishlist.map(id =>
        fetch(`https://dummyjson.com/products/${id}`).then(r => r.json()),
      ),
    )
      .then(items => {
        if (alive) setProducts(items);
      })
      .catch(console.error)
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [wishlist]);

  // Utility to find exact cart entry (if variants needed, update the matching logic)
  const getCartEntry = item =>
    cartItems.find(
      x => x.id === item.id,
      // add x.size === item.size && x.color === item.color if you use variants
    );

  const renderItem = ({item}) => {
  const cartEntry = getCartEntry(item);
  return (
    <View style={styles.card}>
      <Image source={{uri: item.thumbnail}} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.price}>${item.price.toFixed(2)}</Text>
      </View>
      {cartEntry ? (
        <View style={styles.qtyRow}>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => {
              if (cartEntry.quantity === 1) {
                removeItem(cartEntry);
              } else {
                decrementItem(cartEntry);
              }
            }}>
            <Text style={styles.qtySign}>–</Text>
          </TouchableOpacity>
          <Text style={styles.qtyText}>{cartEntry.quantity}</Text>
          <TouchableOpacity
            style={styles.qtyBtn}
            onPress={() => incrementItem(cartEntry)}>
            <Text style={styles.qtySign}>+</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => addToCart(item)}>
          <Text style={styles.addText}>+ Cart</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};


  return (
    <SafeAreaView style={styles.container}>
      {/* Header row with back arrow */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.arrowBack}>
          <ArrowLeft width={24} height={24} fill="#30241F" />
        </TouchableOpacity>
        <Text style={styles.headerText}>My Wishlist</Text>
        <View style={{width: 24}} />
      </View>
      {loading && <ActivityIndicator style={{marginTop: 24}} />}
      {!loading && !products.length && (
        <View style={styles.emptyContainer}>
          <Text style={styles.empty}>Your wishlist is empty.</Text>
        </View>
      )}
      <FlatList
        data={products}
        keyExtractor={i => String(i.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#fff', padding: 16},
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  arrowBack: {marginRight: 8},
  headerText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  empty: {marginTop: 24, textAlign: 'center', color: '#666'},
  emptyContainer: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  list: {paddingBottom: 32},
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  image: {width: 64, height: 64},
  info: {flex: 1, paddingHorizontal: 12},
  title: {fontSize: 14, fontWeight: '600'},
  price: {marginTop: 4, color: '#666'},
  addBtn: {
    padding: 8,
    backgroundColor: '#30241F',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  addText: {color: '#fff', fontSize: 12},
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eee',
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtySign: {fontSize: 18, fontWeight: '600'},
  qtyText: {marginHorizontal: 12, fontSize: 14, fontWeight: '600'},
});