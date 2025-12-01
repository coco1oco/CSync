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

  const { data, error } = await supabase
    .from("profiles")
    .update(update)
    .eq("id", user.id);

  if (error) {
    console.error("Supabase error:", error);
    throw new Error(`Failed to update profile: ${error.message}`);
  }

  return data;
}
