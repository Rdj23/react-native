import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Context Providers
import { CartProvider } from './src/context/CartContext';
import { WishlistProvider } from './src/context/WishlistContext';

import { UserProvider } from './src/context/UserContext'; // or from auth lib

// Main tab navigator
import MainTabs from './src/navigation/MainTabs';
import ProductScreen from './src/screens/ProductScreen';


const Stack = createStackNavigator();

export default function App() {
  return (
    <UserProvider>
    <CartProvider>
      <WishlistProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Main" component={MainTabs} />
             <Stack.Screen name="Product" component={ProductScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </WishlistProvider>
    </CartProvider>
    </UserProvider>
  );
}
