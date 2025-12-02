import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext"; // Import Auth to check role
import type { OutreachEvent } from "@/types";
import { EventCard } from "@/components/EventCard";
import { Button } from "@/components/ui/button"; // Import Button
import { Heart, MessageCircle, Plus } from "lucide-react"; // Import Plus icon

export function UserHomePage() {
  const { user } = useAuth(); // Get current user
  const navigate = useNavigate();

  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedEvents, setLikedEvents] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>(
    {}
  );

  // Check if user is admin
  const isAdmin = (user as any)?.role === "admin";

  // Fetch Events
  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await supabase
          .from("outreach_events")
          .select("*, admin:profiles(id, username, avatar_url)")
          .order("created_at", { ascending: false });

        if (!error && data) {
          setEvents(data as OutreachEvent[]);

          // Initialize Mock Counts
          const counts: { [key: string]: number } = {};
          const comments: { [key: string]: number } = {};
          data.forEach((event) => {
            counts[event.id] = Math.floor(Math.random() * 50) + 1;
            comments[event.id] = Math.floor(Math.random() * 10);
          });
          setLikeCounts(counts);
          setCommentCounts(comments);
        }
      } catch (err) {
        console.error("Error fetching events:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  // Delete Function (Only works if Admin)
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
    const isLiked = likedEvents[eventId];
    setLikedEvents({ ...likedEvents, [eventId]: !isLiked });
    setLikeCounts({
      ...likeCounts,
      [eventId]: isLiked
        ? (likeCounts[eventId] || 0) - 1
        : (likeCounts[eventId] || 0) + 1,
    });
  };

  if (loading)
    return <div className="p-8 text-center text-gray-400">Loading feed...</div>;

  return (
    <div className="space-y-6 p-4 pb-24">
      {/* 1. ADMIN SECTION: Create Post Button */}
      {/* Only shows if you are an admin */}
      {isAdmin && (
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
          <div>
            <h3 className="font-bold text-blue-900">Admin Actions</h3>
            <p className="text-xs text-blue-600">Manage community updates</p>
          </div>
          <Button
            onClick={() => navigate("/admin/events/create")}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md"
          >
            <Plus className="mr-2 h-4 w-4" /> Create Post
          </Button>
        </div>
      )}

      {/* 2. EMPTY STATE */}
      {events.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-3xl">
          <p className="text-gray-500 text-sm mb-2">No posts yet</p>
          {isAdmin ? (
            <Button
              onClick={() => navigate("/admin/events/create")}
              variant="outline"
            >
              Create the first post
            </Button>
          ) : (
            <p className="text-gray-400 text-xs">Check back soon!</p>
          )}
        </div>
      )}

      {/* 3. FEED LIST */}
      {events.map((event) => (
        <div key={event.id} className="space-y-2">
          {/* Event Card */}
          <EventCard
            key={event.id}
            event={event}
            isAdmin={isAdmin} // Pass the admin status to show Edit/Delete dots
            onEdit={() => navigate(`/admin/events/edit/${event.id}`)}
            onDelete={() => handleDelete(event.id)}
          />

          {/* Engagement Buttons */}
          <div className="px-4 space-y-2">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleLike(event.id)}
                className={`flex items-center gap-1 transition-colors ${
                  likedEvents[event.id]
                    ? "text-red-500"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Heart
                  className="h-5 w-5"
                  fill={likedEvents[event.id] ? "currentColor" : "none"}
                />
                <span className="text-sm font-medium">
                  {likeCounts[event.id] || 0}
                </span>
              </button>

              <button className="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition-colors">
                <MessageCircle className="h-5 w-5" />
                <span className="text-sm font-medium">
                  {commentCounts[event.id] || 0}
                </span>
              </button>
            </div>
            <div className="border-t border-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}
