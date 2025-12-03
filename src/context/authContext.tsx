import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type UserProfile = {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  role?: "user" | "admin";
  first_name?: string;
  last_name?: string;
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // --- 🛡️ DEMO CONFIGURATION ---
  const ADMIN_EMAILS = ["kmirafelix@gmail.com", "admin@pawpal.com"];

  // Helper to fetch profile with a hard timeout + Fallback
  const fetchProfileSafe = async (userId: string, sessionUser: any) => {
    try {
      const fetchPromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timeout")), 5000)
      );

      const result: any = await Promise.race([fetchPromise, timeoutPromise]);

      if (result.error) throw result.error;
      return result.data;
    } catch (err) {
      console.warn("⚠️ Profile fetch timed out/failed:", err);

      // 🚀 DEMO FAIL-SAFE:
      // If DB fails, construct a "Fake Profile" using Google data + Force Admin
      const userEmail = sessionUser?.email;

      if (userEmail && ADMIN_EMAILS.includes(userEmail)) {
        console.log("🛡️ Applying Demo Admin Fallback for:", userEmail);

        // Grab metadata from Google login (avatar, full name)
        const meta = sessionUser?.user_metadata || {};

        return {
          id: userId,
          role: "admin",
          email: userEmail,
          username: meta.name || userEmail.split("@")[0],
          first_name: meta.full_name?.split(" ")[0] || "Admin",
          last_name: meta.full_name?.split(" ")[1] || "User",
          avatar_url: meta.avatar_url || meta.picture || null, // Keep the Google picture!
        };
      }

      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Handle Auth State Changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        const profile = await fetchProfileSafe(session.user.id, session.user);

        if (mounted) {
          // Merge Session Data with Profile Data
          const mergedUser = {
            ...session.user,
            // Default to metadata avatar if profile is missing one
            avatar_url: session.user.user_metadata?.avatar_url,
            ...(profile || {}),
          };
          setUser(mergedUser);
          setLoading(false);
        }
      } else if (event === "SIGNED_OUT") {
        if (mounted) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    // 2. Initial Load
    const initSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const profile = await fetchProfileSafe(session.user.id, session.user);

          if (mounted) {
            const mergedUser = {
              ...session.user,
              avatar_url: session.user.user_metadata?.avatar_url,
              ...(profile || {}),
            };
            setUser(mergedUser);
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

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
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const profile = await fetchProfileSafe(session.user.id, session.user);
      if (profile) setUser({ ...session.user, ...profile });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
