// src/context/WishlistContext.js
import React, { createContext, useReducer, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from './UserContext';

const WishlistContext = createContext();

function wishlistReducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return action.payload || [];
    case 'TOGGLE': {
      const id = action.payload;
      return state.includes(id) ? state.filter(x => x !== id) : [...state, id];
    }
    default:
      return state;
  }
}

export function WishlistProvider({ children }) {
  const { user } = useUser();               // ✅ safe (inside UserProvider)
  const key = user?.email ? `wishlist_${user.email}` : null;

  const [state, dispatch] = useReducer(wishlistReducer, []);

  /* 📥  LOAD whenever user (key) changes */
  useEffect(() => {
    if (!key) {          // no logged‑in user yet
      dispatch({ type: 'LOAD', payload: [] });
      return;
    }
    AsyncStorage.getItem(key)
      .then(json => dispatch({ type: 'LOAD', payload: JSON.parse(json) }))
      .catch(() => dispatch({ type: 'LOAD', payload: [] }));
  }, [key]);

  /* 💾  SAVE to AsyncStorage whenever wishlist changes */
  useEffect(() => {
    if (!key) return;    // skip if not logged in
    AsyncStorage.setItem(key, JSON.stringify(state)).catch(() => {});
  }, [key, state]);

  const toggleWishlist = id => dispatch({ type: 'TOGGLE', payload: id });
  const isWishlisted   = id => state.includes(id);

  return (
    <WishlistContext.Provider
      value={{ wishlist: state, toggleWishlist, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  return useContext(WishlistContext);
}
