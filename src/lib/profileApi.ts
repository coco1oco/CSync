import { supabase } from "@/lib/supabaseClient";

export type ProfileUpdate = {
  first_name: string;
  last_name: string;
  username: string;
  bio: string;
  avatar_url: string;
  pronouns: string;
  contact_number: string;
};

export async function updateProfile(update: ProfileUpdate) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw authError ?? new Error("No user session");
  }

  // 1. Update Database
  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    console.error("Supabase error:", error);
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  // 2. Sync to Session Metadata
  const { error: metaError } = await supabase.auth.updateUser({
    data: {
      avatar_url: update.avatar_url,
      full_name: `${update.first_name} ${update.last_name}`,
      username: update.username,
      pronouns: update.pronouns,
      contact_number: update.contact_number,
      bio: update.bio,
    },
  });

  if (metaError) console.warn("Metadata sync warning:", metaError);

  return data;
}

// ✅ NEW: Add this function
export async function deleteUserAccount() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No user logged in");

  // 1. Mark profile as deleted (Soft Delete)
  const { error } = await supabase
    .from("profiles")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  // 2. Sign out immediately
  await supabase.auth.signOut();
}
