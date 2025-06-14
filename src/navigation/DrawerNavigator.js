import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import MainTabs from './MainTabs';
import CustomDrawerContent from '../components/CustomDrawerContent';
import { useUser } from '../context/UserContext'; // ✅ Make sure it's imported
import LoginScreen from '../screens/Auth/LoginScreen'; // Replace with actual path
import RegisterScreen from '../screens/Auth/RegisterScreen';  // Optional

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  const { isLoggedIn } = useUser(); // ✅ Now inside the function

  return (
    <Drawer.Navigator
      screenOptions={{ headerShown: false }}
      drawerContent={(props) => <CustomDrawerContent {...props} />}
    >
      {isLoggedIn ? (
        <>
          <Drawer.Screen name="MainTabs" component={MainTabs} />
        </>
      ) : (
        <>
          <Drawer.Screen name="Login" component={LoginScreen} />
          {/* Optional: */}
          <Drawer.Screen name="Register" component={RegisterScreen} />
        </>
      )}
    </Drawer.Navigator>
  );
}
