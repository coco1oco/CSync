import { useEffect, useState, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, Loader2, Heart, MessageCircle, MoreHorizontal, 
  Trash2, Edit, Send, Reply, X, ChevronLeft, ChevronRight 
} from "lucide-react";
import { FeedPost } from "@/components/FeedPost"; 
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import FailedImageIcon from "@/assets/FailedImage.svg";

// --- Notification Imports ---
import {
  notifyLike,
  notifyComment,
  notifyReply,
  notifyMentions,
  notifyCommentLike,
} from "@/lib/NotificationService";

import type { OutreachEvent } from "@/types";

// --- Helper: Relative Time ---
const formatRelativeTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 0) return "0s"; 
  if (diffInSeconds < 60) return `${diffInSeconds}s`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
  if (diffInSeconds < 2629746) return `${Math.floor(diffInSeconds / 604800)}w`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

// --- Interfaces ---
interface CommentWithExtras {
  id: string;
  event_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  parent_comment_id: string | null;
  user: {
    id: string;
    username: string;
    avatar_url?: string;
  };
  likes_count: number;
  is_liked_by_user: boolean;
}

export default function EventDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); 
  const inputRef = useRef<HTMLInputElement>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  
  // --- STATE ---
  const [event, setEvent] = useState<OutreachEvent | null>(null);
  const [comments, setComments] = useState<CommentWithExtras[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  // Inputs
  const [newComment, setNewComment] = useState(""); 
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyTarget, setReplyTarget] = useState<CommentWithExtras | null>(null);
  const [isPosting, setIsPosting] = useState(false); 

  // UI
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [currentImageIndex, setCurrentImageIndex] = useState(0); 
  
  // Caption Logic
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);

  // Post Like State
  const [postLikesCount, setPostLikesCount] = useState(0);
  const [isPostLiked, setIsPostLiked] = useState(false);
  const [isLikingPost, setIsLikingPost] = useState(false);

  // --- ANIMATION STATES ---
  const [heartBump, setHeartBump] = useState(false);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // --- 1. HEART BUMP ANIMATION ---
  useEffect(() => {
    if (loading) return; 

    const type = searchParams.get('type');
    if (type === 'like') {
        const startTimer = setTimeout(() => setHeartBump(true), 300);
        const endTimer = setTimeout(() => setHeartBump(false), 1000); 
        return () => { clearTimeout(startTimer); clearTimeout(endTimer); };
    }
  }, [searchParams, loading]); 

  // --- 2. COMMENT HIGHLIGHT ANIMATION ---
  useEffect(() => {
    if (loading) return; 

    const targetCommentId = searchParams.get('comment_id');
    if (targetCommentId && comments.length > 0) {
        const commentElement = document.getElementById(`comment-${targetCommentId}`);
        if (commentElement) {
            commentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setHighlightedCommentId(targetCommentId);
            const timer = setTimeout(() => setHighlightedCommentId(null), 3000);
            return () => clearTimeout(timer);
        } else {
             setExpandedComments(prev => {
                 const newSet = new Set(prev);
                 const commentObj = comments.find(c => c.id === targetCommentId);
                 if(commentObj && commentObj.parent_comment_id) {
                     newSet.add(commentObj.parent_comment_id);
                 }
                 return newSet;
             });
        }
    }
  }, [searchParams, comments, loading]); 

  // --- DATA FETCHING ---
  useEffect(() => {
    if (!id) return;

    async function fetchData() {
      try {
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
            setCurrentUser({ ...user, ...profile });
        }

        const { data: eventData, error: eventError } = await supabase
          .from("outreach_events")
          .select(`*, profiles:admin_id (username, avatar_url)`)
          .eq("id", id)
          .single();
        if (eventError) throw eventError;
        setEvent(eventData);

        const { count: likesCount } = await supabase
            .from("likes")
            .select("*", { count: 'exact', head: true })
            .eq("event_id", id);
        setPostLikesCount(likesCount || 0);

        if (user) {
           const { data: myLike } = await supabase.from("likes").select("id").eq("user_id", user.id).eq("event_id", id).maybeSingle();
           setIsPostLiked(!!myLike);
        }

     // ...existing code...
        if (id) {
            await fetchComments(id, user?.id ?? "");
        }
// ...existing code...

      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id]);

  // --- REALTIME SUBSCRIPTION ---
  useEffect(() => {
    if (!id) return;

    const channel = supabase.channel(`event-details-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments', filter: `event_id=eq.${id}` }, 
        async (payload) => {
          if (currentUser && payload.new.user_id === currentUser.id) return; 
          
          const { data: userData } = await supabase.from("profiles").select("id, username, avatar_url").eq("id", payload.new.user_id).single();
          const newComment = { 
            ...payload.new, 
            user: userData,
            likes_count: 0,
            is_liked_by_user: false
          } as CommentWithExtras;
          
          setComments((prev) => [...prev, newComment]);

          setHighlightedCommentId(newComment.id);
          setTimeout(() => {
             const el = document.getElementById(`comment-${newComment.id}`);
             if(el) el.scrollIntoView({ behavior: 'smooth' });
          }, 100);
          setTimeout(() => setHighlightedCommentId(null), 3000);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'likes', filter: `event_id=eq.${id}` }, 
        async () => {
            const { count } = await supabase.from("likes").select("*", { count: 'exact', head: true }).eq("event_id", id);
            setPostLikesCount(count || 0);
            
            setHeartBump(true);
            setTimeout(() => setHeartBump(false), 500);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, currentUser]); 

  const fetchComments = async (eventId: string, userId?: string) => {
    const { data } = await supabase
      .from("comments")
      .select("*, user:profiles!comments_user_profile_fkey(id, username, avatar_url)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true });

    if (data) {
       const formatted = await Promise.all(data.map(async (c) => {
           const { count } = await supabase.from("comment_likes").select("*", { count: 'exact', head: true }).eq("comment_id", c.id);
           let liked = false;
           if(userId) {
              const { data: myLike } = await supabase.from("comment_likes").select("id").eq("comment_id", c.id).eq("user_id", userId).maybeSingle();
              liked = !!myLike;
           }
           return {
               ...c,
               likes_count: count || 0,
               is_liked_by_user: liked
           };
       }));
       setComments(formatted as CommentWithExtras[]);
    }
  };

  const handleTagClick = (tag: string) => {
      navigate(`/feed?search=${encodeURIComponent(tag.replace("#", ""))}`);
  };

  // --- ACTIONS ---
  const togglePostLike = async () => {
      if(!currentUser || isLikingPost) return;
      setIsLikingPost(true);
      
      const prevLiked = isPostLiked;
      setIsPostLiked(!prevLiked);
      setPostLikesCount(prevLiked ? postLikesCount - 1 : postLikesCount + 1);

      // Trigger local Animation
      setHeartBump(true);
      setTimeout(() => setHeartBump(false), 500);

      try {
        if(prevLiked) {
            await supabase.from("likes").delete().eq("event_id", id).eq("user_id", currentUser.id);
        } else {
            await supabase.from("likes").insert({ event_id: id, user_id: currentUser.id });
            if (event?.admin_id !== currentUser.id) {
               await notifyLike(
                  { id: event!.id, admin_id: event!.admin_id, title: event!.title },
                  { id: currentUser.id, username: currentUser.username }
               );
            }
        }
      } catch (e) {
        setIsPostLiked(prevLiked);
      } finally {
        setIsLikingPost(false);
      }
  };

  const handleDeletePost = async () => {
    if (!confirm("Delete this event?")) return;
    try {
      await supabase.from("outreach_events").delete().eq("id", id);
      navigate(-1); 
    } catch (err) { alert("Error deleting"); }
  };

  const handleEditPost = () => { navigate(`/edit-event/${id}`); };

  const handlePostComment = async (e?: React.FormEvent) => {
    if(e) e.preventDefault();
    if (!newComment.trim() || !currentUser) return;
    
    const content = newComment.trim();
    setNewComment("");
    setIsPosting(true);

    const tempId = `temp-${Date.now()}`;
    const optimisticComment: CommentWithExtras = {
        id: tempId,
        event_id: id!,
        user_id: currentUser.id,
        content: content,
        created_at: new Date().toISOString(),
        parent_comment_id: activeReplyId,
        user: currentUser,
        likes_count: 0,
        is_liked_by_user: false
    };

    setComments(prev => [...prev, optimisticComment]);
    
    if(activeReplyId) {
        setExpandedComments(prev => new Set(prev).add(activeReplyId));
    }
    
    setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    const { data: inserted, error } = await supabase.from("comments").insert([{
        event_id: id,
        user_id: currentUser.id,
        content: content,
        parent_comment_id: activeReplyId
    }]).select().single();

    if(!error && inserted) {
        setComments(prev => prev.map(c => c.id === tempId ? { ...c, id: inserted.id, created_at: inserted.created_at } : c));
        
        const notifiedUserIds: string[] = [];
        if (replyTarget && replyTarget.user_id !== currentUser.id) {
            await notifyReply(
                { id: event!.id, admin_id: event!.admin_id, title: event!.title },
                { id: currentUser.id, username: currentUser.username },
                content,
                replyTarget.user_id,
                inserted.id
            );
            notifiedUserIds.push(replyTarget.user_id);
        } else if (event?.admin_id && event.admin_id !== currentUser.id) {
            await notifyComment(
                { id: event!.id, admin_id: event!.admin_id, title: event!.title },
                { id: currentUser.id, username: currentUser.username },
                content,
                inserted.id
            );
        }

        await notifyMentions(
            { id: event!.id, admin_id: event!.admin_id, title: event!.title },
            { id: currentUser.id, username: currentUser.username },
            content,
            inserted.id,
            notifiedUserIds
        );

        setActiveReplyId(null);
        setReplyTarget(null);
    } else {
        setComments(prev => prev.filter(c => c.id !== tempId)); 
    }
    setIsPosting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
      if(!confirm("Delete this comment?")) return;
      setComments(prev => prev.filter(c => c.id !== commentId)); 
      await supabase.from("comments").delete().eq("id", commentId);
  };

  const handleEditComment = async (commentId: string, newContent: string) => {
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: newContent, updated_at: new Date().toISOString() } : c));
      await supabase.from("comments").update({ content: newContent, updated_at: new Date().toISOString() }).eq("id", commentId);
  };

  const handleReplyClick = (comment: CommentWithExtras) => {
      setNewComment(`@${comment.user.username} `);
      setReplyTarget(comment);
      setActiveReplyId(comment.parent_comment_id || comment.id);
      inputRef.current?.focus();
  };

  const toggleReplies = (id: string) => {
      setExpandedComments(prev => {
          const next = new Set(prev);
          if(next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  // Carousel Handlers
  const nextImage = () => {
      if (event?.images && currentImageIndex < event.images.length - 1) {
          setCurrentImageIndex(prev => prev + 1);
      }
  };

  const prevImage = () => {
      if (currentImageIndex > 0) {
          setCurrentImageIndex(prev => prev - 1);
      }
  };

  const repliesByParent = useMemo(() => {
    const map = new Map<string, CommentWithExtras[]>();
    comments.forEach((c) => {
        if (c.parent_comment_id) {
            const existing = map.get(c.parent_comment_id) || [];
            map.set(c.parent_comment_id, [...existing, c]);
        }
    });
    return map;
  }, [comments]);

  const rootComments = comments.filter(c => !c.parent_comment_id);
  const getReplies = (parentId: string) => repliesByParent.get(parentId) || [];

  const renderContentWithTags = (text: string) => {
      if (!text) return "";
      const parts = text.split(/((?:@|#)\w+)/g);
      return parts.map((part, i) => {
          if (part.startsWith("@")) {
              return <span key={i} className="text-blue-600 font-bold mr-1 cursor-pointer hover:underline">{part}</span>;
          } else if (part.startsWith("#")) {
              return (
                <span 
                    key={i} 
                    onClick={(e) => { e.stopPropagation(); handleTagClick(part); }}
                    className="text-blue-500 mr-1 cursor-pointer hover:underline hover:text-blue-700"
                >
                    {part}
                </span>
              );
          }
          return <span key={i}>{part}</span>;
      });
  };

  const renderCommentRow = (comment: CommentWithExtras, isReply = false) => (
      <CommentItem 
         key={comment.id}
         comment={comment}
         event={event!}
         user={currentUser}
         onDelete={handleDeleteComment}
         onEdit={handleEditComment}
         onReply={handleReplyClick}
         isReply={isReply}
         isHighlighted={highlightedCommentId === comment.id} 
      />
  );

  if (loading && !event) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!event) return <div className="p-10">Event not found</div>;

  const images = event.images && event.images.length > 0 ? event.images : [(event as any).image_url].filter(Boolean);
  const hasImages = images.length > 0;
  const isOwner = currentUser?.id === event.admin_id;

  // --- RETURN JSX ---
 // ... existing code ...

  // --- RETURN JSX ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      
      {/* Universal Mobile Header */}
      <div className="bg-white border-b px-4 py-3 sticky top-0 z-50 flex items-center gap-3 shadow-sm lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-lg">Post</h1>
      </div>

      {isMobile ? (
        <div className="w-full max-w-xl mx-auto pt-4 px-0 pb-20">
           {/* Manually rendering FeedPost content here to ensure styles match Desktop */}
           <FeedPost event={event} isAdmin={false} onDelete={() => navigate(-1)} onEdit={() => {}} onTagClick={handleTagClick} />
        </div>
      ) : (
        /* 1. DESKTOP WRAPPER (UPDATED: Removed bg-black/40) */
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 lg:p-6 lg:pl-64 overflow-hidden">
            
            {/* OPTIONAL: If you want to click outside to close, add an absolute div here with onClick={() => navigate(-1)} */}
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm" onClick={() => navigate(-1)} />

            {/* 2. MODAL */}
            <div className="relative bg-white w-full max-w-[1000px] h-[85vh] rounded-xl shadow-2xl border border-gray-200 flex overflow-hidden z-10">
            
            {/* ... rest of your modal content (Left Column, Right Column) remains exactly the same ... */}
            {/* LEFT COLUMN: Media + Caption (60% Width) */}
            <div className="w-[60%] h-full flex flex-col border-r border-gray-200 bg-white relative">
               {/* ... same content ... */}
               <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`absolute top-4 left-4 z-10 rounded-full border ${hasImages ? "bg-black/50 hover:bg-black/70 text-white border-white/10" : "bg-white hover:bg-gray-100 text-gray-700 border-gray-200"}`}
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>

               {hasImages ? (
                   // ... same image logic ...
                   <>
                        <div className="flex-1 relative group/carousel bg-black flex items-center justify-center min-h-0">
                            <img 
                                src={images[currentImageIndex]} 
                                alt="Post" 
                                className="max-w-full max-h-full object-contain" 
                            />
                            {/* ... carousel controls ... */}
                            {images.length > 1 && (
                                <>
                                    {currentImageIndex > 0 && (
                                        <button 
                                                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm transition-all"
                                        >
                                                <ChevronLeft size={24} />
                                        </button>
                                    )}
                                    {currentImageIndex < images.length - 1 && (
                                        <button 
                                                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm transition-all"
                                        >
                                                <ChevronRight size={24} />
                                        </button>
                                    )}
                                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5">
                                            {images.map((_, idx) => (
                                                <div 
                                                    key={idx}
                                                    className={`w-1.5 h-1.5 rounded-full ${idx === currentImageIndex ? 'bg-white' : 'bg-white/40'}`}
                                                />
                                            ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {(event.title || event.description) && (
                            <div className="shrink-0 bg-white border-t border-gray-100 p-4 max-h-[30%] overflow-y-auto">
                                <h1 className="text-sm font-bold text-gray-900 mb-1">{event.title}</h1>
                                <div className={`text-xs text-gray-700 whitespace-pre-wrap leading-relaxed ${isCaptionExpanded ? '' : 'line-clamp-2'}`}>
                                    {renderContentWithTags(event.description || "")}
                                </div>
                                {(event.description || "").length > 100 && (
                                    <button 
                                            onClick={() => setIsCaptionExpanded(!isCaptionExpanded)}
                                            className="text-[10px] text-gray-400 font-medium mt-1 self-start hover:text-gray-600 focus:outline-none"
                                    >
                                            {isCaptionExpanded ? 'See less' : 'See more'}
                                    </button>
                                )}
                            </div>
                        )}
                   </>
               ) : (
                   // ... same no-image logic ...
                   <div className="flex-1 w-full h-full flex flex-col justify-start items-start p-8 pt-20 overflow-y-auto bg-white text-left">
                        <div className="w-full">
                            {event.title && <h1 className="text-2xl font-bold text-gray-900 mb-4">{event.title}</h1>}
                            <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap">
                                {renderContentWithTags(event.description || "")}
                            </p>
                        </div>
                   </div>
               )}
            </div>

            {/* RIGHT COLUMN: Social */}
            <div className="w-[40%] h-full flex flex-col bg-white">
                
                {/* 1. Header */}
                <div className="p-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        {event.profiles?.avatar_url ? (
                            <img src={event.profiles.avatar_url} className="w-9 h-9 rounded-full object-cover border border-gray-100" />
                        ) : (
                            <div className="w-9 h-9 bg-gray-200 animate-pulse rounded-full" />
                        )}
                        
                        <div className="flex flex-col justify-center">
                            {event.profiles?.username ? (
                                <p className="font-bold text-sm text-gray-900">{event.profiles.username}</p>
                            ) : (
                                <div className="h-4 w-24 bg-gray-200 animate-pulse rounded mb-1" />
                            )}
                            <p className="text-[10px] text-gray-500">{event.created_at ? formatRelativeTime(event.created_at) : ""}</p>
                        </div>
                    </div>
                    {isOwner && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={handleEditPost}><Edit className="w-3 h-3 mr-2"/>Edit</DropdownMenuItem>
                                <DropdownMenuItem onClick={handleDeletePost} className="text-red-600"><Trash2 className="w-3 h-3 mr-2"/>Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                {/* 2. Comments */}
                <div className="flex-1 overflow-y-auto pl-4 py-4 pr-6 space-y-4 bg-white [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                    {rootComments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-gray-400 py-10 h-full">
                            <MessageCircle size={40} className="mb-2 opacity-20" />
                            <p className="text-sm">No comments yet.</p>
                            <p className="text-xs">Start the conversation.</p>
                        </div>
                    ) : (
                        <>
                            {rootComments.map(comment => {
                                const replies = getReplies(comment.id);
                                const hasReplies = replies.length > 0;
                                const isExpanded = expandedComments.has(comment.id);
                                return (
                                    <div key={comment.id}>
                                        {renderCommentRow(comment)}
                                        {hasReplies && (
                                            <div className="ml-12 mt-2 flex items-center">
                                                <div className="w-6 h-[1px] bg-gray-300 mr-2" />
                                                <button onClick={() => toggleReplies(comment.id)} className="text-[10px] font-semibold text-gray-500 hover:text-gray-800">
                                                    {isExpanded ? "Hide replies" : `View replies (${replies.length})`}
                                                </button>
                                            </div>
                                        )}
                                        {isExpanded && <div className="mb-2">{replies.map(r => renderCommentRow(r, true))}</div>}
                                    </div>
                                )
                            })}
                            <div ref={commentsEndRef} />
                        </>
                    )}
                </div>

                {/* 3. DESKTOP FOOTER (FIXED) */}
                <div className="border-t border-gray-100 bg-white p-4 shrink-0 z-20">
                    <div className="flex items-center justify-between mb-4">
                         <div className="flex gap-4">
                             {/* LIKE BUTTON */}
                             <button onClick={togglePostLike} className="group flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                                 {/* FORCE STYLE FOR ANIMATION */}
                                 <Heart 
                                    className={`w-6 h-6 transition-transform duration-300 ${isPostLiked ? "fill-red-500 text-red-500" : "text-gray-900 group-hover:text-gray-600"}`}
                                    style={{ transform: heartBump ? "scale(1.5)" : "scale(1)", transition: "transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)" }} 
                                    strokeWidth={isPostLiked || heartBump ? 0 : 1.5}
                                 />
                                 <span className="text-sm font-semibold text-gray-900">{postLikesCount > 0 ? postLikesCount : ""}</span>
                             </button>

                             {/* COMMENT BUTTON - Now showing count */}
                             <button onClick={() => inputRef.current?.focus()} className="group flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                                 <MessageCircle className="w-6 h-6 text-gray-900 group-hover:text-gray-600" strokeWidth={1.5}/>
                                 <span className="text-sm font-semibold text-gray-900">{comments.length > 0 ? comments.length : ""}</span>
                             </button>
                         </div>
                    </div>
                    
                    <div className="relative">
                        {activeReplyId && (
                           <div className="absolute -top-8 left-0 right-0 bg-gray-100 text-[10px] px-2 py-1 flex justify-between items-center rounded-t border">
                               <span>Replying to <span className="font-bold">{replyTarget?.user.username}</span></span>
                               <button onClick={() => { setActiveReplyId(null); setReplyTarget(null); }}><X size={10}/></button>
                           </div>
                        )}
                        <form onSubmit={handlePostComment} className="flex items-center gap-2">
                            <Input 
                                ref={inputRef}
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                placeholder="Add a comment..." 
                                className="bg-transparent border-none focus:ring-0 px-0 h-9 transition-all text-sm w-full focus-visible:ring-0 focus-visible:ring-offset-0"
                            />
                            <Button 
                                type="submit" 
                                variant="ghost"
                                disabled={!newComment.trim() || isPosting} 
                                className="text-blue-500 font-bold hover:text-blue-700 hover:bg-transparent px-2 disabled:text-blue-300"
                            >
                                Post
                            </Button>
                        </form>
                    </div>
                </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// --- SUB-COMPONENT: Individual Comment Item ---
interface CommentItemProps {
  event: OutreachEvent;
  comment: CommentWithExtras;
  user: any;
  onDelete: (id: string) => void;
  onReply: (comment: CommentWithExtras) => void;
  onEdit: (id: string, newContent: string) => void;
  isReply?: boolean;
  isHighlighted?: boolean;
}

function CommentItem({ event, comment, user, onDelete, onReply, onEdit, isReply = false, isHighlighted = false }: CommentItemProps) {
    const [likesCount, setLikesCount] = useState(comment.likes_count || 0);
    const [isLiked, setIsLiked] = useState(comment.is_liked_by_user || false);
    const [isLiking, setIsLiking] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);

    const isEdited = comment.updated_at && comment.updated_at !== comment.created_at;

    useEffect(() => {
        // Fetch comment likes if needed
    }, [comment.id]);

    const toggleLike = async () => {
        if(!user || isLiking) return;
        setIsLiking(true);
        const prevLiked = isLiked;
        setIsLiked(!prevLiked);
        setLikesCount(prevLiked ? likesCount - 1 : likesCount + 1);

        try {
            if(prevLiked) {
                await supabase.from("comment_likes").delete().eq("comment_id", comment.id).eq("user_id", user.id);
            } else {
                await supabase.from("comment_likes").insert({ comment_id: comment.id, user_id: user.id });
                if (comment.user_id !== user.id) {
                     await notifyCommentLike(
                        { id: event.id, admin_id: event.admin_id, title: event.title },
                        { id: user.id, username: user.username },
                        comment.user_id,
                        comment.content,
                        comment.id
                      );
                }
            }
        } catch(e) {
            setIsLiked(prevLiked);
        } finally {
            setIsLiking(false);
        }
    };

    const handleSave = () => {
        if(editContent.trim()) {
            onEdit(comment.id, editContent);
            setIsEditing(false);
        }
    };

    const canManage = user?.id === comment.user_id || user?.role === 'admin';

    return (
        <div 
            id={`comment-${comment.id}`}
            // FIXED: Using blue styling for highlight
            className={`flex gap-2 group animate-in fade-in slide-in-from-bottom-2 duration-300 rounded p-1 transition-colors ${isReply ? "ml-12 mt-2" : "mt-3"} ${isHighlighted ? "bg-blue-50 ring-1 ring-blue-100" : ""}`}
        >
             <img src={comment.user?.avatar_url || FailedImageIcon} className={`${isReply ? "w-5 h-5" : "w-7 h-7"} rounded-full object-cover border border-gray-100 flex-shrink-0`} />
             <div className="flex-1 space-y-0.5">
                 <div className="flex flex-col">
                     <div className="flex items-baseline gap-2">
                         <span className="font-bold text-xs text-gray-900">{comment.user?.username || "Unknown"}</span>
                         {isEditing ? (
                             <div className="flex-1">
                                 <Input value={editContent} onChange={e => setEditContent(e.target.value)} className="h-7 text-xs" autoFocus />
                                 <div className="flex gap-2 mt-1">
                                     <span onClick={handleSave} className="text-[10px] font-bold text-blue-600 cursor-pointer hover:underline">Save</span>
                                     <span onClick={() => { setIsEditing(false); setEditContent(comment.content); }} className="text-[10px] text-gray-500 cursor-pointer hover:underline">Cancel</span>
                                 </div>
                             </div>
                          ) : (
                             <span className="text-xs text-gray-700 break-words whitespace-pre-wrap">{comment.content}</span>
                          )}
                      </div>
                 </div>
                 
                 {!isEditing && (
                    <div className="flex items-center gap-3 px-0.5 mt-0.5">
                        <span className="text-[10px] text-gray-400 font-medium">
                            {formatRelativeTime(comment.created_at)}
                            {isEdited && <span className="ml-1 italic"> (edited)</span>}
                        </span>
                        
                        <button onClick={toggleLike} disabled={isLiking} className="flex items-center gap-1 group/like disabled:opacity-50">
                            <Heart size={10} className={`transition-colors ${isLiked ? "fill-red-500 text-red-500" : "text-gray-400 group-hover/like:text-red-500"}`} />
                            <span className="text-[10px] text-gray-500 font-semibold">{likesCount > 0 ? likesCount : ""}</span>
                        </button>
                        
                        <button onClick={() => onReply(comment)} className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-blue-600 font-semibold transition-colors">
                            <Reply size={9} /> Reply
                        </button>
                        
                        {canManage && (
                            <DropdownMenu>
                                <DropdownMenuTrigger className="focus:outline-none opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity">
                                    <MoreHorizontal size={12} className="text-gray-400 hover:text-gray-700 transition-colors" />
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-28 z-[100] bg-white">
                                    {user?.id === comment.user_id && (
                                        <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                            <Edit size={10} className="mr-2" /><span className="text-[10px]">Edit</span>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => onDelete(comment.id)} className="text-red-600 focus:text-red-600">
                                        <Trash2 size={10} className="mr-2" /><span className="text-[10px]">Delete</span>
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