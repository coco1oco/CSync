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
  contact_number?: string | null;
}

// ✅ NEW: Comment Interface
// ✅ NEW: Comment Interface (Updated)
export interface Comment {
  id: string;
  user_id: string;
  event_id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null; // <--- This was missing!
  user?: UserProfile;
}

// ✅ UPDATED: Added Luma-style fields
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
  // New fields
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  max_attendees?: number | null;
  requires_registration?: boolean;
  event_type?: string; // 'official' | 'general'
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  } | null; 
}

export type UpdateProfilePayload = {
  username?: string;
  email?: string;
  bio?: string;
  avatar_url?: string;
  pronouns?: string;
  first_name?: string;
  last_name?: string;
  contact_number?: string;
};

export interface Message {
  id: number;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: UserProfile;
}

export interface Conversation {
  id: string;
  name: string;
  is_group: boolean;
}
