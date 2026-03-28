/**
 * MovieCartContext — manages a shopping cart of movies/series.
 *
 * Each cart item stores nested movie metadata suitable for CleverTap's
 * nested object ingestion (max 3 levels deep).
 *
 * Cart item shape:
 *   { id, title, type, posterPath, releaseDate, overview, price, rentalPlan?, backdrop }
 */
import React, {createContext, useContext, useReducer, useCallback} from 'react';

const MovieCartContext = createContext();

const initialState = {items: []};

function reducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      // Prevent duplicates (same id + same rentalPlan)
      const exists = state.items.find(
        i => i.id === action.payload.id && i.rentalPlan === action.payload.rentalPlan,
      );
      if (exists) return state;
      return {items: [...state.items, action.payload]};
    }
    case 'REMOVE':
      return {items: state.items.filter((_, i) => i !== action.index)};
    case 'CLEAR':
      return {items: []};
    default:
      return state;
  }
}

export function MovieCartProvider({children}) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addToCart = useCallback(item => {
    dispatch({type: 'ADD', payload: item});
  }, []);

  const removeFromCart = useCallback(index => {
    dispatch({type: 'REMOVE', index});
  }, []);

  const clearCart = useCallback(() => {
    dispatch({type: 'CLEAR'});
  }, []);

  const totalAmount = state.items.reduce((sum, i) => sum + (i.price || 0), 0);

  return (
    <MovieCartContext.Provider
      value={{
        cartItems: state.items,
        addToCart,
        removeFromCart,
        clearCart,
        totalAmount,
        cartCount: state.items.length,
      }}>
      {children}
    </MovieCartContext.Provider>
  );
}

export function useMovieCart() {
  const ctx = useContext(MovieCartContext);
  if (!ctx) throw new Error('useMovieCart must be used within MovieCartProvider');
  return ctx;
}
