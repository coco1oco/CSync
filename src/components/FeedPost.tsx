import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { EventCard } from "@/components/EventCard";
import type { OutreachEvent, Comment } from "@/types";
import { Heart, MessageCircle, Send, Loader2 } from "lucide-react";
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
  const [comments, setComments] = useState<Comment[]>([]);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchLikes();
  }, []);

  useEffect(() => {
    if (isCommentsOpen) {
      fetchComments();
    }
  }, [isCommentsOpen]);

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
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
      console.error("Like failed", err);
    }
  };

  // --- COMMENTS LOGIC ---
  const fetchComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select("*, user:profiles(username, avatar_url)")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true });

    if (data) setComments(data as unknown as Comment[]);
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("comments").insert([
        {
          event_id: event.id,
          user_id: user.id,
          content: newComment.trim(),
        },
      ]);

      if (error) throw error;

      setNewComment("");
      fetchComments();
    } catch (err) {
      console.error("Comment failed", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
          onClick={() => setIsCommentsOpen(!isCommentsOpen)}
          className={`flex items-center gap-2 text-sm font-medium transition-colors ${
            isCommentsOpen
              ? "text-blue-600"
              : "text-gray-500 hover:text-blue-600"
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span>{comments.length > 0 ? comments.length : "Comment"}</span>
        </button>
      </div>

      {isCommentsOpen && (
        <div className="bg-gray-50/50 px-4 py-4 border-t border-gray-100 space-y-4 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-2">
                No comments yet. Be the first!
              </p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="flex gap-3 items-start">
                  <img
                    src={comment.user?.avatar_url || FailedImageIcon}
                    alt="User"
                    className="w-8 h-8 rounded-full object-cover border border-gray-200 shrink-0 mt-1"
                  />
                  {/* ✅ FIXED: Tighter padding (px-3 py-2) for cleaner look */}
                  <div className="flex-1 bg-white px-3 py-2 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm text-sm">
                    <span className="font-bold text-gray-900 mr-2">
                      {comment.user?.username || "Unknown"}
                    </span>
                    <span className="text-gray-700 leading-relaxed break-words">
                      {comment.content}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <form
            onSubmit={handlePostComment}
            className="flex gap-2 items-center pt-2"
          >
            {/* ✅ FIXED: Added pl-4 to prevent text starting too close to rounded edge */}
            <Input
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment..."
              className="bg-white rounded-full h-10 border-gray-200 focus-visible:ring-blue-500 pl-4"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isSubmitting || !newComment.trim()}
              className="rounded-full h-10 w-10 bg-blue-600 hover:bg-blue-700 shrink-0"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 ml-0.5" />
              )}
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
