import React, { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom"; // ✅ Import useSearchParams
import { useAuth } from "@/context/authContext";
import { usePets } from "@/lib/usePets";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";

// ... (Keep BREED_DATA exactly as it is) ...
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
  location: string;
  microchip_id: string;
}

export default function AddPetPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ✅ 1. READ URL PARAMETER
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get("mode");
  const isCampusMode = modeParam === "campus";

  // ✅ 2. INIT HOOK WITH CORRECT MODE
  // If ?mode=campus, addPet will automatically set is_org_pet = true
  const { addPet } = usePets(user?.id, isCampusMode ? "campus" : "personal");

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    name: "",
    species: "",
    breed: "",
    color: "",
    sex: "",
    dob: "",
    location: "",
    microchip_id: "",
  });

  // ... (Keep Breed Suggestions State & Effect) ...
  const [availableBreeds, setAvailableBreeds] = useState<string[]>([]);
  useEffect(() => {
    if (formData.species && BREED_DATA[formData.species]) {
      setAvailableBreeds(BREED_DATA[formData.species]);
    } else {
      setAvailableBreeds([]);
    }
  }, [formData.species]);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [petImageUrl, setPetImageUrl] = useState<string | null>(null);
  const [petImagePreview, setPetImagePreview] = useState<string | null>(null);

  // ... (Keep handleInputChange, handlePickPetImage, handlePetImageChange, handleRemoveImage) ...
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    if (name === "species" && value !== formData.species) {
      setFormData((prev) => ({ ...prev, [name]: value, breed: "" }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handlePetImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const preview = URL.createObjectURL(file);
    setPetImagePreview(preview);
    setUploading(true);
    try {
      const cloudinaryUrl = await uploadImageToCloudinary(file);
      setPetImageUrl(cloudinaryUrl);
      toast.success("Photo uploaded successfully!");
    } catch (error) {
      setPetImagePreview(null);
      toast.error("Failed to upload image. Please try again.");
    }
    setUploading(false);
  };

  const handleRemoveImage = () => {
    setPetImageUrl(null);
    setPetImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Logic handled by usePets hook based on 'mode'
      const result = await addPet({
        name: formData.name,
        species: formData.species || null,
        breed: formData.breed || null,
        color: formData.color || null,
        sex: formData.sex || null,
        dob: formData.dob
          ? new Date(formData.dob).toISOString().split("T")[0]
          : null,
        location: formData.location || null,
        microchip_id: formData.microchip_id || null,
        petimage_url: petImageUrl,
      });

      if (result) {
        toast.success(
          isCampusMode
            ? `Successfully registered ${formData.name} to Campus Dogs! 🎓`
            : `Welcome to the family, ${formData.name}! 🐾`
        );

        setTimeout(() => {
          navigate("/PetDashboard");
        }, 1500);
      } else {
        toast.error("Failed to save pet. Check console for errors.");
      }
    } catch (err: any) {
      console.error("Error adding pet:", err);
      toast.error(err.message || "Failed to add pet");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-white p-4 pb-24">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate("/PetDashboard")}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">
              {isCampusMode ? "Register Campus Dog" : "Add New Pet"}
            </h1>
            {isCampusMode && (
              <span className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full w-fit mt-1">
                <Building2 size={12} /> YFA Management
              </span>
            )}
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* ... (Keep form inputs exactly the same as before) ... */}

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Pet Photo
              </label>
              {petImagePreview ? (
                <div className="relative mb-4">
                  <img
                    src={petImagePreview}
                    alt="Preview"
                    className="w-full h-48 rounded-xl object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    disabled={uploading}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition disabled:opacity-50"
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
                  {uploading ? "Uploading..." : "Upload Photo"}
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePetImageChange}
                  disabled={uploading}
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
                placeholder="Enter pet name"
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
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Breed
                </label>
                <input
                  type="text"
                  name="breed"
                  value={formData.breed}
                  onChange={handleInputChange}
                  list="breed-suggestions"
                  placeholder={
                    availableBreeds.length > 0
                      ? "Select/Type..."
                      : "e.g. Golden Retriever"
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
                <datalist id="breed-suggestions">
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
                  placeholder="e.g., Brown"
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

            {/* Date of Birth */}
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

            {/* Location & Microchip */}
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
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Microchip ID
              </label>
              <input
                type="text"
                name="microchip_id"
                value={formData.microchip_id}
                onChange={handleInputChange}
                placeholder="Enter microchip ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || uploading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading
                ? "Saving..."
                : uploading
                ? "Uploading image..."
                : isCampusMode
                ? "Register Campus Dog"
                : "Add Pet"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
