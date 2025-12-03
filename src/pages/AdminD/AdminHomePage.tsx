import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import type { OutreachEvent } from "@/types";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Plus, Heart, MessageCircle, Loader2 } from "lucide-react";

export function AdminHomePage() {
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // New refreshing state
  const [refreshing, setRefreshing] = useState(false);

  // Stats state
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>(
    {}
  );

  const navigate = useNavigate();

  // Reusable function to fetch events
  const loadEvents = async () => {
    setRefreshing(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setCurrentUserId(user.id);

        const { data, error } = await supabase
          .from("outreach_events")
          .select("*, admin:profiles(id, username, avatar_url)")
          .eq("admin_id", user.id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setEvents(data as OutreachEvent[]);

          const counts: { [key: string]: number } = {};
          const comments: { [key: string]: number } = {};
          data.forEach((event) => {
            counts[event.id] = Math.floor(Math.random() * 50) + 1;
            comments[event.id] = Math.floor(Math.random() * 10);
          });
          setLikeCounts(counts);
          setCommentCounts(comments);
        }
      }
    } catch (err) {
      console.error("Error loading events:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadEvents();
  }, []);

  const handleDelete = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from("outreach_events")
        .delete()
        .eq("id", eventId)
        .eq("admin_id", currentUserId);

      if (!error) {
        setEvents(events.filter((e) => e.id !== eventId));
        setDeleteEventId(null);
      }
    } catch (err) {
      console.error("Error deleting event:", err);
      alert("Failed to delete post");
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-24 lg:pb-8 lg:space-y-6">
      {/* 1. Page Title & Refresh Button (Desktop Only) */}
      <div className="hidden lg:flex items-center justify-between px-2 pt-2">
        <h1 className="text-2xl font-bold text-blue-950">Admin Dashboard</h1>

        <button
          onClick={loadEvents}
          disabled={refreshing}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all"
          title="Refresh Feed"
        >
          {refreshing ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
          )}
        </button>
      </div>

      {/* 2. Admin Actions Banner (Desktop Only) */}
      <div className="hidden lg:flex mx-2 bg-blue-50 border border-blue-100 rounded-2xl p-4 items-center justify-between shadow-sm">
        <div>
          <h3 className="font-bold text-blue-900 text-sm">
            Create New Content
          </h3>
          <p className="text-xs text-blue-600">
            Post updates for the community
          </p>
        </div>
        <Button
          onClick={() => navigate("/admin/events/create")}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md text-xs h-8"
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Create
        </Button>
      </div>

      {/* 3. Empty State */}
      {events.length === 0 && !refreshing && (
        <div className="mx-4 mt-8 text-center py-12 border-2 border-dashed border-gray-200 rounded-3xl bg-white lg:bg-gray-50">
          <p className="text-gray-500 text-sm mb-4">
            You haven't posted anything yet.
          </p>
          <Button
            onClick={() => navigate("/admin/events/create")}
            variant="outline"
            className="rounded-full"
          >
            Create Your First Post
          </Button>
        </div>
      )}

      {/* 4. Events List */}
      <div className="space-y-0 lg:space-y-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white border-b border-gray-100 lg:border lg:rounded-2xl lg:mx-2 lg:shadow-sm"
          >
            <EventCard
              event={event}
              isAdmin={true}
              onEdit={() => navigate(`/admin/events/edit/${event.id}`)}
              onDelete={() => setDeleteEventId(event.id)}
            />

            {/* Engagement Stats */}
            <div className="px-4 pb-3 pt-2 flex gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-1.5">
                <Heart className="h-5 w-5" /> {likeCounts[event.id] || 0}
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="h-5 w-5" />{" "}
                {commentCounts[event.id] || 0}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 5. Floating Create Button (Mobile Only) */}
      <Button
        onClick={() => navigate("/admin/events/create")}
        className="fixed bottom-24 right-5 h-14 w-14 rounded-full shadow-lg hover:shadow-xl bg-blue-600 hover:bg-blue-700 text-white z-40 flex items-center justify-center lg:hidden"
        size="icon"
      >
        <Plus className="h-7 w-7" />
      </Button>

      {/* Delete Confirmation Modal */}
      {deleteEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl animate-in zoom-in-95">
            <h2 className="text-lg font-bold text-gray-900">Delete Post?</h2>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure? This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteEventId(null)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteEventId && handleDelete(deleteEventId)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-colors"
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
