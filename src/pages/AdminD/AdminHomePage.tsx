import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import type { OutreachEvent } from "@/types";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Plus, Heart, MessageCircle } from "lucide-react";

export function AdminHomePage() {
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>(
    {}
  );
  const navigate = useNavigate();

  useEffect(() => {
    async function loadEvents() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setCurrentUserId(user.id);

          const { data, error } = await supabase
            .from("outreach_events")
            .select("*, admin:profiles(id, username, avatar_url)")
            .eq("admin_id", user.id) // Only show this admin's posts
            .order("created_at", { ascending: false });

          if (!error && data) {
            setEvents(data as OutreachEvent[]);

            // Initialize counts (Mock data)
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
      }
    }
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
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between px-2">
        <h1 className="text-2xl font-bold text-blue-950">Admin Dashboard</h1>
      </div>

      {/* Empty State */}
      {events.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-3xl bg-gray-50">
          <p className="text-gray-500 text-sm mb-4">
            You haven't posted anything yet.
          </p>
          <Button
            onClick={() => navigate("/admin/events/create")}
            className="bg-blue-600 rounded-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Post
          </Button>
        </div>
      )}

      {/* Events List */}
      <div className="space-y-4">
        {events.map((event) => (
          <div key={event.id} className="space-y-2">
            <EventCard
              key={event.id}
              event={event}
              isAdmin={true}
              onEdit={() => navigate(`/admin/events/edit/${event.id}`)}
              onDelete={() => setDeleteEventId(event.id)}
            />

            {/* Engagement Stats (ReadOnly for Admin View) */}
            <div className="px-4 flex gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Heart className="h-4 w-4" /> {likeCounts[event.id] || 0}
              </div>
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />{" "}
                {commentCounts[event.id] || 0}
              </div>
            </div>
            <div className="border-t border-gray-100 my-2" />
          </div>
        ))}
      </div>

      {/* Floating Create Button (Fixed above Bottom Nav) */}
      <Button
        onClick={() => navigate("/admin/events/create")}
        className="fixed bottom-24 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl bg-blue-600 hover:bg-blue-700 text-white z-40 flex items-center justify-center"
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Delete Confirmation Modal */}
      {deleteEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Delete Post?</h2>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure? This action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setDeleteEventId(null)}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteEventId && handleDelete(deleteEventId)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
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
