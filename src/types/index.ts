export type UserRole = "user" | "admin";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  pronouns: string | null;
}

// ✅ NEW: Comment Interface
export interface Comment {
  id: string;
  user_id: string;
  event_id: string;
  content: string;
  created_at: string;
  user?: UserProfile; // We will join the profile data here
}

export interface OutreachEvent {
  id: string;
  admin_id: string;
  title: string;
  location: string;
  description: string;
  images: string[];
  created_at: string;
  updated_at: string;
  admin?: UserProfile;
}

export type UpdateProfilePayload = {
  username?: string;
  email?: string;
  bio?: string;
  avatar_url?: string;
  pronouns?: string;
  first_name?: string;
  last_name?: string;
};
