import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "react-qr-code";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/lib/usePets";
import { useVaccinations } from "@/lib/useVaccinations";
import { useTasks } from "@/lib/useTasks";
import { useSchedules } from "@/lib/useSchedules";
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
  LayoutDashboard,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { format, isPast, isToday, addDays, isAfter } from "date-fns";

export default function PetProfilePage() {
  const { petId } = useParams<{ petId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { pets, deletePet, loading: petsLoading } = usePets(user?.id);

  // ✅ NEW: Default to "overview" for the smart dashboard
  const [activeTab, setActiveTab] = useState<
    "overview" | "vaccines" | "schedule" | "tasks"
  >("overview");
  const [showQR, setShowQR] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (petsLoading) {
    return <PetProfileSkeleton />;
  }

  const pet = pets.find((p) => p.id === petId);

  if (!pet) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-50">
        <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-6">
          <Dog className="text-gray-400 w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Pet Not Found</h2>
        <Button onClick={() => navigate("/PetDashboard")} variant="outline">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const handleDelete = async () => {
    if (
      confirm(
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
      {/* ================= LEFT PANEL: PROFILE CARD (Unchanged) ================= */}
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
          <div className="flex justify-between items-start mb-4">
            <button
              onClick={() => navigate("/PetDashboard")}
              className="hidden lg:flex p-2 hover:bg-gray-50 rounded-full text-gray-400 hover:text-gray-700 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1" />
            <button
              onClick={() => navigate(`/PetDashboard/${pet.id}/edit`)}
              className="p-2 hover:bg-blue-50 rounded-full text-gray-400 hover:text-blue-600 transition"
            >
              <Edit2 className="w-5 h-5" />
            </button>
          </div>

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

          <div className="bg-gray-50 rounded-2xl p-4 space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm border-b border-gray-200/50 pb-2">
              <span className="text-gray-500 flex items-center gap-2">
                <Activity size={14} /> Age
              </span>
              <span className="font-semibold text-gray-900">
                {pet.dob
                  ? `${
                      new Date().getFullYear() - new Date(pet.dob).getFullYear()
                    } yrs`
                  : "N/A"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm border-b border-gray-200/50 pb-2">
              <span className="text-gray-500 flex items-center gap-2">
                <Dna size={14} /> Sex
              </span>
              <span className="font-semibold text-gray-900 capitalize">
                {pet.sex || "Unknown"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm border-b border-gray-200/50 pb-2">
              <span className="text-gray-500 flex items-center gap-2">
                <MapPin size={14} /> Location
              </span>
              <span className="font-semibold text-gray-900 truncate max-w-[120px]">
                {pet.location || "Home"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm pt-1">
              <span className="text-gray-500 flex items-center gap-2">
                <Fingerprint size={14} /> Microchip
              </span>
              <span className="font-mono text-xs font-semibold text-gray-600 bg-gray-200/50 px-2 py-1 rounded">
                {pet.microchip_id || "None"}
              </span>
            </div>
          </div>

          {!pet.is_campus_pet && (
            <Button
              onClick={() => setShowQR(true)}
              variant="outline"
              className="w-full mb-3 border-blue-200 text-blue-700 hover:bg-blue-50 rounded-xl gap-2 h-10"
            >
              <QrCode className="w-4 h-4" /> Digital ID & QR
            </Button>
          )}

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

      {/* ================= RIGHT PANEL: SMART ACTION CENTER ================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-white lg:rounded-3xl lg:border lg:border-gray-200 lg:shadow-sm overflow-hidden mt-4 lg:mt-0 rounded-t-3xl shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] border-t border-gray-100 lg:shadow-none lg:border-t">
        {/* Tabs Header */}
        <div className="px-4 pt-4 lg:px-6 lg:pt-6 border-b border-gray-100 pb-0 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 hidden lg:block">
              Pet Health Hub
            </h2>
            {/* Quick Actions for Overview */}
            {activeTab === "overview" && (
              <div className="hidden md:flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveTab("tasks")}
                  className="text-xs text-blue-600 bg-blue-50 hover:bg-blue-100"
                >
                  + Add Task
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setActiveTab("vaccines")}
                  className="text-xs text-green-600 bg-green-50 hover:bg-green-100"
                >
                  + Log Vaccine
                </Button>
              </div>
            )}
          </div>

          <div className="flex gap-6 overflow-x-auto pb-0 hide-scrollbar">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Overview"
            />
            <TabButton
              active={activeTab === "vaccines"}
              onClick={() => setActiveTab("vaccines")}
              icon={<Syringe className="w-4 h-4" />}
              label="Vaccines"
            />
            <TabButton
              active={activeTab === "tasks"}
              onClick={() => setActiveTab("tasks")}
              icon={<CheckSquare className="w-4 h-4" />}
              label="Tasks"
            />
            <TabButton
              active={activeTab === "schedule"}
              onClick={() => setActiveTab("schedule")}
              icon={<Calendar className="w-4 h-4" />}
              label="Visits"
            />
          </div>
        </div>

        {/* Smart Content Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-50/50">
          <div className="max-w-3xl mx-auto space-y-6">
            {activeTab === "overview" && (
              <SmartOverview
                petId={pet.id}
                userId={user?.id}
                onNavigate={setActiveTab}
              />
            )}

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
          <div className="h-20 lg:h-0" />
        </div>
      </div>

      {/* QR Modal (Unchanged) */}
      {showQR && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm relative text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowQR(false)}
              className="absolute right-4 top-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
            >
              <X size={20} />
            </button>
            <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 inline-block">
              <QRCode
                value={`${window.location.origin}/lost-and-found/${pet.id}`}
                size={200}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
              />
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

// --- SUB-COMPONENTS ---

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
        active
          ? "border-blue-600 text-blue-600"
          : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function PetProfileSkeleton() {
  return (
    <div className="h-full w-full flex flex-col lg:flex-row bg-gray-50 lg:p-6 gap-6">
      <div className="w-full lg:w-96 bg-white rounded-3xl p-5 border border-gray-100 h-96">
        <Skeleton className="w-full h-full" />
      </div>
      <div className="flex-1 bg-white rounded-3xl border border-gray-100 p-6">
        <Skeleton className="w-full h-full" />
      </div>
    </div>
  );
}

// --- 🧠 SMART DASHBOARD COMPONENT ---
function SmartOverview({
  petId,
  userId,
  onNavigate,
}: {
  petId: string;
  userId?: string;
  onNavigate: (tab: any) => void;
}) {
  const { vaccinations } = useVaccinations(petId, userId);
  const { tasks } = useTasks(petId, userId);
  const { schedules } = useSchedules(petId, userId);

  // 1. Calculate Insights
  const overdueVax = vaccinations.filter(
    (v) =>
      v.status === "overdue" ||
      (v.next_due_date &&
        isPast(new Date(v.next_due_date)) &&
        v.status !== "completed")
  );
  const urgentTasks = tasks.filter(
    (t) =>
      !t.completed &&
      (t.priority === "high" ||
        t.urgency === "immediate" ||
        t.requires_immediate_attention)
  );
  const upcomingVisits = schedules.filter(
    (s) => s.status === "pending" && !isPast(new Date(s.scheduled_date))
  );

  // 2. Timeline Merging (Next 3 Items)
  const timelineItems = useMemo(() => {
    const vaxItems = vaccinations
      .filter((v) => v.status !== "completed")
      .map((v) => ({
        type: "vaccine",
        date: v.next_due_date,
        title: v.vaccine_name,
        id: v.id,
        sub: "Vaccination Due",
      }));

    const taskItems = tasks
      .filter((t) => !t.completed)
      .map((t) => ({
        type: "task",
        date: t.due_date,
        title: t.title,
        id: t.id,
        sub: "Task",
      }));

    const visitItems = schedules
      .filter((s) => s.status === "pending")
      .map((s) => ({
        type: "visit",
        date: s.scheduled_date,
        title: s.title,
        id: s.id,
        sub: s.scheduled_time || "Appointment",
      }));

    return [...vaxItems, ...taskItems, ...visitItems]
      .filter((i) => i.date) // ensure date exists
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())
      .slice(0, 5); // Take top 5
  }, [vaccinations, tasks, schedules]);

  const isHealthy = overdueVax.length === 0 && urgentTasks.length === 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 1. HEALTH STATUS CARD */}
      <div
        className={`rounded-2xl p-5 border-l-4 shadow-sm flex items-start justify-between ${
          isHealthy
            ? "bg-green-50 border-green-500"
            : "bg-orange-50 border-orange-500"
        }`}
      >
        <div>
          <h3
            className={`font-bold text-lg ${
              isHealthy ? "text-green-900" : "text-orange-900"
            }`}
          >
            {isHealthy ? "Everything looks great!" : "Needs Attention"}
          </h3>
          <p
            className={`text-sm mt-1 ${
              isHealthy ? "text-green-700" : "text-orange-800"
            }`}
          >
            {isHealthy
              ? "You're all caught up on vaccines and tasks."
              : `You have ${overdueVax.length} overdue vaccines and ${urgentTasks.length} urgent tasks.`}
          </p>
        </div>
        <div
          className={`p-3 rounded-full ${
            isHealthy
              ? "bg-green-100 text-green-600"
              : "bg-orange-100 text-orange-600"
          }`}
        >
          {isHealthy ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
        </div>
      </div>

      {/* 2. QUICK STATS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div
          onClick={() => onNavigate("vaccines")}
          className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-blue-300 cursor-pointer transition"
        >
          <p className="text-gray-500 text-xs font-bold uppercase">
            Vaccines Due
          </p>
          <p className="text-2xl font-black text-gray-900">
            {vaccinations.filter((v) => v.status !== "completed").length}
          </p>
        </div>
        <div
          onClick={() => onNavigate("tasks")}
          className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-orange-300 cursor-pointer transition"
        >
          <p className="text-gray-500 text-xs font-bold uppercase">
            Pending Tasks
          </p>
          <p className="text-2xl font-black text-gray-900">
            {tasks.filter((t) => !t.completed).length}
          </p>
        </div>
        <div
          onClick={() => onNavigate("schedule")}
          className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-purple-300 cursor-pointer transition col-span-2 md:col-span-1"
        >
          <p className="text-gray-500 text-xs font-bold uppercase">
            Next Visit
          </p>
          <p className="text-lg font-bold text-gray-900 truncate">
            {upcomingVisits[0]
              ? format(new Date(upcomingVisits[0].scheduled_date), "MMM d")
              : "None"}
          </p>
        </div>
      </div>

      {/* 3. SMART TIMELINE (Merged Feed) */}
      <div>
        <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" /> Coming Up Next
        </h3>

        {timelineItems.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200">
            <p className="text-gray-400 text-sm">Nothing scheduled. Relax!</p>
            <Button
              variant="link"
              onClick={() => onNavigate("tasks")}
              className="text-blue-600 mt-1"
            >
              Add a task?
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {timelineItems.map((item, idx) => {
              const dateObj = new Date(item.date!);
              const isUrgent = isPast(dateObj) && !isToday(dateObj);

              return (
                <div
                  key={`${item.type}-${item.id}`}
                  className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition"
                >
                  {/* Date Badge */}
                  <div
                    className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg shrink-0 ${
                      isUrgent
                        ? "bg-red-50 text-red-600"
                        : "bg-gray-50 text-gray-700"
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase">
                      {format(dateObj, "MMM")}
                    </span>
                    <span className="text-lg font-black leading-none">
                      {format(dateObj, "d")}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4
                        className={`font-bold text-sm truncate ${
                          isUrgent ? "text-red-700" : "text-gray-900"
                        }`}
                      >
                        {item.title}
                      </h4>
                      {isUrgent && (
                        <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                          Overdue
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      {item.type === "vaccine" && <Syringe size={12} />}
                      {item.type === "task" && <CheckSquare size={12} />}
                      {item.type === "visit" && <Calendar size={12} />}
                      {item.sub}
                    </p>
                  </div>

                  {/* Action Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      onNavigate(
                        item.type === "visit"
                          ? "schedule"
                          : item.type === "vaccine"
                          ? "vaccines"
                          : "tasks"
                      )
                    }
                    className="text-gray-400 hover:text-blue-600"
                  >
                    View
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
