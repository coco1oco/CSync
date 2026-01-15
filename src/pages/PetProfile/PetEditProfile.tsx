import { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import PetForm, { type PetFormData } from "@/components/PetForm";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";

export default function PetEditProfile() {
  const { petId } = useParams<{ petId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // 1. Detect Mode
  const isCampusMode = searchParams.get("mode") === "campus";
  const isAdmin = (user as any)?.role === "admin";

  // 2. Security Check
  useEffect(() => {
    if (isCampusMode && !isAdmin) {
      toast.error("Unauthorized access");
      navigate("/PetDashboard");
    }
  }, [isCampusMode, isAdmin, navigate]);

  // 3. FETCH DATA (useQuery)
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

  // 4. UPDATE DATA (useMutation)
  const mutation = useMutation({
    mutationFn: async (data: PetFormData) => {
      let imageUrl = data.petimage_url;

      if (data.imageFile) {
        toast.info("Uploading new photo...");
        imageUrl = await uploadImageToCloudinary(data.imageFile);
      }

      const updates: any = {
        name: data.name,
        species: data.species,
        breed: data.breed,
        color: data.color,
        sex: data.sex,
        dob: data.dob || null,
        location: data.location || null,
        petimage_url: imageUrl,
        spayed_neutered: isCampusMode ? data.spayed_neutered : undefined,
        status: isCampusMode ? data.status : undefined,
      };

      if (!isCampusMode) {
        updates.microchip_id = data.microchip_id || null;
      }

      const { error } = await supabase
        .from("pets")
        .update(updates)
        .eq("id", petId);

      if (error) throw error;
      return updates;
    },
    onSuccess: () => {
      toast.success("Profile updated!");
      // Refetch the specific pet and the list so the UI updates instantly
      queryClient.invalidateQueries({ queryKey: ["edit-pet", petId] });
      queryClient.invalidateQueries({ queryKey: ["pets"] });

      // ✅ FIX: Use navigate(-1) to pop the history stack.
      // This prevents the "Edit -> Profile -> Back -> Edit" loop.
      navigate(-1);
    },
    onError: (err) => {
      console.error(err);
      toast.error("Failed to update profile.");
    },
  });

  if (isLoading || !pet) {
    return <PetEditSkeleton isCampusMode={isCampusMode} />;
  }

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-24">
      {/* Header */}
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
            dob: pet.dob || "",
            location: pet.location || "",
            microchip_id: pet.microchip_id || "",
            petimage_url: pet.petimage_url || "",
            spayed_neutered: pet.spayed_neutered || false,
            status: pet.status || "healthy",
          }}
          onSubmit={(data) => mutation.mutate(data)}
          isSubmitting={mutation.isPending}
          submitLabel="Update Profile"
          isCampusMode={isCampusMode}
        />
      </div>
    </div>
  );
}

// SKELETON COMPONENT
function PetEditSkeleton({ isCampusMode }: { isCampusMode: boolean }) {
  return (
    <div className="w-full min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-30 bg-gray-50/95 border-b border-gray-200/50">
        <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center gap-4">
          <Skeleton className="w-9 h-9 rounded-full" />
          <Skeleton className="h-6 w-48 rounded-lg" />
        </div>
      </div>

      <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 mt-6 space-y-8">
        {/* Photo Upload Skeleton */}
        <div className="flex flex-col items-center space-y-4">
          <Skeleton className="w-32 h-32 rounded-full" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>

        {/* Form Fields Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
