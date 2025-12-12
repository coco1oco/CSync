import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { EventCard } from "@/components/EventCard";
import type { OutreachEvent, Comment } from "@/types";
import { Heart, MessageCircle, Send, Loader2, X, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import FailedImageIcon from "@/assets/FailedImage.svg";

interface FeedPostProps {
  event: OutreachEvent;
  isAdmin: boolean;
  onDelete: () => void;
  onEdit: () => void;
}

export function FeedPost({ event, isAdmin, onDelete, onEdit }: FeedPostProps) {
  const { user } = useAuth();

  // State
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  useEffect(() => {
    fetchLikes();
    fetchCommentsCount();
  }, []);

  // --- LIKES LOGIC ---
  const fetchLikes = async () => {
    const { count } = await supabase
      .from("likes")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);

    setLikesCount(count || 0);

    if (user) {
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("event_id", event.id)
        .eq("user_id", user.id)
        .maybeSingle();
      setIsLiked(!!data);
    }
  };

  const toggleLike = async () => {
    if (!user) return;

    const previousLiked = isLiked;
    const previousCount = likesCount;

    // Optimistic Update
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    try {
      if (previousLiked) {
        await supabase
          .from("likes")
          .delete()
          .eq("event_id", event.id)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("likes")
          .insert([{ event_id: event.id, user_id: user.id }]);
      }
    } catch (err) {
      // Rollback
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      console.error("Like failed", err);
    }
  };

  // --- COMMENTS COUNT ONLY ---
  const fetchCommentsCount = async () => {
    const { count } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);
    setCommentsCount(count || 0);
  };

  return (
    <>
      <div className="bg-white shadow-sm lg:rounded-2xl overflow-hidden border-y border-gray-100 lg:border mb-4 lg:mb-6">
        <EventCard
          event={event}
          isAdmin={isAdmin}
          onEdit={onEdit}
          onDelete={onDelete}
        />

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
            onClick={() => setIsCommentsOpen(true)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            <span>{commentsCount > 0 ? commentsCount : "Comment"}</span>
          </button>
        </div>
      </div>

      {/* COMMENTS MODAL / SHEET */}
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
    </>
  );
}

// --- DEDICATED COMMENTS MODAL COMPONENT ---

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
  const bottomRef = useRef<HTMLDivElement>(null);

  // 1. Fetch & Subscribe
  useEffect(() => {
    document.body.style.overflow = "hidden"; // Lock scroll

    const fetchComments = async () => {
      setLoading(true);
      // ✅ OPTIMIZATION: Limit to 50 to prevent freezing
      const { data } = await supabase
        .from("comments")
        .select("*, user:profiles(id, username, avatar_url)")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (data) setComments(data as unknown as Comment[]);
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView(), 100);
    };

    fetchComments();

    // ✅ REAL-TIME COMMENTS
    const channel = supabase
      .channel(`comments-${event.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `event_id=eq.${event.id}`,
        },
        async (payload) => {
          // If I sent it, ignore (Optimistic UI handled it)
          if (payload.new.user_id === user?.id) return;

          // Fetch user details for the new comment
          const { data: userData } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .eq("id", payload.new.user_id)
            .single();

          const newComment = { ...payload.new, user: userData } as Comment;
          setComments((prev) => [...prev, newComment]);
          onCommentAdded();
          setTimeout(
            () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
            100
          );
        }
      )
      .subscribe();

    return () => {
      document.body.style.overflow = "";
      supabase.removeChannel(channel);
    };
  }, [event.id]);

  // 2. Post Comment (Optimistic)
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    const content = newComment.trim();
    setNewComment(""); // Clear input immediately

    // ✅ OPTIMISTIC UPDATE: Add to list instantly
    const tempId = crypto.randomUUID();
    const optimisticComment: any = {
      id: tempId,
      event_id: event.id,
      user_id: user.id,
      content: content,
      created_at: new Date().toISOString(),
      user: {
        id: user.id,
        username: user.username,
        avatar_url: user.avatar_url,
      },
    };

    setComments((prev) => [...prev, optimisticComment]);
    onCommentAdded();
    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );

    // Send to DB
    const { error } = await supabase.from("comments").insert([
      {
        event_id: event.id,
        user_id: user.id,
        content: content,
      },
    ]);

    if (error) {
      console.error("Comment failed", error);
      // Rollback if failed
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      onCommentDeleted(); // Revert count
      alert("Failed to post comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;

    // Optimistic Delete
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    onCommentDeleted();

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) {
      console.error("Delete failed", error);
      // We could fetchComments() to revert, but usually not worth the UX flicker
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      {/* BACKDROP */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* MODAL CONTAINER */}
      <div className="relative w-full md:w-[480px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-[600px] animate-in slide-in-from-bottom-10 fade-in duration-300">
        {/* HEADER */}
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

        {/* COMMENTS LIST */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
                    {(user?.id === comment.user_id ||
                      user?.role === "admin") && (
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

        {/* FOOTER INPUT */}
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
                placeholder={`Add a comment as ${user?.username || "user"}...`}
                className="bg-gray-50 border-transparent focus:border-blue-200 focus:bg-white rounded-full h-11 pl-4 pr-12 transition-all"
                autoFocus={!loading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newComment.trim()}
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
