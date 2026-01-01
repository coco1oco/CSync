import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/lib/usePets";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { ArrowLeft, Building2 } from "lucide-react";
import { toast } from "sonner";
import { TemplateService } from "@/lib/TemplateService";
import PetForm, { type PetFormData } from "@/components/PetForm";

export default function AddPetPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get("mode");
  const isCampusMode = modeParam === "campus";

  const { addPet } = usePets(user?.id, isCampusMode ? "campus" : "personal");
  const [loading, setLoading] = useState(false);

  const handleAddPet = async (data: PetFormData) => {
    if (!user) return; // Guard clause
    setLoading(true);

    try {
      let imageUrl = null;
      if (data.imageFile) {
        imageUrl = await uploadImageToCloudinary(data.imageFile);
      }

      // 1. Create Pet in Database
      const result = await addPet({
        name: data.name,
        species: data.species || null,
        breed: data.breed || null,
        color: data.color || null,
        sex: data.sex || null,
        dob: data.dob ? new Date(data.dob).toISOString().split("T")[0] : null,
        location: data.location || null,
        microchip_id: data.microchip_id || null,
        petimage_url: imageUrl,
      });

      // 2. If successful, apply the Smart Template
      if (result) {
        try {
          // ✅ FIX: Use 'result.id' (from DB), not 'data.id' (from Form)
          await TemplateService.applyStarterTemplate(
            result.id,
            result.species || "dog", // Fallback if species is missing
            user.id
          );
        } catch (templateError) {
          console.error("Template error:", templateError);
          // We don't block navigation if template fails, just log it
        }

        toast.success(
          isCampusMode ? "Campus dog registered!" : "New pet added!"
        );
        navigate("/PetDashboard");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to add pet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200/50">
        <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate("/PetDashboard")}
            className="p-2 hover:bg-gray-200/50 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900">
              {isCampusMode ? "Register Campus Dog" : "Add New Pet"}
            </h1>
            {isCampusMode && (
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 uppercase tracking-wide">
                <Building2 size={12} /> YFA Management
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Full Width Container */}
      <div className="w-full max-w-7xl mx-auto px-4 lg:px-8 mt-6">
        <PetForm
          onSubmit={handleAddPet}
          isSubmitting={loading}
          submitLabel={isCampusMode ? "Register Dog" : "Add Pet"}
        />
      </div>
    </div>
  );
}
