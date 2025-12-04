import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import type { OutreachEvent } from "@/types";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Plus, Heart, MessageCircle, Loader2 } from "lucide-react";

export function AdminHomePage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);

  // Use simple counts for demo stats
  const [stats, setStats] = useState<{
    [key: string]: { likes: number; comments: number };
  }>({});

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("outreach_events")
        .select("*, admin:profiles(id, username, avatar_url)")
        .eq("admin_id", user.id)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setEvents(data as OutreachEvent[]);

        // Generate random stats
        const newStats: any = {};
        data.forEach((e) => {
          newStats[e.id] = {
            likes: Math.floor(Math.random() * 50),
            comments: Math.floor(Math.random() * 10),
          };
        });
        setStats(newStats);
      }
    } catch (err) {
      console.error("Error loading events:", err);
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
      alert("Failed to delete");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Remove 'hidden lg:flex' and replace with 'flex' */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-blue-950">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your posts and community updates
          </p>
        </div>
        {/* ... button ... */}
      </div>

      {/* 2. Empty State */}
      {events.length === 0 && (
        <div className="text-center py-16 bg-white lg:rounded-2xl border-2 border-dashed border-gray-200 mx-4 lg:mx-0">
          <p className="text-gray-500 mb-4">You haven't posted anything yet.</p>
          <Button
            variant="outline"
            onClick={() => navigate("/admin/events/create")}
          >
            Create your first post
          </Button>
        </div>
      )}

      {/* 3. Post List */}
      <div className="flex flex-col gap-4 lg:gap-6">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white shadow-sm lg:rounded-2xl overflow-hidden border-y border-gray-100 lg:border"
          >
            <EventCard
              event={event}
              isAdmin={true}
              onEdit={() => navigate(`/admin/events/edit/${event.id}`)}
              onDelete={() => setDeleteEventId(event.id)}
            />
            {/* Stats Footer */}
            <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-50 flex gap-6 text-xs font-semibold text-gray-500">
              <div className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-gray-400" />
                {stats[event.id]?.likes || 0} Likes
              </div>
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-gray-400" />
                {stats[event.id]?.comments || 0} Comments
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4. FAB (Mobile Only) */}
      <Button
        onClick={() => navigate("/admin/events/create")}
        className="lg:hidden fixed bottom-24 right-4 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center z-50"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* 5. Delete Modal */}
      {deleteEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl scale-100">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Delete Post?
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              This action cannot be undone.
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
