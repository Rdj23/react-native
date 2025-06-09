import React, {createContext, useContext, useReducer} from 'react';

// 1) Create context
const CartContext = createContext();

function cartReducer(state, action) {
  switch (action.type) {
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

  const addToCart = item => dispatch({type: 'ADD', payload: item});
  const incrementItem = variant =>
    dispatch({type: 'INCREMENT', payload: variant});
  const decrementItem = variant =>
    dispatch({type: 'DECREMENT', payload: variant});

  const totalQuantity = cartItems.reduce((sum, x) => sum + x.quantity, 0);
  const removeItem = variant => dispatch({ type: 'REMOVE', payload: variant });


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

// 2) Custom hook for use in components
export function useCart() {
  return useContext(CartContext);
}