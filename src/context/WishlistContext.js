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
      return state.includes(id)
        ? state.filter(x => x !== id)
        : [ ...state, id ];
    }
    default:
      return state;
  }
}

export function WishlistProvider({ children }) {
  const { user } = useUser();
  const key       = `wishlist_${user.email}`;

  const [state, dispatch] = useReducer(wishlistReducer, []);

  // load on mount / user change
  useEffect(() => {
    AsyncStorage.getItem(key)
      .then(json => dispatch({ type: 'LOAD', payload: JSON.parse(json) }))
      .catch(() => {});
  }, [key]);

  // persist on change
  useEffect(() => {
    AsyncStorage.setItem(key, JSON.stringify(state)).catch(() => {});
  }, [key, state]);

  const toggleWishlist = id => dispatch({ type: 'TOGGLE', payload: id });
  const isWishlisted   = id => state.includes(id);

  return (
    <WishlistContext.Provider value={{ wishlist: state, toggleWishlist, isWishlisted }}>
      {children}
    </WishlistContext.Provider>
  );
}

// hook for easy consumption
export function useWishlist() {
  return useContext(WishlistContext);
}