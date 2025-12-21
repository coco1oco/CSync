import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { FeedPost } from "@/components/FeedPost";
import type { OutreachEvent } from "@/types";
import { Loader2, ArrowLeft } from "lucide-react";

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [event, setEvent] = useState<OutreachEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    fetchEvent();
  }, [eventId]);

  // Scroll to comment if hash is present
  useEffect(() => {
    if (!loading && location.hash) {
      // Auto-open comments modal when there's a hash
      setTimeout(() => {
        const commentId = location.hash.substring(1); // Remove '#' from hash
        const element = document.getElementById(commentId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Add highlight animation
          element.classList.add('highlight-comment');
          setTimeout(() => element.classList.remove('highlight-comment'), 2000);
        }
      }, 600); // Wait for comments modal to open
    }
  }, [loading, location.hash]);

  const fetchEvent = async () => {
    try {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("outreach_events")
        .select("*, admin:profiles(id, username, avatar_url)")
        .eq("id", eventId)
        .single();

      if (err) throw err;
      setEvent(data as OutreachEvent);
    } catch (err) {
      console.error("Error fetching event:", err);
      setError("Event not found");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center pt-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="flex flex-col flex-1 min-h-screen bg-gray-50">
        <main className="flex-1 flex justify-center items-center px-4 py-6 lg:ml-64">
          <div className="text-center">
            <p className="text-gray-600">{error || "Event not found"}</p>
          </div>
        </main>
      </div>
    );
  }

  const isAdmin = user?.id === event.admin_id;

  return (
    <div className="flex flex-col flex-1 min-h-screen bg-gray-50">
      <main className="flex-1 flex justify-center px-4 py-6 lg:ml-64">
        <div className="w-full max-w-2xl">
          {/* ✅ BACK BUTTON */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 mb-4 text-gray-600 hover:text-gray-900 transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          
          <FeedPost
            event={event}
            isAdmin={isAdmin}
            autoOpenComments={!!location.hash && location.hash.startsWith('#comment-')}
            onDelete={() => {
              // Handle delete, maybe navigate back
              window.history.back();
            }}
            onEdit={() => {
              // Handle edit
              window.location.href = `/admin/events/edit/${event.id}`;
            }}
          />
        </div>
      </main>
    </div>
  );
}
