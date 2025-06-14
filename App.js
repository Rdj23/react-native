import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Context Providers
import { CartProvider } from './src/context/CartContext';
import { WishlistProvider } from './src/context/WishlistContext';

import { UserProvider } from './src/context/UserContext'; // or from auth lib

// Main tab navigator
import MainTabs from './src/navigation/MainTabs';
import ProductScreen from './src/screens/ProductScreen';
import DrawerNavigator from './src/navigation/DrawerNavigator';


const Stack = createStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        <CartProvider>
          <WishlistProvider>
            <NavigationContainer>
              <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="Main" component={DrawerNavigator} />
                <Stack.Screen name="Product" component={ProductScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </WishlistProvider>
        </CartProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}
