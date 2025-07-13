// src/navigation/SearchStack.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import SearchScreen  from '../screens/Search/SearchScreen.js';
import ProductScreen from '../screens/ProductScreen';

const Stack = createStackNavigator();

export default function SearchStack() {
  return (
    <Stack.Navigator>
    
      <Stack.Screen
        name="SearchMain"
        component={SearchScreen}
        options={{ headerShown: false }}
      />

      {/* same for Product (you already have your own back button there) */}
      <Stack.Screen
        name="Product"
        component={ProductScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}