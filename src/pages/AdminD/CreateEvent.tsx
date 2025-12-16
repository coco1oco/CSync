// CreateEvent.tsx
import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  X,
  Image as ImageIcon,
  MapPin,
  Globe,
  User,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import { motion } from "framer-motion";

export default function CreateEvent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [showLocation, setShowLocation] = useState(false);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [avatarError, setAvatarError] = useState(false);
  const avatarUrl = user?.avatar_url || user?.user_metadata?.avatar_url;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);

      setImageFiles((prev) => [...prev, ...selectedFiles]);

      const selectedPreviews = selectedFiles.map((file) =>
        URL.createObjectURL(file)
      );
      setPreviewUrls((prev) => [...prev, ...selectedPreviews]);
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== indexToRemove));
    setPreviewUrls((prev) => {
      URL.revokeObjectURL(prev[indexToRemove]);
      return prev.filter((_, i) => i !== indexToRemove);
    });
  };

  const handleVerifyLocation = () => {
    if (!location.trim()) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      location
    )}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSubmit = async () => {
  if (!title.trim() || !description.trim()) return;

  setError("");
  setLoading(true);

  try {
    if (!user) throw new Error("You must be logged in.");

    // 1. Upload all images concurrently
    const uploadPromises = imageFiles.map((file, idx) => {
      console.log("Uploading file", idx, file.name);
      return uploadImageToCloudinary(file, "post"); // uses posts preset
    });
    const uploadedImageUrls = await Promise.all(uploadPromises);

    // 2. Insert into Supabase with array of URLs
    const { error: insertError } = await supabase
      .from("outreach_events")
      .insert([
        {
          admin_id: user.id,
          title,
          location,
          description,
          images: uploadedImageUrls, // e.g. ["https://res.cloudinary.com/..."]
        },
      ]);

    if (insertError) throw insertError;

    setTimeout(() => {
      navigate("/");
    }, 800);
  } catch (err: any) {
    console.error("Error creating post:", err);
    setError(err.message || "Failed to create post");
    setLoading(false);
  }
};


  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center lg:p-4 isolate">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => navigate(-1)}
      />

      <motion.div
        initial={{ y: "100%", opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: "100%", opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="w-full h-full bg-white flex flex-col relative z-10 lg:h-auto lg:max-h-[650px] lg:max-w-xl lg:rounded-2xl lg:shadow-2xl lg:overflow-hidden"
      >
        <header className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white shrink-0">
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6 text-gray-900" />
          </button>

          <Button
            onClick={handleSubmit}
            disabled={loading || !title.trim() || !description.trim()}
            size="sm"
            className="rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-1 h-9 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="flex px-4 py-6 gap-3">
            <div className="shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center">
                {avatarUrl && !avatarError ? (
                  <img
                    src={avatarUrl}
                    alt={user?.username || "User"}
                    className="w-full h-full object-cover"
                    onError={() => setAvatarError(true)}
                  />
                ) : (
                  <User className="text-gray-400 w-6 h-6" />
                )}
              </div>
            </div>

            <div className="flex-1 space-y-3 pt-1">
              <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-blue-200 text-blue-600 text-xs font-bold mb-1">
                <Globe className="w-3 h-3" />
                <span>Everyone</span>
              </div>

              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
                  {error}
                </div>
              )}

              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post Title"
                className="w-full text-lg font-bold placeholder:text-gray-400 border-none focus:ring-0 p-0 bg-transparent"
                autoFocus
              />

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's happening?"
                rows={4}
                className="w-full text-base text-gray-900 placeholder:text-gray-500 border-none focus:ring-0 p-0 bg-transparent resize-none leading-relaxed"
              />

              {showLocation && (
                <div className="flex items-center gap-2 text-blue-600 animate-in fade-in slide-in-from-top-1 duration-200 bg-blue-50/50 p-2 rounded-lg -ml-2">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Add location"
                    className="w-full text-sm text-blue-700 placeholder:text-blue-300 border-none focus:ring-0 p-0 bg-transparent"
                  />
                  {location.trim().length > 0 && (
                    <button
                      onClick={handleVerifyLocation}
                      className="p-1 hover:bg-blue-100 rounded-full text-blue-500"
                      title="Test link on Google Maps"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowLocation(false);
                      setLocation("");
                    }}
                    className="p-1 hover:bg-blue-100 rounded-full"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}

              {previewUrls.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {previewUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative aspect-[4/3] rounded-xl overflow-hidden border border-gray-100 group bg-gray-50"
                    >
                      <img
                        src={url}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => handleRemoveImage(idx)}
                        className="absolute top-1.5 right-1.5 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-50 bg-white shrink-0 flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
            title="Add Photos"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowLocation(!showLocation)}
            className={`p-2.5 rounded-full transition-colors ${
              showLocation
                ? "text-blue-600 bg-blue-50"
                : "text-blue-500 hover:bg-blue-50"
            }`}
            title="Add Location"
          >
            <MapPin className="w-5 h-5" />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="hidden"
          />
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
