import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";
import { useDialog } from "@/context/DialogContext"; // ✅ Custom Dialog Hook

// Components
import PetProfileCard from "./components/PetProfileCard";
import HealthPassport from "./components/HealthPassport";
import QRModal from "./components/QRModal";
import DocumentsSection from "./components/DocumentsSection";
import LifeTimeline from "./components/LifeTimeline";
import RoutineSection from "./components/RoutineSection";
import WeightSection from "./components/WeightSection";
import ScheduleSection from "./ScheduleSection";
import VaccinationSection from "./VaccinationSection";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ShieldCheck,
  History,
  Settings2,
  Calendar,
  HeartPulse,
  Syringe,
  Scale,
  FileText,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PetProfilePage() {
  const { petId } = useParams<{ petId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { confirm, alert } = useDialog(); // ✅ Init Hooks

  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 1. MAIN TABS
  const [activeTab, setActiveTab] = useState("passport");

  // 2. SUB TABS (Health Section)
  const [healthSubTab, setHealthSubTab] = useState("vaccines");

  const [showQR, setShowQR] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchPet() {
      if (!petId) return;
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("pets")
          .select("*")
          .eq("id", petId)
          .single();
        if (error) throw error;
        setPet(data);
      } catch (err) {
        console.error("Error fetching pet:", err);
      } finally {
        setTimeout(() => setLoading(false), 300);
      }
    }
    fetchPet();
  }, [petId]);

  const isOwner = user?.id === pet?.owner_id;
  const isCampusPet = pet?.is_campus_pet;
  const isAdmin = (user as any)?.role === "admin";
  const canManage = isOwner || (isCampusPet && isAdmin);

  if (loading) return <PetProfileSkeleton />;

  if (!pet) return <NotFoundState onBack={() => navigate("/PetDashboard")} />;

  const handleDelete = async () => {
    // ✅ Custom Danger Confirmation
    const isConfirmed = await confirm(
      `This action cannot be undone. All data for ${pet.name} will be lost permanently.`,
      {
        title: `Delete ${pet.name}?`,
        variant: "danger",
        confirmText: "Yes, Delete Profile",
        cancelText: "Keep Profile",
      }
    );

    if (isConfirmed) {
      setIsDeleting(true);
      try {
        await supabase.from("pets").delete().eq("id", pet.id);
        navigate("/PetDashboard");
      } catch (err) {
        // ✅ Custom Alert
        await alert("Failed to delete profile. Please try again.");
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col lg:flex-row lg:items-start lg:p-6 gap-6 relative">
      <div className="shrink-0 w-full lg:w-80 xl:w-96 px-4 pt-4 lg:p-0 lg:sticky lg:top-6 lg:h-fit z-20">
        <PetProfileCard
          pet={pet}
          isOwner={isOwner}
          isCampusPet={isCampusPet}
          canManage={canManage}
          isDeleting={isDeleting}
          onDelete={handleDelete}
          onShowQR={() => setShowQR(true)}
        />
      </div>

      <div className="flex-1 flex flex-col bg-white lg:rounded-[2rem] lg:border lg:shadow-xl mt-4 lg:mt-0 rounded-t-[2rem] min-h-[calc(100vh-4rem)] pb-20 lg:pb-0">
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm shrink-0 rounded-t-[2rem] border-b border-gray-100 shadow-sm lg:shadow-none lg:static transition-all">
          <div className="lg:hidden px-6 pt-4 pb-2 flex items-center justify-between">
            <span className="font-bold text-gray-900 truncate">
              {pet.name}'s Binder
            </span>
          </div>

          <div className="hidden lg:flex justify-between items-center px-8 pt-8 mb-6">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-2 text-gray-900">
                {isCampusPet ? "Campus Dog Hub" : "Pet Binder"}
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                {isCampusPet
                  ? "Monitoring resident."
                  : `Official records for ${pet.name}.`}
              </p>
            </div>
          </div>

          <div className="flex gap-2 px-4 lg:px-8 pb-3 overflow-x-auto scrollbar-hide snap-x">
            <TabBtn
              active={activeTab === "passport"}
              onClick={() => setActiveTab("passport")}
              icon={<ShieldCheck size={18} />}
              label="Passport"
            />
            <TabBtn
              active={activeTab === "schedule"}
              onClick={() => setActiveTab("schedule")}
              icon={<Calendar size={18} />}
              label="Schedule"
            />
            <TabBtn
              active={activeTab === "health"}
              onClick={() => setActiveTab("health")}
              icon={<HeartPulse size={18} />}
              label="Health"
            />
            <TabBtn
              active={activeTab === "routine"}
              onClick={() => setActiveTab("routine")}
              icon={<Settings2 size={18} />}
              label="Routine"
            />
            <TabBtn
              active={activeTab === "timeline"}
              onClick={() => setActiveTab("timeline")}
              icon={<History size={18} />}
              label="Timeline"
            />
          </div>
        </div>

        <div className="flex-1 p-4 lg:p-8 bg-gray-50/50 min-h-[500px]">
          {activeTab === "passport" && (
            <HealthPassport pet={pet} userId={pet.owner_id} />
          )}

          {activeTab === "schedule" && <ScheduleSection petId={pet.id} />}

          {activeTab === "health" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex p-1 bg-white rounded-xl border border-gray-200 w-full md:w-fit shadow-sm overflow-x-auto">
                <SubTabBtn
                  active={healthSubTab === "vaccines"}
                  onClick={() => setHealthSubTab("vaccines")}
                  icon={<Syringe size={14} />}
                  label="Vaccines"
                />
                <SubTabBtn
                  active={healthSubTab === "weight"}
                  onClick={() => setHealthSubTab("weight")}
                  icon={<Scale size={14} />}
                  label="Weight"
                />
                <SubTabBtn
                  active={healthSubTab === "docs"}
                  onClick={() => setHealthSubTab("docs")}
                  icon={<FileText size={14} />}
                  label="Docs"
                />
              </div>

              <div className="mt-4">
                {healthSubTab === "vaccines" && (
                  <VaccinationSection petId={pet.id} />
                )}
                {healthSubTab === "weight" && <WeightSection petId={pet.id} />}
                {healthSubTab === "docs" && (
                  <DocumentsSection petId={pet.id} canManage={canManage} />
                )}
              </div>
            </div>
          )}

          {activeTab === "routine" && <RoutineSection petId={pet.id} />}

          {activeTab === "timeline" && <LifeTimeline petId={pet.id} />}
        </div>
      </div>

      {showQR && (
        <QRModal
          name={pet.name}
          petId={pet.id}
          onClose={() => setShowQR(false)}
        />
      )}
    </div>
  );
}

