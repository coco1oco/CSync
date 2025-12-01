import { useAuth } from "@/context/authContext";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackIcon from "@/assets/BackButton.svg";
import FailedImageIcon from "@/assets/FailedImage.svg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [name, setName] = useState(
    `${user?.first_name ?? ""} ${user?.last_name ?? ""}`.trim()
  );
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");

  // Allowed pronoun values that are considered valid for this field
  const allowedPronouns = [
    "she/her",
    "he/him",
    "they/them",
    "she/they",
    "he/they",
  ];

  // Local state for the current pronoun value shown in the input.
  const [pronouns, setPronouns] = useState(user?.pronouns ?? "");

  // Local state for a validation error message.
  const [pronounsError, setPronounsError] = useState<string | null>(null);

  // Runs every time the pronouns input changes.
  const handlePronounsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.trim();

    // keep input state in sync
    setPronouns(value);

    // allow empty pronouns (no error)
    if (!value) {
      setPronounsError(null);
      return;
    }

    // validate against the allowed list
    if (!allowedPronouns.includes(value)) {
      setPronounsError(
        "Use pronouns like she/her, he/him, they/them, she/they, he/they."
      );
    } else {
      setPronounsError(null);
    }
  };

  // Example save handler (wire to your API / Supabase)
  const handleSave = async () => {
    if (pronounsError) return; // don’t save invalid pronouns

    // TODO: call your updateProfile / Supabase update here
    // await updateProfile({ name, username, email, bio, pronouns });

    navigate(-1);
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
          {/* avatar + change picture */}
          <div className="flex flex-col items-center gap-3">
            {user?.avatar_url ? (
              <img
                src={user.avatar_url}
                alt="Avatar"
                className="h-20 w-20 rounded-full object-cover sm:h-24 sm:w-24"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center sm:h-24 sm:w-24">
                <img src={FailedImageIcon} alt="Avatar" className="h-8 w-8" />
              </div>
            )}
            <button
              type="button"
              className="text-xs font-medium text-primary"
              // onClick={openAvatarPicker}
            >
              Change profile picture
            </button>
          </div>

          {/* form fields */}
          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Name</Label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                maxLength={30}
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
              />
              {pronounsError && (
                <p className="text-xs text-red-500 mt-1">{pronounsError}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <Input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-card px-3 py-2 text-sm"
                maxLength={30}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Bio</Label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={120}
                className="w-full rounded-xl border border-border bg-card p-3 text-sm resize-none"
              />
            </div>

            <Button
              className="w-full rounded-xl bg-primary text-primary-foreground text-sm font-medium py-2"
              type="button"
              onClick={handleSave}
            >
              Save changes
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
