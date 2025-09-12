// App.js
import React, {useEffect, useState} from 'react';
import {Platform, PermissionsAndroid} from 'react-native';
import messaging from '@react-native-firebase/messaging';

import {NavigationContainer} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import {CartProvider} from './src/context/CartContext';
import {WishlistProvider} from './src/context/WishlistContext';
import {UserProvider} from './src/context/UserContext';
import DrawerNavigator from './src/navigation/DrawerNavigator';
import CleverTap from 'clevertap-react-native';

export default function App() {
  //App Inbox

  useEffect(() => {
    CleverTap.initializeInbox();
  }, []);

  //Push
  useEffect(() => {
    const initPush = async () => {
      // Android 13+ requires runtime permission
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          CleverTap.recordEvent('Push Permission Granted');
        } else {
          CleverTap.recordEvent('Push Permission Denied');
        }
      }

      //  Create notification channel (required for Android)
      CleverTap.createNotificationChannel(
        'Rohan25', // Channel ID
        'React-project', // Channel Name
        'Testing', // Description
        5, // Importance (IMPORTANCE_MAX)
        true, // Show badge
      );

      CleverTap.createNotificationChannelWithSound(
        'test', // Channel ID
        'rohan', // Channel Name
        'Sound', // Description
        5, // Importance (IMPORTANCE_MAX)
        true, // Show badge
        'coinswin.mp3', // Custom sound file
      );

      //   CleverTap.createNotificationChannel(
      //   'Sound', // Channel ID
      //   'Sound', // Channel Name
      //   'Sound', // Description
      //   5, // Importance (IMPORTANCE_MAX)
      //   true, // Show badge
      //   'coinswin.mp3', // Custom sound file
      // );

      CleverTap.addListener(
        CleverTap.CleverTapPushNotificationClicked,
        event => {
          console.log('Notification clicked:', event);
          // handle navigation, deep links, etc.
        },
      );
    };

    initPush();
  }, []);

  // In-App callbacks - will check later
  useEffect(() => {
    CleverTap.addListener(CleverTap.CleverTapInAppNotificationShowed, evt => {
      console.log('In-App shown:', evt);
    });
    CleverTap.addListener(
      CleverTap.CleverTapInAppNotificationButtonTapped,
      evt => {
        console.log('In-App button clicked:', evt);
      },
    );
    CleverTap.addListener(
      CleverTap.CleverTapInAppNotificationDismissed,
      evt => {
        console.log('In-App dismissed:', evt);
        CleverTap.recordEvent('Notification dismissed');
      },
    );
  }, []);

  return (
    <GestureHandlerRootView style={{flex: 1}}>
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
