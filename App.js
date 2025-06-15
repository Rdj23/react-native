
// App.js
import React, { useEffect } from 'react';
import { Platform, PermissionsAndroid } from 'react-native'; // ✅ FIXED

import messaging from '@react-native-firebase/messaging';     // ✅ FIXED
import CleverTap from 'clevertap-react-native';              // ✅ FIXED

import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { CartProvider } from './src/context/CartContext';
import { WishlistProvider } from './src/context/WishlistContext';
import { UserProvider } from './src/context/UserContext';
import DrawerNavigator from './src/navigation/DrawerNavigator';

export default function App() {

  useEffect(() => {
    const initPush = async () => {
      // ✅ Android 13+ requires runtime permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          CleverTap.recordEvent('Push Permission Granted');
        } else {
          CleverTap.recordEvent('Push Permission Denied');
        }
      }

      // ✅ Create notification channel (required for Android)
      CleverTap.createNotificationChannel(
        'Rohan25',                 // Channel ID
        'React-project',         // Channel Name
        'Testing',   // Description
        5,                         // Importance (max)
        true                       // Show badge
      );

      // ✅ Request FCM/iOS permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        CleverTap.recordEvent('Push Permission Authorized');

        const fcmToken = await messaging().getToken();
        CleverTap.setFCMPushToken(fcmToken); // ✅ Register with CleverTap
        console.log("Firebase Token: " + fcmToken)
      } else {
        CleverTap.recordEvent('Push Permission Not Authorized');
      }

      // ✅ Optional: Notification click listener
      CleverTap.addListener(CleverTap.CleverTapPushNotificationClicked, (event) => {
        console.log('Notification clicked:', event);
        // handle navigation, deep links, etc.
      });
    };

    initPush();
  }, []);

   // In-App listeners (no cleanup)
  useEffect(() => {
    CleverTap.addListener(
      CleverTap.CleverTapInAppNotificationShowed,
      (evt) => {
        console.log('In-App shown:', evt);
        CleverTap.recordEvent('InApp Viewed', { id: evt.id });
      }
    );
    CleverTap.addListener(
      CleverTap.CleverTapInAppNotificationButtonTapped,
      (evt) => {
        console.log('In-App button clicked:', evt);
        CleverTap.recordEvent('InApp Clicked', { id: evt.id, button: evt.buttonText });
      }
    );
    CleverTap.addListener(
      CleverTap.CleverTapInAppNotificationDismissed,
      (evt) => {
        console.log('In-App dismissed:', evt);
      }
    );
  }, []);


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <UserProvider>
        <CartProvider>
          <WishlistProvider>
            <NavigationContainer>
              <DrawerNavigator />
            </NavigationContainer>
          </WishlistProvider>
        </CartProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}
