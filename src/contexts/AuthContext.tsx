import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Legacy admin login (optional). Set in .env — never commit real values. */
function getLegacyAdminConfig() {
  const email = import.meta.env.VITE_LEGACY_ADMIN_EMAIL?.trim();
  const password = import.meta.env.VITE_LEGACY_ADMIN_PASSWORD;
  const name = import.meta.env.VITE_LEGACY_ADMIN_NAME?.trim() || 'Admin';
  if (!email || !password) return null;
  return { email, password, name };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('prodg_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    const legacy = getLegacyAdminConfig();
    if (!legacy) return false;

    await new Promise(resolve => setTimeout(resolve, 800));

    if (email === legacy.email && password === legacy.password) {
      const userData = { email, name: legacy.name };
      setUser(userData);
      localStorage.setItem('prodg_user', JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('prodg_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
