import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { FeedPost } from "@/components/FeedPost";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UpcomingEventsWidget } from "@/components/UpcomingEventsWidget";
import {
  LayoutGrid,
  Plus,
  Calendar,
  Stethoscope,
  BarChart3,
  Users,
  FileText,
  X,
  PenSquare,
} from "lucide-react";
import { formatDistanceToNow, isPast, addDays, isBefore } from "date-fns";
import type { OutreachEvent } from "@/types";
import { toast } from "react-toastify";

// --- TYPES ---
type HealthAlert = {
  id: string;
  vaccine_name: string;
  next_due_date: string;
  pet_id: string;
  pets: { name: string; petimage_url: string | null };
};

type AdminStats = {
  totalPosts: number;
  myPosts: number;
  totalMembers: number;
};

export function UnifiedDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = (user as any)?.role === "admin";

  // State
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Feature Specific State
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    totalPosts: 0,
    myPosts: 0,
    totalMembers: 0,
  });

  // Filters
  const [filterMode, setFilterMode] = useState<"all" | "mine">("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchData();
  }, [user?.id, filterMode]);

 const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Base Query: Fetch Events (Feed)
      let query = supabase
        .from("outreach_events")
        .select("*, admin:profiles(id, username, avatar_url)")
        .eq("is_hidden", false) // Hides events marked as hidden
        .order("created_at", { ascending: false });

      if (isAdmin && filterMode === "mine") {
        query = query.eq("admin_id", user?.id);
      }

      const { data: eventsData, error: eventsError } = await query;
      if (eventsError) throw eventsError;

      // ✅ 2. ENHANCE EVENTS: Fetch accurate counts & user status for each event
      const eventsWithDetails = await Promise.all(
        (eventsData as OutreachEvent[]).map(async (event) => {
          // A. Get "Going" Count (Approved + Checked In only)
          const { count } = await supabase
            .from("event_registrations")
            .select("id", { count: "exact", head: true })
            .eq("event_id", event.id)
            .in("status", ["approved", "checked_in"]); // <--- THE FIX

          // B. Get Current User's Status
          const { data: myReg } = await supabase
            .from("event_registrations")
            .select("status")
            .eq("event_id", event.id)
            .eq("user_id", user?.id)
            .maybeSingle();

          return {
            ...event,
            current_attendees: count || 0, // Pass accurate count to card
            is_registered: !!myReg,
            registration_status: myReg?.status,
          };
        })
      );

      setEvents(eventsWithDetails);

      // 3. Parallel Data Fetching (Stats or Alerts)
      if (isAdmin) {
        const [postsCount, myCount, usersCount] = await Promise.all([
          supabase
            .from("outreach_events")
            .select("id", { count: "exact", head: true }),
          supabase
            .from("outreach_events")
            .select("id", { count: "exact", head: true })
            .eq("admin_id", user?.id),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true }),
        ]);
        setStats({
          totalPosts: postsCount.count || 0,
          myPosts: myCount.count || 0,
          totalMembers: usersCount.count || 0,
        });
      } else {
        // User Logic: Fetch Pet Alerts
        const { data: vaxData } = await supabase
          .from("vaccinations")
          .select(
            `id, vaccine_name, next_due_date, pet_id, pets (name, petimage_url)`
          )
          .eq("owner_id", user?.id)
          .neq("status", "completed")
          .order("next_due_date", { ascending: true });

        const rawAlerts = (vaxData as any[]) || [];
        const cutoff = addDays(new Date(), 30);
        const urgent = rawAlerts.filter(
          (a) =>
            isPast(new Date(a.next_due_date)) ||
            isBefore(new Date(a.next_due_date), cutoff)
        );
        setAlerts(urgent);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!deleteEventId) return;
    const { error } = await supabase
      .from("outreach_events")
      .delete()
      .eq("id", deleteEventId);
    if (!error) {
      setEvents((prev) => prev.filter((e) => e.id !== deleteEventId));
      setDeleteEventId(null);
      if (isAdmin)
        setStats((prev) => ({
          ...prev,
          totalPosts: prev.totalPosts - 1,
          myPosts: prev.myPosts - 1,
        }));
    }
  };
 // ✅ NEW: Handle Hide/Unhide Logic
