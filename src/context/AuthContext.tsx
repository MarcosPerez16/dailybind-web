import { createContext, useContext, useState, useEffect } from "react";
import type { ReactNode } from "react";
import api from "../lib/api";

//shape of our user object
interface User {
  id: string;
  name: string;
  email: string;
  role: "AGENT" | "ADMIN";
}

//shape of everything the context provides
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

//create the context with default of null
const AuthContext = createContext<AuthContextType | null>(null);

//provider wraps the entire app and holds the auth state
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); //true while checking auth status

  //on app load check if user is already logged in via existing cookie
  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null)) //no valid cookie - not logged in
      .finally(() => setLoading(false));
  }, []);

  //call backend login, then fetch and store user info
  async function login(email: string, password: string) {
    await api.post("/auth/login", { email, password });
    const res = await api.get("/auth/me");
    setUser(res.data);
  }

  //call backend logout and clear user from state
  async function logout() {
    await api.post("/auth/logout");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

//custom hook - any component calls useAuth() to get user, login, logout
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
