// src/types/index.ts
// All TypeScript interfaces in one place

export type UserRole = 'user' | 'admin';

export interface UserProfile {
  id: string;
  username: string;
  role: UserRole;
  avatar_url: string | null;
  is_banned: boolean;
  created_at: string;
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
