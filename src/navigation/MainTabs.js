import React from 'react';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
// Navigators or Screens

import HomeStack from './HomeStack';
import SearchStack from './SearchStack'; // ✅ NOT SearchScreen directly
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarIcon: ({focused, color, size}) => {
          let iconName;

          if (route.name === 'Home')
            iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'Search')
            iconName = focused ? 'magnify' : 'magnify';
          else if (route.name === 'Cart')
            iconName = focused ? 'cart' : 'cart-outline';
          else if (route.name === 'Profile')
            iconName = focused ? 'account-circle' : 'account-circle-outline';

          return (
            <MaterialCommunityIcons name={iconName} size={24} color={color} />
          );
        },
        tabBarActiveTintColor: '#30241F',
        tabBarInactiveTintColor: '#888',
        tabBarLabelStyle: {fontSize: 12},
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: 6,
          height: 60,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          backgroundColor: '#fff',
          elevation: 8,
        },
      })}>
      {/* ✅ Each must be a <Tab.Screen> */}
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Search" component={SearchStack} />
      <Tab.Screen name="Cart" component={CartScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
