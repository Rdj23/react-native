// App.js
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import {CartProvider} from './src/context/CartContext';
import {WishlistProvider} from './src/context/WishlistContext';
import {UserProvider, useUser} from './src/context/UserContext';
import DrawerNavigator from './src/navigation/DrawerNavigator';

import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <UserProvider>
        <CartProvider>
          <WishlistProvider>
            <NavigationContainer>
              <DrawerNavigator/>
            </NavigationContainer>
          </WishlistProvider>
        </CartProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}
