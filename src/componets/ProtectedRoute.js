// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from 'react-bootstrap/Spinner'; // Using a Bootstrap spinner for loading


// allowedLoginTypes: optional array like ['regular'] or ['demand']
const ProtectedRoute = ({ children, allowedLoginTypes }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) {
    // Show a loading spinner while checking authentication status
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }
  // If not authenticated, redirect to the home page ("/")
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // If allowedLoginTypes is provided, enforce it
  if (allowedLoginTypes && allowedLoginTypes.length > 0) {
    const loginType = (user && user.loginType) || 'admin';
    if (!allowedLoginTypes.includes(loginType)) {
      // If user is a demand user, send them to DemandGenerate/CenterwiseEntry
      if (loginType === 'demand') {
        return <Navigate to="/DemandGenerate/CenterwiseEntry" replace />;
      }
      // If user is a nursery user, send them to NurseryPhysicalEntry
      if (loginType === 'nursery') {
        return <Navigate to="/NurseryPhysicalEntry" replace />;
      }
      // Fallback: send to Dashboard
      return <Navigate to="/Dashboard" replace />;
    }
  }

  // If authenticated and allowed, render the child components
  return children;
};

export default ProtectedRoute;