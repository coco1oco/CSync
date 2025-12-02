import { useAuth } from "@/context/authContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackIcon from "@/assets/BackButton.svg";
import FailedImageIcon from "@/assets/FailedImage.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { updateProfile } from "@/lib/profileApi"; // Fixed casing import

export default function EditProfilePage() {
  const navigate = useNavigate();
  // 1. Get refreshProfile from useAuth
  const { user, refreshProfile } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name ?? "");
  const [lastName, setLastName] = useState(user?.last_name ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");

  const allowedPronouns = [
    "she/her",
    "he/him",
    "they/them",
    "she/they",
    "he/they",
  ];

  const [pronouns, setPronouns] = useState(user?.pronouns ?? "");
  const [pronounsError, setPronounsError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handlePronounsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();
    setPronouns(value);
    if (!value) {
      setPronounsError(null);
      return;
    }
    if (!allowedPronouns.includes(value)) {
      setPronounsError(
        "Use pronouns like she/her, he/him, they/them, she/they, he/they."
      );
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

      const cloudinaryUrl = await uploadImageToCloudinary(file);
      setAvatarUrl(cloudinaryUrl);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to upload image";
      setError(errorMessage);
      setAvatarUrl(user?.avatar_url ?? "");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (pronounsError) {
      setError("Please fix the pronouns error before saving.");
      return;
    }

    if (!firstName.trim()) {
      setError("First name is required.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // 2. Update Supabase
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username,
        bio,
        avatar_url: avatarUrl,
        pronouns,
      });

      // 3. CRITICAL: Force the app to re-fetch user data so the Header updates
      await refreshProfile();

      setSuccess(true);
      setTimeout(() => navigate(-1), 1500);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to save profile";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-10 grid grid-cols-3 items-center border-b border-border bg-background px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100"
        >
          <img src={BackIcon} alt="Back" className="h-6 w-6" />
        </button>
        <h2 className="text-base font-semibold text-center">Edit profile</h2>
        <div className="h-8 w-8" />
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-md mx-auto space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm animate-in fade-in">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 text-green-600 px-4 py-2 rounded-lg text-sm animate-in fade-in">
              Profile updated successfully!
            </div>
          )}

          <div className="flex flex-col items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-24 w-24 rounded-full object-cover border-2 border-gray-100 shadow-sm"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center">
                <img
                  src={FailedImageIcon}
                  alt="Avatar"
                  className="h-8 w-8 opacity-50"
                />
              </div>
            )}

            <input
              id="avatarInput"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={isLoading || isUploadingImage}
            />

            <button
              type="button"
              onClick={() => document.getElementById("avatarInput")?.click()}
              className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:opacity-50 transition-colors"
              disabled={isLoading || isUploadingImage}
            >
              {isUploadingImage ? "Uploading..." : "Change profile picture"}
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-gray-500">First Name</Label>
              <Input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="h-11"
                maxLength={30}
                disabled={isLoading || isUploadingImage}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Last Name</Label>
              <Input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="h-11"
                maxLength={30}
                disabled={isLoading || isUploadingImage}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Username</Label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11"
                maxLength={30}
                disabled={isLoading || isUploadingImage}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Pronouns</Label>
              <Input
                type="text"
                value={pronouns}
                onChange={handlePronounsChange}
                className="h-11"
                maxLength={30}
                placeholder="e.g. she/her"
                disabled={isLoading || isUploadingImage}
              />
              {pronounsError && (
                <p className="text-xs text-red-500 mt-1">{pronounsError}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-gray-500">Bio</Label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={120}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading || isUploadingImage}
              />
            </div>

            <Button
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-bold"
              type="button"
              onClick={handleSave}
              disabled={isLoading || isUploadingImage}
            >
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
