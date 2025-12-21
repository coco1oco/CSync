// React core imports
import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";

// Supabase and authentication
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";

// Component imports
import { EventCard } from "@/components/EventCard";
import { EventRegistrationModal } from "@/components/EventRegistrationModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Type definitions
import type { OutreachEvent, Comment } from "@/types";

// Services and utilities
import { notifyLike, notifyComment, notifyCommentLike, notifyCommentReply, parseMentions, notifyMentions } from "@/lib/NotificationService";
import { formatRelativeTime } from "@/lib/utils";

// Icons and assets
import { Heart, MessageCircle, Send, Loader2, X, Trash2 } from "lucide-react";
import FailedImageIcon from "@/assets/FailedImage.svg";

// Constants
const MAX_COMMENT_LENGTH = 1000;
const COMMENTS_PER_PAGE = 50;

// Props interface for FeedPost component
interface FeedPostProps {
  event: OutreachEvent & {
    likes?: { count: number }[]; // Initial likes count from parent
    comments?: { count: number }[]; // Initial comments count from parent
  };
  isAdmin: boolean; // Whether current user is admin
  onDelete: () => void; // Callback when post is deleted
  onEdit: () => void; // Callback when post is edited
  onTagClick?: (tag: string) => void; // Optional callback for tag clicks
  autoOpenComments?: boolean; // Auto-open comments modal on mount
}

/**
 * FeedPost Component
 * Displays a social media-style post for outreach events with like/comment functionality
 */
