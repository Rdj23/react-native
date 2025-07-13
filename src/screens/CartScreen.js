import React from 'react';
import { useCart } from '../context/CartContext';
import Toast from 'react-native-root-toast';
import CleverTap from 'clevertap-react-native';

import {
  SafeAreaView,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';

import ArrowLeft from '../../src/assets/ArrowLeft.svg';


export default function CartScreen({ navigation }) {
  const { cartItems, incrementItem, decrementItem, removeItem } = useCart();

  const subtotal = cartItems
    .reduce((sum, item) => sum + item.price * item.quantity, 0)
    .toFixed(2);

  const handleBuyNow = () => {
    const items = cartItems.map(item => ({
      id: item.id,
      name: item.title,
      price: item.price,
      quantity: item.quantity,
      thumbnail: item.thumbnail,
    }));
    console.log(items);

    CleverTap.recordChargedEvent(
      {
        amount: subtotal,
        payment_mode: 'COD',
        purchase_date: new Date(),
      },
      items
    );

    Toast.show('Order placed! (Charged event sent)', {
      duration: Toast.durations.SHORT,
      position: Toast.positions.BOTTOM,
    });

    // Optionally clear cart or navigate
    cartItems.forEach(item => removeItem(item));
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.thumbnail }} style={styles.image} />
      <View style={styles.info}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.price}>${item.price.toFixed(2)}</Text>
        {(item.size || item.color) && (
          <Text style={styles.meta}>
            {item.size ? `Size: ${item.size}` : ''}
            {item.size && item.color ? ' | ' : ''}
            {item.color ? `Color: ${item.color}` : ''}
          </Text>
        )}
      </View>
      <View style={styles.qtyRow}>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() =>
            item.quantity === 1 ? removeItem(item) : decrementItem(item)
          }>
          <Text style={styles.qtySign}>–</Text>
        </TouchableOpacity>
        <Text style={styles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity
          style={styles.qtyBtn}
          onPress={() => incrementItem(item)}>
          <Text style={styles.qtySign}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft width={24} height={24} fill="#30241F" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Your Cart</Text>
          <View style={{ width: 24 }} />
        </View>
        <Text style={styles.emptyTitle}>Your Cart Is Empty</Text>
        <Text style={styles.emptySubtitle}>
          Looks like you haven’t added anything yet.
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft width={24} height={24} fill="#30241F" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Cart</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={cartItems}
        keyExtractor={item => `${item.id}-${item.size}-${item.color}`}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />

      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.row}>
          <Text>Product price</Text>
          <Text>${subtotal}</Text>
        </View>
        <View style={styles.row}>
          <Text>Shipping</Text>
          <Text>Freeship</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.sub}>Subtotal</Text>
          <Text style={styles.sub}>${subtotal}</Text>
        </View>
        <TouchableOpacity style={styles.checkout} onPress={handleBuyNow}>
          <Text style={styles.checkoutText}>Buy Now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#FFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },

  list: { paddingBottom: 16 },

  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    elevation: 1,
  },
  image: { width: 64, height: 64, borderRadius: 8, marginRight: 12 },
  info: { flex: 1 },
  title: { fontSize: 14, fontWeight: '600' },
  price: { fontSize: 13, color: '#666', marginTop: 4 },
  meta: { fontSize: 12, color: '#999', marginTop: 4 },

  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtySign: { fontSize: 18 },
  qtyText: { marginHorizontal: 8, fontSize: 16 },

  summary: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    backgroundColor: '#FFF',
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sub: { fontSize: 16, fontWeight: '700' },

  checkout: {
    marginTop: 16,
    backgroundColor: '#30241F',
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  checkoutText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  emptyContainer: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginTop: 48,
  },
  emptySubtitle: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});
