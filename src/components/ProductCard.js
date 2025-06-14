import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 64) / 2;

export default function ProductCard({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
      <Image source={{ uri: item.thumbnail }} style={styles.image} resizeMode="cover" />
      <Text numberOfLines={2} style={styles.name}>{item.title}</Text>
      <Text style={styles.price}>₹{item.price.toFixed(2)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    marginBottom: 16,
    marginHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    padding: 12,
  },
  image: {
    width: '100%',
    height: CARD_WIDTH,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  name: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  price: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#30241F',
  },
});
