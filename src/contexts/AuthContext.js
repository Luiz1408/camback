import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { setLogoutHandler } from '../services/api';

const TOKEN_STORAGE_KEY = 'token';
const USER_STORAGE_KEY = 'user';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearPersistentValues = (storage) => {
    try {
      storage.removeItem(TOKEN_STORAGE_KEY);
      storage.removeItem(USER_STORAGE_KEY);
    } catch (error) {}
  };

  const writePersistentValues = (storage, token, userInfo) => {
    try {
      storage.setItem(TOKEN_STORAGE_KEY, token);
      storage.setItem(USER_STORAGE_KEY, JSON.stringify(userInfo));
    } catch (error) {}
  };

  const buildUserFromStorage = (rawUser) => {
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser);
    } catch (error) {
      return null;
    }
  };

  const persistSession = useCallback((token, userInfo) => {
    if (!token || !userInfo) {
      return;
    }

    writePersistentValues(localStorage, token, userInfo);
    writePersistentValues(sessionStorage, token, userInfo);

    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    setCurrentUser(userInfo);
  }, []);

  const clearSession = useCallback(() => {
    clearPersistentValues(localStorage);
    clearPersistentValues(sessionStorage);

    delete api.defaults.headers.common.Authorization;
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    const initializeSession = () => {
      let token = null;
      let storedUser = null;

      try {
        token = localStorage.getItem(TOKEN_STORAGE_KEY) ?? sessionStorage.getItem(TOKEN_STORAGE_KEY);
        const rawUser = localStorage.getItem(USER_STORAGE_KEY) ?? sessionStorage.getItem(USER_STORAGE_KEY);
        storedUser = buildUserFromStorage(rawUser);
      } catch (error) {
        token = null;
        storedUser = null;
      }

      if (token && storedUser) {
        persistSession(token, storedUser);
      } else {
        clearSession();
      }

      setLoading(false);
    };

    initializeSession();
  }, [clearSession, persistSession]);

  useEffect(() => {
    setLogoutHandler(() => {
      clearSession();
    });

    return () => setLogoutHandler(null);
  }, [clearSession]);

  const login = async (username, password) => {
    try {
      const { data } = await api.post('/Auth/login', {
        username,
        password,
      });

      const userInfo = {
        username: data.username,
        fullName: data.fullName,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        expiresAt: data.expiresAt,
      };

      persistSession(data.token, userInfo);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Error al iniciar sesión',
      };
    }
  };

  const register = async ({ username, password, firstName, lastName, roleId }) => {
    try {
      const { data } = await api.post('/Auth/register', {
        username,
        password,
        firstName,
        lastName,
        roleId,
      });

      const userInfo = {
        username: data.username,
        fullName: data.fullName,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        expiresAt: data.expiresAt,
      };

      persistSession(data.token, userInfo);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.message || 'Error al registrarse',
      };
    }
  };

  const logout = () => {
    clearSession();
  };

  const value = {
    currentUser,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
