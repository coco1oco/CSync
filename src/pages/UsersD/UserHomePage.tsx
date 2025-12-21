import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { FeedPost } from "@/components/FeedPost"; 
import { Loader2 } from "lucide-react";

// ⚡ OPTIMIZATION: Load only 5 posts at a time
const POSTS_PER_PAGE = 5;

export function UserHomePage() {
  // Use "any[]" to avoid TypeScript errors with the 'likes' property
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observer = useRef<IntersectionObserver | null>(null);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      
      const from = page * POSTS_PER_PAGE;
      const to = from + POSTS_PER_PAGE - 1;

      // 🔥 CRITICAL FIX: Fetch events + REAL counts of likes/comments
      const { data, error } = await supabase
        .from("outreach_events")
        .select(`
          *,
          admin:profiles(id, username, avatar_url),
          likes!left(count),
          comments!left(count)
        `)
        .order("created_at", { ascending: false })
        .range(from, to); // Pagination happens here

      if (error) throw error;

      if (data) {
        // If we got fewer posts than requested, we reached the end
        if (data.length < POSTS_PER_PAGE) {
          setHasMore(false);
        }

        setEvents((prevEvents) => {
          // Filter out duplicates to prevent React key errors
          const existingIds = new Set(prevEvents.map(e => e.id));
          const uniqueNewEvents = data.filter(e => !existingIds.has(e.id));
          return [...prevEvents, ...uniqueNewEvents];
        });
      }
    } catch (err) {
      console.error("Error fetching feed:", err);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [page]);

  // Initial Load
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Infinite Scroll Logic (Auto-load more when scrolling down)
  const lastEventElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();

    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });

    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  const handleDelete = useCallback(() => {}, []);
  const handleEdit = useCallback(() => {}, []);
  const handleTagClick = useCallback((tag: string) => {
    const sanitizedTag = String(tag).replace(/[\r\n]/g, ' ');
    console.log("Tag clicked:", sanitizedTag);
  }, []);

  return (
    <div className="max-w-xl mx-auto pb-20 pt-4 px-4 md:px-0">
      <div className="flex flex-col gap-6">
        {events.map((event, index) => {
          const isLastElement = events.length === index + 1;
          
          return (
            <div 
              key={event.id} 
              ref={isLastElement ? lastEventElementRef : null}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              {/* ✅ FIX: We pass the FULL event object to FeedPost.
                 FeedPost will look for `event.likes[0].count` and display it immediately.
              */}
              <FeedPost
                event={event}
                isAdmin={false} 
                onDelete={handleDelete} 
                onEdit={handleEdit}   
                onTagClick={handleTagClick} 
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

      {!hasMore && events.length > 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          You're all caught up! 🎉
        </div>
      )}

      {!loading && events.length === 0 && (
        <div className="text-center py-20">
          <p className="text-gray-500">No posts yet. Check back later!</p>
        </div>
      )}
    </div>
  );
}