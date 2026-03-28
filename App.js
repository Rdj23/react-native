// App.js
//
// Root of the application. Responsibilities:
//   1. Wraps the entire tree with context providers (UserProvider, MovieCartProvider)
//   2. Initializes CleverTap App Inbox on mount
//   3. Requests push notification permission (Android 13+) and creates
//      notification channels used by CleverTap push campaigns
//   4. Registers global In-App notification callbacks (shown / button tapped / dismissed)
//
// CleverTap accounts wired up in this app:
//   Dashboard 1 (Primary)   → handled by `clevertap-react-native` default import
//                              push, in-app messages, App Inbox, event analytics
//   Dashboard 2 (Secondary) → handled by CleverTapSecondary native module
//                              (src/services/CleverTapSecondary.js)
//                              separate Account ID & Token, initialized natively
//
import React, {useEffect, useState} from 'react';
import {Platform, PermissionsAndroid} from 'react-native';
import messaging from '@react-native-firebase/messaging';

import {NavigationContainer} from '@react-navigation/native';
import {GestureHandlerRootView} from 'react-native-gesture-handler';

import {UserProvider} from './src/context/UserContext';
import {MovieCartProvider} from './src/context/MovieCartContext';
import DrawerNavigator from './src/navigation/DrawerNavigator';
import CleverTap from 'clevertap-react-native';
import {initialize as initInbox} from './src/services/InboxService';

export default function App() {
  // Initializes the App Inbox SDK on the primary CleverTap instance.
  // Must run before any screen tries to fetch inbox messages.
  // InboxService.initialize() → CleverTap.initializeInbox()
  useEffect(() => {
    initInbox();
  }, []);

  // Handles push notification setup for both Android and iOS.
  //   - Android 13+ requires an explicit POST_NOTIFICATIONS runtime permission.
  //   - createNotificationChannel sets up the channel that CleverTap uses when
  //     delivering push on Android 8+. Channel ID must match what is configured
  //     in the CleverTap Dashboard 1 push campaign settings.
  //   - createNotificationChannelWithSound adds a second channel with a custom
  //     sound (coinswin.mp3 — must be in android/app/src/main/res/raw/).
  //   - CleverTapPushNotificationClicked listener fires when the user taps a
  //     push notification; use it for deep-link navigation handling.
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

  // Global callbacks for CleverTap In-App notification lifecycle (Dashboard 1).
  //   CleverTapInAppNotificationShowed     → fires when an in-app renders on screen
  //   CleverTapInAppNotificationButtonTapped → fires when the user taps a CTA button
  //   CleverTapInAppNotificationDismissed  → fires on swipe/close; also records
  //                                          a 'Notification dismissed' event so
  //                                          we can track dismissal rate in Dashboard 1
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
      {/* UserProvider — exposes Firebase auth user across all screens */}
      <UserProvider>
        {/* MovieCartProvider — global cart state (items, total, add/remove) */}
        <MovieCartProvider>
          <NavigationContainer>
            {/* DrawerNavigator — root navigator; wraps MainTabs + drawer menu */}
            <DrawerNavigator />
          </NavigationContainer>
        </MovieCartProvider>
      </UserProvider>
    </GestureHandlerRootView>
  );
}
