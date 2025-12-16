import { useAuth } from "@/context/authContext";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { updateProfile } from "@/lib/profileApi";
import FailedImageIcon from "@/assets/FailedImage.svg";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  // Initialize state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [pronouns, setPronouns] = useState("");

  const [pronounsError, setPronounsError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allowedPronouns = [
    "she/her",
    "he/him",
    "they/them",
    "she/they",
    "he/they",
  ];

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setUsername(user.username || "");
      setBio(user.bio || "");
      setAvatarUrl(user.avatar_url || "");
      setPronouns(user.pronouns || "");
    }
  }, [user]);

  const handlePronounsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setPronouns(value);
    if (!value) {
      setPronounsError(null);
      return;
    }
    if (!allowedPronouns.includes(value)) {
      setPronounsError("Invalid format");
    } else {
      setPronounsError(null);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setIsUploadingImage(true);
      const localPreview = URL.createObjectURL(file);
      setAvatarUrl(localPreview);

      const cloudinaryUrl = await uploadImageToCloudinary(file, "avatar");
      setAvatarUrl(cloudinaryUrl);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Upload failed";
      setError(errorMessage);
      setAvatarUrl(user?.avatar_url || "");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (pronounsError || !firstName.trim()) {
      setError("Please check your inputs.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username,
        bio,
        avatar_url: avatarUrl,
        pronouns,
      });

      await refreshProfile();
      navigate(-1);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save";
      setError(message);
      setIsLoading(false);
    }
  };

  return (
    // ✅ FIX: Removed negative margins (-mt-4) and added proper spacing
    <div className="min-h-screen bg-white flex flex-col relative pb-20 mt-2">
      {/* === HEADER === */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3 bg-white/95 backdrop-blur-md border-b border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900" />
          </button>
          <h2 className="text-lg font-bold text-gray-900">Edit Profile</h2>
        </div>

        <Button
          onClick={handleSave}
          disabled={isLoading || isUploadingImage}
          size="sm"
          className="rounded-full bg-black text-white hover:bg-gray-800 font-bold px-6"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
        </Button>
      </header>

      {/* === BANNER (Blue Area) === */}
      <div className="h-32 bg-blue-100 w-full shrink-0" />

      {/* === CONTENT CONTAINER === */}
      <div className="px-4 -mt-10 relative z-10">
        {/* === AVATAR === */}
        <div className="relative inline-block group mb-6">
          <div className="w-24 h-24 rounded-full border-4 border-white bg-white overflow-hidden shadow-sm">
            <img
              src={avatarUrl || FailedImageIcon}
              alt="Avatar"
              className="w-full h-full object-cover"
            />
            {/* Upload Overlay */}
            <div
              className="absolute inset-0 bg-black/30 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => document.getElementById("avatarInput")?.click()}
            >
              <Camera className="w-8 h-8 text-white" />
            </div>
          </div>

          {/* Change Photo Input */}
          <input
            id="avatarInput"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
            disabled={isLoading || isUploadingImage}
          />
        </div>

        {/* === FORM FIELDS === */}
        <div className="space-y-6 max-w-2xl">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {/* Row 1: Names */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                First Name
              </Label>
              <Input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-10 border-x-0 border-t-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-blue-500 transition-colors bg-transparent font-medium text-base"
                placeholder="First Name"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Last Name
              </Label>
              <Input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-10 border-x-0 border-t-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-blue-500 transition-colors bg-transparent font-medium text-base"
                placeholder="Last Name"
              />
            </div>
          </div>

          {/* Row 2: Username & Pronouns */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Username
              </Label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-10 border-x-0 border-t-0 border-b border-gray-200 rounded-none px-0 focus-visible:ring-0 focus-visible:border-blue-500 transition-colors bg-transparent font-medium text-base"
                placeholder="@username"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Pronouns
              </Label>
              <Input
                value={pronouns}
                onChange={handlePronounsChange}
                className={`h-10 border-x-0 border-t-0 border-b rounded-none px-0 focus-visible:ring-0 transition-colors bg-transparent font-medium text-base ${
                  pronounsError
                    ? "border-red-500 focus-visible:border-red-500 text-red-600"
                    : "border-gray-200 focus-visible:border-blue-500"
                }`}
                placeholder="e.g. he/him"
              />
            </div>
          </div>

          {/* Row 3: Bio */}
          <div className="space-y-1">
            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Bio
            </Label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={120}
              className="w-full text-base border-0 border-b border-gray-200 focus:border-blue-500 focus:ring-0 bg-transparent resize-none py-2 placeholder:text-gray-300 outline-none leading-relaxed"
              placeholder="Tell us about yourself..."
            />
            <div className="text-right pt-1">
              <span
                className={`text-[10px] ${
                  bio?.length > 100 ? "text-orange-500" : "text-gray-400"
                }`}
              >
                {bio?.length || 0}/120
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
