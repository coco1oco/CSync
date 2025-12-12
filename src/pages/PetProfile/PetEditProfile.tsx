import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/lib/usePets";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner"; // ✅ Toasts
import { uploadImageToCloudinary } from "@/lib/cloudinary"; // ✅ Consistent Uploads

// ✅ Reuse the Breed Data for consistency
const BREED_DATA: Record<string, string[]> = {
  Dog: [
    "Aspin (Askal)",
    "Beagle",
    "Bulldog",
    "Chihuahua",
    "Dachshund",
    "German Shepherd",
    "Golden Retriever",
    "Labrador Retriever",
    "Pomeranian",
    "Poodle",
    "Pug",
    "Shih Tzu",
    "Siberian Husky",
    "Mixed Breed",
  ],
  Cat: [
    "Puspin (Domestic Short Hair)",
    "Persian",
    "Siamese",
    "Maine Coon",
    "British Shorthair",
    "Ragdoll",
    "Bengal",
    "Scottish Fold",
    "Sphynx",
    "Mixed Breed",
  ],
  Bird: ["Parakeet", "Cockatiel", "Lovebird", "Canary", "Parrot", "Finch"],
  Rabbit: ["Netherland Dwarf", "Holland Lop", "Lionhead", "Mini Rex"],
};

interface FormData {
  name: string;
  species: string;
  breed: string;
  color: string;
  sex: string;
  dob: string;
  microchip_id: string;
  location: string;
  petimage_url: string;
}

export default function PetEditProfile() {
  const { petId } = useParams<{ petId: string }>();
  const { user } = useAuth();
  const { pets } = usePets(user?.id); // Note: We might want a dedicated fetchPet(id) later for freshness
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    species: "",
    breed: "",
    color: "",
    sex: "",
    dob: "",
    microchip_id: "",
    location: "",
    petimage_url: "",
  });

  // Smart Breed Logic
  const [availableBreeds, setAvailableBreeds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const pet = pets.find((p) => p.id === petId);

  // Load Pet Data
  useEffect(() => {
    if (pet) {
      setFormData({
        name: pet.name || "",
        species: pet.species || "",
        breed: pet.breed || "",
        color: pet.color || "",
        sex: pet.sex || "",
        dob: pet.dob ? pet.dob.split("T")[0] : "",
        microchip_id: pet.microchip_id || "",
        location: pet.location || "",
        petimage_url: pet.petimage_url || "",
      });
      if (pet.petimage_url) {
        setImagePreview(pet.petimage_url);
      }
    }
  }, [pet]);

  // Update Breeds when Species changes (Initial load + User change)
  useEffect(() => {
    if (formData.species && BREED_DATA[formData.species]) {
      setAvailableBreeds(BREED_DATA[formData.species]);
    } else {
      setAvailableBreeds([]);
    }
  }, [formData.species]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    // Clear breed if species changes
    if (name === "species" && value !== formData.species) {
      setFormData((prev) => ({ ...prev, [name]: value, breed: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setFormData((prev) => ({
      ...prev,
      petimage_url: "",
    }));
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = formData.petimage_url;

      // ✅ Use standard Cloudinary uploader
      if (imageFile) {
        toast.info("Uploading new photo...");
        try {
          const uploadedUrl = await uploadImageToCloudinary(imageFile);
          if (uploadedUrl) imageUrl = uploadedUrl;
        } catch (uploadErr) {
          console.error("Upload failed", uploadErr);
          toast.error("Failed to upload image, but saving profile...");
        }
      }

      const { error: updateError } = await supabase
        .from("pets")
        .update({
          name: formData.name,
          species: formData.species,
          breed: formData.breed,
          color: formData.color,
          sex: formData.sex,
          dob: formData.dob || null,
          microchip_id: formData.microchip_id || null,
          location: formData.location || null,
          petimage_url: imageUrl,
        })
        .eq("id", petId)
        .eq("owner_id", user?.id);

      if (updateError) throw updateError;

      // ✅ Success Toast
      toast.success("Pet profile updated successfully!");

      setTimeout(() => {
        navigate(`/PetDashboard/${petId}`);
      }, 1000);
    } catch (err: any) {
      console.error("Error updating pet:", err);
      toast.error(err.message || "Failed to update pet profile");
    } finally {
      setLoading(false);
    }
  };

  if (!pet) {
    return (
      <div className="w-full min-h-screen bg-white p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-gray-500">Loading pet details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white p-4 pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(`/PetDashboard/${petId}`)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-2xl font-bold">Edit {pet.name}</h1>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Pet Photo
              </label>
              {imagePreview ? (
                <div className="relative mb-4">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-full h-48 rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-full h-48 bg-gray-100 rounded-xl mb-4 flex items-center justify-center">
                  <span className="text-gray-500">No photo</span>
                </div>
              )}

              <label className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 cursor-pointer transition">
                <Upload className="w-4 h-4" />
                <span className="text-sm font-medium text-gray-600">
                  {imageFile ? "Change Photo" : "Upload Photo"}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            </div>

            {/* Pet Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Pet Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Species & Breed */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Species
                </label>
                <select
                  name="species"
                  value={formData.species}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="">Select species</option>
                  <option value="Dog">Dog</option>
                  <option value="Cat">Cat</option>
                  <option value="Bird">Bird</option>
                  <option value="Rabbit">Rabbit</option>
                  <option value="Hamster">Hamster</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* ✅ SMART BREED INPUT */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Breed
                </label>
                <input
                  type="text"
                  name="breed"
                  value={formData.breed}
                  onChange={handleInputChange}
                  list="breed-suggestions-edit" // Unique ID
                  placeholder={
                    availableBreeds.length > 0
                      ? "Select/Type..."
                      : "e.g. Bulldog"
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <datalist id="breed-suggestions-edit">
                  {availableBreeds.map((breed) => (
                    <option key={breed} value={breed} />
                  ))}
                </datalist>
              </div>
            </div>

            {/* Color & Sex */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Color
                </label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Sex
                </label>
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
                >
                  <option value="">Select sex</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
            </div>

            {/* Date of Birth & Location */}
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., New York, NY"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Microchip ID */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Microchip ID
              </label>
              <input
                type="text"
                name="microchip_id"
                value={formData.microchip_id}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? "Saving Changes..." : "Update Profile"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
