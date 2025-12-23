import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
// 1. UPDATE: Import useSearchParams
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { EventCard } from "@/components/EventCard";
import { OfficialEventCard } from "@/components/OfficialEventCard"; // ✅ IMPORT NEW CARD
import { EventRegistrationModal } from "@/components/EventRegistrationModal";
import {
  notifyLike,
  notifyComment,
  notifyReply,
  notifyMentions,
  notifyCommentLike,
} from "@/lib/NotificationService";
import {
  Loader2,
  X,
  Send,
  Reply,
  Heart,
  MessageCircle,
  Trash2,
  MoreHorizontal,
  Edit,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FailedImageIcon from "@/assets/FailedImage.svg";
import type { OutreachEvent, Comment } from "@/types";

// --- Interfaces ---

interface FeedPostProps {
  event: OutreachEvent;
  isAdmin: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onTagClick?: (tag: string) => void;
  customUsername?: string;
  customAvatar?: string;
}

interface CommentWithExtras extends Comment {
  reply_count?: number;
  likes_count?: number;
  is_liked_by_user?: boolean;
  parent_comment_id: string | null;
}

// --- Main Component (FeedPost) ---

export function FeedPost({
  event,
  isAdmin,
  onDelete,
  onEdit,
  onTagClick,
  customUsername, // 👈 Destructure here
  customAvatar,
}: FeedPostProps) {
  const { user } = useAuth();
  // 2. UPDATE: Read URL params for Deep Linking
  const [searchParams] = useSearchParams();
  const highlightCommentId = searchParams.get("comment_id");
  const actionType = searchParams.get("action");

  // Shared Logic (Likes, Comments, Reg)
  const [likesCount, setLikesCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [, setIsLoading] = useState(true);
  const [, setError] = useState<string | null>(null);

  // State for visual effect on Like
  const [triggerLikeAnim, setTriggerLikeAnim] = useState(false);

  // ✅ SMART CHECK: Is this an "Official Event" or a "Standard Post"?
  const officialTypes = ["official", "pet", "member", "campus"];
  const isOfficialEvent = officialTypes.includes(event.event_type || "");

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await Promise.all([
          fetchLikes(),
          fetchCommentsCount(),
          checkRegistration(),
        ]);
      } catch (err) {
        setError("Failed to load post data");
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [event.id]);

  // 3. UPDATE: Effect to handle Deep Links (Open Modal or Animate)
  useEffect(() => {
    // If URL has ?comment_id=..., automatically open comments
    if (highlightCommentId) {
      setIsCommentsOpen(true);
    }
    // If URL has ?action=like, trigger animation
    if (actionType === "like") {
      setTriggerLikeAnim(true);
      setTimeout(() => setTriggerLikeAnim(false), 2000);
    }
  }, [highlightCommentId, actionType]);

  // ... (Keep existing fetchLikes, toggleLike, fetchCommentsCount, checkRegistration logic exactly the same) ...
  const fetchLikes = async () => {
    try {
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
    } catch (err) {
      console.error("Failed to load likes:", err);
      setLikesCount(0);
      setIsLiked(false);
    }
  };

  const toggleLike = async () => {
    if (!user || isLiking) return;

    setIsLiking(true);
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
        const { error } = await supabase
          .from("likes")
          .insert([{ event_id: event.id, user_id: user.id }]);
        if (error) throw error;

        if (event.admin_id !== user.id) {
          await notifyLike(
            { id: event.id, admin_id: event.admin_id, title: event.title },
            { id: user.id, username: user.username }
          );
        }
      }
    } catch (err) {
      console.error("Feed like error:", err);
      setIsLiked(previousLiked);
      setLikesCount(likesCount);
      setError("Failed to like post. Try again.");
      setTimeout(() => setError(null), 3000);
    } finally {
      setIsLiking(false);
    }
  };

  const fetchCommentsCount = async () => {
    try {
      const { count } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);
      setCommentsCount(count || 0);
    } catch (err) {
      console.error("Failed to load comments count:", err);
      setCommentsCount(0);
    }
  };

  const checkRegistration = async () => {
    if (!user) return;
    try {
      const { data } = await supabase
        .from("event_registrations")
        .select("id")
        .eq("event_id", event.id)
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setIsRegistered(true);
    } catch (err) {
      console.error("Failed to check registration:", err);
      setIsRegistered(false);
    }
  };

  // --- RENDER ---

  // 🎨 OPTION A: OFFICIAL EVENT CARD (Luma Style)
  if (isOfficialEvent) {
    return (
      <>
        <OfficialEventCard
          event={event}
          isRegistered={isRegistered}
          onRegister={() => setIsRegistrationOpen(true)}
          onEdit={onEdit}
          isAdmin={isAdmin}
        />
        {isRegistrationOpen && (
          <EventRegistrationModal
            eventId={event.id}
            eventTitle={event.title}
            eventLocation={event.location}
            eventDate={
              event.event_date
                ? new Date(event.event_date).toLocaleDateString()
                : undefined
            }
            // ✅ NEW: Pass the type so the modal knows whether to ask for pets
            eventType={event.event_type}
            onClose={() => setIsRegistrationOpen(false)}
            onSuccess={() => setIsRegistered(true)}
          />
        )}{" "}
      </>
    );
  }

  // 📝 OPTION B: STANDARD SOCIAL POST (Facebook Style)
  return (
    <>
      <div className="mb-4">
        <EventCard
          event={event}
          isAdmin={isAdmin}
          onEdit={onEdit}
          onDelete={onDelete}
          onTagClick={onTagClick}
          // 🔥 Pass them down to the EventCard
          customUsername={customUsername}
          customAvatar={customAvatar}
        >
          {/* Action Bar for Standard Posts */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              {/* Event Like Button */}
              <button
                onClick={toggleLike}
                disabled={isLiking}
                className="flex items-center gap-1.5 group transition-all focus:outline-none disabled:opacity-50"
              >
                <Heart
                  // 4. UPDATE: Add bounce animation if triggered via notification
                  className={`w-6 h-6 transition-transform group-active:scale-90 ${
                    isLiked || triggerLikeAnim
                      ? "fill-red-500 text-red-500"
                      : "text-gray-900 hover:text-gray-600"
                  } ${triggerLikeAnim ? "animate-bounce" : ""}`}
                  strokeWidth={isLiked || triggerLikeAnim ? 0 : 2}
                />
                {likesCount > 0 && (
                  <span className="text-sm font-bold text-gray-900">
                    {likesCount}
                  </span>
                )}
              </button>

              {/* Comment Button */}
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
          // 5. UPDATE: Pass highlight ID
          highlightId={highlightCommentId}
        />
      )}
    </>
  );
}

