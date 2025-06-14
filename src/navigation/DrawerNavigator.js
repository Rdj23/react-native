import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import MainTabs from './MainTabs';
import CustomDrawerContent from '../components/CustomDrawerContent'; // You already have this

const Drawer = createDrawerNavigator();
export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      <Drawer.Screen name="Home" component={MainTabs} initialParams={{ screen: 'Home' }} />
      <Drawer.Screen name="Search" component={MainTabs} initialParams={{ screen: 'Search' }} />
      <Drawer.Screen name="Cart" component={MainTabs} initialParams={{ screen: 'Cart' }} />
      <Drawer.Screen name="Profile" component={MainTabs} initialParams={{ screen: 'Profile' }} />
    </Drawer.Navigator>
  );
}
