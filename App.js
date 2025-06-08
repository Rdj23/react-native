import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AuthStack from './src/navigation/AuthStack';
import auth from '@react-native-firebase/auth';
import CleverTap from 'clevertap-react-native';
import { Provider as PaperProvider } from 'react-native-paper';

export default function App() {
  useEffect(() => {
    // Setup CleverTap (optional but good for event tracking)
    CleverTap.setDebugLevel(3);
    CleverTap.initializeInbox();

    const unsubscribe = auth().onAuthStateChanged(user => {
      console.log(user ? 'Signed in:' + user.email : 'Signed out');
    });

    return () => unsubscribe();
  }, []);

  return (
    <PaperProvider>
      <NavigationContainer>
        <AuthStack />
      </NavigationContainer>
    </PaperProvider>
  );
}
