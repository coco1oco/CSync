import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
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

  const ADMIN_EMAILS = ["kmirafelix@gmail.com", "admin@pawpal.com"];

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

  const fetchProfileSafe = async (
    userId: string,
    sessionUser: any,
    retries = 1
  ): Promise<any> => {
   // inside fetchProfileSafe function...

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

      // ✅ FIX IS HERE: Do not throw 'result.error' directly.
      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch profile");
      }

      const db = result.data;
      // ... rest of your success logic ...
      
      return result.data || null;

    } catch (err: any) {
      // ✅ FIX IS HERE: Retry logic must be safe
      if (retries > 0) {
        console.warn(`Profile fetch failed, retrying... (${retries} left)`);
        return fetchProfileSafe(userId, sessionUser, retries - 1);
      }

      // Fallback for admins
      if (sessionUser?.email && ADMIN_EMAILS.includes(sessionUser.email)) {
        return { role: "admin" };
      }
      
      // ✅ FIX IS HERE: Log the error safely
      console.error("Profile fetch gave up:", err.message || "Unknown error");
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session?.user) {
          const instantUser = getUserFromSession(session.user);
          if (mounted) {
            setUser(instantUser);
            setLoading(false); // Unblock UI immediately
          }

          // Fetch detailed profile in background
          const dbProfile = await fetchProfileSafe(
            session.user.id,
            session.user
          );

          if (mounted && dbProfile) {
            setUser((prev) => ({ 
                ...instantUser, 
                ...(prev || {}), 
                ...dbProfile 
            }));
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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === "SIGNED_IN" && session?.user) {
        const instantUser = getUserFromSession(session.user);
        setUser(instantUser);
        setLoading(false);

        const dbProfile = await fetchProfileSafe(session.user.id, session.user);
        if (mounted && dbProfile) {
          setUser((prev) => ({ 
              ...instantUser, 
              ...(prev || {}), 
              ...dbProfile 
          }));
        }
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

  const value = useMemo(
    () => ({ user, loading, signOut, refreshProfile }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};