// Helpers
function PetProfileSkeleton() {
  return (
    <div className="w-full min-h-screen bg-gray-50 flex flex-col lg:flex-row p-4 lg:p-6 gap-6">
      <div className="w-full lg:w-96 bg-white rounded-[2rem] p-6 shadow-sm border border-gray-100 h-fit">
        <Skeleton className="h-40 w-40 rounded-full mb-4 mx-auto" />
      </div>
      <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 p-8">
        <Skeleton className="h-8 w-64 mb-6" />
        <Skeleton className="h-48 rounded-3xl w-full" />
      </div>
    </div>
  );
}

function NotFoundState({ onBack }: any) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-xl font-bold text-gray-900 mb-2">Pet Not Found</h2>
      <Button onClick={onBack} variant="outline" className="gap-2">
        <ChevronLeft size={16} /> Go Back
      </Button>
    </div>
  );
}

const TabBtn = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`snap-start py-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 transition-all whitespace-nowrap ${
      active
        ? "border-blue-600 text-blue-600 bg-blue-50/50 rounded-t-lg"
        : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-t-lg"
    }`}
  >
    {icon} {label}
  </button>
);

const SubTabBtn = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`flex-1 min-w-[100px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
      active
        ? "bg-gray-900 text-white shadow-md transform scale-[1.02]"
        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
    }`}
  >
    {icon} {label}
  </button>
);
