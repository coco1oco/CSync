import { useAuth } from "@/context/authContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackIcon from "@/assets/BackButton.svg";
import FailedImageIcon from "@/assets/FailedImage.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { updateProfile } from "@/lib/ProfileApi";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Split name into first and last
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

  // Loading and error states
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

  // Handle avatar file selection and upload
  const handleAvatarChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      setIsUploadingImage(true);

      // Show local preview while uploading
      const localPreview = URL.createObjectURL(file);
      setAvatarUrl(localPreview);

      // Upload to Cloudinary
      const cloudinaryUrl = await uploadImageToCloudinary(file);
      setAvatarUrl(cloudinaryUrl); // Set the actual Cloudinary URL
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to upload image";
      setError(errorMessage);
      // Revert to previous avatar on error
      setAvatarUrl(user?.avatar_url ?? "");
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Save all profile changes
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
      await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        username,
        bio,
        avatar_url: avatarUrl,
        pronouns,
      });

      setSuccess(true);
      setTimeout(() => navigate(-1), 1500); // Go back after brief success message
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
      {/* header */}
      <header className="sticky top-0 z-10 grid grid-cols-3 items-center border-b border-border bg-background px-4 py-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="h-8 w-8 flex items-center justify-center"
        >
          <img src={BackIcon} alt="Back" className="h-6 w-6" />
        </button>
        <h2 className="text-base font-semibold text-center">Edit profile</h2>
        <div className="h-8 w-8" />
      </header>

      {/* main content */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* error banner */}
          {error && (
            <div className="bg-red-500/10 border border-red-500 text-red-600 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* success banner */}
          {success && (
            <div className="bg-green-500/10 border border-green-500 text-green-600 px-4 py-2 rounded-lg text-sm">
              Profile updated successfully!
            </div>
          )}

          {/* avatar + change picture */}
          <div className="flex flex-col items-center gap-3">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="h-20 w-20 rounded-full object-cover sm:h-24 sm:w-24"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center sm:h-24 sm:w-24">
                <img src={FailedImageIcon} alt="Avatar" className="h-8 w-8" />
              </div>
            )}

            {/* Hidden file input */}
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
              className="text-xs font-medium text-primary disabled:opacity-50"
              disabled={isLoading || isUploadingImage}
            >
              {isUploadingImage ? "Uploading..." : "Change profile picture"}
            </button>
          </div>

          {/* form fields */}
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                First Name
              </Label>
              <Input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                maxLength={30}
                disabled={isLoading || isUploadingImage}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Last Name</Label>
              <Input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                maxLength={30}
                disabled={isLoading || isUploadingImage}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Username</Label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                maxLength={30}
                disabled={isLoading || isUploadingImage}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Pronouns</Label>
              <Input
                type="text"
                value={pronouns}
                onChange={handlePronounsChange}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                maxLength={30}
                disabled={isLoading || isUploadingImage}
              />
              {pronounsError && (
                <p className="text-xs text-red-500 mt-1">{pronounsError}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Bio</Label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={120}
                className="w-full rounded-xl border border-border bg-card p-3 text-sm resize-none disabled:opacity-50"
                disabled={isLoading || isUploadingImage}
              />
            </div>

            <Button
              className="w-full rounded-xl bg-primary text-primary-foreground text-sm font-medium py-2 disabled:opacity-50"
              type="button"
              onClick={handleSave}
              disabled={isLoading || isUploadingImage}
            >
              {isLoading ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
