import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { supabase } from "@/lib/supabaseClient";

// Explicit, typed profile — no [key: string]: any escape hatch
type UserProfile = {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  // Role is ONLY ever populated from the DB profiles row, never from user_metadata
  role?: "user" | "admin";
  first_name?: string;
  last_name?: string;
  pronouns?: string;
  bio?: string;
  contact_number?: string;
  banned_at?: string | null;
  deleted_at?: string | null;
};

type AuthContextProps = {
  user: UserProfile | null;
  loading: boolean;
  /** True only when the session was created via a password-reset magic link */
  isRecoveryMode: boolean;
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
  isRecoveryMode: false,
  signOut: async () => {},
  refreshProfile: async () => {},
  updatePassword: async () => {},
});

export const useAuth = () => useContext(AuthContext);

// Build a minimal, safe user object from the session token.
// Role is intentionally omitted here — it will be overwritten from the DB.
const getUserFromSession = (sessionUser: any): UserProfile => {
  const meta = sessionUser.user_metadata || {};
  return {
    id: sessionUser.id,
    email: sessionUser.email,
    avatar_url: meta.avatar_url || null,
    username: meta.username || sessionUser.email?.split("@")[0],
    first_name: meta.first_name || meta.full_name?.split(" ")[0] || null,
    last_name: meta.last_name || meta.full_name?.split(" ")[1] || null,
    pronouns: meta.pronouns || null,
    bio: meta.bio || null,
    contact_number: meta.contact_number || null,
    // ⚠️ SECURITY: role defaults to "user" until the DB profile confirms otherwise.
    // Never trust meta.role — user_metadata is writable by the client.
    role: "user",
    banned_at: null,
    deleted_at: null,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  // Fetch the authoritative profile from the DB.
  // Only explicit columns are selected — avoids leaking future sensitive fields.
  const fetchProfileSafe = useCallback(
    async (userId: string, retries = 1): Promise<UserProfile | null> => {
      try {
        const fetchPromise = supabase
          .from("profiles")
          .select(
            "id, email, username, avatar_url, role, first_name, last_name, pronouns, bio, contact_number, banned_at, deleted_at"
          )
          .eq("id", userId)
          .maybeSingle();

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Profile fetch timeout")), 5000)
        );

        const result: any = await Promise.race([fetchPromise, timeoutPromise]);

        if (result.error) {
          throw new Error(result.error.message || "Failed to fetch profile");
        }

        return result.data || null;
      } catch (err: any) {
        if (retries > 0) {
          console.warn(`Profile fetch failed, retrying... (${retries} left)`);
          return fetchProfileSafe(userId, retries - 1);
        }
        return null;
      }
    },
    []
  );

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

          const dbProfile = await fetchProfileSafe(session.user.id);

          if (mounted && dbProfile) {
            // DB profile is the source of truth — it overwrites the optimistic user
            setUser((prev) => ({ ...(prev || instantUser), ...dbProfile }));
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

      if (event === "PASSWORD_RECOVERY") {
        // Flag the context so UpdatePassword can detect the recovery session
        setIsRecoveryMode(true);
        setLoading(false);
        return;
      }

      if (event === "SIGNED_IN" && session?.user) {
        const instantUser = getUserFromSession(session.user);

        // Don't overwrite an already-loaded profile for the same user
        setUser((prev) => {
          if (prev && prev.id === instantUser.id) return prev;
          return instantUser;
        });

        const dbProfile = await fetchProfileSafe(session.user.id);
        if (mounted && dbProfile) {
          setUser((prev) => ({ ...(prev || instantUser), ...dbProfile }));
        }
        // Recovery mode ends once the user completes a normal sign-in
        setIsRecoveryMode(false);
        setLoading(false);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setIsRecoveryMode(false);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchProfileSafe]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsRecoveryMode(false);
  }, []);

  const updatePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!user?.email) {
        throw new Error("User email not found");
      }

      // Verify the current password via sign-in.
      // Note: this fires a SIGNED_IN event; the onAuthStateChange handler guards
      // against profile reload for the same user ID, so side effects are minimal.
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        throw new Error("Current password is incorrect");
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw new Error(updateError.message || "Failed to update password");
      }
    },
    [user?.email]
  );

  const refreshProfile = useCallback(async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      const instantUser = getUserFromSession(session.user);
      const dbProfile = await fetchProfileSafe(session.user.id);
      if (dbProfile) {
        setUser({ ...instantUser, ...dbProfile });
      } else {
        setUser(instantUser);
      }
    }
  }, [fetchProfileSafe]);

  const value = useMemo(
    () => ({
      user,
      loading,
      isRecoveryMode,
      signOut,
      refreshProfile,
      updatePassword,
    }),
    [user, loading, isRecoveryMode, signOut, refreshProfile, updatePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
