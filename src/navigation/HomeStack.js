import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import HomeScreen from '../screens/Home/HomeScreen';
import MovieDetail from '../screens/MovieDetail';
import InboxScreen from '../screens/InboxScreen';
import NativeDisplayScreen from '../screens/NativeDisplayScreen';

const Stack = createStackNavigator();

export default function HomeStack() {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen name="MovieDetail" component={MovieDetail} />
      <Stack.Screen name="Inbox" component={InboxScreen} />
      {/* Blank canvas for testing CleverTap Native Display campaigns */}
      <Stack.Screen name="NativeDisplay" component={NativeDisplayScreen} />
    </Stack.Navigator>
  );
}
