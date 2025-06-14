import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import HomeStack from './HomeStack';
import SearchStack from './SearchStack';
import CartScreen from '../screens/CartScreen';
import ProfileScreen from '../screens/ProfileScreen';

import { useCart } from '../context/CartContext';

const Tab = createBottomTabNavigator();

export default function MainTabs({ route }) {
  const { totalQuantity } = useCart();
  const initialTab = route?.params?.screen || 'Home';

  return (
    <Tab.Navigator
      initialRouteName={initialTab}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Search':
              iconName = 'magnify';
              break;
            case 'Cart':
              iconName = focused ? 'cart' : 'cart-outline';
              break;
            case 'Profile':
              iconName = focused ? 'account' : 'account-outline';
              break;
            default:
              iconName = 'alert-circle-outline';
          }
          return (
            <MaterialCommunityIcons name={iconName} size={24} color={color} />
          );
        },
        tabBarActiveTintColor: '#30241F',
        tabBarInactiveTintColor: '#888',
        tabBarLabelStyle: { fontSize: 12 },
        tabBarStyle: {
          paddingTop: 6,
          paddingBottom: 6,
          height: 60,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          backgroundColor: '#fff',
          elevation: 8,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Search" component={SearchStack} />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarBadge: totalQuantity > 0 ? totalQuantity : undefined,
          tabBarBadgeStyle: {
            backgroundColor: 'red',
            color: 'white',
          },
        }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
