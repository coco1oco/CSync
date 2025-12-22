import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Loader2,
  Save,
  User,
  Mail,
  AtSign,
  Phone,
  ShieldCheck,
  AlignLeft,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/context/authContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { updateProfile } from "@/lib/profileApi";
import FailedImageIcon from "@/assets/FailedImage.svg";

// --- VALIDATION SCHEMA ---
const profileSchema = z.object({
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  username: z.string().min(3, "Username must be at least 3 chars"),
  bio: z.string().max(120, "Bio must be under 120 characters").optional(),
  pronouns: z.string().optional(),
  contact_number: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function EditProfilePage() {
  const navigate = useNavigate();
  const { user, refreshProfile } = useAuth();

  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // --- FORM INITIALIZATION ---
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      username: "",
      bio: "",
      pronouns: "",
      contact_number: "",
    },
  });

  const bioValue = watch("bio") || "";

  useEffect(() => {
    if (user) {
      reset({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        username: user.username || "",
        bio: user.bio || "",
        pronouns: user.pronouns || "",
        contact_number: user.contact_number || "",
      });
      setAvatarUrl(user.avatar_url || "");
    }
  }, [user, reset]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const localPreview = URL.createObjectURL(file);
      setAvatarUrl(localPreview);

      const cloudinaryUrl = await uploadImageToCloudinary(file);
      setAvatarUrl(cloudinaryUrl);
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error("Failed to upload image");
      setAvatarUrl(user?.avatar_url || "");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      await updateProfile({
        ...data,
        bio: data.bio || "",
        pronouns: data.pronouns || "",
        contact_number: data.contact_number || "",
        avatar_url: avatarUrl,
      });
      await refreshProfile();
      toast.success("Profile saved successfully!");
      navigate(-1);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to save profile"
      );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 pb-20 pt-6 px-4">
      {/* === TRANSPARENT HEADER (Matching ProfilePage) === */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full text-gray-700 hover:bg-gray-200/50 transition-colors"
            type="button"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-black text-blue-950 tracking-tight">
              Edit Profile
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="hidden sm:flex text-gray-500 hover:text-gray-900"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || isUploadingImage}
            size="sm"
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 shadow-sm transition-all"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* === MAIN CARD CONTENT === */}
      <div className="max-w-4xl mx-auto bg-white rounded-[2rem] border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden flex flex-col md:flex-row">
        {/* LEFT SIDE: VISUAL IDENTITY */}
        <div className="md:w-72 bg-gradient-to-b from-blue-50/50 to-transparent border-b md:border-b-0 md:border-r border-gray-100 p-8 flex flex-col items-center text-center shrink-0">
          <div className="relative group mb-4">
            <div className="w-32 h-32 rounded-full border-[4px] border-white shadow-lg overflow-hidden bg-gray-200 ring-1 ring-gray-100">
              <img
                src={avatarUrl || FailedImageIcon}
                alt="Avatar"
                className={`w-full h-full object-cover transition-all duration-300 ${
                  isUploadingImage ? "opacity-50 blur-sm" : ""
                }`}
              />
              {isUploadingImage && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
              )}
            </div>
            <button
              onClick={() => document.getElementById("avatarInput")?.click()}
              disabled={isSubmitting || isUploadingImage}
              type="button"
              className="absolute bottom-1 right-1 bg-gray-900 text-white p-2.5 rounded-full border-[3px] border-white shadow-md hover:bg-black transition-transform hover:scale-105 active:scale-95"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              id="avatarInput"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          <div className="space-y-1 w-full break-words">
            <h2 className="font-bold text-gray-900 text-lg leading-tight">
              {watch("first_name") || "Your"} {watch("last_name") || "Name"}
            </h2>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100/50 border border-blue-200 text-blue-700 text-[11px] font-bold uppercase tracking-wider mt-1">
              <ShieldCheck className="w-3 h-3" />
              {user?.role === "admin" ? "Administrator" : "Member"}
            </div>
          </div>

          <div className="mt-6 w-full pt-6 border-t border-gray-200/60">
            <div className="flex items-center gap-3 text-sm text-gray-500 bg-white/50 p-2.5 rounded-lg border border-gray-100 overflow-hidden">
              <Mail className="w-4 h-4 shrink-0 opacity-50" />
              <span className="truncate text-xs font-medium">
                {user?.email}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE: FORM FIELDS (STACKED LAYOUT) */}
        <div className="flex-1 p-6 md:p-8 space-y-5">
          {/* NAME STACK */}
          <div className="space-y-5">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                First Name
              </Label>
              <Input
                {...register("first_name")}
                className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all h-11 rounded-xl"
                placeholder="Jane"
              />
              {errors.first_name && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.first_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Last Name
              </Label>
              <Input
                {...register("last_name")}
                className="bg-gray-50/50 border-gray-200 focus:bg-white transition-all h-11 rounded-xl"
                placeholder="Doe"
              />
              {errors.last_name && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.last_name.message}
                </p>
              )}
            </div>
          </div>

          {/* USERNAME & PRONOUNS STACK */}
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Username
              </Label>
              <div className="relative">
                <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  {...register("username")}
                  className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all h-11 rounded-xl"
                  placeholder="username"
                />
              </div>
              {errors.username && (
                <p className="text-red-500 text-xs mt-1">
                  {errors.username.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                Pronouns
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  {...register("pronouns")}
                  className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all h-11 rounded-xl"
                  placeholder="e.g. they/them"
                />
              </div>
            </div>
          </div>

          {/* CONTACT INFO */}
          <div className="space-y-2 pt-2">
            <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Contact Number
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                {...register("contact_number")}
                className="pl-9 bg-gray-50/50 border-gray-200 focus:bg-white transition-all h-11 rounded-xl"
                placeholder="09XX-XXX-XXXX"
              />
            </div>
            <p className="text-[10px] text-gray-400 flex items-center gap-1.5 px-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Only shown to admins or when reporting a lost pet.
            </p>
          </div>

          {/* BIO */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                <AlignLeft className="w-3.5 h-3.5" /> Bio
              </Label>
              <span
                className={`text-[10px] font-medium ${
                  bioValue.length > 120 ? "text-red-500" : "text-gray-400"
                }`}
              >
                {bioValue.length}/120
              </span>
            </div>
            <textarea
              {...register("bio")}
              rows={4}
              className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3 py-2 text-sm placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all resize-none"
              placeholder="Share a little about yourself..."
            />
            {errors.bio && (
              <p className="text-red-500 text-xs mt-1">{errors.bio.message}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
