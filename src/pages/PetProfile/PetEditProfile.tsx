import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import PetForm, { type PetFormData } from "@/components/PetForm";
import { useQuery } from "@tanstack/react-query"; // ✅ Need this for admin fetch

export default function PetEditProfile() {
  const { petId } = useParams<{ petId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Detect Mode
  const isCampusMode = searchParams.get("mode") === "campus";
  const isAdmin = (user as any)?.role === "admin";

  // 2. Security Check (If accessing campus mode)
  useEffect(() => {
    if (isCampusMode && !isAdmin) {
      toast.error("Unauthorized access");
      navigate("/PetDashboard");
    }
  }, [isCampusMode, isAdmin, navigate]);

  // 3. FETCH DATA (Replaced usePets with direct fetch to support Admins)
  const { data: pet, isLoading } = useQuery({
    queryKey: ["edit-pet", petId],
    queryFn: async () => {
      if (!petId) return null;
      const { data, error } = await supabase
        .from("pets")
        .select("*")
        .eq("id", petId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!petId,
  });

  const handleUpdatePet = async (data: PetFormData) => {
    setIsSubmitting(true);
    try {
      let imageUrl = data.petimage_url;
      if (data.imageFile) {
        toast.info("Uploading new photo...");
        imageUrl = await uploadImageToCloudinary(data.imageFile);
      }

      // Build update object dynamically
      const updates: any = {
        name: data.name,
        species: data.species,
        breed: data.breed,
        color: data.color,
        sex: data.sex,
        dob: data.dob || null,
        location: data.location || null,
        petimage_url: imageUrl,
        // ✅ Add new fields for Campus Pets
        spayed_neutered: isCampusMode ? data.spayed_neutered : undefined,
        status: isCampusMode ? data.status : undefined,
      };

      // Only add microchip if NOT campus pet
      if (!isCampusMode) {
        updates.microchip_id = data.microchip_id || null;
      }

      const { error } = await supabase
        .from("pets")
        .update(updates)
        .eq("id", petId);

      if (error) throw error;
      toast.success("Profile updated!");
      navigate(
        isCampusMode
          ? `/PetDashboard/${petId}?mode=campus`
          : `/PetDashboard/${petId}`
      );
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ PRESERVED YOUR ORIGINAL UI
  if (isLoading || !pet)
    return <div className="p-8 text-center">Loading Pet...</div>;

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200/50">
        <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-200/50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="text-xl font-black text-gray-900">
            Edit {isCampusMode ? "Campus Resident" : "Profile"}
          </h1>
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
            dob: pet.dob || "", // Handle full date string from DB
            location: pet.location || "",
            microchip_id: pet.microchip_id || "",
            petimage_url: pet.petimage_url || "",
            // ✅ Map existing DB values
            spayed_neutered: pet.spayed_neutered || false,
            status: pet.status || "healthy",
          }}
          onSubmit={handleUpdatePet}
          isSubmitting={isSubmitting}
          submitLabel="Update Profile"
          isCampusMode={isCampusMode} // ✅ Passed prop
        />
      </div>
    </div>
  );
}
