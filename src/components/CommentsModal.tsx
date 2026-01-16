import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabaseClient";
import { LikesListModal } from "@/components/LikesListModal";
import { notifyReply, notifyMentions } from "@/lib/NotificationService";
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
  ChevronLeft,
  ChevronRight,
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

interface CommentWithExtras extends Comment {
  reply_count?: number;
  likes_count?: number;
  is_liked_by_user?: boolean;
  parent_comment_id: string | null;
  updated_at?: string;
}

interface CommentsModalProps {
  event: OutreachEvent;
  user: any;
  onClose: () => void;
  onCommentChange: () => void; // Combined refresh trigger
  highlightId?: string | null;
  customUsername?: string;
  customAvatar?: string;
  isLiked?: boolean;
  likesCount?: number;
  onToggleLike?: () => void;
  commentsCount?: number;
}

export function CommentsModal({
  event,
  user,
  onClose,
  onCommentChange,
  highlightId,
  customUsername,
  customAvatar,
  isLiked,
  likesCount,
  onToggleLike,
  commentsCount,
}: CommentsModalProps) {
  const [comments, setComments] = useState<CommentWithExtras[]>([]);
  const [newComment, setNewComment] = useState("");
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<CommentWithExtras | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(
    new Set()
  );
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentToDelete, setCommentToDelete] = useState<string | null>(null);
  const [fetchedAuthor, setFetchedAuthor] = useState<any>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const commentsTopRef = useRef<HTMLDivElement>(null);

  // --- Helpers ---
  const getEmbeddedProfile = () => {
    const p = (event as any).profiles;
    if (Array.isArray(p) && p.length > 0) return p[0];
    if (p && typeof p === "object") return p;
    return null;
  };

  const embeddedProfile = getEmbeddedProfile();
  const displayName =
    customUsername ||
    embeddedProfile?.username ||
    fetchedAuthor?.username ||
    null;
  const displayAvatar =
    customAvatar ||
    embeddedProfile?.avatar_url ||
    fetchedAuthor?.avatar_url ||
    null;

  const images =
    event.images && event.images.length > 0
      ? event.images
      : (event as any).image_url
      ? [(event as any).image_url]
      : [];

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => Math.min(prev + 1, images.length - 1));
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => Math.max(prev - 1, 0));
  };

  // --- Fetching Logic ---
  const fetchComments = async () => {
    setLoading(true);
    try {
      let dataToProcess: any[] | null = null;

      const { data, error } = await supabase
        .from("comments")
        .select(
          "*, user:profiles!comments_user_profile_fkey(id, username, avatar_url)"
        )
        .eq("event_id", event.id)
        .order("created_at", { ascending: true });

      if (error) {
        // Fallback for implicit join
        const { data: retryData, error: retryError } = await supabase
          .from("comments")
          .select("*, user:profiles(id, username, avatar_url)")
          .eq("event_id", event.id)
          .order("created_at", { ascending: true });

        if (retryError) throw retryError;
        dataToProcess = retryData;
      } else {
        dataToProcess = data;
      }

      if (dataToProcess) {
        const formatted = dataToProcess.map((c) => ({
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

  useEffect(() => {
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    if (!customUsername && !getEmbeddedProfile() && event.admin_id) {
      supabase
        .from("profiles")
        .select("username, avatar_url")
        .eq("id", event.admin_id)
        .single()
        .then(({ data }) => data && setFetchedAuthor(data));
    }

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
            likes_count: 0,
            is_liked_by_user: false,
          } as CommentWithExtras;
          setComments((prev) => [...prev, newMsg]);
          onCommentChange();
        }
      )
      .subscribe();

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.body.style.overflow = originalBodyOverflow;
      supabase.removeChannel(channel);
    };
  }, [event.id]);

  useEffect(() => {
    if (!loading) {
      if (highlightId && comments.length > 0) {
        setTimeout(() => {
          const element = document.getElementById(`comment-${highlightId}`);
          if (element) {
            const comment = comments.find((c) => c.id === highlightId);
            if (comment?.parent_comment_id) {
              setExpandedComments((prev) =>
                new Set(prev).add(comment.parent_comment_id!)
              );
            }
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add(
              "bg-blue-50",
              "ring-2",
              "ring-blue-100",
              "rounded-lg"
            );
            setTimeout(() => {
              element.classList.remove(
                "bg-blue-50",
                "ring-2",
                "ring-blue-100",
                "rounded-lg"
              );
              element.classList.add("transition-all", "duration-1000");
            }, 3000);
          }
        }, 300);
      } else {
        setTimeout(() => {
          if (commentsTopRef.current) {
            commentsTopRef.current.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }
        }, 300);
      }
    }
  }, [loading, highlightId]);

  useEffect(() => {
    if (activeReplyId && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeReplyId]);

  const toggleReplies = (commentId: string) => {
    setExpandedComments((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) next.delete(commentId);
      else next.add(commentId);
      return next;
    });
  };

  const handleReplyClick = (comment: CommentWithExtras) => {
    const targetUsername = comment.user?.username || "user";
    setNewComment(`@${targetUsername} `);
    setReplyTarget(comment);
    setActiveReplyId(comment.parent_comment_id || comment.id);
    inputRef.current?.focus();
  };

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
      likes_count: 0,
      is_liked_by_user: false,
    };

    setComments((prev) => [...prev, optimisticComment]);
    onCommentChange();

    if (activeReplyId) {
      setExpandedComments((prev) => {
        const next = new Set(prev);
        next.add(activeReplyId);
        return next;
      });
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
      .select("id, created_at")
      .single();

    if (error) {
      console.error(error);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
    } else if (insertedData) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === tempId
            ? { ...c, id: insertedData.id, created_at: insertedData.created_at }
            : c
        )
      );

      setActiveReplyId(null);
      setReplyTarget(null);

      const notifiedUserIds: string[] = [];
      if (replyTarget) {
        if (replyTarget.user_id !== user.id) {
          await notifyReply(
            { id: event.id, admin_id: event.admin_id, title: event.title },
            { id: user.id, username: user.username },
            content,
            replyTarget.user_id,
            insertedData.id
          );
          notifiedUserIds.push(replyTarget.user_id);
        }
      }

      await notifyMentions(
        { id: event.id, admin_id: event.admin_id, title: event.title },
        { id: user.id, username: user.username },
        content,
        insertedData.id,
        notifiedUserIds
      );
    }
  };

  const handleEditComment = async (commentId: string, newContent: string) => {
    const newTime = new Date().toISOString();
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, content: newContent, updated_at: newTime }
          : c
      )
    );

    await supabase
      .from("comments")
      .update({ content: newContent, updated_at: newTime })
      .eq("id", commentId);
  };

  const requestDelete = (commentId: string) => {
    setCommentToDelete(commentId);
  };

  const confirmDelete = async () => {
    if (!commentToDelete) return;
    const commentId = commentToDelete;

    setComments((prev) => prev.filter((c) => c.id !== commentId));
    onCommentChange();
    setCommentToDelete(null);

    if (commentId.startsWith("temp-")) return;

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
      onDelete={requestDelete}
      onEdit={handleEditComment}
      onReply={handleReplyClick}
      isReply={isReply}
    />
  );

  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 0) return "0s";
    if (diffInSeconds < 2629746) {
      if (diffInSeconds < 60) return `${diffInSeconds}s`;
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
      if (diffInSeconds < 604800)
        return `${Math.floor(diffInSeconds / 86400)}d`;
      return `${Math.floor(diffInSeconds / 604800)}w`;
    }
    if (diffInSeconds >= 31556952)
      return `${Math.floor(diffInSeconds / 31556952)}y`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return createPortal(
    <div className="fixed inset-0 z-60 flex items-end justify-center md:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative w-full md:w-650px bg-white rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-[90vh] animate-in slide-in-from-bottom-10 fade-in duration-300">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div className="w-8" />
          {displayName ? (
            <h3 className="font-bold text-gray-900">{displayName}'s Post</h3>
          ) : (
            <div className="h-6 w-32 bg-gray-200 animate-pulse rounded" />
          )}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="hidden md:block p-5 border-b border-gray-100 bg-white">
            <div className="flex items-center gap-3 mb-4">
              {displayAvatar ? (
                <img
                  src={displayAvatar}
                  alt={displayName || "User"}
                  className="w-10 h-10 rounded-full object-cover border border-gray-100"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-200 animate-pulse rounded-full" />
              )}
              <div className="flex flex-col leading-tight">
                {displayName ? (
                  <span className="font-bold text-gray-900">{displayName}</span>
                ) : (
                  <div className="h-4 w-24 bg-gray-200 animate-pulse rounded mb-1" />
                )}
                <span className="text-xs text-gray-500">
                  {formatRelativeTime(event.created_at)}
                </span>
              </div>
            </div>

            {event.description && (
              <div className="mb-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                {event.title && (
                  <h4 className="font-bold text-lg mb-2">{event.title}</h4>
                )}
                {event.description}
              </div>
            )}

            {images.length > 0 && (
              <div className="relative rounded-xl overflow-hidden border border-gray-100 bg-gray-50 mb-4 group/carousel">
                <img
                  src={images[currentImageIndex]}
                  alt="Post content"
                  className="w-full h-auto max-h-[400px] object-cover"
                />
                {images.length > 1 && (
                  <>
                    {currentImageIndex > 0 && (
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity"
                      >
                        <ChevronLeft size={20} />
                      </button>
                    )}
                    {currentImageIndex < images.length - 1 && (
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity"
                      >
                        <ChevronRight size={20} />
                      </button>
                    )}
                    <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                      {images.map((_, idx) => (
                        <div
                          key={idx}
                          className={`w-1.5 h-1.5 rounded-full shadow-sm transition-all ${
                            idx === currentImageIndex
                              ? "bg-white scale-125"
                              : "bg-white/50"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex items-center gap-6 pt-2 border-t border-gray-50">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onToggleLike}
                  className="flex items-center group transition-all"
                >
                  <Heart
                    className={`w-6 h-6 transition-transform group-active:scale-90 ${
                      isLiked
                        ? "fill-red-500 text-red-500"
                        : "text-gray-900 hover:text-gray-600"
                    }`}
                    strokeWidth={isLiked ? 0 : 2}
                  />
                </button>
                {likesCount && likesCount > 0 ? (
                  <span className="text-sm font-bold text-gray-900">
                    {likesCount}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-gray-900">Like</span>
                )}
              </div>
              <button
                onClick={() => inputRef.current?.focus()}
                className="flex items-center gap-1.5 group transition-all"
              >
                <MessageCircle
                  className="w-6 h-6 text-gray-900 hover:text-gray-600"
                  strokeWidth={2}
                />
                <span className="text-sm font-bold text-gray-900">
                  {commentsCount && commentsCount > 0 ? `${commentsCount}` : ""}
                </span>
              </button>
            </div>
          </div>

          <div ref={commentsTopRef} className="p-4 bg-gray-50/50 min-h-[200px]">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : comments.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-sm">
                  No comments yet. Be the first to say something!
                </p>
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
                        <div className="w-8 h-[1px] bg-gray-300 mr-2" />
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
        </div>

        <div className="p-4 border-t border-gray-100 bg-white md:rounded-b-2xl shrink-0 z-10">
          {activeReplyId && (
            <div className="text-xs text-gray-400 mb-2 ml-4 flex justify-between items-center">
              <span>
                Replying to {replyTarget?.user?.username || "comment"}...
              </span>
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
                placeholder="Write a comment..."
                className="bg-gray-100 border-transparent focus:border-blue-200 focus:bg-white rounded-full h-10 pl-4 pr-12 transition-all"
                autoFocus={!loading}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!newComment.trim()}
                className="absolute right-1 top-0.5 h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-sm"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </Button>
            </div>
          </form>
        </div>
      </div>

      {commentToDelete && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setCommentToDelete(null)}
          />
          <div className="relative bg-white rounded-lg shadow-xl max-w-sm w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex flex-col gap-2 mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Comment?
              </h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to delete this comment? This cannot be
                undone.
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setCommentToDelete(null)}
                className="h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDelete}
                className="h-9 px-4 bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

// --- Individual Comment Component (Restored) ---

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
  const [showLikesModal, setShowLikesModal] = useState(false);

  const isEdited =
    comment.updated_at && comment.updated_at !== comment.created_at;

  useEffect(() => {
    fetchCommentLikes();
  }, [comment.id]);

  const fetchCommentLikes = async () => {
    if (!comment.id || comment.id.startsWith("temp-")) return;
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

  const renderContentWithTags = (text: string) => {
    if (!text) return "";
    const parts = text.split(/(@[\w.-]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith("@")) {
        return (
          <span
            key={i}
            className="inline-block bg-blue-100 text-blue-700 font-semibold px-1.5 py-0.5 rounded-md mx-0.5 text-[11px]"
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 0) return "0s";
    if (diffInSeconds < 2629746) {
      if (diffInSeconds < 60) return `${diffInSeconds}s`;
      if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
      if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
      if (diffInSeconds < 604800)
        return `${Math.floor(diffInSeconds / 86400)}d`;
      return `${Math.floor(diffInSeconds / 604800)}w`;
    }
    if (diffInSeconds >= 31556952)
      return `${Math.floor(diffInSeconds / 31556952)}y`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <>
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
                  {renderContentWithTags(comment.content)}
                </span>
              )}
            </div>
          </div>

          {!isEditing && (
            <div className="flex items-center gap-4 px-1 mt-1">
              <span className="text-[10px] text-gray-400 font-medium">
                {formatRelativeTime(comment.created_at)}
                {isEdited && <span className="ml-1 italic"> (edited)</span>}
              </span>

              <div className="flex items-center gap-1 group/like">
                <button
                  onClick={toggleCommentLike}
                  disabled={isLiking}
                  className="flex items-center disabled:opacity-50"
                >
                  <Heart
                    size={12}
                    className={`transition-colors ${
                      isLiked
                        ? "fill-red-500 text-red-500"
                        : "text-gray-400 group-hover/like:text-red-500"
                    }`}
                  />
                </button>
                <button
                  onClick={() => likesCount > 0 && setShowLikesModal(true)}
                  disabled={likesCount === 0}
                  className={`text-[10px] font-semibold ${
                    likesCount > 0
                      ? "text-gray-500 hover:text-gray-900 hover:underline cursor-pointer"
                      : "text-gray-400 cursor-default"
                  }`}
                >
                  {likesCount}
                </button>
              </div>

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
      <LikesListModal
        isOpen={showLikesModal}
        onClose={() => setShowLikesModal(false)}
        targetId={comment.id}
        type="comment"
      />
    </>
  );
}