const handleHide = async (eventId: string, currentStatus: boolean) => {
  // 1. Optimistic Update
  setEvents((prev) => 
    prev.map((e) => e.id === eventId ? { ...e, is_hidden: !currentStatus } : e)
  );

  // 2. Database Update
  const { error } = await supabase
    .from("outreach_events")
    .update({ is_hidden: !currentStatus })
    .eq("id", eventId);

  if (error) {
    console.error(error);
    toast.error("Failed to update visibility");
    fetchData(); // Revert
  } else {
    toast.success(currentStatus ? "Event is now visible" : "Event hidden");
  }
};

  const filteredEvents = activeTag
    ? events.filter((e) =>
        e.description?.toLowerCase().includes(activeTag.toLowerCase())
      )
    : events;

  // --- SKELETON HELPERS ---
  const renderHeaderSkeleton = () => (
    <div className="flex justify-between items-center w-full">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40 rounded-lg" />
        <Skeleton className="h-3 w-24 rounded" />
      </div>
      <Skeleton className="h-8 w-24 rounded-full" />
    </div>
  );

  const renderStatsSkeleton = () => (
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center"
        >
          <Skeleton className="w-8 h-8 rounded-full mb-2" />
          <Skeleton className="w-8 h-5 mb-1" />
          <Skeleton className="w-12 h-3" />
        </div>
      ))}
    </div>
  );

  const renderAlertsSkeleton = () => (
    <div className="flex gap-3 overflow-x-hidden pb-2 -mx-4 px-4">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="shrink-0 w-64 p-3 rounded-2xl border bg-white border-gray-200 shadow-sm flex flex-col gap-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="w-20 h-4" />
              <Skeleton className="w-16 h-3" />
            </div>
          </div>
          <Skeleton className="w-24 h-6 rounded-lg" />
        </div>
      ))}
    </div>
  );

  // ✅ NEW: Upcoming Events Skeleton (Reduced to 2 items)
  const renderUpcomingEventsSkeleton = () => (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full">
      {/* Header Skeleton */}
      <div className="p-4 border-b border-gray-50 flex items-center justify-between">
        <div className="h-5 w-28 bg-gray-100 rounded animate-pulse" />
      </div>
      {/* List Items Skeleton */}
      <div className="divide-y divide-gray-50">
        {[1, 2].map((i) => ( // <--- CHANGED FROM [1,2,3] TO [1,2]
          <div key={i} className="p-3 flex gap-3 items-center">
            {/* Date Box */}
            <div className="shrink-0 w-12 h-12 bg-gray-100 rounded-lg animate-pulse" />
            {/* Text Content */}
            <div className="flex-1 flex flex-col justify-center gap-2">
              <div className="h-3.5 w-3/4 bg-gray-100 rounded animate-pulse" />
              <div className="flex gap-2">
                <div className="h-2.5 w-1/3 bg-gray-100 rounded animate-pulse" />
                <div className="h-2.5 w-10 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
            {/* Chevron */}
            <div className="w-4 h-4 bg-gray-100 rounded animate-pulse shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );

  const renderFeedSkeleton = () => (
    <div className="space-y-6">
      {[1, 2].map((i) => (
        <div key={i} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="space-y-1.5">
              <Skeleton className="w-32 h-4" />
              <Skeleton className="w-20 h-3" />
            </div>
          </div>
          <Skeleton className="w-full h-48 rounded-2xl" />
          <div className="flex justify-between">
            <Skeleton className="w-16 h-4" />
            <Skeleton className="w-16 h-4" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="w-full max-w-xl mx-auto pb-24 px-0 md:px-4">
      {/* --- HEADER --- */}
      <div className="relative z-10 bg-white py-4 px-4 flex items-center justify-between border-b border-gray-200 shadow-sm md:border-none">
        {loading ? (
          renderHeaderSkeleton()
        ) : (
          <>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                {isAdmin ? "Admin Dashboard" : "Dashboard"}
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Welcome back, {user?.first_name || "Guest"}!
              </p>
            </div>

            {!isAdmin && (
              <Button
                size="sm"
                variant="outline"
                className="rounded-full h-8 text-xs gap-1"
                onClick={() => navigate("/PetDashboard/new")}
              >
                <Plus className="w-3 h-3" /> Add Pet
              </Button>
            )}

            {isAdmin && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="rounded-full h-8 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white shadow-sm border border-purple-500/20"
                  onClick={() => navigate("/admin/events/new-official")}
                >
                  <Calendar className="w-3 h-3" /> Event
                </Button>
                <Button
                  size="sm"
                  className="rounded-full h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  onClick={() => navigate("/admin/events/create")}
                >
                  <PenSquare className="w-3 h-3" /> Post
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full h-8 text-xs gap-1 border-gray-300 text-gray-700 hover:bg-gray-100"
                  onClick={() => navigate("/admin/events/manage")}
                >
                  <Users className="w-3 h-3" /> Manage
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* --- WIDGET AREA (Stats & Alerts) --- */}
      <div className="px-4 mt-4 space-y-4">
        {loading ? (
          <>
            {isAdmin ? renderStatsSkeleton() : renderAlertsSkeleton()}
            {renderUpcomingEventsSkeleton()}
          </>
        ) : (
          <>
            {isAdmin ? (
              /* 👑 ADMIN STATS GRID */
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center text-center">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-full mb-1">
                    <FileText size={18} />
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {stats.totalPosts}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase font-bold">
                    Total Posts
                  </span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center text-center">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-full mb-1">
                    <BarChart3 size={18} />
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {stats.myPosts}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase font-bold">
                    My Posts
                  </span>
                </div>
                <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm flex flex-col items-center text-center">
                  <div className="p-2 bg-green-50 text-green-600 rounded-full mb-1">
                    <Users size={18} />
                  </div>
                  <span className="text-xl font-bold text-gray-900">
                    {stats.totalMembers}
                  </span>
                  <span className="text-[10px] text-gray-400 uppercase font-bold">
                    Members
                  </span>
                </div>
              </div>
            ) : /* 🐾 USER ALERTS */
            alerts.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide snap-x">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    onClick={() => navigate(`/PetDashboard/${alert.pet_id}`)}
                    className="snap-center shrink-0 w-64 p-3 rounded-2xl border bg-white border-gray-200 shadow-sm"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <img
                        src={alert.pets.petimage_url || "/default-pet.png"}
                        className="w-10 h-10 rounded-full bg-gray-200 object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-bold truncate">
                          {alert.pets.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {alert.vaccine_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs font-semibold px-2 py-1 bg-orange-50 text-orange-700 rounded-lg inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Due{" "}
                      {formatDistanceToNow(new Date(alert.next_due_date), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-full text-blue-600">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-blue-900">
                    All caught up!
                  </p>
                  <p className="text-xs text-blue-700">No pending vaccines.</p>
                </div>
              </div>
            )}

            {/* WIDGET */}
            <UpcomingEventsWidget />
          </>
        )}
      </div>

      {/* --- FEED CONTROLS --- */}
      <div className="mx-4 mt-8 mb-4 flex items-center justify-between">
        {loading ? (
          <Skeleton className="w-32 h-6" />
        ) : (
          <h2 className="text-lg font-bold text-gray-900">Community Feed</h2>
        )}

        {isAdmin && !loading && (
          <div className="bg-white border border-gray-200 p-0.5 rounded-lg flex text-xs font-medium">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                filterMode === "all"
                  ? "bg-gray-100 text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterMode("mine")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                filterMode === "mine"
                  ? "bg-gray-100 text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              My Posts
            </button>
          </div>
        )}
      </div>

      {/* Tag Filter */}
      {activeTag && (
        <div className="mx-4 mb-4 flex items-center justify-between bg-blue-600 text-white p-2.5 px-4 rounded-xl shadow-md">
          <span className="text-xs font-bold">Filter: {activeTag}</span>
          <button
            onClick={() => setActiveTag(null)}
            className="text-blue-100 hover:text-white bg-blue-700 p-0.5 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* --- FEED LIST --- */}
      <div className="space-y-6">
        {loading ? (
          renderFeedSkeleton()
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center mx-4">
            <LayoutGrid className="w-12 h-12 text-gray-300 mb-3" />
            <h3 className="text-lg font-bold text-gray-900">No posts found</h3>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <FeedPost
              key={event.id}
              event={event}
              isAdmin={isAdmin}
              // ✅ ADD THESE TWO LINES:
                onHide={() => handleHide(event.id, event.is_hidden || false)}
                isHidden={event.is_hidden}
              onEdit={() => {
                const officialTypes = ["official", "pet", "member", "campus"];
                if (officialTypes.includes(event.event_type || "")) {
                  navigate(`/admin/events/edit-official/${event.id}`);
                } else {
                  navigate(`/admin/events/edit/${event.id}`);
                }
              }}
              onDelete={() => setDeleteEventId(event.id)}
              onTagClick={(tag) => {
                setActiveTag(tag);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ))
        )}
      </div>

      {/* Delete Modal */}
      {deleteEventId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Delete Post?
            </h2>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setDeleteEventId(null)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}