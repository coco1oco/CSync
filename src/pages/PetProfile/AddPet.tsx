import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";
import { uploadImageToCloudinary } from "@/lib/cloudinary"; // Re-using your existing Cloudinary helper
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Camera, ChevronLeft, PawPrint } from "lucide-react";

// Default image if they don't upload one
import defaultPetIcon from "@/assets/Pet.svg";

export default function AddPet() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Form States
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [gender, setGender] = useState("Male");
  const [dob, setDob] = useState("");
  const [weight, setWeight] = useState("");
  const [color, setColor] = useState("");
  const [location, setLocation] = useState("");
  const [microchipId, setMicrochipId] = useState("");

  // Image States
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // UI States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Handle Image Selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // Show preview immediately
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!user) throw new Error("You must be logged in.");

      let photoUrl = null;

      // 1. Upload Image (if selected)
      if (imageFile) {
        // Using your existing Cloudinary helper
        photoUrl = await uploadImageToCloudinary(imageFile);
      }

      // 2. Save Pet Data to Supabase
      const { error: insertError } = await supabase.from("pets").insert([
        {
          owner_id: user.id,
          name,
          breed,
          gender,
          dob, // Ensure your date input format matches your DB (YYYY-MM-DD usually works)
          weight,
          color,
          location,
          microchip_id: microchipId,
          photo_url: photoUrl,
        },
      ]);

      if (insertError) throw insertError;

      // 3. Success -> Go back to Profile
      navigate("/ProfilePage");
    } catch (err: any) {
      console.error("Error adding pet:", err);
      setError(err.message || "Failed to add pet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* HEADER */}
      <header className="sticky top-0 z-10 flex items-center justify-between bg-white border-b border-gray-200 px-4 py-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition"
        >
          <ChevronLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">Add New Pet</h1>
        <div className="w-10" /> {/* Spacer for centering */}
      </header>

      <div className="max-w-md mx-auto p-6">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* PHOTO UPLOAD (Circle) */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative group">
              <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-sm overflow-hidden relative">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-200">
                    <PawPrint size={48} />
                  </div>
                )}

                {/* Hidden Input Trigger */}
                <label
                  htmlFor="pet-photo"
                  className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-all cursor-pointer"
                >
                  <div className="bg-white/90 p-2 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity transform scale-90 group-hover:scale-100">
                    <Camera size={20} className="text-gray-700" />
                  </div>
                </label>
              </div>
              <input
                type="file"
                id="pet-photo"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Tap to upload photo
            </p>
          </div>

          {/* FORM FIELDS (White Card Style) */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="name">Pet Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Putu"
                required
                className="bg-gray-50 border-gray-200 focus-visible:ring-blue-600 rounded-xl"
              />
            </div>

            {/* Breed & Gender Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="breed">Breed</Label>
                <Input
                  id="breed"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="e.g. Aspin"
                  className="bg-gray-50 border-gray-200 focus-visible:ring-blue-600 rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            {/* DOB & Weight Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="dob">Date of Birth</Label>
                <Input
                  id="dob"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  required
                  className="bg-gray-50 border-gray-200 focus-visible:ring-blue-600 rounded-xl block w-full"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 14"
                  className="bg-gray-50 border-gray-200 focus-visible:ring-blue-600 rounded-xl"
                />
              </div>
            </div>

            {/* Color */}
            <div className="space-y-1">
              <Label htmlFor="color">Color / Markings</Label>
              <Input
                id="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="e.g. White with brown spots"
                className="bg-gray-50 border-gray-200 focus-visible:ring-blue-600 rounded-xl"
              />
            </div>

            {/* Location */}
            <div className="space-y-1">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Indang, Cavite"
                className="bg-gray-50 border-gray-200 focus-visible:ring-blue-600 rounded-xl"
              />
            </div>

            {/* Microchip (Optional) */}
            <div className="space-y-1">
              <Label htmlFor="microchip">Microchip ID (Optional)</Label>
              <Input
                id="microchip"
                value={microchipId}
                onChange={(e) => setMicrochipId(e.target.value)}
                placeholder="e.g. 9851..."
                className="bg-gray-50 border-gray-200 focus-visible:ring-blue-600 rounded-xl"
              />
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              "Save Pet Profile"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
