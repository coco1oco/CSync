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
  const getUserFromSession = (sessionUser: any): UserProfile => {
    const meta = sessionUser.user_metadata || {};
    return {
      ...sessionUser,
      id: sessionUser.id,
      email: sessionUser.email,
      avatar_url: meta.avatar_url || null,
      username: meta.username || sessionUser.email?.split("@")[0],
      first_name: meta.full_name?.split(" ")[0] || meta.first_name,
      last_name: meta.full_name?.split(" ")[1] || meta.last_name,
      pronouns: meta.pronouns,
      role: meta.role || "user",
    };
  };

  // Helper: Fetch authoritative data from DB
  // Helper: Fetch authoritative data from DB
  // Added 'retries' parameter for robustness
  // Helper: Fetch authoritative data from DB
  // Added 'retries' parameter for robustness against Free Tier "Cold Starts"
  const fetchProfileSafe = async (
    userId: string,
    sessionUser: any,
    retries = 1
  ) => {
    try {
      const fetchPromise = supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      // INCREASED TIMEOUT: Changed 10000 (10s) to 20000 (20s)
      // This gives the Free Tier database time to "wake up" from inactivity.
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timeout")), 20000)
      );

      const result: any = await Promise.race([fetchPromise, timeoutPromise]);

      if (result.error) throw result.error;
      return result.data || null;
    } catch (err) {
      // NEW: Simple Retry Logic
      // If the DB was sleeping, the first request might fail/timeout.
      // We immediately try one more time, which usually succeeds.
      if (retries > 0) {
        console.log(
          `Profile fetch failed, retrying... (${retries} attempts left)`
        );
        return fetchProfileSafe(userId, sessionUser, retries - 1);
      }

      console.warn("⚠️ Profile fetch issue:", err);

      // Fallback: If DB fails, check Admin allowlist so they aren't locked out
      if (sessionUser?.email && ADMIN_EMAILS.includes(sessionUser.email)) {
        return { role: "admin" };
      }
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    // 1. Initial Session Load (Blocking)
    const initSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const instantUser = getUserFromSession(session.user);

          // Wait for DB profile before setting loading=false
          // This prevents the "user" -> "admin" flash/bug
          const dbProfile = await fetchProfileSafe(
            session.user.id,
            session.user
          );

          if (mounted) {
            setUser({ ...instantUser, ...(dbProfile || {}) });
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initSession();

    // 2. Auth State Listener (Real-time updates)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        // On explicit sign-in, we can show the UI faster but still fetch profile
        const instantUser = getUserFromSession(session.user);
        setUser(instantUser); // Show something immediately

        const dbProfile = await fetchProfileSafe(session.user.id, session.user);
        if (mounted && dbProfile) {
          setUser((prev) => ({ ...prev, ...instantUser, ...dbProfile }));
        }
        setLoading(false);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setLoading(false);
      }
    });

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
      const instantUser = getUserFromSession(session.user);
      const dbProfile = await fetchProfileSafe(session.user.id, session.user);
      if (dbProfile) {
        setUser({ ...instantUser, ...dbProfile });
      } else {
        setUser(instantUser);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
