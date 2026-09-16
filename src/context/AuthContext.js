// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // On initial load, check for a simple 'isLoggedIn' flag
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const storedUser = localStorage.getItem('authUser');
    if (isLoggedIn === 'true') {
      setIsAuthenticated(true);
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse stored authUser', e);
      }
    }
    setIsLoading(false);
  }, []);

  // Simplified login function - accepts a user object and persists it
  const login = (userData = {}) => {
    try {
      localStorage.setItem('isLoggedIn', 'true');
      localStorage.setItem('authUser', JSON.stringify(userData));
      setUser(userData);
      setIsAuthenticated(true);
    } catch (e) {
      console.error('Failed to persist auth user', e);
    }
  };

  const logout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('authUser');
    setUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    isLoading,
    user,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};