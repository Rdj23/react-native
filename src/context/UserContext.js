import React, { createContext, useState, useContext } from 'react';

const UserContext = createContext();

export function UserProvider({ children }) {
  const [user, setUser] = useState({
    name: '',
    email: '',
    phone: '',
    avatarUrl: '',
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const login = (userData) => {
    setUser(userData);
    setIsLoggedIn(true);
  };

  const logout = () => {
    setUser({ name: '', email: '', phone: '', avatarUrl: '' });
    setIsLoggedIn(false);
  };

  return (
    <UserContext.Provider value={{ user, setUser, isLoggedIn, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within a <UserProvider>');
  return ctx;
}