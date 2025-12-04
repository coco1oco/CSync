import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import type { OutreachEvent } from "@/types";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Plus, Loader2 } from "lucide-react";

export function UserHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Interaction states
  const [likedEvents, setLikedEvents] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  const isAdmin = (user as any)?.role === "admin";

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from("outreach_events")
        .select("*, admin:profiles(id, username, avatar_url)")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setEvents(data as OutreachEvent[]);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
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

  const handleLike = (eventId: string) => {
    setLikedEvents((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. Desktop Title (Hidden on mobile) */}
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

      {/* 2. Empty State */}
      {events.length === 0 && (
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

      {/* 3. Feed List */}
      <div className="flex flex-col gap-4 lg:gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white shadow-sm lg:rounded-2xl overflow-hidden border-y border-gray-100 lg:border"
          >
            <EventCard
              event={event}
              isAdmin={isAdmin}
              onEdit={() => navigate(`/admin/events/edit/${event.id}`)}
              onDelete={() => setDeleteEventId(event.id)}
            />

            {/* Actions Footer */}
            <div className="px-4 py-3 border-t border-gray-50 flex items-center gap-6">
              <button
                onClick={() => handleLike(event.id)}
                className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                  likedEvents[event.id]
                    ? "text-pink-600"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Heart
                  className={`w-5 h-5 ${
                    likedEvents[event.id] ? "fill-current" : ""
                  }`}
                />
                <span>{likedEvents[event.id] ? "1" : "Like"}</span>
              </button>

              <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
                <MessageCircle className="w-5 h-5" />
                <span>Comment</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 4. FAB (Mobile Only - Admin) */}
      {isAdmin && (
        <Button
          onClick={() => navigate("/admin/events/create")}
          className="lg:hidden fixed bottom-24 right-4 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center z-50"
        >
          <Plus className="h-6 w-6" />
        </Button>
      )}

      {/* 5. Delete Modal */}
      {deleteEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
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
