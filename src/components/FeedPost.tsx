import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { EventCard } from "@/components/EventCard";
import { EventRegistrationModal } from "@/components/EventRegistrationModal";
import type { OutreachEvent, Comment } from "@/types";
// 🔔 use the shared notification helpers (grouped + pruning)
import { notifyLike, notifyComment } from "@/lib/NotificationService";

import { Heart, MessageCircle, Send, Loader2, X, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FailedImageIcon from "@/assets/FailedImage.svg";

interface FeedPostProps {
  event: OutreachEvent;
  isAdmin: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onTagClick?: (tag: string) => void;
}

// FEED POST = Event card + like/comment footer + comments modal
export function FeedPost({ event, isAdmin, onDelete, onEdit, onTagClick }: FeedPostProps) {
  const { user } = useAuth();

  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  
  useEffect(() => {
    console.log('isCommentsOpen changed:', isCommentsOpen);
  }, [isCommentsOpen]);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    // Test database connectivity first
    const testDatabase = async () => {
      console.log('🔍 Testing database connectivity...');
      console.log('Event ID being used:', event.id, typeof event.id);
      
      // Test if we can read from likes table at all
      const { data: allLikes, error: allLikesError } = await supabase
        .from('likes')
        .select('*')
        .limit(1);
      
      console.log('All likes test:', { data: allLikes, error: allLikesError });
      
      // Test if we can read from comments table at all
      const { data: allComments, error: allCommentsError } = await supabase
        .from('comments')
        .select('*')
        .limit(1);
      
      console.log('All comments test:', { data: allComments, error: allCommentsError });
    };
    
    testDatabase();
    fetchLikes();
    fetchCommentsCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load total likes + whether current user liked this event
  const fetchLikes = async () => {
    try {
      const { count, error: countError } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);
      
      if (countError) {
        console.error('Error fetching likes count:', countError);
        return;
      }
      
      console.log('Likes count for event', event.id, ':', count);
      console.log('Event ID type:', typeof event.id);
      setLikesCount(count || 0);
      
      if (user) {
        const { data, error: likeError } = await supabase
          .from("likes")
          .select("id")
          .eq("event_id", event.id)
          .eq("user_id", user.id)
          .maybeSingle();
          
        if (likeError) {
          console.error('Error checking user like:', likeError);
          return;
        }
        
        console.log('User liked this event:', !!data);
        setIsLiked(!!data);
      }
    } catch (err) {
      console.error('Error in fetchLikes:', err);
    }
  };

  // Toggle like/unlike and create GROUPED notification on LIKE
  const toggleLike = async () => {
    if (!user) return;
    const previousLiked = isLiked;
    const previousCount = likesCount;

    // Optimistic UI update
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);
    try {
      if (previousLiked) {
        // UNLIKE: remove like (no notification needed)
        await supabase
          .from("likes")
          .delete()
          .eq("event_id", event.id)
          .eq("user_id", user.id);
      } else {
        // LIKE: insert like row
        await supabase
          .from("likes")
          .insert([{ event_id: event.id, user_id: user.id }]);

        // 🔔 Grouped like notification for event owner (admin_id)
        if (event.admin_id && event.admin_id !== user.id) {
          await notifyLike(
            { id: event.id, admin_id: event.admin_id, title: event.title },
            { id: user.id, username: user.username }
          );
        }
      }
    } catch (err) {
      // Roll back optimistic UI on error
      setIsLiked(previousLiked);
      setLikesCount(likesCount);
    }
  };

  // Load comment count for footer
  const fetchCommentsCount = async () => {
    try {
      const { count, error } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);
        
      if (error) {
        console.error('Error fetching comments count:', error);
        return;
      }
      
      console.log('Comments count for event', event.id, ':', count);
      console.log('Event ID type:', typeof event.id);
      setCommentsCount(count || 0);
    } catch (err) {
      console.error('Error in fetchCommentsCount:', err);
    }
  };

  const checkRegistration = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("event_id", event.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setIsRegistered(true);
  };

  return (
    <>
      {/* ✅ CLEAN CONTAINER: Just spacing, no white bg/borders */}
      <div className="mb-4">
        <EventCard
          event={event}
          isAdmin={isAdmin}
          onEdit={onEdit}
          onDelete={onDelete}
          onTagClick={onTagClick}
        >
          {/* ✅ ACTION BAR INJECTED INTO EVENT CARD */}
          <div className="flex items-center justify-between mb-2">
            {/* Left: Interactions */}
            <div className="flex items-center gap-4">
              <button
                onClick={toggleLike}
                className="flex items-center gap-1.5 group transition-all focus:outline-none"
              >
                <Heart
                  className={`w-6 h-6 transition-transform group-active:scale-90 ${
                    isLiked
                      ? "fill-red-500 text-red-500"
                      : "text-gray-900 hover:text-gray-600"
                  }`}
                  strokeWidth={isLiked ? 0 : 2}
                />
                {likesCount > 0 && (
                  <span className="text-sm font-bold text-gray-900">
                    {likesCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => {
                  console.log('Comment button clicked');
                  setIsCommentsOpen(true);
                }}
                className="flex items-center gap-1.5 group transition-all focus:outline-none"
              >
                <MessageCircle className="w-6 h-6 text-gray-900 hover:text-gray-600" />
                {commentsCount > 0 && (
                  <span className="text-sm font-bold text-gray-900">
                    {commentsCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </EventCard>

        {/* Footer: Like + Comment buttons */}
        <div className="px-4 py-3 border-t border-gray-50 flex items-center gap-6">
          <button
            onClick={toggleLike}
            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
              isLiked ? "text-pink-600" : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Heart className={`w-5 h-5 ${isLiked ? "fill-current" : ""}`} />
            <span>{likesCount > 0 ? likesCount : "Like"}</span>
          </button>

          <button
            onClick={() => {
              console.log('Footer comment button clicked');
              setIsCommentsOpen(true);
            }}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{commentsCount > 0 ? commentsCount : "Comment"}</span>
          </button>
        </div>
      </div>

      {/* Comments side-sheet/modal */}
      {isCommentsOpen && (
        <CommentsModal
          event={event}
          user={user}
          onClose={() => setIsCommentsOpen(false)}
          onCommentAdded={() => setCommentsCount((prev) => prev + 1)}
          onCommentDeleted={() =>
            setCommentsCount((prev) => Math.max(0, prev - 1))
          }
        />
      )}

      {isRegistrationOpen && (
        <EventRegistrationModal
          eventId={event.id}
          eventTitle={event.title}
          onClose={() => setIsRegistrationOpen(false)}
          onSuccess={() => setIsRegistered(true)}
        />
      )}
    </>
  );
}

// --- COMMENTS MODAL ---

interface CommentsModalProps {
  event: OutreachEvent;
  user: any;
  onClose: () => void;
  onCommentAdded: () => void;
  onCommentDeleted: () => void;
}

function CommentsModal({
  event,
  user,
  onClose,
  onCommentAdded,
  onCommentDeleted,
}: CommentsModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prevent background scroll while modal is open
    document.body.style.overflow = "hidden";

    const fetchComments = async () => {
      setLoading(true);

      // Preferred path: join profile info in a single query.
      const joined = await supabase
        .from("comments")
        .select("*, user:profiles(id, username, avatar_url)")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (!joined.error && joined.data) {
        setComments(joined.data as unknown as Comment[]);
        setLoading(false);
        setTimeout(() => bottomRef.current?.scrollIntoView(), 100);
        return;
      }

      // Fallback path: some Supabase setups don't have a FK relationship that enables `user:profiles(...)`.
      // In that case, fetch comments first, then fetch profiles separately.
      if (joined.error) {
        console.error("Failed to load comments (join)", joined.error);
      }

      const base = await supabase
        .from("comments")
        .select("id, user_id, event_id, content, created_at")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (base.error) {
        console.error("Failed to load comments", base.error);
        setComments([]);
        setLoading(false);
        return;
      }

      const rows = (base.data ?? []) as Array<
        Pick<Comment, "id" | "user_id" | "event_id" | "content" | "created_at">
      >;

      const userIds = Array.from(
        new Set(rows.map((c) => c.user_id).filter(Boolean))
      );
      const profilesRes = userIds.length
        ? await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", userIds)
        : { data: [], error: null as unknown };

      if ((profilesRes as any).error) {
        console.error(
          "Failed to load comment authors",
          (profilesRes as any).error
        );
      }

      const profileById = new Map(
        (((profilesRes as any).data ?? []) as Array<any>).map((p) => [p.id, p])
      );

      setComments(
        rows.map((c) => ({
          ...c,
          user: profileById.get(c.user_id),
        })) as unknown as Comment[]
      );

      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 100);
    };
    
    fetchComments();
    
    return () => {
      document.body.style.overflow = "unset";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load all comments for this event
  const fetchComments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("comments")
      .select("*, user:profiles(id, username, avatar_url)")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true });

    if (data) setComments(data as unknown as Comment[]);
    setLoading(false);

    // Scroll to bottom after loading
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  };

  // Post a new comment + grouped notification for owner
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user || isSubmitting) return;
    
    const content = newComment.trim();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("comments")
        .insert({
          event_id: event.id,
          user_id: user.id,
          content: content,
        })
        .select("*, user:profiles(id, username, avatar_url)")
        .single();

      if (error) throw error;

      if (data) {
        // Update local state
        setComments((prev) => [...prev, data as any]);
        setNewComment("");
        onCommentAdded();

        setTimeout(
          () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
          100
        );

        // 🔔 Grouped comment notification for event owner
        if (event.admin_id && event.admin_id !== user.id) {
          const preview = content.slice(0, 120);
          await notifyComment(
            { id: event.id, admin_id: event.admin_id, title: event.title },
            { id: user.id, username: user.username },
            preview,
            data.id
          );
        }
      }
    } catch (err) {
      console.error("Comment failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete a comment (optional: you can also delete its notification here)
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (!error) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
        onCommentDeleted();
        // Optional: also delete related 'comment' notification here if you want
      }
    } catch (err) {
      console.error("Delete comment failed", err);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal container */}
      <div className="relative w-full md:w-[480px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-[600px] animate-in slide-in-from-bottom-10 fade-in duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div className="w-8" />
          <div className="flex flex-col items-center">
            <div className="w-10 h-1 bg-gray-200 rounded-full md:hidden mb-2" />
            <h3 className="font-bold text-gray-900">Comments</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {/* Comments list */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">No comments yet.</p>
              <p className="text-xs">Start the conversation!</p>
            </div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <img
                  src={comment.user?.avatar_url || FailedImageIcon}
                  alt="User"
                  className="w-8 h-8 rounded-full object-cover border border-gray-100 flex-shrink-0"
                />
                <div className="flex-1 space-y-1">
                  <div className="bg-gray-50 rounded-2xl rounded-tl-none px-3 py-2 inline-block max-w-full">
                    <span className="font-bold text-sm text-gray-900 mr-2">
                      {comment.user?.username || "Unknown"}
                    </span>
                    <span className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                      {comment.content}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 px-1 h-4">
                    <span className="text-[10px] text-gray-400 font-medium">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                    {(user?.id === comment.user_id || user?.role === "admin") && (
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={10} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
        {/* New comment input */}
        <div className="p-4 border-t border-gray-100 bg-white md:rounded-b-2xl">
          <form
            onSubmit={handlePostComment}
            className="flex gap-2 items-center"
          >
            <img
              src={user?.avatar_url || FailedImageIcon}
              alt="Me"
              className="w-8 h-8 rounded-full object-cover border border-gray-100 shrink-0"
            />
            <div className="relative flex-1">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={`Add a comment...`}
                className="bg-gray-50 border-transparent focus:border-blue-200 focus:bg-white rounded-full h-11 pl-4 pr-12 transition-all"
                autoFocus={!loading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newComment.trim() || isSubmitting}
                className="absolute right-1 top-1 h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-sm"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}
