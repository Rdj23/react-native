import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import AuthStack from './AuthStack';
import DrawerNavigator from './DrawerNavigator';
import ProductScreen from '../screens/ProductScreen';
import { useUser } from '../context/UserContext';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const { isLoggedIn } = useUser();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isLoggedIn ? (
        <Stack.Screen name="Auth" component={AuthStack} />
      ) : (
        <>
          <Stack.Screen name="MainApp" component={DrawerNavigator} />
          <Stack.Screen name="Product" component={ProductScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}
