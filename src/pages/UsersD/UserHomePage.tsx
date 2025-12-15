import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import type { OutreachEvent } from "@/types";
import { FeedPost } from "@/components/FeedPost";
import { Button } from "@/components/ui/button";
import { WifiOff, RefreshCcw, LayoutGrid } from "lucide-react";

export function UserHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const isAdmin = (user as any)?.role === "admin";

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("outreach_events")
        .select("*, admin:profiles(id, username, avatar_url)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setEvents(data as OutreachEvent[]);
    } catch (err: any) {
      console.error("Error fetching events:", err);
      setError("Could not load the feed.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteEventId) return;
    try {
      const { error } = await supabase
        .from("outreach_events")
        .delete()
        .eq("id", deleteEventId);
      if (!error) {
        setEvents((prev) => prev.filter((e) => e.id !== deleteEventId));
        setDeleteEventId(null);
      }
    } catch (err) {
      alert("Failed to delete post");
    }
  };

  const filteredEvents = activeTag
    ? events.filter((e) =>
        e.description?.toLowerCase().includes(activeTag.toLowerCase())
      )
    : events;

  return (
    <div className="w-full max-w-xl mx-auto pb-24 px-0 md:px-4">
      {/* 1. Header Area */}
      <div className="sticky top-0 z-30 bg-gray-50/95 backdrop-blur-sm py-4 px-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Feed
          </h1>
          <p className="text-xs text-gray-500 font-medium">Community Updates</p>
        </div>
      </div>

      {/* Facebook-style composer entry (Admin only) */}
      {isAdmin && (
        <button
          type="button"
          onClick={() => navigate("/admin/events/create")}
          className="mx-4 mt-3 mb-2 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors"
          aria-label="Create a new post"
        >
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.username || "Me"}
              className="w-10 h-10 rounded-full object-cover border border-gray-100"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-100" />
          )}

          <div className="flex-1">
            <div className="w-full rounded-full bg-gray-50 border border-gray-200 px-4 py-2 text-sm text-gray-500">
              What’s happening?
            </div>
          </div>
        </button>
      )}

      {/* 2. Filter Banner */}
      {activeTag && (
        <div className="mx-4 mb-4 flex items-center justify-between bg-blue-600 text-white p-3 rounded-xl shadow-lg shadow-blue-200 animate-in slide-in-from-top-2">
          <span className="text-sm font-bold">Showing: {activeTag}</span>
          <button
            onClick={() => setActiveTag(null)}
            className="text-blue-100 hover:text-white bg-blue-700 p-1 rounded-full"
          >
            <span className="sr-only">Clear</span>✕
          </button>
        </div>
      )}

      {/* 3. Error State */}
      {error && (
        <div className="mx-4 mt-8 flex flex-col items-center justify-center p-8 bg-white rounded-2xl border border-red-100 shadow-sm text-center">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
            <WifiOff className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-gray-900 font-bold mb-1">Connection Issue</h3>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <Button
            variant="outline"
            onClick={fetchEvents}
            className="rounded-full"
          >
            <RefreshCcw className="w-4 h-4 mr-2" /> Try Again
          </Button>
        </div>
      )}

      {/* 4. Feed Content */}
      <div className="space-y-6">
        {loading ? (
          // Skeletons
          [1, 2].map((i) => (
            <div
              key={i}
              className="mx-4 bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-full animate-pulse" />
                <div className="space-y-2 flex-1">
                  <div className="w-32 h-3 bg-gray-100 rounded animate-pulse" />
                  <div className="w-20 h-2 bg-gray-100 rounded animate-pulse" />
                </div>
              </div>
              <div className="w-full aspect-[4/3] bg-gray-100 rounded-2xl animate-pulse" />
            </div>
          ))
        ) : filteredEvents.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center py-24 text-center mx-4">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-gray-100">
              <LayoutGrid className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No posts yet</h3>
            <p className="text-gray-500 text-sm max-w-xs mx-auto">
              The feed is quiet. Be the first to share something!
            </p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <FeedPost
              key={event.id}
              event={event}
              isAdmin={isAdmin}
              onEdit={() => navigate(`/admin/events/edit/${event.id}`)}
              onDelete={() => setDeleteEventId(event.id)}
              onTagClick={(tag) => {
                setActiveTag(tag);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          ))
        )}
      </div>

      {/* 5. Delete Modal */}
      {deleteEventId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-xs rounded-3xl p-6 shadow-2xl scale-100">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              Delete Post?
            </h2>
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Are you sure? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteEventId(null)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-sm text-sm"
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
