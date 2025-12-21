import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/lib/usePets"; // Ensure this path is correct
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// Sub-sections
import ScheduleSection from "./ScheduleSection";
import VaccinationSection from "./VaccinationSection";
import TasksSection from "./TasksSection";

// Icons
import {
  ArrowLeft,
  Edit2,
  Calendar,
  Syringe,
  CheckSquare,
  MapPin,
  Activity,
  Trash2,
  Dog,
  Loader2,
  Fingerprint,
  Dna,
  QrCode,
  X,
  Download,
  AlertTriangle,
} from "lucide-react";

export default function PetProfilePage() {
  const { petId } = useParams<{ petId: string }>();
  const { user } = useAuth();

  // ✅ FIX 1: Destructure 'loading' from usePets
  const { pets, deletePet, loading: petsLoading } = usePets(user?.id);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"vaccines" | "schedule" | "tasks">(
    "vaccines"
  );
  const [showQR, setShowQR] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ FIX 2: Handle Loading State FIRST
  // If usePets is still fetching, show the spinner.
  // Inside PetProfilePage function...

  if (petsLoading) {
    return <PetProfileSkeleton />; // 🟢 Use the skeleton instead of the spinner div
  }

  // ✅ FIX 3: Find the pet only AFTER loading is done
  const pet = pets.find((p) => p.id === petId);

  // If loading is done but pet is still undefined, THEN show Not Found
  if (!pet) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50">
        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6">
          <Dog className="text-gray-400 w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Pet Not Found</h2>
        <p className="text-gray-500 max-w-xs text-center mb-8">
          This pet may have been deleted or you don't have permission to view
          it.
        </p>
        <Button
          onClick={() => navigate("/PetDashboard")}
          variant="outline"
          className="px-8"
        >
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const handleDelete = async () => {
    if (
      window.confirm(
        `Are you sure you want to remove ${pet.name}? This cannot be undone.`
      )
    ) {
      setIsDeleting(true);
      await deletePet(pet.id);
      setIsDeleting(false);
      navigate("/PetDashboard");
    }
  };

  return (
    <div className="h-full w-full flex flex-col lg:flex-row bg-gray-50 lg:p-6 gap-6 overflow-hidden relative">
      {/* ================= LEFT PANEL: PROFILE CARD ================= */}
      <div className="shrink-0 w-full lg:w-80 xl:w-96 flex flex-col gap-4 overflow-y-auto lg:overflow-hidden px-4 pt-4 lg:p-0">
        {/* Mobile Back Button */}
        <div className="lg:hidden mb-2">
          <button
            onClick={() => navigate("/PetDashboard")}
            className="flex items-center text-gray-500 text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 h-fit">
          {/* Header Actions */}
          <div className="flex justify-between items-start mb-4">
            <button
              onClick={() => navigate("/PetDashboard")}
              className="hidden lg:flex p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-gray-700 transition"
              title="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1" />
            <button
              onClick={() => navigate(`/PetDashboard/${pet.id}/edit`)}
              className="p-2 hover:bg-blue-50 rounded-full text-gray-400 hover:text-blue-600 transition"
              title="Edit Profile"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          </div>

          {/* Avatar */}
          <div className="relative w-32 h-32 mx-auto mb-4">
            <div className="w-full h-full rounded-full p-1 border-2 border-blue-100 bg-white shadow-sm">
              <div className="w-full h-full rounded-full overflow-hidden bg-gray-100">
                {pet.petimage_url ? (
                  <img
                    src={pet.petimage_url}
                    alt={pet.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-300">
                    <Dog size={40} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Basic Info */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black text-gray-900">{pet.name}</h1>
            <div className="flex items-center justify-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wide">
                {pet.species || "Pet"}
              </span>
              <span className="text-sm text-gray-500 font-medium">
                {pet.breed || "Unknown Breed"}
              </span>
            </div>
          </div>

          {/* Full Details Grid */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-3 mb-6">
            {/* Age */}
            <div className="flex items-center justify-between text-sm border-b border-gray-200/50 pb-2">
              <span className="text-gray-500 flex items-center gap-2">
                <Activity size={14} /> Age
              </span>
              <div className="text-right">
                <span className="font-semibold text-gray-900 block">
                  {pet.dob
                    ? `${
                        new Date().getFullYear() -
                        new Date(pet.dob).getFullYear()
                      } yrs`
                    : "N/A"}
                </span>
                {pet.dob && (
                  <span className="text-xs text-gray-400">
                    {new Date(pet.dob).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>

            {/* Sex */}
            <div className="flex items-center justify-between text-sm border-b border-gray-200/50 pb-2">
              <span className="text-gray-500 flex items-center gap-2">
                <Dna size={14} /> Sex
              </span>
              <span className="font-semibold text-gray-900 capitalize">
                {pet.sex || "Unknown"}
              </span>
            </div>

            {/* Color */}
            <div className="flex items-center justify-between text-sm border-b border-gray-200/50 pb-2">
              <span className="text-gray-500 flex items-center gap-2">
                <div
                  className="w-3.5 h-3.5 rounded-full border border-gray-400"
                  style={{ backgroundColor: pet.color || "transparent" }}
                />
                Color
              </span>
              <span className="font-semibold text-gray-900">
                {pet.color || "N/A"}
              </span>
            </div>

            {/* Location */}
            <div className="flex items-center justify-between text-sm border-b border-gray-200/50 pb-2">
              <span className="text-gray-500 flex items-center gap-2">
                <MapPin size={14} /> Location
              </span>
              <span className="font-semibold text-gray-900 truncate max-w-[120px]">
                {pet.location || "Home"}
              </span>
            </div>

            {/* Microchip */}
            <div className="flex items-center justify-between text-sm pt-1">
              <span className="text-gray-500 flex items-center gap-2">
                <Fingerprint size={14} /> Microchip
              </span>
              <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-200/50 px-2 py-1 rounded">
                {pet.microchip_id || "None"}
              </span>
            </div>
          </div>

          {/* QR Code Button (Personal Pets Only) */}
          {!pet.is_campus_pet && (
            <Button
              onClick={() => setShowQR(true)}
              variant="outline"
              className="w-full mb-3 border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800 rounded-xl gap-2 h-10"
            >
              <QrCode className="w-4 h-4" /> Digital ID & QR
            </Button>
          )}

          {/* Delete Button */}
          <Button
            onClick={handleDelete}
            disabled={isDeleting}
            variant="ghost"
            className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl h-10"
          >
            {isDeleting ? (
              <Loader2 className="animate-spin w-4 h-4" />
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" /> Delete Profile
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ================= RIGHT PANEL: ACTION CENTER ================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-white lg:rounded-3xl lg:border lg:border-gray-200 lg:shadow-sm overflow-hidden mt-4 lg:mt-0 rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t border-gray-100 lg:shadow-none lg:border-t">
        {/* Tabs Header */}
        <div className="px-4 pt-4 lg:px-6 lg:pt-6 border-b border-gray-100 pb-0 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 mb-4 hidden lg:block">
            Records & Health
          </h2>
          <div className="flex gap-6 overflow-x-auto pb-0 hide-scrollbar">
            <button
              onClick={() => setActiveTab("vaccines")}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "vaccines"
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Syringe className="w-4 h-4" /> Vaccinations
            </button>
            <button
              onClick={() => setActiveTab("tasks")}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "tasks"
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <CheckSquare className="w-4 h-4" /> Tasks & Care
            </button>
            <button
              onClick={() => setActiveTab("schedule")}
              className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
                activeTab === "schedule"
                  ? "border-purple-500 text-purple-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Calendar className="w-4 h-4" /> Appointments
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-50/50">
          <div className="max-w-3xl mx-auto space-y-6">
            {activeTab === "vaccines" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <VaccinationSection petId={pet.id} />
              </div>
            )}
            {activeTab === "tasks" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <TasksSection petId={pet.id} />
              </div>
            )}
            {activeTab === "schedule" && (
              <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                <ScheduleSection petId={pet.id} />
              </div>
            )}
          </div>

          {/* Bottom padding spacer for mobile */}
          <div className="h-20 lg:h-0" />
        </div>
      </div>

      {/* ================= QR CODE MODAL ================= */}
      {showQR && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm relative text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowQR(false)}
              className="absolute right-4 top-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
            >
              <X size={20} />
            </button>

            <div>
              <h3 className="text-xl font-bold text-gray-900">
                Pet Digital ID
              </h3>
              <p className="text-sm text-gray-500">
                Scan to view owner contact info
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 inline-block">
              <QRCode
                value={`${window.location.origin}/lost-and-found/${pet.id}`}
                size={200}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-xl text-left flex items-start gap-3">
              <AlertTriangle
                className="text-blue-600 shrink-0 mt-0.5"
                size={18}
              />
              <p className="text-xs text-blue-800 leading-relaxed">
                <strong>Tip:</strong> Print this code and attach it to{" "}
                {pet.name}'s collar. If they get lost, anyone can scan it to
                contact you immediately.
              </p>
            </div>

            <Button
              className="w-full rounded-xl bg-gray-900 hover:bg-black"
              onClick={() => window.print()}
            >
              <Download className="w-4 h-4 mr-2" /> Print / Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
function PetProfileSkeleton() {
  return (
    <div className="h-full w-full flex flex-col lg:flex-row bg-gray-50 lg:p-6 gap-6">
      {/* Left Panel Skeleton */}
      <div className="w-full lg:w-96 flex flex-col gap-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 h-96 flex flex-col items-center pt-10">
          <Skeleton className="w-32 h-32 rounded-full mb-4" /> {/* Avatar */}
          <Skeleton className="w-48 h-8 mb-2" /> {/* Name */}
          <Skeleton className="w-24 h-4 mb-8" /> {/* Breed */}
          <div className="w-full space-y-4 px-4">
            <Skeleton className="w-full h-6" />
            <Skeleton className="w-full h-6" />
            <Skeleton className="w-full h-6" />
          </div>
        </div>
      </div>

      {/* Right Panel Skeleton */}
      <div className="flex-1 bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
        <div className="flex gap-4 mb-8 border-b pb-4">
          <Skeleton className="w-32 h-10 rounded-full" />
          <Skeleton className="w-32 h-10 rounded-full" />
          <Skeleton className="w-32 h-10 rounded-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="w-full h-24 rounded-xl" />
          <Skeleton className="w-full h-24 rounded-xl" />
          <Skeleton className="w-full h-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
