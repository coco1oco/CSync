import { Link, useNavigate } from "react-router-dom";
import { BottomNavigation } from "@/components/BottomNavigation";
import BackIcon from "@/assets/BackButton.svg";
import MenuIcon from "@/assets/Menu.svg";
import type { UserProfile } from "@/types";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import FailedImageIcon from "@/assets/FailedImage.svg";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // NEW: flags for “complete your profile”
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
        .select(
          "id, username, email, role, avatar_url, first_name, last_name, bio, pronouns"
        )
        .eq("id", user.id)
        .maybeSingle(); // allow 0 rows without 406

      if (error) {
        console.error("Error loading profile", error);
        setProfile(null);
      } else if (data) {
        const p = data as UserProfile;
        setProfile(p);

        // mark incomplete if first or last name missing
        const incomplete = !p.first_name || !p.last_name;
        setNeedsCompletion(incomplete);
      }

      setLoading(false);
    };

    loadProfile();
  }, []);

  if (loading) return <p>Loading...</p>;
  if (!profile) return <p>No profile found</p>;

  return (
    <div>
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="h-8 w-8 rounded flex items-center justify-center"
        >
          <img src={BackIcon} alt="Back" className="h-6 w-6" />
        </button>
        <h2 className="text-xl font-semibold">Your Profile</h2>
        <button
          onClick={() => navigate("/Menu")}
          className="rounded-full p-2 hover:bg-gray-100 transition-colors"
        >
          <img src={MenuIcon} alt="Menu" className="h-6 w-6" />
        </button>
      </header>

      <div className="w-full min-h-screen bg-white p-6 space-y-10">
        {/* NEW: banner when profile incomplete */}
        {needsCompletion && (
          <div className="max-w-xs mx-auto mb-4 rounded-md bg-yellow-100 px-3 py-2 text-sm text-yellow-900 text-center">
            Complete your profile:
          </div>
        )}

        <section className="w-full max-w-xs mx-auto text-center space-y-4">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-20 h-20 bg-gray-300 rounded-xl">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="w-24 h-24 rounded-2xl object-cover bg-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-2xl bg-gray-200 flex items-center justify-center">
                  <img
                    src={FailedImageIcon}
                    alt="FailedImage"
                    className="h-6 w-6"
                  />
                </div>
              )}
            </div>

            <p className="font-semibold">
              {profile.first_name} {profile.last_name}
            </p>
             <p className="text-black-100 text-sm"> {profile.pronouns}</p>
            <p className="text-black-100 text-sm"> {profile.username}</p>
            <p className="text-black-500 text-sm">{profile.email}</p>
            <p className="text-black-500 text-sm">{profile.bio}</p>
          </div>

          <Link
            to="/ProfilePage/Edit"
            className="bg-gray-200 text-sm py-2 px-4 rounded-xl"
          >
            {needsCompletion ? "Complete Profile" : "Edit Profile"}
          </Link>
        </section>

        <BottomNavigation userRole="admin" />
      </div>
    </div>
  );
}
