// Import React hooks and Supabase
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Define the shape of a user profile object
// This tells TypeScript what fields a user can have
type UserProfile = {
  id: string;                    // Unique identifier from Supabase
  email: string;                 // User's email
  username?: string;             // Username (optional, ? means it might not exist)
  avatar_url?: string;           // URL to user's avatar image (optional)
  role?: "user" | "admin";       // User role - either 'user' or 'admin' (optional)
  [key: string]: any;            // Allow any other extra fields
};

// Define what the AuthContext will provide to components
type AuthContextProps = {
  user: UserProfile | null;                  // Current logged-in user (or null if not logged in)
  loading: boolean;                          // True while fetching data from database
  signOut: () => Promise<void>;              // Function to log out user
  refreshProfile: () => Promise<void>;       // Function to manually refresh user data
};

// Create the context with default/placeholder values
const AuthContext = createContext<AuthContextProps>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

// Export a custom hook so components can easily use the context
// Instead of writing: useContext(AuthContext)
// Components can just write: useAuth()
export const useAuth = () => useContext(AuthContext);

// Create the AuthProvider component - this wraps your entire app
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State 1: Store the current logged-in user
  // Initially null because no one is logged in yet
  const [user, setUser] = useState<UserProfile | null>(null);

  // State 2: Track if data is still loading from database
  // Initially true because we need to check if user is already logged in on app load
  const [loading, setLoading] = useState(true);

  // Effect 1: Run when component first mounts
  // This checks if a user is already logged in and fetches their profile
  useEffect(() => {
    // Define an async function to fetch profile data
    const fetchProfile = async () => {
      setLoading(true); // Start loading

      // Step 1: Get the current session from Supabase
      // If user is already logged in, this will return their session
      const { data: { session } } = await supabase.auth.getSession();

      // Step 2: If a session exists (user is logged in)
      if (session?.user) {
        // Query the 'profiles' table to get the user's profile data
        const { data, error } = await supabase
          .from("profiles")
          .select("*")                          // Get all columns
          .eq("id", session.user.id)            // Where id matches the logged-in user's id
          .single();                            // Expect only one result

        // If we got profile data successfully
        if (data) {
          // Combine Supabase auth user data with profile data and store it
          // This gives us email + password from auth, plus username + role from profiles table
          setUser({ ...session.user, ...data });
        }
      } else {
        // No session = no user logged in
        setUser(null);
      }

      setLoading(false); // Done loading
    };

    // Call the function when component mounts
    fetchProfile();

    // Subscribe to auth state changes (when user logs in or out)
    // This listener will detect any authentication changes
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      // When auth changes, re-fetch the profile
      fetchProfile();
    });

    // Cleanup: unsubscribe from the listener when component unmounts
    // This prevents memory leaks
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []); // Empty dependency array = run only once on mount

  // Function 1: Sign out the user
  const signOut = async () => {
    // Call Supabase's signOut method to end the session
    await supabase.auth.signOut();
    // Clear the user state
    setUser(null);
  };

  // Function 2: Manually refresh user profile
  // Useful when user updates their profile (avatar, username, etc.)
  const refreshProfile = async () => {
    setLoading(true); // Start loading

    // Get current session
    const { data: { session } } = await supabase.auth.getSession();

    // If user is logged in
    if (session?.user) {
      // Fetch their latest profile data
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      // If data exists, update the user state
      if (data) {
        setUser({ ...session.user, ...data });
      }
    }

    setLoading(false); // Done loading
  };

  // Return the context provider to wrap components
  // Pass all the state and functions to any component that uses useAuth()
  return (
    <AuthContext.Provider 
      value={{ 
        user,              // Current user data
        loading,           // Loading state
        signOut,           // Sign out function
        refreshProfile     // Refresh profile function
      }}
    >
      {children}  {/* Render all child components */}
    </AuthContext.Provider>
  );
};
