import { supabase } from "@/lib/supabaseClient";

export type ProfileUpdate = {
  first_name: string;
  last_name: string;
  username: string;
  bio: string;
  avatar_url: string;
  pronouns: string;
};

export async function updateProfile(update: ProfileUpdate) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw authError ?? new Error("No user session");
  }

  // 1. Update the 'profiles' table (Database)
  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    console.error("Supabase error:", error);
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  // 2. CRITICAL FIX: Sync to Auth Metadata (Session)
  // This ensures the avatar is available instantly and persists even if the DB is slow
  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      avatar_url: update.avatar_url,
      full_name: `${update.first_name} ${update.last_name}`,
      username: update.username,
      pronouns: update.pronouns,
    },
  });

  if (metaError) {
    console.warn("Metadata sync warning:", metaError);
    // We proceed anyway since the DB update succeeded
  }

  return data;
}