// ... (Keep CommentsModal Component at bottom as is) ...

// ... (CommentsModal Logic remains unchanged below)
interface CommentsModalProps {
  event: OutreachEvent;
  user: any;
  onClose: () => void;
  onCommentAdded: () => void;
  onCommentDeleted: () => void;
  highlightId?: string | null; // 6. UPDATE: Prop for highlighting
}

function CommentsModal({
  event,
  user,
  onClose,
  onCommentAdded,
  onCommentDeleted,
  highlightId,
}: CommentsModalProps) {
  const [comments, setComments] = useState<CommentWithExtras[]>([]);
  const [newComment, setNewComment] = useState("");
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

  // 1. SMART TARGETING STATE: Remembers exactly who you clicked
  const [replyTarget, setReplyTarget] = useState<CommentWithExtras | null>(
    null
  );

  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(
    new Set()
  );

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    const fetchComments = async () => {
      setLoading(true);
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

      // Fallback
      const base = await supabase
        .from("comments")
        .select("id, user_id, event_id, content, created_at")
        .eq("event_id", event.id)
        .order("created_at", { ascending: true })
        .limit(50);

      if (base.error) {
        setComments([]);
        setLoading(false);
        return;
      }

      const rows = (base.data ?? []) as Array<any>;
      const userIds = Array.from(
        new Set(rows.map((c) => c.user_id).filter(Boolean))
      );

      const profilesRes = userIds.length
        ? await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", userIds)
        : { data: [] };

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
          const newMsg = {
            ...payload.new,
            user: userData,
          } as CommentWithExtras;
          setComments((prev) => [...prev, newMsg]);
          onCommentAdded();
        }
      )
      .subscribe();

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      supabase.removeChannel(channel);
    };
  }, [event.id]);

  // 7. UPDATE: Effect to Scroll & Highlight specific comment
  useEffect(() => {
    if (highlightId && !loading && comments.length > 0) {
      // Small timeout to ensure rendering
      setTimeout(() => {
        const element = document.getElementById(`comment-${highlightId}`);
        if (element) {
          // If it's a reply, ensure parent is expanded
          const comment = comments.find((c) => c.id === highlightId);
          if (comment?.parent_comment_id) {
            setExpandedComments((prev) =>
              new Set(prev).add(comment.parent_comment_id!)
            );
          }

          element.scrollIntoView({ behavior: "smooth", block: "center" });

          // Add highlight animation
          element.classList.add(
            "bg-yellow-50",
            "ring-2",
            "ring-yellow-100",
            "rounded-lg"
          );
          setTimeout(() => {
            element.classList.remove(
              "bg-yellow-50",
              "ring-2",
              "ring-yellow-100",
              "rounded-lg"
            );
            element.classList.add("transition-all", "duration-1000");
          }, 3000);
        }
      }, 300);
    }
  }, [loading, comments, highlightId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("comments")
        .select(
          "*, user:profiles!comments_user_profile_fkey(id, username, avatar_url)"
        )
        .eq("event_id", event.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching comments:", error);
        setComments([]);
      } else if (data) {
        const formatted = data.map((c) => ({
          ...c,
          likes_count: 0,
          is_liked_by_user: false,
        }));
        setComments(formatted as unknown as CommentWithExtras[]);
      }
    } catch (err) {
      console.error("Fetch comments failed:", err);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const toggleReplies = (commentId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  // --- 2. UPDATED: THE INSTAGRAM LOGIC (Auto-fill + Save Target) ---
  const handleReplyClick = (comment: CommentWithExtras) => {
    const targetUsername = comment.user?.username || "user";
    // A. INSTAGRAM STYLE: Auto-fill the text input
    setNewComment(`@${targetUsername} `);

    // B. SMART TARGETING: Remember this specific user object in the background
    setReplyTarget(comment);

    // C. DATABASE STRUCTURE: Keep the thread flat
    setActiveReplyId(comment.parent_comment_id || comment.id);

    inputRef.current?.focus();
  };

  // --- 3. UPDATED: SUBMIT LOGIC (Smart Notification Routing) ---
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    const content = newComment.trim();
    setNewComment("");

    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const optimisticComment: any = {
      id: tempId,
      event_id: event.id,
      user_id: user.id,
      content: content,
      created_at: new Date().toISOString(),
      parent_comment_id: activeReplyId,
      user: {
        id: user.id,
        username: user.username,
        avatar_url: user.avatar_url,
      },
    };

    setComments((prev) => [...prev, optimisticComment]);
    onCommentAdded();

    if (activeReplyId) {
      setExpandedComments((prev) => new Set(prev).add(activeReplyId));
    }

    setTimeout(
      () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );

    const { data: insertedData, error } = await supabase
      .from("comments")
      .insert([
        {
          event_id: event.id,
          user_id: user.id,
          content: content,
          parent_comment_id: activeReplyId,
        },
      ])
      .select("id")
      .single();

    if (error) {
      console.error(error);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
    } else if (insertedData) {
      setActiveReplyId(null);
      setReplyTarget(null); // Reset target

      // We will track who got a "Reply" alert so we don't send them a "Mention" alert too.
      const notifiedUserIds: string[] = [];

      // --- LOGIC A: HANDLE REPLIES (The Smart Target) ---
      if (replyTarget) {
        // Notify the specific person we clicked (User B), not the Main Commenter (User A)
        if (replyTarget.user_id !== user.id) {
          await notifyReply(
            { id: event.id, admin_id: event.admin_id, title: event.title },
            { id: user.id, username: user.username },
            content,
            replyTarget.user_id, // <--- Target the specific user
            insertedData.id
          );
          notifiedUserIds.push(replyTarget.user_id); // Add to exclusion list
        }
      } else {
        // --- LOGIC B: HANDLE MAIN COMMENT ---
        // If no reply target, it's a root comment. Notify Admin.
        if (event.admin_id && event.admin_id !== user.id) {
          await notifyComment(
            { id: event.id, admin_id: event.admin_id, title: event.title },
            { id: user.id, username: user.username },
            content,
            insertedData.id
          );
        }
      }

      // --- LOGIC C: HANDLE MENTIONS ---
      // Pass the exclusion list to prevent duplicates
      await notifyMentions(
        { id: event.id, admin_id: event.admin_id, title: event.title },
        { id: user.id, username: user.username },
        content,
        insertedData.id,
        notifiedUserIds // <--- The Deduplication Magic
      );
    }
  };

  const handleEditComment = async (commentId: string, newContent: string) => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, content: newContent } : c))
    );

    const { error } = await supabase
      .from("comments")
      .update({ content: newContent })
      .eq("id", commentId);

    if (error) {
      console.error("Failed to edit comment:", error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Delete this comment?")) return;
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    onCommentDeleted();
    await supabase.from("comments").delete().eq("id", commentId);
  };

  const repliesByParent = useMemo(() => {
    const map = new Map<string, CommentWithExtras[]>();
    comments.forEach((comment) => {
      if (comment.parent_comment_id) {
        const existing = map.get(comment.parent_comment_id) || [];
        map.set(comment.parent_comment_id, [...existing, comment]);
      }
    });
    return map;
  }, [comments]);

  const rootComments = comments.filter((c) => !c.parent_comment_id);
  const getReplies = (parentId: string) => repliesByParent.get(parentId) || [];

  const renderCommentRow = (comment: CommentWithExtras, isReply = false) => (
    <CommentItem
      key={comment.id}
      event={event}
      comment={comment}
      user={user}
      onDelete={handleDeleteComment}
      onEdit={handleEditComment}
      onReply={handleReplyClick}
      isReply={isReply}
    />
  );

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative w-full md:w-[480px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-[600px] animate-in slide-in-from-bottom-10 fade-in duration-300">
        {/* Header */}
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

        {/* List */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">No comments yet.</p>
            </div>
          ) : (
            rootComments.map((comment) => {
              const replies = getReplies(comment.id);
              const hasReplies = replies.length > 0;
              const isExpanded = expandedComments.has(comment.id);

              return (
                <div key={comment.id}>
                  {renderCommentRow(comment)}

                  {hasReplies && (
                    <div className="ml-14 mt-2 flex items-center">
                      <div className="w-8 h-[1px] bg-gray-300 mr-2"></div>
                      <button
                        onClick={() => toggleReplies(comment.id)}
                        className="text-[11px] font-semibold text-gray-500 hover:text-gray-800"
                      >
                        {isExpanded
                          ? "Hide replies"
                          : `View replies (${replies.length})`}
                      </button>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="mb-2">
                      {replies.map((reply) => renderCommentRow(reply, true))}
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 bg-white md:rounded-b-2xl">
          {activeReplyId && (
            <div className="text-xs text-gray-400 mb-2 ml-4 flex justify-between items-center">
              <span>Replying to comment...</span>
              <button
                onClick={() => setActiveReplyId(null)}
                className="mr-2 hover:text-gray-600"
              >
                <X size={12} />
              </button>
            </div>
          )}
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
                ref={inputRef}
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

const formatRelativeTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 2629746) {
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  }
  if (diffInSeconds >= 31556952) {
    return `${Math.floor(diffInSeconds / 31556952)}y`;
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// --- Individual Comment Item Component ---

interface CommentItemProps {
  event: OutreachEvent;
  comment: CommentWithExtras;
  user: any;
  onDelete: (id: string) => void;
  onReply: (comment: CommentWithExtras) => void;
  onEdit: (id: string, newContent: string) => void;
  isReply?: boolean;
}

function CommentItem({
  event,
  comment,
  user,
  onDelete,
  onReply,
  onEdit,
  isReply = false,
}: CommentItemProps) {
  const [likesCount, setLikesCount] = useState(comment.likes_count || 0);
  const [isLiked, setIsLiked] = useState(comment.is_liked_by_user || false);
  const [isLiking, setIsLiking] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);

  useEffect(() => {
    fetchCommentLikes();
  }, [comment.id]);

  const fetchCommentLikes = async () => {
    try {
      const { count } = await supabase
        .from("comment_likes")
        .select("*", { count: "exact", head: true })
        .eq("comment_id", comment.id);

      setLikesCount(count || 0);

      if (user) {
        const { data } = await supabase
          .from("comment_likes")
          .select("id")
          .eq("comment_id", comment.id)
          .eq("user_id", user.id)
          .maybeSingle();
        setIsLiked(!!data);
      }
    } catch (err) {
      console.error("Error fetching comment likes:", err);
    }
  };

  const toggleCommentLike = async () => {
    if (!user || isLiking) return;

    setIsLiking(true);
    const previousLiked = isLiked;
    const previousCount = likesCount;

    setIsLiked(!isLiked);
    setLikesCount(previousLiked ? likesCount - 1 : likesCount + 1);

    try {
      if (previousLiked) {
        await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", comment.id)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("comment_likes")
          .insert([{ comment_id: comment.id, user_id: user.id }]);

        // 9. UPDATE: Pass comment ID to notification
        if (comment.user_id !== user.id) {
          await notifyCommentLike(
            { id: event.id, admin_id: event.admin_id, title: event.title },
            { id: user.id, username: user.username },
            comment.user_id,
            comment.content,
            comment.id // Pass ID
          );
        }
      }
    } catch (err) {
      console.error("Like error:", err);
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
    } finally {
      setIsLiking(false);
    }
  };

  const handleSaveEdit = () => {
    if (editContent.trim() !== "") {
      onEdit(comment.id, editContent);
      setIsEditing(false);
    }
  };

  return (
    // 10. UPDATE: Add ID to div for scrolling
    <div
      id={`comment-${comment.id}`}
      className={`flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300 ${
        isReply ? "ml-11 mt-3" : "mt-4"
      }`}
    >
      <img
        src={comment.user?.avatar_url || FailedImageIcon}
        alt="User"
        className={`${
          isReply ? "w-6 h-6" : "w-8 h-8"
        } rounded-full object-cover border border-gray-100 flex-shrink-0`}
      />
      <div className="flex-1 space-y-1">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="font-bold text-sm text-gray-900">
              {comment.user?.username || "Unknown"}
            </span>

            {isEditing ? (
              <div className="flex-1">
                <Input
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="h-8 text-sm"
                  autoFocus
                />
                <div className="flex gap-2 mt-1">
                  <span
                    onClick={handleSaveEdit}
                    className="text-[10px] font-bold text-blue-600 cursor-pointer hover:underline"
                  >
                    Save
                  </span>
                  <span
                    onClick={() => {
                      setIsEditing(false);
                      setEditContent(comment.content);
                    }}
                    className="text-[10px] text-gray-500 cursor-pointer hover:underline"
                  >
                    Cancel
                  </span>
                </div>
              </div>
            ) : (
              <span className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                {comment.content}
              </span>
            )}
          </div>
        </div>

        {!isEditing && (
          <div className="flex items-center gap-4 px-1 mt-1">
            <span className="text-[10px] text-gray-400 font-medium">
              {formatRelativeTime(comment.created_at)}
            </span>

            <button
              onClick={toggleCommentLike}
              disabled={isLiking}
              className="flex items-center gap-1 group/like disabled:opacity-50"
            >
              <Heart
                size={12}
                className={`transition-colors ${
                  isLiked
                    ? "fill-red-500 text-red-500"
                    : "text-gray-400 group-hover/like:text-red-500"
                }`}
              />
              <span className="text-[10px] text-gray-500 font-semibold">
                {likesCount}
              </span>
            </button>

            <button
              onClick={() => onReply(comment)}
              className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-blue-600 font-semibold transition-colors"
            >
              <Reply size={10} /> Reply
            </button>

            {(user?.id === comment.user_id || user?.role === "admin") && (
              <DropdownMenu>
                <DropdownMenuTrigger className="focus:outline-none opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity">
                  <MoreHorizontal
                    size={14}
                    className="text-gray-400 hover:text-gray-700 transition-colors"
                  />
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="start"
                  className="w-32 z-[100] bg-white"
                >
                  {user?.id === comment.user_id && (
                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                      <Edit size={12} className="mr-2" />
                      <span className="text-xs">Edit</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    onClick={() => onDelete(comment.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 size={12} className="mr-2" />
                    <span className="text-xs">Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
