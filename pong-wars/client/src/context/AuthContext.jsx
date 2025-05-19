import React, { createContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';


const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // トークンの有効性を確認する関数
  const verifyToken = async () => {
    if (!token) return;

    try {
      const res = await fetch('http://192.168.2.127:3001/auth/verify', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();

      if (data.isExpired) {
        setIsTokenExpired(true);
        logout();
        return;
      }

      if (data.user) {
        setUser(data.user);
        setIsTokenExpired(false);
        if (location.pathname === '/' || location.pathname === '/register') {
          navigate('/game');
        }
        else if (location.pathname === '/game') {
          navigate('/game');
        }
        
      } else {
        logout();
      }
    } catch (err) {
      console.error('Token verification error:', err);
      logout();
    }
  };

  // トークンの定期的な確認
  useEffect(() => {
    verifyToken();
    const interval = setInterval(verifyToken, 5 * 60 * 1000); // 5分ごとに確認

    return () => clearInterval(interval);
  }, [token]);

  const login = (newToken, userData) => {
    setUser(userData);
    setToken(newToken);
    setIsTokenExpired(false);
    localStorage.setItem('token', newToken);
    navigate('/game');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    navigate('/');
  };

  const refreshToken = async () => {
    try {
      const res = await fetch('http://192.168.2.127:3001/auth/refresh', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      
      if (data.token) {
        login(data.token, data.user);
      }
    } catch (err) {
      console.error('Token refresh error:', err);
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      logout,
      isTokenExpired,
      refreshToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext, AuthProvider };
export default AuthProvider;