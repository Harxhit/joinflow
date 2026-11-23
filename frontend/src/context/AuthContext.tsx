import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import api from "../services/api";


export type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type SignupInput = {
  name: string;
  email: string;
  password: string;
};

type AuthValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (input: SignupInput) => Promise<User>;
  logout: () => Promise<void>;
};

type Raw = Record<string, unknown>;

function toUser(raw: Raw): User {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    role: String(raw.role ?? "student")
  };
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setSession = useCallback((next: User | null) => {
    setUser(next);
  }, []);

  const fetchMe = useCallback(async () => {
    const { data } = await api.get("/auth/me");

    return toUser(data.data.user as Raw);
  }, []);

  useEffect(() => {
    fetchMe()
      .then(setSession)
      .catch((error: { response?: { status?: number } }) => {
        if (error.response?.status === 401) {
          setSession(null);
        } else {
          console.error("Failed to restore authentication:", error);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [fetchMe, setSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      await api.post("/auth/login", {
        email,
        password,
      });

      const me = await fetchMe();

      setSession(me);

      return me;
    },
    [fetchMe, setSession]
  );

  const signup = useCallback(
    async (input: SignupInput) => {
      await api.post("/auth/signup", input);

      const me = await fetchMe();

      setSession(me);

      return me;
    },
    [fetchMe, setSession]
  );

  const logout = useCallback(async () => {
    try {
      await api.patch("/auth/logout");
    } finally {
      setSession(null);
    }
  }, [setSession]);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      signup,
      logout,
    }),
    [user, loading, login, signup, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside <AuthProvider>"
    );
  }

  return context;
}
