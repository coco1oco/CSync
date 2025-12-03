import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import type { OutreachEvent } from "@/types";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, Plus } from "lucide-react";

export function UserHomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Real interaction state (Client-side only for demo)
  // Starts empty (0 likes), toggles to true (1 like) on click
  const [likedEvents, setLikedEvents] = useState<{ [key: string]: boolean }>(
    {}
  );

  const isAdmin = (user as any)?.role === "admin";

  useEffect(() => {
    async function fetchEvents() {
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
    }
    fetchEvents();
  }, []);

  const handleDelete = async (eventId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      const { error } = await supabase
        .from("outreach_events")
        .delete()
        .eq("id", eventId);
      if (!error) {
        setEvents(events.filter((e) => e.id !== eventId));
      }
    } catch (err) {
      alert("Failed to delete post");
    }
  };

  const handleLike = (eventId: string) => {
    setLikedEvents((prev) => ({ ...prev, [eventId]: !prev[eventId] }));
  };

  if (loading)
    return <div className="p-8 text-center text-gray-400">Loading feed...</div>;

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* 1. Header (Mobile Only) - Keeps it clean */}
      <div className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-900">Community Feed</h1>
      </div>

      {/* 2. Desktop Title */}
      <div className="hidden lg:block px-4 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-blue-950">Community Feed</h1>
      </div>

      {/* 3. Empty State */}
      {events.length === 0 && (
        <div className="mx-4 mt-8 text-center py-12 border-2 border-dashed border-gray-200 rounded-3xl bg-white">
          <p className="text-gray-500 text-sm mb-4">No posts yet</p>
          {isAdmin && (
            <Button
              onClick={() => navigate("/admin/events/create")}
              variant="outline"
            >
              Create the first post
            </Button>
          )}
        </div>
      )}

      {/* 4. Feed List */}
      <div className="space-y-3 lg:space-y-6 px-0 lg:px-4">
        {events.map((event) => (
          <div
            key={event.id}
            className="bg-white border-y border-gray-100 lg:border lg:rounded-2xl shadow-sm overflow-hidden"
          >
            <EventCard
              event={event}
              isAdmin={isAdmin}
              onEdit={() => navigate(`/admin/events/edit/${event.id}`)}
              onDelete={() => handleDelete(event.id)}
            />

            {/* Action Bar (Real Data) */}
            <div className="px-4 py-3 border-t border-gray-50 flex items-center gap-6">
              {/* Like Button */}
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
                {/* Real Data: 0 or 1 */}
                <span>{likedEvents[event.id] ? 1 : 0}</span>
              </button>

              {/* Comment Button (Always 0 for demo) */}
              <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors">
                <MessageCircle className="w-5 h-5" />
                <span>0</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 5. Floating Action Button (FAB) - The "Blue Button at the side" */}
      {/* Shows on both Mobile (bottom right above nav) and Desktop */}
      {isAdmin && (
        <Button
          onClick={() => navigate("/admin/events/create")}
          className="fixed bottom-24 right-5 lg:bottom-10 lg:right-10 h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center z-40 transition-transform active:scale-95"
        >
          <Plus className="h-7 w-7" />
        </Button>
      )}
    </div>
  );
}
