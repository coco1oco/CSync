import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { FeedPost } from "@/components/FeedPost";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
// ❌ REMOVED: UpcomingEventsWidget import
import { ChallengeWidget } from "@/components/ChallengeWidget";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  LayoutGrid,
  Plus,
  Calendar,
  X,
  PenSquare,
  ChevronDown,
  Settings,
  Trophy,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useAdminChallenges } from "@/hooks/useChallenges";
import { useFeedEvents, useEventMutations } from "@/hooks/useFeedEvents";

export function UnifiedDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = (user as any)?.role === "admin";

  // State
  const [filterMode, setFilterMode] = useState<"all" | "mine">("all");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  // FETCH FEED
  const {
    data: events = [],
    isLoading: isFeedLoading,
    refetch,
  } = useFeedEvents(user?.id, filterMode, isAdmin);

  // MUTATIONS
  const { deleteEvent, toggleVisibility } = useEventMutations();

  // Admin Data: Challenges
  const { data: adminChallenges } = useAdminChallenges();

  const loading = isFeedLoading;

  // --- ACTIONS ---
  const handleDelete = async () => {
    if (!deleteEventId) return;
    try {
      await deleteEvent.mutateAsync(deleteEventId);
      toast.success("Post deleted");
      setDeleteEventId(null);
    } catch (err) {
      toast.error("Failed to delete post");
    }
  };

  const handleHide = async (eventId: string, currentStatus: boolean) => {
    try {
      await toggleVisibility.mutateAsync({
        id: eventId,
        isHidden: currentStatus,
      });
      toast.success(currentStatus ? "Event is now visible" : "Event hidden");
    } catch (err) {
      toast.error("Failed to update visibility");
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

  // ❌ REMOVED: renderUpcomingEventsSkeleton

  const renderFeedSkeleton = () => (
    <div className="space-y-6">
      {[1, 2].map((i) => (
        <div
          key={i}
          className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm space-y-4"
        >
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
      <div className="relative z-40 bg-white py-4 px-4 flex items-center justify-between border-b border-gray-200 shadow-sm md:border-none">
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="rounded-full h-8 text-xs gap-1.5 bg-gray-900 text-white hover:bg-gray-800 shadow-sm pr-3"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span className="font-bold">Create</span>
                    <ChevronDown className="w-3 h-3 text-gray-400 ml-0.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 p-1">
                  <DropdownMenuItem
                    onClick={() => navigate("/admin/events/new-official")}
                    className="gap-2 cursor-pointer"
                  >
                    <div className="p-1 bg-purple-100 text-purple-600 rounded-md">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs">Official Event</span>
                      <span className="text-[10px] text-gray-500">
                        Calendar & Signups
                      </span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => navigate("/admin/events/create")}
                    className="gap-2 cursor-pointer"
                  >
                    <div className="p-1 bg-blue-100 text-blue-600 rounded-md">
                      <PenSquare className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs">Community Post</span>
                      <span className="text-[10px] text-gray-500">
                        Feed Update
                      </span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => navigate("/admin/challenges/create")}
                    className="gap-2 cursor-pointer"
                  >
                    <div className="p-1 bg-indigo-100 text-indigo-600 rounded-md">
                      <Trophy className="w-4 h-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-xs">Challenge</span>
                      <span className="text-[10px] text-gray-500">
                        Start new game
                      </span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-gray-100 my-1" />

                  <DropdownMenuItem
                    onClick={() => navigate("/admin/events/manage")}
                    className="gap-2 cursor-pointer"
                  >
                    <div className="p-1 bg-gray-100 text-gray-600 rounded-md">
                      <Settings className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-xs">Manage Guests</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </>
        )}
      </div>

      {/* --- WIDGET AREA --- */}
      <div className="px-4 mt-4 space-y-4">
        {loading ? (
          // ❌ Removed Upcoming Events Skeleton
          null
        ) : (
          <>
            {/* 👑 ADMIN WIDGETS */}
            {isAdmin && adminChallenges && adminChallenges.length > 0 && (
              <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-indigo-600" />
                  <h3 className="font-bold text-gray-900 text-sm">
                    Challenge History
                  </h3>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                  {adminChallenges.map((c) => {
                    const isUpcoming = new Date(c.start_date) > new Date();
                    const isEnded =
                      !c.is_active || new Date() > new Date(c.end_date);
                    const isActive = !isUpcoming && !isEnded;

                    return (
                      <div
                        key={c.id}
                        onClick={() => navigate(`/challenges/view/${c.id}`)}
                        className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer rounded-xl transition-colors group"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-gray-900 text-sm block group-hover:text-indigo-600 transition-colors truncate">
                            {c.theme}
                          </span>
                          <span className="text-gray-500 text-xs">
                            {format(new Date(c.end_date), "MMM d")}
                          </span>
                        </div>

                        <div className="shrink-0 ml-2">
                          {isActive && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-lg whitespace-nowrap">
                              Active
                            </span>
                          )}
                          {isUpcoming && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-lg whitespace-nowrap">
                              Upcoming
                            </span>
                          )}
                          {isEnded && (
                            <span className="px-2 py-1 bg-gray-200 text-gray-600 text-[10px] font-bold rounded-lg whitespace-nowrap">
                              Ended
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ✅ Challenge Widget (Everyone sees the active one) */}
            <ChallengeWidget />

            {/* ❌ REMOVED: UpcomingEventsWidget from body */}
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
              event={event as any}
              isAdmin={isAdmin}
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
              onRefresh={refetch}
            />
          ))
        )}
      </div>

      {/* Delete Modal */}
      {deleteEventId && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
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