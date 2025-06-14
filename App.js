// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CartProvider } from './src/context/CartContext';
import { WishlistProvider } from './src/context/WishlistContext';
import { UserProvider } from './src/context/UserContext';

import RootNavigator from './src/navigation/RootNavigator'; // ✅ Correct import

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        <CartProvider>
          <WishlistProvider>
            <NavigationContainer>
              <RootNavigator />
            </NavigationContainer>
          </WishlistProvider>
        </CartProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}
