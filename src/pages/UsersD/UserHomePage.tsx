import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import type { OutreachEvent } from "@/types";
import { EventCard } from "@/components/EventCard";
import { Heart, MessageCircle } from "lucide-react";

export function UserHomePage() {
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedEvents, setLikedEvents] = useState<{ [key: string]: boolean }>(
    {}
  );
  const [likeCounts, setLikeCounts] = useState<{ [key: string]: number }>({});
  const [commentCounts, setCommentCounts] = useState<{ [key: string]: number }>(
    {}
  );
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await supabase
          .from("outreach_events")
          .select("*, admin:profiles(id, username, avatar_url)")
          .order("created_at", { ascending: false });

        if (!error && data) {
          setEvents(data as OutreachEvent[]);

          // Initialize counts (Mock data for demo)
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

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-12 text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Removed <Header /> - AppLayout handles it */}

      {events.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500 text-sm">No posts yet</p>
          <p className="text-gray-400 text-xs mt-1">Check back soon!</p>
        </div>
      )}

      {events.map((event) => (
        <div key={event.id} className="space-y-2">
          <EventCard key={event.id} event={event} isAdmin={false} />

          {/* Engagement */}
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

      {/* Removed <BottomNavigation /> - AppLayout handles it */}
    </div>
  );
}
