import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  DrawerContentScrollView,
  DrawerItem,
} from '@react-navigation/drawer';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useUser } from '../context/UserContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

export default function CustomDrawerContent({ navigation }) {
  const { user } = useUser();
  const { totalQuantity } = useCart();
  const { wishlist } = useWishlist();

  const goToTab = (tabName) => {
    navigation.closeDrawer();
    navigation.navigate(tabName);
  };

  return (
    <DrawerContentScrollView contentContainerStyle={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="person-circle" size={64} color="#30241F" />
        <Text style={styles.name}>{user.name || 'Your Name'}</Text>
        <Text style={styles.email}>{user.email || 'example@email.com'}</Text>
      </View>

      {/* Menu Items */}
      <View style={styles.menu}>
        <DrawerItem
          label="Home"
          icon={({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          )}
          onPress={() => goToTab('Home')}
        />
        <DrawerItem
          label="Search"
          icon={({ color, size }) => (
            <Ionicons name="search-outline" size={size} color={color} />
          )}
          onPress={() => goToTab('Search')}
        />
        <DrawerItem
          label={`Cart${totalQuantity > 0 ? ` (${totalQuantity})` : ''}`}
          icon={({ color, size }) => (
            <Ionicons name="cart-outline" size={size} color={color} />
          )}
          onPress={() => goToTab('Cart')}
        />
        <DrawerItem
          label={`Wishlist${wishlist.length > 0 ? ` (${wishlist.length})` : ''}`}
          icon={({ color, size }) => (
            <Ionicons name="heart-outline" size={size} color={color} />
          )}
          onPress={() => goToTab('Profile')} // Navigate to Profile tab where Wishlist is shown
        />
        <DrawerItem
          label="Profile"
          icon={({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          )}
          onPress={() => goToTab('Profile')}
        />
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  name: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  menu: {
    paddingTop: 16,
  },
});
