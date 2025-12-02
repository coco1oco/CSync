import { Link, useNavigate } from "react-router-dom";
import FailedImageIcon from "@/assets/FailedImage.svg";
import type { UserProfile } from "@/types";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsCompletion, setNeedsCompletion] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        const p = data as UserProfile;
        setProfile(p);
        setNeedsCompletion(!p.first_name || !p.last_name);
      }
      setLoading(false);
    };
    loadProfile();
  }, []);

  if (loading)
    return <p className="p-4 text-center text-gray-500">Loading...</p>;
  if (!profile)
    return <p className="p-4 text-center text-gray-500">No profile found</p>;

  return (
    <div className="space-y-6">
      {/* Removed Sticky Header - AppLayout handles navigation */}

      {/* Simple Page Title */}
      <h1 className="text-2xl font-bold text-gray-900 px-2">My Profile</h1>

      {/* Banner if incomplete */}
      {needsCompletion && (
        <div className="rounded-xl bg-yellow-50 border border-yellow-100 px-4 py-3 text-sm text-yellow-800 text-center shadow-sm">
          ⚠️ Please complete your profile information
        </div>
      )}

      {/* Profile Card */}
      <div className="flex flex-col items-center space-y-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gray-100 p-1 overflow-hidden">
            <img
              src={profile.avatar_url || FailedImageIcon}
              alt="Profile"
              className="w-full h-full rounded-full object-cover"
            />
          </div>
        </div>

        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-gray-900">
            {profile.first_name} {profile.last_name}
          </h2>
          <p className="text-sm text-gray-500 font-medium">
            @{profile.username}
          </p>
          <p className="text-xs text-gray-400">{profile.pronouns}</p>
        </div>

        <div className="text-center space-y-1 w-full border-t border-gray-50 pt-4">
          <p className="text-sm text-gray-600">{profile.email}</p>
          <p className="text-sm text-gray-500 italic">
            {profile.bio || "No bio yet"}
          </p>
        </div>

        <Link
          to="/ProfilePage/Edit"
          className="w-full block text-center bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-bold py-3 px-4 rounded-xl transition-colors"
        >
          Edit Profile
        </Link>
      </div>

      {/* Removed <BottomNavigation /> - AppLayout handles it */}
    </div>
  );
}
