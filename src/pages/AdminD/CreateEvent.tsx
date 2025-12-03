import { useState, useRef } from "react";
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
} from "lucide-react";
import { useAuth } from "@/context/authContext";
import { motion } from "framer-motion"; // ✅ Added for smooth animations

export default function CreateEvent() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showLocation, setShowLocation] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return;

    setError("");
    setLoading(true);

    try {
      if (!user) throw new Error("You must be logged in.");

      let uploadedImageUrl = "";

      if (imageFile) {
        uploadedImageUrl = await uploadImageToCloudinary(imageFile);
      }

      const { error: insertError } = await supabase
        .from("outreach_events")
        .insert([
          {
            admin_id: user.id,
            title,
            location,
            description,
            images: uploadedImageUrl ? [uploadedImageUrl] : [],
          },
        ]);

      if (insertError) throw insertError;

      // ✅ ADDED DELAY: Wait 800ms to let the slow DB catch up
      setTimeout(() => {
        navigate("/AdminDashboard");
      }, 800);
    } catch (err: any) {
      console.error("Error creating post:", err);
      setError(err.message || "Failed to create post");
      setLoading(false); // Only stop loading on error
    }
  };

  return (
    // OUTER CONTAINER: Handles positioning and z-index
    <div className="fixed inset-0 z-50 flex items-center justify-center lg:p-4">
      {/* 1. BACKDROP (Desktop Only) - Fades in */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm hidden lg:block"
        onClick={() => navigate(-1)}
      />

      {/* 2. CARD CONTAINER - Animated Entry */}
      <motion.div
        // Mobile: Slide up from bottom | Desktop: Fade in + Scale up
        initial={{ y: "100%", opacity: 0, scale: 0.95 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: "100%", opacity: 0, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="
          w-full h-full bg-white flex flex-col relative z-10
          lg:h-auto lg:max-h-[650px] lg:max-w-xl lg:rounded-2xl lg:shadow-2xl lg:overflow-hidden
        "
      >
        {/* HEADER */}
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

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto">
          <div className="flex px-4 py-6 gap-3">
            {/* User Avatar */}
            <div className="shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center">
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url}
                    alt={user.username || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="text-gray-400 w-6 h-6" />
                )}
              </div>
            </div>

            {/* Inputs */}
            <div className="flex-1 space-y-3 pt-1">
              {/* Audience Badge */}
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

              {previewUrl && (
                <div className="relative mt-2 rounded-xl overflow-hidden border border-gray-100 max-h-64 w-full group">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-2 left-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors backdrop-blur-sm"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER TOOLBAR */}
        <div className="p-4 border-t border-gray-50 bg-white shrink-0 flex items-center gap-1">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
            title="Add Photo"
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
            onChange={handleImageChange}
            className="hidden"
          />
        </div>
      </motion.div>
    </div>
  );
}
