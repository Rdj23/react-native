import React, {createContext, useContext, useReducer, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext();

function cartReducer(state, action) {
  switch (action.type) {
    case 'SET':
      return action.payload;

    case 'ADD': {
      const item = action.payload;
      const existing = state.find(
        x => x.id === item.id && x.color === item.color && x.size === item.size,
      );
      if (existing) {
        return state.map(x =>
          x === existing ? {...x, quantity: x.quantity + 1} : x,
        );
      }
      return [...state, {...item, quantity: 1}];
    }

    case 'INCREMENT': {
      const {id, color, size} = action.payload;
      return state.map(x =>
        x.id === id && x.color === color && x.size === size
          ? {...x, quantity: x.quantity + 1}
          : x,
      );
    }

    case 'DECREMENT': {
      const {id, color, size} = action.payload;
      return state.map(x =>
        x.id === id && x.color === color && x.size === size
          ? {...x, quantity: Math.max(1, x.quantity - 1)}
          : x,
      );
    }

    case 'REMOVE': {
      const {id, color, size} = action.payload;
      return state.filter(
        x => !(x.id === id && x.color === color && x.size === size),
      );
    }

    default:
      return state;
  }
}

export function CartProvider({children}) {
  const [cartItems, dispatch] = useReducer(cartReducer, []);

  // ✅ Load cart from AsyncStorage on mount
  useEffect(() => {
    const loadCart = async () => {
      try {
        const stored = await AsyncStorage.getItem('cart');
        if (stored) {
          dispatch({type: 'SET', payload: JSON.parse(stored)});
        }
      } catch (e) {
        console.warn('❌ Failed to load cart from storage:', e);
      }
    };
    loadCart();
  }, []);

  // ✅ Save cart to AsyncStorage whenever it changes
  useEffect(() => {
    AsyncStorage.setItem('cart', JSON.stringify(cartItems)).catch(e =>
      console.warn('❌ Failed to save cart:', e),
    );
  }, [cartItems]);

  const addToCart = item => dispatch({type: 'ADD', payload: item});
  const incrementItem = variant =>
    dispatch({type: 'INCREMENT', payload: variant});
  const decrementItem = variant =>
    dispatch({type: 'DECREMENT', payload: variant});
  const removeItem = variant => dispatch({type: 'REMOVE', payload: variant});

  const totalQuantity = cartItems.reduce((sum, x) => sum + x.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        incrementItem,
        decrementItem,
        removeItem,
        totalQuantity,
      }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
