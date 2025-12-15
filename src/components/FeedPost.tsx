import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { EventCard } from "@/components/EventCard";
import { EventRegistrationModal } from "@/components/EventRegistrationModal";
import type { OutreachEvent, Comment } from "@/types";
import {
  Heart,
  MessageCircle,
  Send,
  Loader2,
  X,
  Trash2,
  CalendarCheck,
  CheckCircle2,
} from "lucide-react";
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

export function FeedPost({
  event,
  isAdmin,
  onDelete,
  onEdit,
  onTagClick,
}: FeedPostProps) {
  const { user } = useAuth();

  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  useEffect(() => {
    fetchLikes();
    fetchCommentsCount();
    checkRegistration();
  }, []);

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
      setLikesCount(likesCount);
    }
  };

  const fetchCommentsCount = async () => {
    const { count } = await supabase
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("event_id", event.id);
    setCommentsCount(count || 0);
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
                onClick={() => setIsCommentsOpen(true)}
                className="flex items-center gap-1.5 group transition-all focus:outline-none"
              >
                <MessageCircle
                  className="w-6 h-6 text-gray-900 hover:text-gray-600"
                  strokeWidth={2}
                />
                {commentsCount > 0 && (
                  <span className="text-sm font-bold text-gray-900">
                    {commentsCount}
                  </span>
                )}
              </button>
            </div>

            {/* Right: Registration Button (Hidden for Admins) */}
            {!isAdmin &&
              (isRegistered ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">
                  <CheckCircle2 size={14} />
                  <span>Going</span>
                </div>
              ) : (
                <Button
                  size="sm"
                  onClick={() => setIsRegistrationOpen(true)}
                  className="h-8 rounded-full bg-black hover:bg-gray-800 text-white text-xs font-bold px-4 shadow-sm"
                >
                  <CalendarCheck className="w-3.5 h-3.5 mr-1.5" />
                  Register
                </Button>
              ))}
          </div>
        </EventCard>
      </div>

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

// ... CommentsModal Logic ...
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

  useEffect(() => {
    // Lock background scroll while modal is open.
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
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
          if (payload.new.user_id === user?.id) return;
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
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      supabase.removeChannel(channel);
    };
  }, [event.id, user?.id]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    const content = newComment.trim();
    setNewComment("");

    // Older iOS versions may not support `crypto.randomUUID()`.
    const tempId =
      typeof crypto !== "undefined" &&
      typeof (crypto as any).randomUUID === "function"
        ? (crypto as any).randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

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
    const { error } = await supabase
      .from("comments")
      .insert([{ event_id: event.id, user_id: user.id, content: content }]);
    if (error) {
      console.error("Failed to post comment", error);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      onCommentDeleted();
      alert(error.message || "Failed to post comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    onCommentDeleted();
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);
    if (error) {
      console.error("Failed to delete comment", error);
      alert(error.message || "Failed to delete comment");
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative w-full md:w-[480px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-[600px] animate-in slide-in-from-bottom-10 fade-in duration-300">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div className="w-8" />
          <h3 className="font-bold text-gray-900">Comments</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
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
