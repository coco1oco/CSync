import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type UserProfile = {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  role?: "user" | "admin";
  [key: string]: any;
};

type AuthContextProps = {
  user: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadUser = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Session:", session); // Debug: see if session exists
      
      if (session?.user) {
        console.log("Fetching profile for user:", session.user.id);
        
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        console.log("Profile error:", error); // Debug: see if there's an error
        console.log("Profile data:", profile); // Debug: see the profile

        if (error) {
          console.error("Error fetching profile:", error);
          setUser(null);
        } else if (profile) {
          console.log("Setting user with profile:", { ...session.user, ...profile });
          setUser({ ...session.user, ...profile });
        }
      } else {
        console.log("No session found");
        setUser(null);
      }
    } catch (error) {
      console.error("Error loading user:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  loadUser();

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (event, session) => {
      console.log("Auth state changed:", event, session);
      
      if (session?.user) {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        console.log("onAuthStateChange - Profile:", profile, "Error:", error);

        if (profile) {
          setUser({ ...session.user, ...profile });
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    }
  );

  return () => subscription?.unsubscribe();
}, []);


  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshProfile = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profile) {
        setUser({ ...session.user, ...profile });
      }
    }
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
