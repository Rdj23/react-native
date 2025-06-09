import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './src/navigation/AuthStack';
import auth from '@react-native-firebase/auth';
import CleverTap from 'clevertap-react-native';

export default function App() {
  useEffect(() => {
    CleverTap.setDebugLevel(3);
    CleverTap.initializeInbox();

    const unsubscribe = auth().onAuthStateChanged(user => {
      console.log(user ? 'Signed in' : 'Signed out');
    });

    return () => unsubscribe();
  }, []);

  return (
    <NavigationContainer>
      <AuthStack />
    </NavigationContainer>
  );
}
