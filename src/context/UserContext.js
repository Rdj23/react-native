// src/context/UserContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CleverTap from 'clevertap-react-native';
import CleverTapSecondary from '../services/CleverTapSecondary';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);   //to manage global state of the user around the application.
  const [isLoggedIn, setIsLoggedIn] = useState(false); //check if the user is logged in or not and then decide to show the app or auth screens.
  const [ready, setReady] = useState(false); //to avoid login screen for split of second , the RN component rendered before async finish.
  const [mockSubscriptionTier, setMockSubscriptionTier] = useState('free'); // 'free' or 'premium' — dev toggle for paywall testing

  // Sync subscription tier to both dashboards whenever it changes
  // Per docs: after updating user properties used in PE segments,
  // immediately call fetchVariables to re-evaluate segments.
  // PE Variables are defined on Dashboard 2 (secondary), so the re-evaluation
  // fetch must run on CleverTapSecondary, not the default (primary) instance.
  useEffect(() => {
    if (isLoggedIn) {
      CleverTap.profileSet({ 'Subscription Tier': mockSubscriptionTier });
      CleverTapSecondary?.profileSet?.({ 'Subscription Tier': mockSubscriptionTier });

      // Re-evaluate PE segments immediately after profile update
      CleverTapSecondary?.fetchVariables?.()?.then((success) => {
        console.log('[UserContext] fetchVariables after tier change:', success);
      });
    }
  }, [mockSubscriptionTier, isLoggedIn]);

  // Sync user identity to Dashboard 2 (secondary) so profiles are identifiable
  useEffect(() => {
    if (isLoggedIn && user?.email) {
      const identity = { Email: user.email };
      if (user.name) identity.Name = user.name;
      if (user.phone) identity.Phone = user.phone;
      identity['Subscription Tier'] = mockSubscriptionTier;
      CleverTapSecondary?.onUserLogin?.(identity);
    }
  }, [isLoggedIn, user?.email]);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const json = await AsyncStorage.getItem('user');  //ceheck if there is any save user in the storage.
        if (json) {
          const savedUser = JSON.parse(json);
          setUser(savedUser);
          setIsLoggedIn(true);
        }
      } catch (e) {
        console.warn('Failed to load user from storage', e);
      } finally {
        setReady(true); //  done loading proceed for UI loading
      }
    };

    loadUser();
  }, []);
  
  const login = async (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    await AsyncStorage.setItem('user', JSON.stringify(userData)); //vvimp if the user kills the app it will keep the state do not need to login again
  };

  const logout = async () => {
    setUser({
      name: '',
      email: '',
      phone: '',
      avatarUrl: '',
      preferences: {
        whatsapp: false,
        push: true,
        sms: false,
        email: true,
      },
    });
    setIsLoggedIn(false);
    await AsyncStorage.removeItem('user'); //clear user data and delete the user from the storage
  };

  
  // useEffect(() => {
  //   const restoreUser = async () => {
  //     try {
  //       const storedUser = await AsyncStorage.getItem('user');
  //       if (storedUser) {
  //         const parsed = JSON.parse(storedUser);
  //         setUser(parsed);
  //         setIsLoggedIn(true);
  //       }
  //     } catch (e) {
  //       console.warn('Failed to load user from AsyncStorage:', e);
  //     } finally {
  //       setReady(true);
  //     }
  //   };

  //   restoreUser();
  // }, []);

  return (
    <UserContext.Provider value={{ user, setUser, isLoggedIn, login, logout, ready, mockSubscriptionTier, setMockSubscriptionTier }}>
      {children}
    </UserContext.Provider>
  );

  
}
export function useUser() {
  return useContext(UserContext);
}
