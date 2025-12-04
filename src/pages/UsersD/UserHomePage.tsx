import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import type { OutreachEvent } from "@/types";
import { FeedPost } from "@/components/FeedPost";
import { Button } from "@/components/ui/button";
import { Plus, AlertCircle, RefreshCw } from "lucide-react"; // Added icons

export function UserHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // New Error State
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  const isAdmin = (user as any)?.role === "admin";

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null); // Reset error on refetch

      const { data, error } = await supabase
        .from("outreach_events")
        .select("*, admin:profiles(id, username, avatar_url)")
        .order("created_at", { ascending: false });

      if (error) throw error; // Explicitly throw to catch block

      if (data) {
        setEvents(data as OutreachEvent[]);
      }
    } catch (err: any) {
      console.error("Error fetching events:", err);
      setError("Unable to load the feed. Please try again.");
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
      } else {
        throw error;
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete post");
    }
  };

  return (
    <div className="space-y-4">
      {/* Desktop Title */}
      <div className="hidden lg:flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-950">Community Feed</h1>
        {isAdmin && (
          <Button
            onClick={() => navigate("/admin/events/create")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full"
          >
            <Plus className="w-4 h-4 mr-2" /> New Post
          </Button>
        )}
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="p-6 text-center bg-red-50 rounded-2xl border border-red-100 flex flex-col items-center gap-2">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-red-700 font-medium">{error}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchEvents}
            className="mt-2 border-red-200 text-red-700 hover:bg-red-100 hover:text-red-800"
          >
            <RefreshCw className="w-3 h-3 mr-2" /> Retry
          </Button>
        </div>
      )}

      {/* SKELETON LOADING STATE */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="space-y-2">
                  <div className="w-32 h-4 bg-gray-200 rounded" />
                  <div className="w-20 h-3 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="w-full h-48 bg-gray-200 rounded-xl" />
              <div className="w-3/4 h-4 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        /* ACTUAL CONTENT */
        <>
          {events.length === 0 && !error && (
            <div className="text-center py-20 bg-white lg:rounded-2xl border-2 border-dashed border-gray-100 mx-4 lg:mx-0">
              <p className="text-gray-500 font-medium">No posts yet</p>
              {isAdmin && (
                <Button
                  onClick={() => navigate("/admin/events/create")}
                  variant="link"
                  className="mt-2 text-blue-600"
                >
                  Create the first post
                </Button>
              )}
            </div>
          )}

          <div className="flex flex-col">
            {events.map((event) => (
              <FeedPost
                key={event.id}
                event={event}
                isAdmin={isAdmin}
                onEdit={() => navigate(`/admin/events/edit/${event.id}`)}
                onDelete={() => setDeleteEventId(event.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* FAB (Mobile Only - Admin) */}
      {isAdmin && (
        <Button
          onClick={() => navigate("/admin/events/create")}
          className="lg:hidden fixed bottom-24 right-4 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center z-50"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* Delete Modal */}
      {deleteEventId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl scale-100">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Delete Post?
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              This action cannot be undone. This post will be removed from the
              feed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteEventId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-sm"
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
