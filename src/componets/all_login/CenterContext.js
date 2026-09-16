// src/context/CenterContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

const CenterContext = createContext();

export const useCenter = () => {
  const context = useContext(CenterContext);
  if (!context) {
    throw new Error('useCenter must be used within a CenterProvider');
  }
  return context;
};

export const CenterProvider = ({ children }) => {
  const [centerData, setCenterData] = useState({
    centerId: '',
    centerName: '',
    isLoggedIn: false,
  });

  useEffect(() => {
    const storedCenterData = localStorage.getItem('centerData');
    if (storedCenterData) {
      setCenterData(JSON.parse(storedCenterData));
    }
  }, []);

  useEffect(() => {
    if (centerData.isLoggedIn) {
      localStorage.setItem('centerData', JSON.stringify(centerData));
    } else {
      localStorage.removeItem('centerData');
    }
  }, [centerData]);

  const setCenter = (id, name) => {
    const newCenterData = {
      centerId: id,
      centerName: name,
      isLoggedIn: true,
    };
    setCenterData(newCenterData);
    localStorage.setItem('centerData', JSON.stringify(newCenterData));
  };

  const clearCenter = () => {
    const clearedCenterData = {
      centerId: '',
      centerName: '',
      isLoggedIn: false,
    };
    setCenterData(clearedCenterData);
    localStorage.removeItem('centerData');
  };

  return (
    <CenterContext.Provider value={{ centerData, setCenter, clearCenter }}>
      {children}
    </CenterContext.Provider>
  );
};