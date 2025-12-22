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
  ClipboardList,
  CalendarClock,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton"; // ✅ Import Skeleton

export default function MainPetProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"personal" | "campus">("personal");
  const [stats, setStats] = useState({
    vaccinesDue: 0,
    tasksPending: 0,
    upcomingVisits: 0,
  });

  const { pets, loading } = usePets(user?.id, activeTab);
  const isAdmin = (user as any)?.role === "admin";

  useEffect(() => {
    if (!user || activeTab !== "personal") return;
    const fetchStats = async () => {
      try {
        const [vRes, tRes, sRes] = await Promise.all([
          supabase
            .from("vaccinations")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", user.id)
            .neq("status", "completed"),
          supabase
            .from("pet_tasks")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", user.id)
            .eq("completed", false),
          supabase
            .from("schedules")
            .select("id", { count: "exact", head: true })
            .eq("owner_id", user.id)
            .eq("status", "pending"),
        ]);
        setStats({
          vaccinesDue: vRes.count || 0,
          tasksPending: tRes.count || 0,
          upcomingVisits: sRes.count || 0,
        });
      } catch (err) {
        console.error(err);
      }
    };
    fetchStats();
  }, [user, activeTab]);

  // ✅ SKELETON LOADING STATE
  if (loading) {
    return (
      <div className="w-full h-full flex flex-col bg-gray-50">
        {/* Fixed Header Skeleton */}
        <div className="shrink-0 px-4 pt-4 lg:pt-8 lg:px-8 pb-4 bg-gray-50 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
            {/* Tabs Skeleton */}
            <Skeleton className="h-10 w-64 rounded-full" />
          </div>

          {/* Stats Grid Skeleton */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3"
              >
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-6 w-8" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Scrollable Content Skeleton */}
        <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-24 lg:pb-8">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 space-y-3"
              >
                <Skeleton className="aspect-[4/3] w-full rounded-xl" />
                <div className="flex justify-between items-center px-1">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="w-8 h-8 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-gray-50">
      {/* 1. FIXED HEADER SECTION */}
      <div className="shrink-0 px-4 pt-4 lg:pt-8 lg:px-8 pb-4 bg-gray-50 z-10 flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Pet Management
            </h1>
            <p className="text-gray-500 text-sm">
              Manage profiles, health records, and tasks.
            </p>
          </div>

          <div className="bg-white p-1 rounded-full border border-gray-200 shadow-sm flex items-center self-start md:self-auto">
            <button
              onClick={() => setActiveTab("personal")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                activeTab === "personal"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <PawPrint size={16} />
              My Pets
            </button>
            <button
              onClick={() => setActiveTab("campus")}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all ${
                activeTab === "campus"
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-700"
              }`}
            >
              <Building2 size={16} />
              Campus Dogs
            </button>
          </div>
        </div>

        {/* SUMMARY STATS */}
        {activeTab === "personal" && pets.length > 0 && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
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
            <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3 relative overflow-hidden">
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
              {stats.vaccinesDue > 0 && (
                <div className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full animate-pulse" />
              )}
            </div>
            <div className="bg-white p-3 md:p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                <ClipboardList size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase">
                  Tasks
                </p>
                <p className="text-xl font-black text-gray-900">
                  {stats.tasksPending}
                </p>
              </div>
            </div>
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
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. SCROLLABLE CONTENT AREA */}
      <div className="flex-1 overflow-y-auto px-4 lg:px-8 pb-24 lg:pb-8">
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
