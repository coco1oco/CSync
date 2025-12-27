import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "../lib/firebase";
import { supabase } from "../lib/supabaseClient";

// --- Types ---

/** Allowed notification types (keep in sync with DB CHECK constraint). */
export type NotificationType =
  | "message"
  | "reaction" // Used for Post Likes (Grouped)
  | "comment" // Used for Post Comments (Grouped)
  | "reply" // New: For replies to comments
  | "mention" // New: For @mentions
  | "comment_like" // New: For liking a comment
  | "pet_task"
  | "schedule"
  | "vaccination";

/** Simple shapes so we don't depend heavily on your types file */
type SimpleEvent = {
  id: string;
  admin_id: string | null;
  title: string | null;
};
type SimpleActor = { id: string; username?: string | null };

// --- Permission & Token Management ---

export async function requestNotificationPermission(): Promise<string | null> {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return null;
  }

  try {
    if (Notification.permission === "granted") {
      return await getFCMToken();
    }
    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        return await getFCMToken();
      }
    }
  } catch (err) {
    console.error("Error requesting notification permission:", err);
  }
  return null;
}

async function getFCMToken(): Promise<string | null> {
  try {
    if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) {
      console.warn("VITE_FIREBASE_VAPID_KEY is missing in .env file!");
      return null;
    }
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    return token || null;
  } catch (error) {
    console.error("Error retrieving FCM token:", error);
    return null;
  }
}

export function setupForegroundNotificationHandler() {
  onMessage(messaging, (payload) => {
    window.dispatchEvent(
      new CustomEvent("fcm-notification", {
        detail: {
          title: payload.notification?.title,
          body: payload.notification?.body,
          data: payload.data,
        },
      })
    );
  });
}

// --- Database Helpers ---

export async function createNotification(params: {
  userId: string;
  fromUserId?: string;
  type: NotificationType;
  title: string;
  body: string;
  actionText?: string;
  data: Record<string, any>;
}) {
  const { error } = await supabase.from("notifications").insert({
    user_id: params.userId,
    from_user_id: params.fromUserId,
    type: params.type,
    title: params.title,
    body: params.body,
    action_text: params.actionText,
    data: params.data,
    is_unread: true,
  });

  if (error) throw error;

  // ❌ REMOVED: Pruning logic deleted to fix P0001 Unauthorized error
}

// --- Business Logic: Grouped Notifications (Using SQL RPC) ---

export async function notifyLike(event: SimpleEvent, actor: SimpleActor) {
  if (!event.admin_id || event.admin_id === actor.id) return;

  const actorName = actor.username ?? "Someone";

  const { error } = await supabase.rpc("send_grouped_notification", {
    p_user_id: event.admin_id,
    p_from_user_id: actor.id,
    p_type: "reaction",
    p_event_id: event.id,
    p_actor_name: actorName,
    p_preview_text: "New like",
    p_link: `/event/${event.id}?action=like`,
    p_title: event.title ?? "New Likes",
  });

  if (error) console.error("Error sending like notification:", error);
}

export async function notifyComment(
  event: SimpleEvent,
  actor: SimpleActor,
  preview: string,
  commentId: string
) {
  if (!event.admin_id || event.admin_id === actor.id) return;

  const actorName = actor.username ?? "Someone";
  const shortPreview =
    preview.length > 30 ? preview.substring(0, 30) + "..." : preview;

  const { error } = await supabase.rpc("send_grouped_notification", {
    p_user_id: event.admin_id,
    p_from_user_id: actor.id,
    p_type: "comment",
    p_event_id: event.id,
    p_actor_name: actorName,
    p_preview_text: shortPreview,
    p_link: `/event/${event.id}?comment_id=${commentId}`,
    p_title: event.title ?? "New Comments",
  });

  if (error) console.error("Error sending comment notification:", error);
}

export async function notifyCommentLike(
  event: SimpleEvent,
  actor: SimpleActor,
  commentOwnerId: string,
  commentContent: string,
  commentId: string
) {
  if (actor.id === commentOwnerId) return;

  const actorName = actor.username ?? "Someone";
  const shortPreview =
    commentContent.length > 30
      ? commentContent.substring(0, 30) + "..."
      : commentContent;

  const { error } = await supabase.rpc("send_grouped_notification", {
    p_user_id: commentOwnerId,
    p_from_user_id: actor.id,
    p_type: "comment_like",
    p_event_id: event.id,
    p_actor_name: actorName,
    p_preview_text: shortPreview,
    p_link: `/event/${event.id}?comment_id=${commentId}`,
    p_title: "New Like on Comment",
  });

  if (error) console.error("Error sending comment like notification:", error);
}

// --- Business Logic: Individual Notifications ---

export async function notifyReply(
  event: SimpleEvent,
  actor: SimpleActor,
  commentContent: string,
  replyToUserId: string,
  replyId: string
) {
  if (actor.id === replyToUserId) return;

  const preview =
    commentContent.length > 50
      ? commentContent.substring(0, 50) + "..."
      : commentContent;

  const actorName = actor.username ?? "Someone";

  await createNotification({
    userId: replyToUserId,
    fromUserId: actor.id,
    type: "reply",
    title: "New Reply",
    body: `${actorName} replied: "${preview}"`,
    data: {
      event_id: event.id,
      link: `/event/${event.id}?comment_id=${replyId}`,
    },
  });
}

export async function notifyMentions(
  event: SimpleEvent,
  actor: SimpleActor,
  commentContent: string,
  commentId: string,
  excludeUserIds: string[] = []
) {
  const mentionRegex = /@(\w+)/g;
  const matches = [...commentContent.matchAll(mentionRegex)].map((m) => m[1]);

  if (matches.length === 0) return;

  const { data: mentionedUsers } = await supabase
    .from("profiles")
    .select("id, username")
    .in("username", matches);

  if (!mentionedUsers || mentionedUsers.length === 0) return;

  const actorName = actor.username ?? "Someone";

  for (const user of mentionedUsers) {
    if (user.id === actor.id) continue;

    if (excludeUserIds.includes(user.id)) continue;

    await createNotification({
      userId: user.id,
      fromUserId: actor.id,
      type: "mention",
      title: "You were mentioned",
      body: `${actorName} mentioned you in "${event.title ?? "a post"}"`,
      data: {
        event_id: event.id,
        link: `/event/${event.id}?comment_id=${commentId}`,
      },
    });
  }
}
