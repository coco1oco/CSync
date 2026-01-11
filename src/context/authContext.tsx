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
  updatePassword: (
    currentPassword: string,
    newPassword: string
  ) => Promise<void>;
};

const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  updatePassword: async (currentPassword: string, newPassword: string) => {},

  // ...existing code...
});

export const useAuth = () => useContext(AuthContext);

const getUserFromSession = (sessionUser: any): UserProfile => {
  const meta = sessionUser.user_metadata || {};
  return {
    ...sessionUser,
    id: sessionUser.id,
    email: sessionUser.email,
    avatar_url: meta.avatar_url || null,
    username: meta.username || sessionUser.email?.split("@")[0],
    // ✅ FIX 1: Prioritize explicit fields over split logic
    first_name: meta.first_name || meta.full_name?.split(" ")[0] || null,
    last_name: meta.last_name || meta.full_name?.split(" ")[1] || null,
    pronouns: meta.pronouns,
    role: meta.role || "user",
    bio: meta.bio || null,
    contact_number: meta.contact_number || null,
  };
};
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const ADMIN_EMAILS = ["kmirafelix@gmail.com", "admin@pawpal.com"];

  // Move fetchProfileSafe inside AuthProvider so setUser is in scope
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

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Profile fetch timeout")), 5000)
      );

      const result: any = await Promise.race([fetchPromise, timeoutPromise]);

      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch profile");
      }

      const db = result.data;
      const meta = sessionUser.user_metadata || {};

      if (db) {
        const needsSync =
          db.role !== meta.role ||
          db.avatar_url !== meta.avatar_url ||
          db.username !== meta.username ||
          db.first_name !== meta.first_name ||
          db.contact_number !== meta.contact_number ||
          // ✅ ADD THIS LINE:
          db.bio !== meta.bio ||
          db.banned_at !== meta.banned_at ||
          db.deleted_at !== meta.deleted_at;
        if (needsSync) {
          console.log("♻️ Syncing full profile to session cache...");
          await supabase.auth.updateUser({
            data: {
              role: db.role,
              avatar_url: db.avatar_url,
              username: db.username,
              first_name: db.first_name,
              last_name: db.last_name,
              pronouns: db.pronouns,
              bio: db.bio,
              contact_number: db.contact_number,
              banned_at: db.banned_at,
              deleted_at: db.deleted_at,
            },
          });
        }
      }

      return result.data || null;
    } catch (err: any) {
      if (retries > 0) {
        console.warn(`Profile fetch failed, retrying... (${retries} left)`);
        return fetchProfileSafe(userId, sessionUser, retries - 1);
      }
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
          if (mounted) setUser(instantUser);

          const dbProfile = await fetchProfileSafe(
            session.user.id,
            session.user
          );

          if (mounted) {
            setUser((prev) => ({
              ...(prev || instantUser),
              ...(dbProfile || {}),
            }));
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
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

        // ✅ FIX 2: PREVENT FLICKER / DOWNGRADE
        // If we already have the full profile for this user, keep it!
        // Don't overwrite it with the partial 'instantUser' while we wait for the DB.
        setUser((prev) => {
          if (prev && prev.id === instantUser.id) {
            return prev;
          }
          return instantUser;
        });

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

  // ✅ ADD THIS FUNCTION
  const updatePassword = async (
    currentPassword: string,
    newPassword: string
  ) => {
    // First, verify the current password by attempting reauthentication
    if (!user?.email) {
      throw new Error("User email not found");
    }

    try {
      // Verify current password by signing in with current credentials
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Current password is incorrect");
      }

      // If verification succeeds, update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error(updateError.message || "Failed to update password");
      }
    } catch (error: any) {
      throw new Error(error.message || "Failed to change password");
    }
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
    () => ({ user, loading, signOut, refreshProfile, updatePassword }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
