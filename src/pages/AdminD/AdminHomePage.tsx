import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { FeedPost } from "@/components/FeedPost";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import type { OutreachEvent } from "@/types";

const POSTS_PER_PAGE = 5;

export function AdminHomePage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Array<OutreachEvent & {
    likes?: { count: number }[];
    comments?: { count: number }[];
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [deleteEventId, setDeleteEventId] = useState<string | null>(null);
  
  const observer = useRef<IntersectionObserver | null>(null);
  const eventsLengthRef = useRef(0);

  useEffect(() => {
    eventsLengthRef.current = events.length;
  }, [events.length]);

  const fetchEvents = useCallback(async (pageNumber: number) => {
    try {
      setLoading(true);
      const from = pageNumber * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from("outreach_events")
        .select(`
          *, 
          admin:profiles(id, username, avatar_url),
          likes(count),
          comments(count)
        `)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (data) {
        if (data.length < POSTS_PER_PAGE) setHasMore(false);
        setEvents((prev) => {
          const existingIds = new Set(prev.map(e => e.id));
          const uniqueNew = data.filter(e => !existingIds.has(e.id));
          return [...prev, ...uniqueNew];
        });
      }
    } catch (err) {
      console.error("Error loading events:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents(0);
  }, [fetchEvents]);

  const lastEventRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        const nextPage = Math.ceil(eventsLengthRef.current / POSTS_PER_PAGE);
        fetchEvents(nextPage);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, fetchEvents]);

  const handleDelete = useCallback(async () => {
    if (!deleteEventId) return;
    try {
      const { error } = await supabase.from("outreach_events").delete().eq("id", deleteEventId);
      if (!error) {
        setEvents((prev) => prev.filter((e) => e.id !== deleteEventId));
        setDeleteEventId(null);
      }
    } catch (err) { alert("Failed to delete"); }
  }, [deleteEventId]);

  return (
    <div className="space-y-6 pb-24 px-4 md:px-0 max-w-xl mx-auto pt-6 relative">
      
      {/* 1. HEADER SECTION */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-950">All Posts</h1>
          <p className="text-sm text-gray-500">Community updates</p>
        </div>

        {/* ✅ UNIFIED BUTTON: Visible on ALL screens with TEXT */}
        <Button
          onClick={() => navigate("/admin/events/create")}
          className="flex bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-md transition-transform hover:scale-105 shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          <span className="font-bold">New Post</span>
        </Button>
      </div>

      {/* Empty State */}
      {!loading && events.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <p className="text-gray-500 mb-4">You haven't posted anything yet.</p>
          <Button variant="outline" onClick={() => navigate("/admin/events/create")}>
            Create your first post
          </Button>
        </div>
      )}

      {/* Feed List */}
      <div className="flex flex-col gap-6">
        {events.map((event, index) => {
          const isLast = events.length === index + 1;
          return (
            <div
              key={event.id}
              ref={isLast ? lastEventRef : null}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <FeedPost
                event={event}
                isAdmin={true}
                onEdit={() => navigate(`/admin/events/edit/${event.id}`)}
                onDelete={() => setDeleteEventId(event.id)}
              />
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      )}

      {/* Delete Modal */}
      {deleteEventId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl scale-100">
            <h2 className="text-xl font-bold text-gray-900 mb-2">Delete Post?</h2>
            <p className="text-gray-600 text-sm mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteEventId(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-colors shadow-sm">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}