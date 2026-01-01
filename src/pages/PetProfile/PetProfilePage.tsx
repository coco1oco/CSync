import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";

// Components (Modular Structure)
import PetProfileCard from "./components/PetProfileCard";
import SmartOverview from "./components/SmartOverview";
import QRModal from "./components/QRModal";
import VaccinationSection from "./VaccinationSection";
import TasksSection from "./TasksSection";
import ScheduleSection from "./ScheduleSection";
import DocumentsSection from "./components/DocumentsSection";
import { FileText } from "lucide-react";

// UI & Icons
import {
  LayoutDashboard,
  Syringe,
  CheckSquare,
  Calendar,
  Sparkles,
  Heart,
  Dog,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export default function PetProfilePage() {
  const { petId } = useParams<{ petId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [pet, setPet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [showQR, setShowQR] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Fetch Pet Data
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
        setLoading(false);
      }
    }
    fetchPet();
  }, [petId]);

  // 2. Permission Logic
  const isOwner = user?.id === pet?.owner_id;
  const isCampusPet = pet?.is_campus_pet;
  const isAdmin = (user as any)?.role === "admin";
  const canManage = isOwner || (isCampusPet && isAdmin);

  // 3. Loading & Error States
  if (loading) return <PetProfileSkeleton />;
  if (!pet) return <NotFoundState onBack={() => navigate("/PetDashboard")} />;

  // 4. Delete Handler
  const handleDelete = async () => {
    if (confirm(`Are you sure you want to remove ${pet.name}?`)) {
      setIsDeleting(true);
      try {
        await supabase.from("pets").delete().eq("id", pet.id);
        navigate("/PetDashboard");
      } catch (err) {
        alert("Failed to delete pet. Please try again.");
        setIsDeleting(false);
      }
    }
  };

  return (
    <div className="h-full w-full flex flex-col lg:flex-row bg-gray-50 lg:p-6 gap-6 overflow-hidden relative">
      {/* --- LEFT PANEL: Profile Card --- */}
      <div className="shrink-0 w-full lg:w-80 xl:w-96 px-4 pt-4 lg:p-0">
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

      {/* --- RIGHT PANEL: Main Hub --- */}
      <div className="flex-1 flex flex-col bg-white lg:rounded-[2rem] lg:border lg:shadow-xl overflow-hidden mt-4 lg:mt-0 rounded-t-[2rem]">
        {/* Header & Tabs */}
        <div className="px-6 pt-6 pb-2 bg-white shrink-0">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-2 text-gray-900">
                {isCampusPet ? "Campus Dog Hub" : "Health Hub"}
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                {isCampusPet
                  ? "Help monitor university friends."
                  : `Managing ${pet.name}'s daily life.`}
              </p>
            </div>
            {isCampusPet && !canManage && (
              <Button className="rounded-full bg-blue-600 shadow-md hover:bg-blue-700">
                <Heart className="mr-2 fill-white/20" size={18} /> Support
              </Button>
            )}
          </div>

          <div className="flex gap-6 border-b border-gray-100 overflow-x-auto">
            <TabBtn
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              icon={<LayoutDashboard size={18} />}
              label="Overview"
            />
            <TabBtn
              active={activeTab === "vaccines"}
              onClick={() => setActiveTab("vaccines")}
              icon={<Syringe size={18} />}
              label="Medical"
            />
            <TabBtn
              active={activeTab === "tasks"}
              onClick={() => setActiveTab("tasks")}
              icon={<CheckSquare size={18} />}
              label="Tasks"
            />
            <TabBtn
              active={activeTab === "schedule"}
              onClick={() => setActiveTab("schedule")}
              icon={<Calendar size={18} />}
              label="Visits"
            />
            <TabBtn
              active={activeTab === "documents"}
              onClick={() => setActiveTab("documents")}
              icon={<FileText size={18} />}
              label="Docs"
            />
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 bg-gray-50/50">
          {activeTab === "overview" && (
            <SmartOverview
              pet={pet}
              userId={pet.owner_id} // Pass owner ID so we see the correct records
              onNavigate={setActiveTab}
              canManage={canManage}
              isOwner={isOwner}
              isCampusPet={isCampusPet}
            />
          )}
          {activeTab === "vaccines" && (
            <VaccinationSection petId={pet.id} userId={pet.owner_id} />
          )}
          {activeTab === "tasks" && (
            <TasksSection petId={pet.id} userId={pet.owner_id} />
          )}
          {activeTab === "schedule" && (
            <ScheduleSection petId={pet.id} userId={pet.owner_id} />
          )}
          {activeTab === "documents" && (
            <DocumentsSection petId={pet.id} canManage={canManage} />
          )}
        </div>
      </div>

      {/* Modals */}
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

// Helper Components
function PetProfileSkeleton() {
  return (
    <div className="h-full w-full flex flex-col lg:flex-row bg-gray-50 lg:p-6 gap-6">
      <div className="w-full lg:w-96 bg-white rounded-[2rem] p-6 border border-gray-100 h-[600px]">
        <Skeleton className="w-40 h-40 rounded-full mx-auto mb-6" />
        <Skeleton className="w-3/4 h-8 mx-auto mb-2" />
        <Skeleton className="w-1/2 h-6 mx-auto mb-8" />
        <div className="space-y-4">
          <Skeleton className="w-full h-12 rounded-xl" />
          <Skeleton className="w-full h-12 rounded-xl" />
          <Skeleton className="w-full h-12 rounded-xl" />
        </div>
      </div>
      <div className="flex-1 bg-white rounded-[2rem] border border-gray-100 p-8 space-y-6">
        <div className="flex justify-between">
          <Skeleton className="w-48 h-10" />
          <Skeleton className="w-32 h-10 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
        <Skeleton className="w-full h-64 rounded-3xl" />
      </div>
    </div>
  );
}

function NotFoundState({ onBack }: any) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4 mx-auto">
        <Dog className="text-gray-400 w-10 h-10" />
      </div>
      <h2 className="text-xl font-bold text-gray-900">Pet Not Found</h2>
      <Button onClick={onBack} variant="outline" className="mt-4 rounded-full">
        Back to Dashboard
      </Button>
    </div>
  );
}

const TabBtn = ({ active, onClick, icon, label }: any) => (
  <button
    onClick={onClick}
    className={`pb-3 text-sm font-bold border-b-[3px] flex items-center gap-2 px-1 transition-all whitespace-nowrap ${
      active
        ? "border-blue-600 text-blue-600"
        : "border-transparent text-gray-400 hover:text-gray-600"
    }`}
  >
    {icon} {label}
  </button>
);
