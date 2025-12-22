import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/lib/usePets";
import { supabase } from "@/lib/supabaseClient";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import PetForm, { type PetFormData } from "@/components/PetForm";

export default function PetEditProfile() {
  const { petId } = useParams<{ petId: string }>();
  const { user } = useAuth();
  const { pets } = usePets(user?.id);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const pet = pets.find((p) => p.id === petId);

  const handleUpdatePet = async (data: PetFormData) => {
    setLoading(true);
    try {
      let imageUrl = data.petimage_url;
      if (data.imageFile) {
        toast.info("Uploading new photo...");
        imageUrl = await uploadImageToCloudinary(data.imageFile);
      }

      const { error } = await supabase
        .from("pets")
        .update({
          name: data.name,
          species: data.species,
          breed: data.breed,
          color: data.color,
          sex: data.sex,
          dob: data.dob || null,
          microchip_id: data.microchip_id || null,
          location: data.location || null,
          petimage_url: imageUrl,
        })
        .eq("id", petId)
        .eq("owner_id", user?.id);

      if (error) throw error;
      toast.success("Profile updated!");
      navigate(`/PetDashboard/${petId}`);
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  if (!pet) return <div className="p-8 text-center">Loading Pet...</div>;

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200/50">
        <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(`/PetDashboard/${petId}`)}
            className="p-2 hover:bg-gray-200/50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-black text-gray-900">Edit Profile</h1>
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 mt-6">
        <PetForm
          initialData={{
            name: pet.name,
            species: pet.species || "",
            breed: pet.breed || "",
            color: pet.color || "",
            sex: pet.sex || "",
            dob: pet.dob ? pet.dob.split("T")[0] : "",
            location: pet.location || "",
            microchip_id: pet.microchip_id || "",
            petimage_url: pet.petimage_url || "",
          }}
          onSubmit={handleUpdatePet}
          isSubmitting={loading}
          submitLabel="Update Profile"
        />
      </div>
    </div>
  );
}
