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
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("⚠️ Auth state changed:", event);

        if (!mounted) return;

        if (event === "SIGNED_IN" && session?.user) {
          console.log("✅ User signed in, fetching profile...");
          
          let profile = null;
          
          try {
            // ✅ Add timeout - if profile takes too long, just use session user
            const profilePromise = supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .maybeSingle();

            const timeoutPromise = new Promise((resolve) =>
              setTimeout(() => resolve({ data: null, error: "timeout" }), 3000)
            );

            const result: any = await Promise.race([profilePromise, timeoutPromise]);
            
            if (result.error && result.error !== "timeout") {
              console.error("❌ Profile fetch error:", result.error);
            }
            
            profile = result.data;
            
            if (result.error === "timeout") {
              console.warn("⏱️ Profile fetch timed out, using session user only");
            } else {
              console.log("📦 Profile data:", profile);
            }
          } catch (error) {
            console.error("💥 Exception fetching profile:", error);
          }

          // ✅ ALWAYS set user - this is critical
          const userData: UserProfile = {
            ...session.user,
            ...(profile || {}),
          };
          
          console.log("✨ Setting user:", userData);
          setUser(userData);
          setLoading(false);
        } else if (event === "SIGNED_OUT") {
          console.log("👋 User signed out");
          setUser(null);
          setLoading(false);
        }
      }
    );

    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          console.log("🔍 Initial session found");
          
          let profile = null;
          
          try {
            const { data, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .maybeSingle();

            if (error) {
              console.error("❌ Initial profile fetch error:", error);
            }
            
            profile = data;
          } catch (error) {
            console.error("💥 Exception in initial profile fetch:", error);
          }

          const userData: UserProfile = {
            ...session.user,
            ...(profile || {}),
          };

          console.log("✨ Setting initial user:", userData);
          setUser(userData);
        }
      } catch (error) {
        console.error("💥 Initial session check error:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        setUser({
          ...session.user,
          ...(profile || {}),
        });
      }
    } catch (error) {
      console.error("Error in refreshProfile:", error);
    } finally {
      setLoading(false);
    }
  };

  console.log("🎨 Context render - user:", user, "loading:", loading);

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
