i// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "../lib/supabaseClient";

interface AuthContextType {
  user: any | null;
  role: "admin" | "user" | null;
  loading: boolean;
  logout: () => void;
}

const authContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<"admin" | "user" | null>(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
const getSession = async () => {
    const { data } = await supabase.auth.getSession();
    const sessionUser = data.session?.user ?? null;
    setUser(sessionUser);

    if (sessionUser) {
        const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", sessionUser.id)
        .single();
        setRole(profile?.role ?? null);
    }
    setLoading(false);
    };

    getSession();
    const { data: listener } = supabase.auth.onAuthStateChange(() => getSession());

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  return (
    <authContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </authContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(authContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

