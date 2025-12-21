import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "../lib/firebase";
import { supabase } from "../lib/supabaseClient";

/**
 * Ask the browser for permission to show notifications
 * and return the FCM token if permission is granted.
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (!("Notification" in window)) return null;

  try {
    if (Notification.permission === "granted") {
      return await getFCMToken();
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") return await getFCMToken();
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }

  return null;
}

/**
 * Get the FCM registration token for this device/browser.
 */
async function getFCMToken(): Promise<string | null> {
  try {
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    });
    return token || null;
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

/**
 * Handle FCM messages when the app is open (foreground).
 */
export function setupForegroundNotificationHandler() {
  onMessage(messaging, (payload) => {
    const sanitizeText = (text: string | undefined): string => {
      if (!text) return '';
      return text.replace(/[<>"'&]/g, (char) => {
        const entities: Record<string, string> = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' };
        return entities[char] || char;
      });
    };
    
    window.dispatchEvent(
      new CustomEvent("fcm-notification", {
        detail: {
          title: sanitizeText(payload.notification?.title),
          body: sanitizeText(payload.notification?.body),
          data: payload.data,
        },
      })
    );
  });
}

export type NotificationType =
  | "message"
  | "reaction"
  | "comment"
  | "pet_task"
  | "schedule"
  | "vaccination";

/**
 * Base helper: create a notification row in the DB
 */
const sanitizeText = (text: string): string => {
  return text.replace(/[<>"'&]/g, (char) => {
    const entities: Record<string, string> = { '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' };
    return entities[char] || char;
  });
};

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

  try {
    await supabase.rpc("prune_old_notifications", {
      p_user_id: params.userId,
    });
  } catch (error) {
    console.error('Error pruning old notifications:', error);
  }
}

type SimpleEvent = { id: string; admin_id: string | null; title: string | null };
type SimpleActor = { id: string; username?: string | null };

/**
 * Send like notification (grouped via database function)
 */
export async function notifyLike(event: SimpleEvent, actor: SimpleActor) {
  if (!event.admin_id || event.admin_id === actor.id) return;

  const actorName = actor.username ?? "Someone";

  try {
    // ✅ Call the database function to handle grouping
    const { error } = await supabase.rpc('handle_new_like', {
      p_target_user_id: event.admin_id,
      p_actor_name: actorName,
      p_event_id: event.id,
      p_event_title: event.title || "your post"
    });
    
    if (error) throw error;
  } catch (error) {
    console.error("Failed to send like notification:", error);
  }
}

/**
 * Send comment notification (grouped via database function)
 */
export async function notifyComment(
  event: SimpleEvent,
  actor: SimpleActor,
  preview: string,
  commentId: string
) {
  if (!event.admin_id || event.admin_id === actor.id) return;

  const actorName = actor.username ?? "Someone";

  try {
    const { error } = await supabase.rpc('handle_new_comment', {
      p_target_user_id: event.admin_id,
      p_actor_name: actorName,
      p_event_id: event.id,
      p_event_title: event.title || "your post",
      p_preview_text: preview,
      p_comment_id: commentId
    });
    
    if (error) {
      console.error("Comment notification error:", error);
      throw error;
    }
  } catch (error) {
    console.error("Failed to send comment notification:", error);
  }
}

/**
 * Send comment like notification
 */
export async function notifyCommentLike(
  commentOwnerId: string,
  actor: SimpleActor,
  commentId: string,
  commentPreview: string
) {
  if (commentOwnerId === actor.id) return; // Don't notify self

  const actorName = actor.username ?? "Someone";

  try {
    await createNotification({
      userId: commentOwnerId,
      fromUserId: actor.id,
      type: "reaction",
      title: `${actorName} liked your comment`,
      body: commentPreview.slice(0, 100),
      actionText: "View",
      data: { commentId }
    });
  } catch (error) {
    console.error("Failed to send comment like notification:", error);
  }
}

/**
 * Send comment reply notification
 */
export async function notifyCommentReply(
  commentOwnerId: string,
  actor: SimpleActor,
  replyId: string,
  replyPreview: string
) {
  if (commentOwnerId === actor.id) return; // Don't notify self

  const actorName = actor.username ?? "Someone";

  try {
    await createNotification({
      userId: commentOwnerId,
      fromUserId: actor.id,
      type: "comment",
      title: `${actorName} replied to your comment`,
      body: replyPreview.slice(0, 100),
      actionText: "View",
      data: { replyId }
    });
  } catch (error) {
    console.error("Failed to send comment reply notification:", error);
  }
}

/**
 * Parse @mentions from comment text and return array of usernames
 */
export function parseMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    mentions.push(match[1]);
  }
  
  return [...new Set(mentions)]; // Remove duplicates
}

/**
 * Send notifications to all mentioned users in a comment
 */
export async function notifyMentions(
  mentionedUsernames: string[],
  actor: SimpleActor,
  commentId: string,
  commentPreview: string,
  excludeUserId?: string // Don't notify this user (e.g., comment owner already notified)
) {
  if (mentionedUsernames.length === 0) return;

  const actorName = actor.username ?? "Someone";

  try {
    // Fetch user IDs for mentioned usernames
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, username')
      .in('username', mentionedUsernames);

    if (error || !users) {
      console.error("Failed to fetch mentioned users:", error);
      return;
    }

    // Send notification to each mentioned user
    for (const user of users) {
      if (user.id === actor.id || user.id === excludeUserId) continue; // Skip self and already notified user

      await createNotification({
        userId: user.id,
        fromUserId: actor.id,
        type: "comment",
        title: `${actorName} mentioned you in a comment`,
        body: commentPreview.slice(0, 100),
        actionText: "View",
        data: { commentId }
      });
    }
  } catch (error) {
    console.error("Failed to send mention notifications:", error);
  }
}
