import { useState } from "react";
import ScheduleSection from "./ScheduleSection";
import VaccinationSection from "./VaccinationSection";
import TasksSection from "./TasksSection";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/lib/usePets";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit2, Calendar, Syringe, CheckSquare, QrCode } from "lucide-react";
import PetQRCode from "@/components/PetQRCode";

// Helper function to get owner display name
const getOwnerDisplayName = (user: any): string => {
  if (user?.first_name && user?.last_name) {
    return `${user.first_name} ${user.last_name}`;
  }
  return user?.username || "Owner";
};

export default function PetProfilePage() {
  const { petId } = useParams<{ petId: string }>();
  const { user } = useAuth();
  const { pets, deletePet } = usePets(user?.id);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"vaccines" | "schedule" | "tasks" | "qrcode">(
    "vaccines"
  );

  const pet = pets.find((p) => p.id === petId);

  if (!pet) {
    return (
      <div className="w-full min-h-screen bg-gray-100 p-4 flex items-center justify-center">
        <p>Pet not found</p>
      </div>
    );
  }

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this pet?")) {
      setLoading(true);
      await deletePet(pet.id);
      setLoading(false);
      navigate("/PetDashboard");
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-100 p-4 pb-24">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl p-4 shadow-md">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => navigate("/PetDashboard")}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="font-semibold text-lg">{pet.name}</span>
            <button
              onClick={() => navigate(`/PetDashboard/${pet.id}/edit`)}
              className="p-1 hover:bg-gray-100 rounded-lg"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          </div>

          {/* Pet Image */}
          {pet.petimage_url ? (
            <img
              src={pet.petimage_url}
              alt={pet.name}
              className="w-full h-48 rounded-xl object-cover mb-6"
            />
          ) : (
            <div className="w-full h-48 bg-gray-300 rounded-xl mb-6 flex items-center justify-center">
              <span className="text-gray-500">No Photo</span>
            </div>
          )}

          {/* Info Grid */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500">Name</p>
                <p className="text-sm font-medium">{pet.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">Species</p>
                <p className="text-sm font-medium">{pet.species || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">Breed</p>
                <p className="text-sm font-medium">{pet.breed || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">Color</p>
                <p className="text-sm font-medium">{pet.color || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">Sex</p>
                <p className="text-sm font-medium">{pet.sex || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">
                  Date of Birth
                </p>
                <p className="text-sm font-medium">
                  {pet.dob ? new Date(pet.dob).toLocaleDateString() : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500">Location</p>
                <p className="text-sm font-medium">{pet.location || "N/A"}</p>
              </div>
            </div>

            {pet.microchip_id && (
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-500">
                  Microchip ID
                </p>
                <p className="text-sm font-medium">{pet.microchip_id}</p>
              </div>
            )}
          </div>

          {/* ✅ NEW PILL-SHAPED TAB NAVIGATION */}
          <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-full overflow-x-auto">
            <button
              onClick={() => setActiveTab("vaccines")}
              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 font-medium text-xs rounded-full transition-all whitespace-nowrap ${
                activeTab === "vaccines"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Syringe className="w-3 h-3" />
              Vaccines
            </button>
            <button
              onClick={() => setActiveTab("schedule")}
              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 font-medium text-xs rounded-full transition-all whitespace-nowrap ${
                activeTab === "schedule"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Calendar className="w-3 h-3" />
              Schedule
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 font-medium text-xs rounded-full transition-all whitespace-nowrap ${
                activeTab === "tasks"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <CheckSquare className="w-3 h-3" />
              Tasks
            </button>
            <button
              onClick={() => setActiveTab("qrcode")}
              className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 font-medium text-xs rounded-full transition-all whitespace-nowrap ${
                activeTab === "qrcode"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <QrCode className="w-3 h-3" />
              QR Code
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-64 mb-6">
            {activeTab === "vaccines" && <VaccinationSection petId={pet.id} />}
            {activeTab === "schedule" && <ScheduleSection petId={pet.id} />}
            {activeTab === "tasks" && <TasksSection petId={pet.id} />}
            {activeTab === "qrcode" && (
              <PetQRCode
                pet={pet}
                ownerName={getOwnerDisplayName(user)}
                ownerContact={user?.email}
              />
            )}
          </div>

          {/* Delete Button */}
          <Button
            onClick={handleDelete}
            disabled={loading}
            variant="destructive"
            className="w-full mt-6"
          >
            {loading ? "Deleting..." : "Delete Pet"}
          </Button>
        </div>
      </div>
    </div>
  );
}
