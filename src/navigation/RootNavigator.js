import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';

import AuthStack from './AuthStack';
import DrawerNavigator from './DrawerNavigator';
import ProductScreen from '../screens/ProductScreen';
import {useUser} from '../context/UserContext';

const Stack = createStackNavigator();

export default function RootNavigator() {
  const {isLoggedIn, ready} = useUser();

  if (!ready) {
    return (
      <View style={{flex: 1, justifyContent: 'center', alignItems: 'center'}}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
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