export function FeedPost({ event, isAdmin, onDelete, onEdit, onTagClick, autoOpenComments }: FeedPostProps) {
  const { user } = useAuth();

  // Initialize with passed data to prevent "0" flash on initial render
  const [likesCount, setLikesCount] = useState(event.likes?.[0]?.count || 0);
  const [commentsCount, setCommentsCount] = useState(event.comments?.[0]?.count || 0);
  const [isLiked, setIsLiked] = useState(false); // Whether current user liked this post
  
  // Modal states
  const [isCommentsOpen, setIsCommentsOpen] = useState(autoOpenComments || false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  // Auto-open comments if prop is set
  useEffect(() => {
    if (autoOpenComments) {
      setIsCommentsOpen(true);
    }
  }, [autoOpenComments]);

  // Fetch initial data on mount
  useEffect(() => {
    fetchLikes().catch((err) => console.error('Error in fetchLikes:', err));
    fetchCommentsCount().catch((err) => console.error('Error in fetchCommentsCount:', err));
    checkRegistration().catch((err) => console.error('Error in checkRegistration:', err));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, user]); // Added dependencies to fix exhaustive-deps warning

  // Fetch total likes count and check if current user liked this post
  const fetchLikes = async () => {
    try {
      // Get total likes count (head: true = count only, no data)
      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);
      
      if (count !== null) setLikesCount(count);

      // Check if current user has liked this post
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
      console.error("Failed to fetch likes", err);
    }
  };

  /**
   * Toggle like with optimistic UI update for better UX
   * Updates UI immediately, then syncs with database
   * Rolls back on error
   */
  const toggleLike = async () => {
    if (!user) return;
    const previousLiked = isLiked;
    const previousCount = likesCount;

    // Optimistic update: Update UI immediately before API call
    setIsLiked(!isLiked);
    setLikesCount(isLiked ? likesCount - 1 : likesCount + 1);

    try {
      if (previousLiked) {
        // Unlike: Remove like from database
        await supabase
          .from("likes")
          .delete()
          .eq("event_id", event.id)
          .eq("user_id", user.id);
      } else {
        // Like: Add like to database
        await supabase
          .from("likes")
          .insert([{ event_id: event.id, user_id: user.id }]);

        // Notify post owner (if not self-like)
        if (event.admin_id && event.admin_id !== user.id) {
          await notifyLike(
            { id: event.id, admin_id: event.admin_id, title: event.title },
            { id: user.id, username: user.username }
          );
        }
      }
    } catch (err) {
      console.error("Like failed", err);
      // Rollback optimistic update on error
      setIsLiked(previousLiked);
      setLikesCount(previousCount);
    }
  };

  // Fetch total comments count for this post
  const fetchCommentsCount = async () => {
    try {
      const { count } = await supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("event_id", event.id);
      if (count !== null) setCommentsCount(count);
    } catch (err) {
      console.error("Failed to fetch comments count", err);
    }
  };

  // Check if current user is registered for this event
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
      console.error("Failed to check registration", err);
    }
  };

  return (
    <>
      <div className="mb-4">
        <EventCard
          event={event}
          isAdmin={isAdmin}
          onEdit={onEdit}
          onDelete={onDelete}
          onTagClick={onTagClick}
        >
          {/* Action bar with like and comment buttons */}
          <div className="flex items-center justify-between mb-2">
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

      </div>

      {/* Comments modal - conditionally rendered */}
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

      {/* Event registration modal - conditionally rendered */}
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

/**
 * Comments Modal Component
 * Full-screen modal for viewing and posting comments on an event
 */
interface CommentsModalProps {
  event: OutreachEvent; // Event being commented on
  user: any; // Current authenticated user (TODO: type this properly)
  onClose: () => void; // Callback to close modal
  onCommentAdded: () => void; // Callback when comment is added
  onCommentDeleted: () => void; // Callback when comment is deleted
}

function CommentsModal({
  event,
  user,
  onClose,
  onCommentAdded,
  onCommentDeleted,
}: CommentsModalProps) {
  // State management
  const [comments, setComments] = useState<Comment[]>([]); // List of comments
  const [newComment, setNewComment] = useState(""); // Input field value
  const [loading, setLoading] = useState(true); // Loading state for initial fetch
  const [isSubmitting, setIsSubmitting] = useState(false); // Prevent double submission
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // ID of comment being replied to
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set()); // IDs of comments with visible replies
  const [repliesData, setRepliesData] = useState<Record<string, Comment[]>>({}); // Replies for each comment
  const [editingComment, setEditingComment] = useState<string | null>(null); // ID of comment being edited
  const [editContent, setEditContent] = useState(""); // Content being edited
  const [page, setPage] = useState(1); // Current page for pagination
  const [hasMore, setHasMore] = useState(true); // Whether more comments exist
  const [loadingReplies, setLoadingReplies] = useState<Set<string>>(new Set()); // Loading state for replies
  const [loadingMore, setLoadingMore] = useState(false); // Loading state for load more
  const bottomRef = useRef<HTMLDivElement>(null); // Ref for auto-scroll to bottom

  // Fetch comments on mount and manage body scroll
  useEffect(() => {
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    const fetchComments = async () => {
      setLoading(true);

      try {
        // Fetch comments with user profile data, likes count, and replies count
        let query = supabase
          .from("comments")
          .select(`
            *,
            user:profiles(id, username, avatar_url),
            likes:comment_likes(count),
            replies:comments!parent_comment_id(count)
          `)
          .eq("event_id", event.id)
          .is("parent_comment_id", null) // Only get top-level comments
          .order("created_at", { ascending: true })
          .range((page - 1) * COMMENTS_PER_PAGE, page * COMMENTS_PER_PAGE - 1); // Pagination

        const { data: commentsData, error: commentsError } = await query;

        if (commentsError) {
          console.error("Error fetching comments:", commentsError);
          return;
        }
        
        if (commentsData) {
          setHasMore(commentsData.length === COMMENTS_PER_PAGE); // Has more if we got full page
          
          // Fetch user's likes separately if user is logged in
          if (user) {
            const commentIds = commentsData.map((c: any) => c.id);
            const { data: userLikes } = await supabase
              .from("comment_likes")
              .select("comment_id")
              .in("comment_id", commentIds)
              .eq("user_id", user.id);

            const likedCommentIds = new Set(userLikes?.map(l => l.comment_id) || []);
            
            // Add user's like status to each comment
            const commentsWithLikes = commentsData.map((comment: any) => ({
              ...comment,
              comment_likes: likedCommentIds.has(comment.id) 
                ? [{ id: 'temp', comment_id: comment.id, user_id: user.id, created_at: new Date().toISOString() }]
                : []
            }));
            
            if (page === 1) {
              setComments(commentsWithLikes as unknown as Comment[]);
            } else {
              setComments(prev => [...prev, ...commentsWithLikes as unknown as Comment[]]);
            }
          } else {
            if (page === 1) {
              setComments(commentsData as unknown as Comment[]);
            } else {
              setComments(prev => [...prev, ...commentsData as unknown as Comment[]]);
            }
          }
          
          // Auto-scroll to bottom after comments load (only on initial load)
          if (page === 1) {
            setTimeout(() => bottomRef.current?.scrollIntoView(), 100);
          }
        }
      } catch (err) {
        console.error("Failed to fetch comments", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchComments();
    
    // Set up real-time subscriptions
    const commentsSubscription = supabase
      .channel(`comments:${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `event_id=eq.${event.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (payload.new.user_id === user?.id) return; // Skip own messages
            
            // Only add to list if we're on page 1 (to avoid pagination issues)
            if (page !== 1) return;

            // Fetch the new comment/reply with user data
            supabase
              .from('comments')
              .select(`
                *,
                user:profiles(id, username, avatar_url),
                likes:comment_likes(count),
                replies:comments!parent_comment_id(count)
              `)
              .eq('id', payload.new.id)
              .single()
              .then(({ data }) => {
                if (!data) return;

                if (!payload.new.parent_comment_id) {
                  // New top-level comment
                  setComments(prev => [...prev, data as any]);
                } else {
                  // New reply - update replies data and count
                  setRepliesData(prev => ({
                    ...prev,
                    [payload.new.parent_comment_id]: [
                      ...(prev[payload.new.parent_comment_id] || []),
                      data as any
                    ]
                  }));
                  setComments(prev => prev.map(c =>
                    c.id === payload.new.parent_comment_id
                      ? { ...c, replies: [{ count: (c.replies?.[0]?.count || 0) + 1 }] }
                      : c
                  ));
                }
              });
          } else if (payload.eventType === 'DELETE') {
            // Handle deletion
            setComments(prev => prev.filter(c => c.id !== payload.old.id));
            // Remove from replies data too
            setRepliesData(prev => {
              const newData = { ...prev };
              Object.keys(newData).forEach(parentId => {
                const filtered = newData[parentId].filter(r => r.id !== payload.old.id);
                if (filtered.length !== newData[parentId].length) {
                  newData[parentId] = filtered;
                  // Update parent reply count
                  setComments(prevComments => prevComments.map(c =>
                    c.id === parentId
                      ? { ...c, replies: [{ count: Math.max(0, (c.replies?.[0]?.count || 0) - 1) }] }
                      : c
                  ));
                }
              });
              return newData;
            });
          } else if (payload.eventType === 'UPDATE') {
            // Handle edit
            setComments(prev => prev.map(c => 
              c.id === payload.new.id ? { ...c, content: payload.new.content } : c
            ));
            setRepliesData(prev => {
              const newData = { ...prev };
              Object.keys(newData).forEach(parentId => {
                newData[parentId] = newData[parentId].map(r =>
                  r.id === payload.new.id ? { ...r, content: payload.new.content } : r
                );
              });
              return newData;
            });
          }
        }
      )
      .subscribe();

    // Subscribe to comment likes for real-time like count updates
    const likesSubscription = supabase
      .channel(`comment_likes:${event.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_likes',
        },
        async (payload) => {
          const commentId = (payload.new as any)?.comment_id || (payload.old as any)?.comment_id;
          if (!commentId) return;

          // Fetch updated like count
          const { count } = await supabase
            .from('comment_likes')
            .select('*', { count: 'exact', head: true })
            .eq('comment_id', commentId);

          // Update comments
          setComments(prev => prev.map(c =>
            c.id === commentId ? { ...c, likes: [{ count: count || 0 }] } : c
          ));

          // Update replies
          setRepliesData(prev => {
            const newData = { ...prev };
            Object.keys(newData).forEach(parentId => {
              newData[parentId] = newData[parentId].map(r =>
                r.id === commentId ? { ...r, likes: [{ count: count || 0 }] } : r
              );
            });
            return newData;
          });
        }
      )
      .subscribe();

    // Cleanup: Restore body scroll and unsubscribe
    return () => {
      document.body.style.overflow = "unset";
      commentsSubscription.unsubscribe();
      likesSubscription.unsubscribe();
    };
  }, [event.id, page, user]); // Added page dependency

  /**
   * Post a new comment or reply
   * Validates input, submits to database, updates UI, and sends notification
   */
  const handlePostComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    // Validation: Check for empty comment, user authentication, and prevent double submission
    if (!newComment.trim() || !user || isSubmitting) return;
    
    // Validate length
    if (newComment.trim().length > MAX_COMMENT_LENGTH) {
      alert(`Comment is too long. Maximum ${MAX_COMMENT_LENGTH} characters allowed.`);
      return;
    }
    
    const content = newComment.trim();
    const mentions = parseMentions(content);
    setIsSubmitting(true);

    // Store previous state for rollback
    const previousComments = [...comments];
    const previousRepliesData = { ...repliesData };
    let parentCommentOwnerId: string | undefined;

    try {
      // Optimistic update for replies
      if (replyingTo) {
        const parentComment = comments.find(c => c.id === replyingTo);
        parentCommentOwnerId = parentComment?.user_id;
        
        setComments((prev) =>
          prev.map((c) =>
            c.id === replyingTo
              ? {
                  ...c,
                  replies: [{ count: (c.replies?.[0]?.count || 0) + 1 }],
                }
              : c
          )
        );
      }

      // Insert comment and return with user profile data
      const { data, error } = await supabase
        .from("comments")
        .insert({
          event_id: event.id,
          user_id: user.id,
          content: content,
          parent_comment_id: replyingTo, // null for top-level comments
        })
        .select(`
          *,
          user:profiles(id, username, avatar_url),
          likes:comment_likes(count),
          replies:comments!parent_comment_id(count)
        `)
        .single();

      if (error) throw error;

      if (data) {
        if (replyingTo) {
          // Add reply to replies data
          setRepliesData(prev => ({
            ...prev,
            [replyingTo]: [...(prev[replyingTo] || []), data as any]
          }));
          
          // Send notification to parent comment owner
          if (parentCommentOwnerId && parentCommentOwnerId !== user.id) {
            const preview = content.slice(0, 120);
            await notifyCommentReply(
              parentCommentOwnerId,
              { id: user.id, username: user.username },
              data.id,
              preview
            );
          }
          
          // Send mention notifications (excluding parent comment owner)
          if (mentions.length > 0) {
            await notifyMentions(
              mentions,
              { id: user.id, username: user.username },
              data.id,
              content,
              parentCommentOwnerId
            );
          }
          
          setReplyingTo(null); // Clear reply mode
        } else {
          // Add new top-level comment to local state
          setComments((prev) => [...prev, data as any]);
          onCommentAdded();
          
          // Send mention notifications for top-level comment
          if (mentions.length > 0) {
            await notifyMentions(
              mentions,
              { id: user.id, username: user.username },
              data.id,
              content,
              event.admin_id || undefined
            );
          }
        }
        
        setNewComment("");

        // Auto-scroll to new comment
        setTimeout(
          () => bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
          100
        );

        // Notify post owner (if not self-comment)
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
      
      // Rollback optimistic updates on error
      if (replyingTo) {
        setComments(previousComments);
        setRepliesData(previousRepliesData);
      }
      
      alert("Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [newComment, user, event.id, event.admin_id, event.title, onCommentAdded, replyingTo, comments, repliesData]);

  /**
   * Delete a comment (admin or comment owner only)
   * Shows confirmation dialog before deletion
   */
  const handleDeleteComment = async (commentId: string, parentCommentId?: string) => {
    // Confirmation dialog
    if (!confirm("Delete this comment?")) return;
    
    try {
      const { error } = await supabase
        .from("comments")
        .delete()
        .eq("id", commentId);

      if (!error) {
        if (parentCommentId) {
          // Deleting a reply - update replies data and count
          setRepliesData(prev => ({
            ...prev,
            [parentCommentId]: prev[parentCommentId]?.filter(r => r.id !== commentId) || []
          }));
          setComments(prev => prev.map(c =>
            c.id === parentCommentId
              ? { ...c, replies: [{ count: Math.max(0, (c.replies?.[0]?.count || 0) - 1) }] }
              : c
          ));
        } else {
          // Deleting top-level comment
          setComments((prev) => prev.filter((c) => c.id !== commentId));
          onCommentDeleted(); // Notify parent to update count
        }
      }
    } catch (err) {
      console.error("Delete comment failed", err);
    }
  };

  /**
   * Toggle like on a comment with optimistic UI update
   */
  const toggleCommentLike = async (commentId: string, isLiked: boolean, comment: Comment) => {
    if (!user) return;

    // Optimistic update
    setComments((prev) =>
      prev.map((c) => {
        if (c.id === commentId) {
          const currentCount = c.likes?.[0]?.count || 0;
          return {
            ...c,
            likes: [{ count: isLiked ? currentCount - 1 : currentCount + 1 }],
            comment_likes: isLiked ? [] : [{ id: 'temp', comment_id: commentId, user_id: user.id, created_at: new Date().toISOString() }],
          };
        }
        return c;
      })
    );

    // Update replies data too
    setRepliesData(prev => {
      const newRepliesData = { ...prev };
      Object.keys(newRepliesData).forEach(parentId => {
        newRepliesData[parentId] = newRepliesData[parentId].map(r => {
          if (r.id === commentId) {
            const currentCount = r.likes?.[0]?.count || 0;
            return {
              ...r,
              likes: [{ count: isLiked ? currentCount - 1 : currentCount + 1 }],
              comment_likes: isLiked ? [] : [{ id: 'temp', comment_id: commentId, user_id: user.id, created_at: new Date().toISOString() }],
            };
          }
          return r;
        });
      });
      return newRepliesData;
    });

    try {
      if (isLiked) {
        // Unlike
        await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", user.id);
      } else {
        // Like
        await supabase
          .from("comment_likes")
          .insert([{ comment_id: commentId, user_id: user.id }]);

        // Send notification to comment owner
        if (comment.user_id && comment.user_id !== user.id) {
          await notifyCommentLike(
            comment.user_id,
            { id: user.id, username: user.username },
            commentId,
            comment.content
          );
        }
      }
    } catch (err) {
      console.error("Comment like failed", err);
      // Revert optimistic update on error
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            const currentCount = c.likes?.[0]?.count || 0;
            return {
              ...c,
              likes: [{ count: isLiked ? currentCount + 1 : currentCount - 1 }],
              comment_likes: isLiked ? [{ id: 'temp', comment_id: commentId, user_id: user.id, created_at: new Date().toISOString() }] : [],
            };
          }
          return c;
        })
      );
    }
  };

  /**
   * Start replying to a comment or reply
   * For replies to replies, we still attach to the top-level comment
   */
  const startReply = (commentId: string, username: string) => {
    setReplyingTo(commentId);
    setNewComment(`@${username} `);
  };

  /**
   * Toggle viewing replies for a comment
   */
  const toggleReplies = async (commentId: string) => {
    const newExpanded = new Set(expandedReplies);
    
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId);
      setExpandedReplies(newExpanded);
    } else {
      newExpanded.add(commentId);
      setExpandedReplies(newExpanded);
      
      // Fetch replies if not already loaded (including nested replies)
      if (!repliesData[commentId]) {
        const newLoading = new Set(loadingReplies);
        newLoading.add(commentId);
        setLoadingReplies(newLoading);
        
        try {
          // First, get direct replies to this comment
          const { data, error } = await supabase
            .from("comments")
            .select(`
              *,
              user:profiles(id, username, avatar_url),
              likes:comment_likes(count),
              replies:comments!parent_comment_id(count)
            `)
            .eq("parent_comment_id", commentId)
            .order("created_at", { ascending: true });

          if (error) throw error;

          if (data && user) {
            // Fetch user's likes for replies
            const replyIds = data.map((r: any) => r.id);
            const { data: userLikes } = await supabase
              .from("comment_likes")
              .select("comment_id")
              .in("comment_id", replyIds)
              .eq("user_id", user.id);

            const likedReplyIds = new Set(userLikes?.map(l => l.comment_id) || []);
            
            const repliesWithLikes = data.map((reply: any) => ({
              ...reply,
              comment_likes: likedReplyIds.has(reply.id)
                ? [{ id: 'temp', comment_id: reply.id, user_id: user.id, created_at: new Date().toISOString() }]
                : [],
              nestedReplies: [] // Initialize for nested replies
            }));
            
            setRepliesData(prev => ({ ...prev, [commentId]: repliesWithLikes as any }));
          } else if (data) {
            const dataWithNested = data.map((reply: any) => ({
              ...reply,
              nestedReplies: []
            }));
            setRepliesData(prev => ({ ...prev, [commentId]: dataWithNested as any }));
          }
          
          // Scroll to the comment after replies load
          setTimeout(() => {
            document.getElementById(`comment-${commentId}`)?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'nearest' 
            });
          }, 100);
        } catch (err) {
          console.error("Failed to fetch replies", err);
        } finally {
          const newLoading = new Set(loadingReplies);
          newLoading.delete(commentId);
          setLoadingReplies(newLoading);
        }
      }
    }
  };

  /**
   * Start editing a comment
   */
  const startEdit = (commentId: string, content: string) => {
    setEditingComment(commentId);
    setEditContent(content);
  };

  /**
   * Save edited comment
   */
  const saveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;

    try {
      const { error } = await supabase
        .from("comments")
        .update({ content: editContent.trim() })
        .eq("id", commentId);

      if (error) throw error;

      // Update local state
      setComments(prev =>
        prev.map(c => (c.id === commentId ? { ...c, content: editContent.trim() } : c))
      );
      
      // Update replies data if editing a reply
      setRepliesData(prev => {
        const newRepliesData = { ...prev };
        Object.keys(newRepliesData).forEach(parentId => {
          newRepliesData[parentId] = newRepliesData[parentId].map(r =>
            r.id === commentId ? { ...r, content: editContent.trim() } : r
          );
        });
        return newRepliesData;
      });

      setEditingComment(null);
      setEditContent("");
    } catch (err) {
      console.error("Failed to edit comment", err);
    }
  };

  // Render modal using portal to avoid z-index issues
  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      {/* Backdrop overlay - click to close */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal content container */}
      <div className="relative w-full md:w-[480px] bg-white rounded-t-2xl md:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] md:max-h-[600px] animate-in slide-in-from-bottom-10 fade-in duration-300">
        {/* Modal header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 shrink-0">
          <div className="w-8" /> {/* Spacer for centering */}
          <div className="flex flex-col items-center">
            {/* Mobile drag indicator */}
            <div className="w-10 h-1 bg-gray-200 rounded-full md:hidden mb-2" />
            <h3 className="font-bold text-gray-900">Comments</h3>
          </div>
          {/* Close button */}
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Close comments"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        {/* Comments list - scrollable area */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
          {loading ? (
            // Loading spinner
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : comments.length === 0 ? (
            // Empty state
            <div className="text-center py-10 text-gray-400">
              <p className="text-sm">No comments yet.</p>
              <p className="text-xs">Start the conversation!</p>
            </div>
          ) : (
            // Comments list
            <>
              {comments.map((comment) => {
                const likesCount = comment.likes?.[0]?.count || 0;
                const repliesCount = comment.replies?.[0]?.count || 0;
                const isLiked = comment.comment_likes && comment.comment_likes.length > 0;
                const isExpanded = expandedReplies.has(comment.id);
                const isEditing = editingComment === comment.id;

                return (
                  <div key={comment.id} className="space-y-2">
                    <div
                      id={`comment-${comment.id}`}
                      className="flex gap-3 group animate-in fade-in slide-in-from-bottom-2 duration-300 scroll-mt-4"
                    >
                      {/* User avatar */}
                      <img
                        src={comment.user?.avatar_url || FailedImageIcon}
                        alt={`${comment.user?.username || 'User'} avatar`}
                        className="w-8 h-8 rounded-full object-cover border border-gray-100 flex-shrink-0"
                      />
                      <div className="flex-1 space-y-1">
                        {/* Comment bubble */}
                        {isEditing ? (
                          <div className="space-y-2">
                            <Input
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              className="bg-white border-blue-300"
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => saveEdit(comment.id)}
                                disabled={!editContent.trim()}
                              >
                                Save
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingComment(null);
                                  setEditContent("");
                                }}
                              >
                                Cancel
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-2xl rounded-tl-none px-3 py-2 inline-block max-w-full">
                            <span className="font-bold text-sm text-gray-900 mr-2">
                              {comment.user?.username || "Unknown"}
                            </span>
                            <span className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                              {comment.content}
                            </span>
                          </div>
                        )}
                        {/* Comment metadata and actions */}
                        {!isEditing && (
                          <div className="flex flex-col gap-1">
                            {/* Action buttons row */}
                            <div className="flex items-center gap-4 mt-1">
                              {/* Like button */}
                              <button
                                onClick={() => toggleCommentLike(comment.id, !!isLiked, comment)}
                                className="flex items-center gap-1.5 group/like transition-all focus:outline-none"
                                aria-label={isLiked ? "Unlike comment" : "Like comment"}
                              >
                                <Heart
                                  className={`w-5 h-5 transition-transform group-active/like:scale-90 ${
                                    isLiked
                                      ? "fill-red-500 text-red-500"
                                      : "text-gray-600 hover:text-gray-900"
                                  }`}
                                  strokeWidth={isLiked ? 0 : 2}
                                />
                                {likesCount > 0 && (
                                  <span className="text-xs font-semibold text-gray-700">
                                    {likesCount}
                                  </span>
                                )}
                              </button>
                              {/* Reply button */}
                              <button
                                onClick={() => startReply(comment.id, comment.user?.username || 'User')}
                                className="flex items-center gap-1.5 group/reply transition-all focus:outline-none"
                                aria-label="Reply to comment"
                              >
                                <MessageCircle className="w-5 h-5 text-gray-600 hover:text-gray-900 transition-colors" />
                              </button>
                              {/* View replies button */}
                              {repliesCount > 0 && (
                                <button
                                  onClick={() => toggleReplies(comment.id)}
                                  className="text-xs text-gray-500 hover:text-gray-700 font-semibold transition-colors flex items-center gap-1"
                                  disabled={loadingReplies.has(comment.id)}
                                >
                                  {loadingReplies.has(comment.id) ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      {isExpanded ? 'Hide' : 'View'} {repliesCount} {repliesCount === 1 ? 'reply' : 'replies'}
                                    </>
                                  )}
                                </button>
                              )}
                              {/* Edit button - only for comment owner */}
                              {user?.id === comment.user_id && (
                                <button
                                  onClick={() => startEdit(comment.id, comment.content)}
                                  className="text-xs text-gray-500 hover:text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                                  aria-label="Edit comment"
                                >
                                  Edit
                                </button>
                              )}
                              {/* Delete button - only visible to comment owner or admin */}
                              {(user?.id === comment.user_id || user?.role === "admin") && (
                                <button
                                  onClick={() => handleDeleteComment(comment.id)}
                                  className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                                  aria-label="Delete comment"
                                >
                                  <Trash2 size={12} />
                                </button>
                              )}
                            </div>
                            {/* Timestamp */}
                            <span className="text-[11px] text-gray-400 font-medium">
                              {formatRelativeTime(comment.created_at)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Nested replies */}
                    {isExpanded && repliesData[comment.id] && (
                      <div className="ml-11 space-y-3 border-l-2 border-gray-100 pl-3">
                        {repliesData[comment.id].length === 0 ? (
                          <div className="text-center py-4 text-gray-400 text-xs">
                            No replies yet
                          </div>
                        ) : (
                          repliesData[comment.id].map((reply) => {
                          const replyLikesCount = reply.likes?.[0]?.count || 0;
                          const replyRepliesCount = reply.replies?.[0]?.count || 0;
                          const isReplyLiked = reply.comment_likes && reply.comment_likes.length > 0;
                          const isEditingReply = editingComment === reply.id;
                          const isReplyExpanded = expandedReplies.has(reply.id);

                          return (
                            <div key={reply.id} className="space-y-2">
                            <div
                              id={`comment-${reply.id}`}
                              className="flex gap-3 group animate-in fade-in duration-200"
                            >
                              <img
                                src={reply.user?.avatar_url || FailedImageIcon}
                                alt={`${reply.user?.username || 'User'} avatar`}
                                className="w-7 h-7 rounded-full object-cover border border-gray-100 flex-shrink-0"
                              />
                              <div className="flex-1 space-y-1">
                                {isEditingReply ? (
                                  <div className="space-y-2">
                                    <Input
                                      value={editContent}
                                      onChange={(e) => setEditContent(e.target.value)}
                                      className="bg-white border-blue-300 text-sm"
                                      autoFocus
                                    />
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        onClick={() => saveEdit(reply.id)}
                                        disabled={!editContent.trim()}
                                      >
                                        Save
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingComment(null);
                                          setEditContent("");
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="bg-blue-50 rounded-2xl rounded-tl-none px-3 py-2 inline-block max-w-full">
                                    <span className="font-bold text-sm text-gray-900 mr-2">
                                      {reply.user?.username || "Unknown"}
                                    </span>
                                    <span className="text-sm text-gray-700 break-words whitespace-pre-wrap">
                                      {reply.content}
                                    </span>
                                  </div>
                                )}
                                {!isEditingReply && (
                                  <div className="flex flex-col gap-1">
                                    {/* Action buttons row */}
                                    <div className="flex items-center gap-4 mt-1">
                                      {/* Like button */}
                                      <button
                                        onClick={() => toggleCommentLike(reply.id, !!isReplyLiked, reply)}
                                        className="flex items-center gap-1.5 group/like transition-all focus:outline-none"
                                      >
                                        <Heart
                                          className={`w-4 h-4 transition-transform group-active/like:scale-90 ${
                                            isReplyLiked
                                              ? "fill-red-500 text-red-500"
                                              : "text-gray-600 hover:text-gray-900"
                                          }`}
                                          strokeWidth={isReplyLiked ? 0 : 2}
                                        />
                                        {replyLikesCount > 0 && (
                                          <span className="text-xs font-semibold text-gray-700">
                                            {replyLikesCount}
                                          </span>
                                        )}
                                      </button>
                                      {/* Reply button */}
                                      <button
                                        onClick={() => startReply(reply.id, reply.user?.username || 'User')}
                                        className="flex items-center gap-1.5 group/reply transition-all focus:outline-none"
                                      >
                                        <MessageCircle className="w-4 h-4 text-gray-600 hover:text-gray-900 transition-colors" />
                                      </button>
                                      {/* View nested replies button */}
                                      {replyRepliesCount > 0 && (
                                        <button
                                          onClick={() => toggleReplies(reply.id)}
                                          className="text-xs text-gray-500 hover:text-gray-700 font-semibold transition-colors flex items-center gap-1"
                                          disabled={loadingReplies.has(reply.id)}
                                        >
                                          {loadingReplies.has(reply.id) ? (
                                            <Loader2 className="w-3 h-3 animate-spin" />
                                          ) : (
                                            <>
                                              {isReplyExpanded ? '—' : '└'} {replyRepliesCount}
                                            </>
                                          )}
                                        </button>
                                      )}
                                      {/* Edit button */}
                                      {user?.id === reply.user_id && (
                                        <button
                                          onClick={() => startEdit(reply.id, reply.content)}
                                          className="text-xs text-gray-500 hover:text-blue-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity ml-auto"
                                        >
                                          Edit
                                        </button>
                                      )}
                                      {/* Delete button */}
                                      {(user?.id === reply.user_id || user?.role === "admin") && (
                                        <button
                                          onClick={() => handleDeleteComment(reply.id, comment.id)}
                                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                    </div>
                                    {/* Timestamp */}
                                    <span className="text-[11px] text-gray-400 font-medium">
                                      {formatRelativeTime(reply.created_at)}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Nested replies to this reply */}
                            {isReplyExpanded && repliesData[reply.id] && repliesData[reply.id].length > 0 && (
                              <div className="ml-8 mt-2 space-y-2 border-l border-gray-200 pl-3">
                                {repliesData[reply.id].map((nestedReply: any) => {
                                  const nestedLikesCount = nestedReply.likes?.[0]?.count || 0;
                                  const isNestedLiked = nestedReply.comment_likes && nestedReply.comment_likes.length > 0;
                                  const isEditingNested = editingComment === nestedReply.id;

                                  return (
                                    <div
                                      key={nestedReply.id}
                                      className="flex gap-2 group/nested animate-in fade-in duration-200"
                                    >
                                      <img
                                        src={nestedReply.user?.avatar_url || FailedImageIcon}
                                        alt={`${nestedReply.user?.username || 'User'} avatar`}
                                        className="w-6 h-6 rounded-full object-cover border border-gray-100 flex-shrink-0"
                                      />
                                      <div className="flex-1 space-y-1">
                                        {isEditingNested ? (
                                          <div className="space-y-2">
                                            <Input
                                              value={editContent}
                                              onChange={(e) => setEditContent(e.target.value)}
                                              className="bg-white border-blue-300 text-sm"
                                              autoFocus
                                            />
                                            <div className="flex gap-2">
                                              <Button
                                                size="sm"
                                                onClick={() => saveEdit(nestedReply.id)}
                                                disabled={!editContent.trim()}
                                              >
                                                Save
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                  setEditingComment(null);
                                                  setEditContent("");
                                                }}
                                              >
                                                Cancel
                                              </Button>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="bg-gray-50 rounded-xl rounded-tl-none px-2.5 py-1.5 inline-block max-w-full">
                                            <span className="font-bold text-xs text-gray-900 mr-1.5">
                                              {nestedReply.user?.username || "Unknown"}
                                            </span>
                                            <span className="text-xs text-gray-700 break-words whitespace-pre-wrap">
                                              {nestedReply.content}
                                            </span>
                                          </div>
                                        )}
                                        {!isEditingNested && (
                                          <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-3">
                                              <button
                                                onClick={() => toggleCommentLike(nestedReply.id, !!isNestedLiked, nestedReply)}
                                                className="flex items-center gap-1 group/like transition-all"
                                              >
                                                <Heart
                                                  className={`w-3.5 h-3.5 transition-transform group-active/like:scale-90 ${
                                                    isNestedLiked
                                                      ? "fill-red-500 text-red-500"
                                                      : "text-gray-600 hover:text-gray-900"
                                                  }`}
                                                  strokeWidth={isNestedLiked ? 0 : 2}
                                                />
                                                {nestedLikesCount > 0 && (
                                                  <span className="text-[11px] font-semibold text-gray-700">
                                                    {nestedLikesCount}
                                                  </span>
                                                )}
                                              </button>
                                              <button
                                                onClick={() => startReply(reply.id, nestedReply.user?.username || 'User')}
                                                className="flex items-center gap-1 group/reply transition-all"
                                              >
                                                <MessageCircle className="w-3.5 h-3.5 text-gray-600 hover:text-gray-900" />
                                              </button>
                                              {user?.id === nestedReply.user_id && (
                                                <button
                                                  onClick={() => startEdit(nestedReply.id, nestedReply.content)}
                                                  className="text-[11px] text-gray-500 hover:text-blue-600 font-semibold opacity-0 group-hover/nested:opacity-100 transition-opacity ml-auto"
                                                >
                                                  Edit
                                                </button>
                                              )}
                                              {(user?.id === nestedReply.user_id || user?.role === "admin") && (
                                                <button
                                                  onClick={() => handleDeleteComment(nestedReply.id, reply.id)}
                                                  className="flex items-center gap-0.5 text-[11px] text-red-500 hover:text-red-600 font-semibold opacity-0 group-hover/nested:opacity-100 transition-opacity"
                                                >
                                                  <Trash2 size={10} />
                                                </button>
                                              )}
                                            </div>
                                            <span className="text-[10px] text-gray-400 font-medium">
                                              {formatRelativeTime(nestedReply.created_at)}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            </div>
                          );
                        })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Load more button */}
              {hasMore && !loading && (
                <div className="flex justify-center py-4">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      setLoadingMore(true);
                      setPage(prev => prev + 1);
                      // Wait a bit for the effect to run
                      setTimeout(() => setLoadingMore(false), 1000);
                    }}
                    disabled={loadingMore}
                    className="text-sm"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Loading...
                      </>
                    ) : (
                      'Load more comments'
                    )}
                  </Button>
                </div>
              )}
            </>
          )}
          {/* Auto-scroll anchor */}
          <div ref={bottomRef} />
        </div>
        
        {/* Comment input form */}
        <div className="p-4 border-t border-gray-100 bg-white md:rounded-b-2xl">
          {/* Reply indicator */}
          {replyingTo && (
            <div className="flex items-center justify-between mb-2 text-xs text-gray-500 bg-blue-50 px-3 py-2 rounded-lg">
              <span className="font-medium">
                Replying to {comments.find(c => c.id === replyingTo)?.user?.username || 'user'}
              </span>
              <button
                onClick={() => {
                  setReplyingTo(null);
                  setNewComment('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <form
            onSubmit={handlePostComment}
            className="flex gap-2 items-start"
          >
            {/* Current user avatar */}
            <img
              src={user?.avatar_url || FailedImageIcon}
              alt="Your avatar"
              className="w-8 h-8 rounded-full object-cover border border-gray-100 shrink-0 mt-1"
            />
            <div className="relative flex-1">
              {/* Comment input field */}
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? "Write a reply..." : "Add a comment..."}
                className={`bg-gray-50 border-transparent focus:border-blue-200 focus:bg-white rounded-full h-11 pl-4 pr-12 transition-all ${
                  newComment.length > MAX_COMMENT_LENGTH ? 'border-red-300 focus:border-red-400' : ''
                }`}
                autoFocus={!loading}
                disabled={isSubmitting}
                maxLength={MAX_COMMENT_LENGTH + 100} // Soft limit with visual feedback
              />
              {/* Character counter */}
              {newComment.length > MAX_COMMENT_LENGTH * 0.8 && (
                <div className={`absolute -bottom-5 right-1 text-[10px] ${
                  newComment.length > MAX_COMMENT_LENGTH ? 'text-red-500 font-bold' : 'text-gray-400'
                }`}>
                  {newComment.length}/{MAX_COMMENT_LENGTH}
                </div>
              )}
              {/* Submit button */}
              <Button
                type="submit"
                size="icon"
                disabled={!newComment.trim() || isSubmitting || newComment.length > MAX_COMMENT_LENGTH}
                className="absolute right-1 top-1 h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Send comment"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 ml-0.5" />
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>,
    document.body
  );
}