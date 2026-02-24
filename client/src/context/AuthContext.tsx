import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { authApi, setAuthLogoutCallback } from "../lib/api";

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    authenticated: false,
  });

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    authApi.logout().catch(() => {});
    setState({ user: null, loading: false, authenticated: false });
  }, []);

  useEffect(() => {
    setAuthLogoutCallback(() => {
      logout();
    });
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    authApi
      .me()
      .then((res) => {
        const user = res.data?.user;
        if (user) {
          setState({
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
              createdAt: user.createdAt,
            },
            loading: false,
            authenticated: true,
          });
        } else {
          logout();
        }
      })
      .catch(() => {
        logout();
      });
  }, [logout]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { data } = await authApi.login(email, password);
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
      }
      const user = data.user;
      if (user) {
        setState({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
          },
          loading: false,
            authenticated: true,
        });
      }
    },
    []
  );

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      const { data } = await authApi.register(name, email, password);
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
      }
      const user = data.user;
      if (user) {
        setState({
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar,
          },
          loading: false,
          authenticated: true,
        });
      }
    },
    []
  );

  const setUser = useCallback((user: User | null) => {
    setState((s) => ({ ...s, user, authenticated: !!user }));
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    register,
    logout,
    setUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
