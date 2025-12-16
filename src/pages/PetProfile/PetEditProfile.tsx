import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/lib/usePets";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Upload, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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
  const { pets } = usePets(user?.id);
  const navigate = useNavigate();

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

  const [loading, setLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const pet = pets.find((p) => p.id === petId);

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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileName = `${user?.id}/${petId}/${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from("pet-images")
        .upload(fileName, file, { upsert: true });

      if (error) throw error;

      const { data: publicData } = supabase.storage
        .from("pet-images")
        .getPublicUrl(data.path);

      return publicData.publicUrl;
    } catch (err: any) {
      console.error("Error uploading image:", err);
      setError("Failed to upload image");
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      let imageUrl = formData.petimage_url;

      // Upload new image if selected
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        } else {
          setLoading(false);
          return;
        }
      }

      // Update pet in database
      const { error: updateError } = await supabase
        .from("pets")
        .update({
          name: formData.name,
          species: formData.species,
          breed: formData.breed,
          color: formData.color,
          sex: formData.sex,
          dob: formData.dob,
          microchip_id: formData.microchip_id,
          location: formData.location,
          petimage_url: imageUrl,
        })
        .eq("id", petId)
        .eq("owner_id", user?.id);

      if (updateError) throw updateError;

      setSuccess("Pet profile updated successfully!");

      // Redirect after 1.5 seconds
      setTimeout(() => {
        navigate(`/PetDashboard/${petId}`);
      }, 1500);
    } catch (err: any) {
      console.error("Error updating pet:", err);
      setError(err.message || "Failed to update pet profile");
    } finally {
      setLoading(false);
    }
  };

  if (!pet) {
    return (
      <div className="w-full min-h-screen bg-white p-4 flex items-center justify-center">
        <p className="text-gray-600">Pet not found</p>
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
            {/* Error/Success Messages */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                {success}
              </div>
            )}

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
                  Upload Photo
                </span>
                <input
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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
                  placeholder="e.g., Golden Retriever"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
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

            {/* Location */}
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
                placeholder="Enter microchip ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
