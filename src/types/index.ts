export type UserRole = "user" | "admin";

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  committee?: string | null;
  avatar_url: string | null;
  first_name: string | null;
  last_name: string | null;
  bio: string | null;
  pronouns: string | null;
  contact_number?: string | null;
}

// ✅ UPDATED PET INTERFACE
export interface Pet {
  id: string;
  owner_id: string;
  name: string;
  species: string | null;
  breed: string | null;
  color: string | null;
  dob: string | null;
  sex: string | null;
  microchip_id: string | null;
  location: string | null;
  petimage_url: string | null;
  is_campus_pet: boolean;
  created_at: string;

  // 🆕 NEW Admin Fields (Added spayed_neutered & new statuses)
  spayed_neutered?: boolean;
  status?: "healthy" | "injured" | "sick" | "missing" | "aggressive" | "unseen";
  last_fed_at?: string | null;
  last_seen_at?: string | null;
}

export interface Comment {
  id: string;
  user_id: string;
  event_id: string;
  content: string;
  created_at: string;
  parent_comment_id: string | null;
  user?: UserProfile;
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
  event_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  max_attendees?: number | null;
  requires_registration?: boolean;
  event_type?: string;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  } 
  registration_deadline?: string | null;
  registration_closed_manually?: boolean;
  is_hidden?: boolean;
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

export interface Medication {
  id: string;
  pet_id: string;
  owner_id: string;
  name: string;
  current_stock: number;
  dosage_per_use: number;
  low_stock_threshold: number;
  unit: string;
  created_at?: string;
  pets?: {
    name: string;
    petimage_url: string | null;
  };
}

export interface MedicationLog {
  id: string;
  medication_id: string;
  pet_id: string;
  logged_at: string;
  dosage_taken: number;
}
