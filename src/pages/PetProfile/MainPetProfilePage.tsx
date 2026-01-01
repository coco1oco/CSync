import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { usePets } from "@/lib/usePets";
import { supabase } from "@/lib/supabaseClient";
import {
  Plus,
  Dog,
  PawPrint,
  Building2,
  Syringe,
  CalendarClock,
  ChevronRight,
  Pill,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { isSameDay, isPast, addDays, isBefore } from "date-fns";

export default function MainPetProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"personal" | "campus">("personal");

  // New Stats State: Tracks Daily Meds separate from General Tasks
  const [stats, setStats] = useState({
    vaccinesDue: 0,
    dailyNeeds: 0, // Meds & Urgent Tasks due Today/Overdue
    upcomingVisits: 0,
    urgentPets: [] as any[], // List of pets that need attention NOW
  });

  const { pets, loading } = usePets(user?.id, activeTab);
  const isAdmin = (user as any)?.role === "admin";

  useEffect(() => {
    if (!user || activeTab !== "personal") return;
    const fetchStats = async () => {
      try {
        const todayStr = new Date().toISOString();

        // 1. Fetch Vaccines (Upcoming 30 days or Overdue)
        const { data: vax } = await supabase
          .from("vaccinations")
          .select("id")
          .eq("owner_id", user.id)
          .neq("status", "completed");

        // 2. Fetch Tasks/Meds (Due Today or Overdue)
        // We consider 'Daily Needs' anything due on or before today that isn't done
        const { data: meds } = await supabase
          .from("pet_tasks")
          .select("id, title, pet_id, pets(name, petimage_url)")
          .eq("owner_id", user.id)
          .eq("completed", false)
          .lte("due_date", todayStr); // Less than or equal to Today

        // 3. Fetch Visits
        const { data: visits } = await supabase
          .from("schedules")
          .select("id")
          .eq("owner_id", user.id)
          .eq("status", "pending");

        // 4. Identify Pets needing attention
        const urgentPetIds = new Set(meds?.map((m: any) => m.pet_id));
        const urgentPetsList = pets.filter((p) => urgentPetIds.has(p.id));

        setStats({
          vaccinesDue: vax?.length || 0,
          dailyNeeds: meds?.length || 0,
          upcomingVisits: visits?.length || 0,
          urgentPets: urgentPetsList,
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, [user, activeTab, pets]);

  // --- SKELETON LOADING ---
  if (loading) {
    return (
      <div className="w-full h-full flex flex-col bg-gray-50">
        <div className="shrink-0 px-4 pt-4 lg:pt-8 lg:px-8 pb-4 bg-gray-50 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-64 rounded-full" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-24 lg:pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-64 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* 1. HEADER SECTION */}
      <div className="shrink-0 px-4 pt-4 lg:pt-8 lg:px-8 pb-4 bg-gray-50 z-10 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Pet Dashboard
            </h1>
            <p className="text-gray-500 text-sm">
              Overview of your furry family.
            </p>
          </div>

          <div className="bg-white p-1 rounded-full border border-gray-200 shadow-sm flex items-center self-start md:self-auto">
            <button
              onClick={() => setActiveTab("personal")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                activeTab === "personal"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <PawPrint size={16} /> My Pets
            </button>
            <button
              onClick={() => setActiveTab("campus")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                activeTab === "campus"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <Building2 size={16} /> Campus Dogs
            </button>
          </div>
        </div>

        {/* 2. SMART STATS (Only for Personal Pets) */}
        {activeTab === "personal" && pets.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 animate-in fade-in slide-in-from-top-2">
            {/* Total Pets */}
            <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 shrink-0">
                <Dog size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">
                  Total
                </p>
                <p className="text-xl font-black text-gray-900">
                  {pets.length}
                </p>
              </div>
            </div>

            {/* Daily Needs (Medicine/Tasks) - REPLACED GENERIC TASKS */}
            <div
              className={`p-3 md:p-4 rounded-xl border shadow-sm flex items-center gap-3 relative overflow-hidden transition-all ${
                stats.dailyNeeds > 0
                  ? "bg-red-50 border-red-100"
                  : "bg-white border-gray-200"
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  stats.dailyNeeds > 0
                    ? "bg-red-100 text-red-600"
                    : "bg-blue-50 text-blue-600"
                }`}
              >
                <Pill size={20} />
              </div>
              <div>
                <p
                  className={`text-[10px] font-bold uppercase ${
                    stats.dailyNeeds > 0 ? "text-red-400" : "text-gray-400"
                  }`}
                >
                  Daily Needs
                </p>
                <p
                  className={`text-xl font-black ${
                    stats.dailyNeeds > 0 ? "text-red-900" : "text-gray-900"
                  }`}
                >
                  {stats.dailyNeeds}
                </p>
              </div>
              {stats.dailyNeeds > 0 && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>

            {/* Vaccines */}
            <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 shrink-0">
                <Syringe size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">
                  Vaccines
                </p>
                <p className="text-xl font-black text-gray-900">
                  {stats.vaccinesDue}
                </p>
              </div>
            </div>

            {/* Visits */}
            <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600 shrink-0">
                <CalendarClock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">
                  Visits
                </p>
                <p className="text-xl font-black text-gray-900">
                  {stats.upcomingVisits}
                </p>
                {/* This logic was already here, but now it will show up */}
                {stats.upcomingVisits > 0 && (
                  <div className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. CONTENT AREA */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-24 lg:pb-8">
        {/* Urgent Attention Section (New) */}
        {activeTab === "personal" && stats.dailyNeeds > 0 && (
          <div className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-red-900">
                Meds & Tasks Due Today
              </h3>
              <p className="text-xs text-red-700 mt-1">
                You have {stats.dailyNeeds} pending items. Check profiles for:
                <span className="font-bold ml-1">
                  {stats.urgentPets.map((p) => p.name).join(", ")}
                </span>
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-red-700 hover:text-red-900 hover:bg-red-100 h-8"
              onClick={() =>
                navigate(`/PetDashboard/${stats.urgentPets[0].id}`)
              }
            >
              View
            </Button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">
            {activeTab === "personal" ? "My Furry Friends" : "Campus Residents"}
          </h2>
          {(activeTab === "personal" || isAdmin) && (
            <Button
              onClick={() => navigate(`/PetDashboard/new?mode=${activeTab}`)}
              className="bg-gray-900 hover:bg-gray-800 text-white rounded-full gap-2 shadow-sm h-9 px-4 text-xs md:text-sm"
            >
              <Plus className="w-4 h-4" />
              {activeTab === "personal" ? "Add Pet" : "Add Dog"}
            </Button>
          )}
        </div>

        {pets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-gray-200 text-center shadow-sm">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4">
              <Dog className="w-10 h-10 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {activeTab === "personal"
                ? "No pets found"
                : "No campus dogs yet"}
            </h3>
            <p className="text-gray-500 text-sm max-w-xs mb-6">
              {activeTab === "personal"
                ? "Start by creating a profile."
                : "The organization hasn't listed any dogs yet."}
            </p>
            {(activeTab === "personal" || isAdmin) && (
              <Button
                onClick={() => navigate(`/PetDashboard/new?mode=${activeTab}`)}
                className="rounded-full bg-blue-600"
              >
                <Plus className="w-4 h-4 mr-2" /> Add First
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pets.map((pet) => (
              <div
                key={pet.id}
                onClick={() => navigate(`/PetDashboard/${pet.id}`)}
                className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col"
              >
                <div className="aspect-[4/3] rounded-xl bg-gray-100 overflow-hidden relative mb-3">
                  {pet.petimage_url ? (
                    <img
                      src={pet.petimage_url}
                      alt={pet.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Dog className="w-10 h-10 text-gray-300" />
                    </div>
                  )}
                  {/* Badge for Daily Needs on the Card */}
                  {activeTab === "personal" &&
                    stats.urgentPets.some((p) => p.id === pet.id) && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md animate-pulse">
                        Needs Care
                      </div>
                    )}
                </div>
                <div className="flex items-center justify-between px-1">
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {pet.name}
                    </h3>
                    <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                      <span>{pet.species || "Pet"}</span>
                      {pet.dob && (
                        <span>• {new Date(pet.dob).getFullYear()}</span>
                      )}
                    </div>
                  </div>
                  <div className="p-1.5 bg-gray-50 rounded-full text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    <ChevronRight size={16} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
