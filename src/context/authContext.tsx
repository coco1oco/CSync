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

  // Helper: Extract usable profile data directly from Session Metadata
  // This allows the UI to render instantly without waiting for the DB
  const getUserFromSession = (sessionUser: any): UserProfile => {
    const meta = sessionUser.user_metadata || {};
    return {
      ...sessionUser,
      id: sessionUser.id,
      email: sessionUser.email,
      // Metadata is the "fast" source of truth
      avatar_url: meta.avatar_url || null,
      username: meta.username || sessionUser.email?.split("@")[0],
      first_name: meta.full_name?.split(" ")[0] || meta.first_name,
      last_name: meta.full_name?.split(" ")[1] || meta.last_name,
      pronouns: meta.pronouns,
      // Default role to 'user', DB will override if 'admin'
      role: meta.role || "user",
    };
  };

  // Helper: Fetch authoritative data from DB (slower but accurate for roles)
  const fetchProfileSafe = async (userId: string, sessionUser: any) => {
    try {
      const fetchPromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      // 10s timeout
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timeout")), 10000)
      );

      const result: any = await Promise.race([fetchPromise, timeoutPromise]);

      if (result.error) throw result.error;
      return result.data || null;
    } catch (err) {
      console.warn("⚠️ Profile fetch issue (background):", err);

      // Fallback: If DB fails, check Admin allowlist
      if (sessionUser?.email && ADMIN_EMAILS.includes(sessionUser.email)) {
        return { role: "admin" };
      }
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        // 1. INSTANT: Set user from session metadata
        const instantUser = getUserFromSession(session.user);
        setUser(instantUser);
        setLoading(false); // Unblock the UI immediately

        // 2. BACKGROUND: Fetch DB profile to update roles/details
        const dbProfile = await fetchProfileSafe(session.user.id, session.user);

        if (mounted && dbProfile) {
          // Merge DB data on top of session data
          setUser((prev) => ({ ...prev, ...instantUser, ...dbProfile }));
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setLoading(false);
      }
    });

    // Initial Load Logic
    const initSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          // 1. INSTANT
          const instantUser = getUserFromSession(session.user);
          if (mounted) {
            setUser(instantUser);
            setLoading(false);
          }

          // 2. BACKGROUND
          const dbProfile = await fetchProfileSafe(
            session.user.id,
            session.user
          );
          if (mounted && dbProfile) {
            setUser((prev) => ({ ...prev, ...instantUser, ...dbProfile }));
          }
        } else {
          if (mounted) setLoading(false);
        }
      } catch (error) {
        console.error("Session check error:", error);
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
      // Re-run the instant + background sync
      const instantUser = getUserFromSession(session.user);
      setUser(instantUser);

      const dbProfile = await fetchProfileSafe(session.user.id, session.user);
      if (dbProfile) {
        setUser({ ...instantUser, ...dbProfile });
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
