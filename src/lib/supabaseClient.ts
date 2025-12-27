import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables!");
}

// ✅ 1. ADD A CONTROL VARIABLE
// Default to true (Local Storage) so simple reloads work
let persistInLocalStorage = true;

// ✅ 2. EXPORT A HELPER FUNCTION
// SignIn.tsx will call this to toggle the behavior
export const setPersistencePreference = (shouldPersist: boolean) => {
  persistInLocalStorage = shouldPersist;
};

// ✅ 3. UPDATE THE ADAPTER
const customStorage = {
  getItem: (key: string) => {
    // Check Session Storage first (Priority)
    const sessionItem = window.sessionStorage.getItem(key);
    if (sessionItem) return sessionItem;
    // Fallback to Local Storage
    return window.localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    // A. STICKY BEHAVIOR (For Token Refreshes)
    // If key already exists in Session Storage, keep it there.
    if (window.sessionStorage.getItem(key)) {
      window.sessionStorage.setItem(key, value);
      return;
    }
    // If key already exists in Local Storage, keep it there.
    if (window.localStorage.getItem(key)) {
      window.localStorage.setItem(key, value);
      return;
    }

    // B. NEW SESSION BEHAVIOR (For Login)
    // If it's a new login, check the preference set by setPersistencePreference
    if (persistInLocalStorage) {
      window.localStorage.setItem(key, value);
    } else {
      window.sessionStorage.setItem(key, value);
    }
  },
  removeItem: (key: string) => {
    // Clear both on sign out
    window.sessionStorage.removeItem(key);
    window.localStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
