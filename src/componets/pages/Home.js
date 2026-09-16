import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Login from '../all_login/Login'

function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // If user is already authenticated, redirect based on login type
    if (!isLoading && isAuthenticated) {
      if (user && user.loginType === 'demand') {
        navigate('/DemandGenerate/CenterwiseEntry', { replace: true });
      } else {
        navigate('/MonthReport', { replace: true });
      }
    }
  }, [isAuthenticated, isLoading, navigate, user]);

  return (
    <div>
        <Login />
    </div>
  )
}

export default Home