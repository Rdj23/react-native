import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator } from 'react-native';
import auth from '@react-native-firebase/auth';
import { COLORS } from '../../theme/colors';

export default function HomeScreen() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const category = 'smartphones'; // hardcoded for now — can be dynamic later

  useEffect(() => {
    const currentUser = auth().currentUser;
    setUser(currentUser);

    fetch(`https://dummyjson.com/products/category/${category}?limit=50`)
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const renderProduct = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.thumbnail }} style={styles.image} />
      <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.price}>₹ {item.price}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Welcome {user?.displayName || 'User'}</Text>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProduct}
          numColumns={2}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 24, backgroundColor: '#ffffff' },
  greeting: { fontSize: 22, fontWeight: 'bold', marginBottom: 16, color: COLORS.text },
  grid: { paddingBottom: 100 },
  card: {
    flex: 1,
    margin: 8,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  image: { width: '100%', height: 100, resizeMode: 'cover', borderRadius: 4 },
  name: { marginTop: 8, fontWeight: '500', fontSize: 14 },
  price: { color: COLORS.primary, marginTop: 4, fontSize: 14 },
});
