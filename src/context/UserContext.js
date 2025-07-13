// src/context/UserContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState(null);     
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [ready, setReady] = useState(false); // NEW

  useEffect(() => {
    const loadUser = async () => {
      try {
        const json = await AsyncStorage.getItem('user');
        if (json) {
          const savedUser = JSON.parse(json);
          setUser(savedUser);
          setIsLoggedIn(true);
        }
      } catch (e) {
        console.warn('⚠️ Failed to load user from storage', e);
      } finally {
        setReady(true); // ✅ done loading
      }
    };

    loadUser();
  }, []);
  
  const login = async (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
    await AsyncStorage.setItem('user', JSON.stringify(userData));
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
    await AsyncStorage.removeItem('user');
  };

  // ✅ Load user from AsyncStorage on mount
  useEffect(() => {
    const restoreUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          setUser(parsed);
          setIsLoggedIn(true);
        }
      } catch (e) {
        console.warn('🔴 Failed to load user from AsyncStorage:', e);
      } finally {
        setReady(true);
      }
    };

    restoreUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, isLoggedIn, login, logout, ready }}>
      {children}
    </UserContext.Provider>
  );

  
}
export function useUser() {
  return useContext(UserContext);
}