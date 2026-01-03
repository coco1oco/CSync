import { Link } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { Button } from "@/components/ui/button";
import { Mail, Phone, User, ShieldCheck, Edit3, AlignLeft } from "lucide-react";
import FailedImageIcon from "@/assets/FailedImage.svg";

export default function ProfilePage() {
  const { user } = useAuth();

  if (!user) return null;

  const needsCompletion = !user.first_name || !user.last_name;

  return (
    <div className="min-h-full bg-gray-50/50 pb-20 pt-6 px-4">
      {/* Container to center content on Desktop */}
      <div className="max-w-md mx-auto space-y-6">
        {/* Page Title */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-blue-950">My Profile</h1>
        </div>

        {/* Warning Banner */}
        {needsCompletion && (
          <div className="rounded-xl bg-orange-50 border border-orange-100 px-4 py-3 text-sm text-orange-800 flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
            <span>⚠️</span> Please complete your profile information.
          </div>
        )}

        {/* === MAIN PROFILE CARD === */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
          {/* Header / Avatar Section */}
          <div className="p-6 flex flex-col items-center text-center border-b border-gray-100 bg-gradient-to-b from-white to-gray-50/50">
            <div className="w-28 h-28 rounded-full bg-white p-1 shadow-sm border border-gray-100 mb-4">
              <img
                src={user.avatar_url || FailedImageIcon}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
              />
            </div>

            <h2 className="text-xl font-bold text-gray-900">
              {user.first_name} {user.last_name}
            </h2>

            {/* Role Badge */}
            <div className="mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
              <ShieldCheck className="w-3 h-3 mr-1.5" />
              {user.role === "admin" ? "Administrator" : "Member"}
            </div>
          </div>

          {/* Details List */}
          <div className="p-6 space-y-5">
            {/* Username */}
            <div className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  Username
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    @{user.username}
                  </p>
                  {user.pronouns && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                      {user.pronouns}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  Email
                </p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.email}
                </p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3 group">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                  Contact Number
                </p>
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.contact_number || (
                    <span className="text-gray-400 italic font-normal">
                      Not added
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* Bio */}
            <div className="flex gap-3 group items-start pt-2 border-t border-gray-50">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors shrink-0">
                <AlignLeft className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">
                  Bio
                </p>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                  {user.bio || (
                    <span className="text-gray-400 italic">
                      No bio yet. Tap 'Edit Profile' to add one.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 bg-gray-50 border-t border-gray-100">
            <Link to="/ProfilePage/Edit">
              <Button
                variant="outline"
                className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold border-gray-200 shadow-sm h-11"
              >
                <Edit3 className="w-4 h-4 mr-2 text-gray-500" /> Edit Profile
              </Button>
            </Link>
          </div>
        </div>

        <div className="text-center text-xs text-gray-400 pb-4">
          Member since {new Date(user.created_at || Date.now()).getFullYear()}
        </div>
      </div>
    </div>
  );
}
