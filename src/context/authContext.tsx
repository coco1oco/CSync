import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
} from "react";
import { supabase } from "@/lib/supabaseClient";

type UserRole = "user" | "admin";

export type UserProfile = {
  id: string;
  email: string;
  username?: string;
  avatar_url?: string;
  role?: UserRole;
  first_name?: string;
  last_name?: string;
  bio?: string;
  contact_number?: string;
  pronouns?: string;
  banned_at?: string | null;
  deleted_at?: string | null;
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
      contact_number: meta.contact_number,
      bio: meta.bio,
      role: (meta.role as UserRole) || "user",
      banned_at: meta.banned_at || null,
      deleted_at: meta.deleted_at || null,
    };
  };

  const fetchProfileSafe = async (
    userId: string,
    sessionUser: any,
    retries = 1
  ): Promise<any> => {
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
        // ✅ CHANGED: Removed the "Bouncer" check here.
        // We WANT to return the profile even if banned, so the UI can handle it.

        const needsSync =
          db.role !== meta.role ||
          db.avatar_url !== meta.avatar_url ||
          db.username !== meta.username ||
          db.first_name !== meta.first_name ||
          db.contact_number !== meta.contact_number ||
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

          if (mounted) {
            setUser(instantUser);
            setLoading(false);
          }

          const dbProfile = await fetchProfileSafe(
            session.user.id,
            session.user
          );

          if (mounted && dbProfile) {
            setUser((prev) => ({
              ...instantUser,
              ...(prev || {}),
              ...dbProfile,
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
            ...dbProfile,
          }));
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        setLoading(false);
      } else if (event === "USER_UPDATED" && session?.user) {
        const instantUser = getUserFromSession(session.user);
        setUser((prev) => ({ ...prev, ...instantUser }));
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
