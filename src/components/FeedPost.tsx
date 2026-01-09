import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/authContext";
import { EventCard } from "@/components/EventCard";
import { OfficialEventCard } from "@/components/OfficialEventCard";
import { EventRegistrationModal } from "@/components/EventRegistrationModal";
import { LikesListModal } from "@/components/LikesListModal";
import { CommentsModal } from "@/components/CommentsModal"; // ✅ Extracted
import { Heart, MessageCircle } from "lucide-react";
import type { OutreachEvent } from "@/types";
// We assume this type exists from your dashboard refactor
import type { FeedEvent } from "@/hooks/useFeedEvents";
import {
  usePostLikes,
  usePostCommentCount,
  useToggleLike,
} from "@/hooks/usePostInteractions";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";

interface FeedPostProps {
  event: OutreachEvent;
  isAdmin: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onTagClick?: (tag: string) => void;
  customUsername?: string;
  customAvatar?: string;
  onRefresh?: () => void;
  onHide?: () => void;
  isHidden?: boolean;
}

export function FeedPost({
  event,
  isAdmin,
  onDelete,
  onEdit,
  onTagClick,
  customUsername,
  customAvatar,
  onRefresh,
  onHide,
  isHidden,
}: FeedPostProps) {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const highlightCommentId = searchParams.get("comment_id");

  // --- 1. TANSTACK HOOKS ---
  const { data: likeData } = usePostLikes(event.id, user?.id);
  const { data: commentCount } = usePostCommentCount(event.id);
  const toggleLikeMutation = useToggleLike();

  // --- 2. DATA NORMALIZATION ---
  // We treat the event as a FeedEvent to access the joined fields.
  const feedEvent = event as unknown as FeedEvent;

  // ✅ FIX: Use string | null to safely handle 'waitlist', 'checked_in', etc.
  const [registrationStatus, setRegistrationStatus] = useState<string | null>(
    feedEvent.registration_status || null
  );

  const [isRegistered, setIsRegistered] = useState(
    feedEvent.is_registered || false
  );
  const [participantCount, setParticipantCount] = useState(
    feedEvent.current_attendees || 0
  );

  // Sync state if props change (e.g. after a feed refresh)
  useEffect(() => {
    setRegistrationStatus(feedEvent.registration_status || null);
    setIsRegistered(feedEvent.is_registered || false);
    setParticipantCount(feedEvent.current_attendees || 0);
  }, [
    feedEvent.registration_status,
    feedEvent.is_registered,
    feedEvent.current_attendees,
  ]);

  // --- 3. UI STATE ---
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);

  // Auto-open comments if linked
  useEffect(() => {
    if (highlightCommentId) setIsCommentsOpen(true);
  }, [highlightCommentId]);

  // --- HANDLERS ---
  const handleToggleLike = () => {
    if (!user || toggleLikeMutation.isPending) return;
    toggleLikeMutation.mutate({
      eventId: event.id,
      userId: user.id,
      isLiked: likeData?.isLiked || false,
      eventTitle: event.title,
      adminId: event.admin_id,
      username: user.username || "Member",
    });
  };

  const handleUnregister = async () => {
    if (!user || !isRegistered) return;
    if (!confirm("Are you sure you want to cancel your registration?")) return;

    try {
      const { error } = await supabase
        .from("event_registrations")
        .delete()
        .eq("event_id", event.id)
        .eq("user_id", user.id);

      if (error) throw error;

      setIsRegistered(false);
      setRegistrationStatus(null);
      setParticipantCount((prev) => Math.max(0, prev - 1));
      toast.success("Registration cancelled");
      onRefresh?.(); // Update parent list
    } catch (err) {
      console.error("Unregister failed:", err);
      toast.error("Failed to unregister");
    }
  };

  const isOfficialEvent = ["official", "pet", "member", "campus"].includes(
    event.event_type || ""
  );

  // --- RENDER OFFICIAL CARD ---
  if (isOfficialEvent) {
    return (
      <>
        <OfficialEventCard
          event={event}
          isRegistered={isRegistered}
          // Pass the robust string type status
          registrationStatus={registrationStatus || undefined}
          onRegister={() => setIsRegistrationOpen(true)}
          onUnregister={handleUnregister}
          onEdit={onEdit}
          isAdmin={isAdmin}
          onDelete={onDelete}
          currentCount={participantCount}
          onSuccess={onRefresh}
          onHide={onHide}
          isHidden={isHidden}
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
            eventType={event.event_type}
            onClose={() => setIsRegistrationOpen(false)}
            onSuccess={() => {
              setIsRegistered(true);
              setRegistrationStatus("approved"); // Optimistic update
              setParticipantCount((prev) => prev + 1);
              onRefresh?.(); // Fetch true status from DB
            }}
          />
        )}

        {/* Comments Modal can still be accessed via Official Card if you add a button, 
            but usually it's hidden. If you need it, add logic here. */}
      </>
    );
  }

  // --- RENDER STANDARD POST ---
  return (
    <>
      <div className="mb-4">
        <EventCard
          event={event}
          isAdmin={isAdmin}
          onEdit={onEdit}
          onDelete={onDelete}
          onTagClick={onTagClick}
          customUsername={customUsername}
          customAvatar={customAvatar}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              {/* LIKE BUTTON */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleToggleLike}
                  disabled={toggleLikeMutation.isPending}
                  className="flex items-center group transition-all focus:outline-none disabled:opacity-50"
                >
                  <Heart
                    className={`w-6 h-6 transition-transform group-active:scale-90 ${
                      likeData?.isLiked
                        ? "fill-red-500 text-red-500"
                        : "text-gray-900 hover:text-gray-600"
                    }`}
                    strokeWidth={likeData?.isLiked ? 0 : 2}
                  />
                </button>
                {likeData?.count ? (
                  <button
                    onClick={() => setShowLikesModal(true)}
                    className="text-sm font-bold text-gray-900 hover:underline focus:outline-none"
                  >
                    {likeData.count}
                  </button>
                ) : null}
              </div>

              {/* COMMENTS BUTTON */}
              <button
                onClick={() => setIsCommentsOpen(true)}
                className="flex items-center gap-1.5 group transition-all focus:outline-none"
              >
                <MessageCircle
                  className="w-6 h-6 text-gray-900 hover:text-gray-600"
                  strokeWidth={2}
                />
                {commentCount ? (
                  <span className="text-sm font-bold text-gray-900">
                    {commentCount}
                  </span>
                ) : null}
              </button>
            </div>
          </div>
        </EventCard>
      </div>

      <LikesListModal
        isOpen={showLikesModal}
        onClose={() => setShowLikesModal(false)}
        targetId={event.id}
        type="post"
      />

      {isCommentsOpen && (
        <CommentsModal
          event={event}
          user={user}
          customUsername={customUsername}
          customAvatar={customAvatar}
          onClose={() => setIsCommentsOpen(false)}
          onCommentChange={() => {
            // Invalidate query or rely on mutation side-effect
          }}
          highlightId={highlightCommentId}
          isLiked={likeData?.isLiked}
          likesCount={likeData?.count}
          onToggleLike={handleToggleLike}
          commentsCount={commentCount}
        />
      )}
    </>
  );
}
