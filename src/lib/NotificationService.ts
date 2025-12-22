import { getToken, onMessage } from "firebase/messaging";
import { messaging } from "../lib/firebase";
import { supabase } from "../lib/supabaseClient";

// --- Types ---

/** Allowed notification types (keep in sync with DB CHECK constraint). */
export type NotificationType =
  | "message"
  | "reaction"
  | "comment"
  | "pet_task"
  | "schedule"
  | "vaccination";

/** Simple shapes so we don't depend heavily on your types file */
type SimpleEvent = { id: string; admin_id: string | null; title: string | null };
type SimpleActor = { id: string; username?: string | null };

// --- Permission & Token Management ---

/**
 * Ask the browser for permission to show notifications
 * and return the FCM token if permission is granted.
 */
export async function requestNotificationPermission(): Promise<string | null> {
  // If the browser does not support Notification API, stop
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return null;
  }

  try {
    // If already granted, just get the token
    if (Notification.permission === "granted") {
      return await getFCMToken();
    }

    // If not decided yet, ask the user
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

/**
 * Get the FCM registration token for this device/browser.
 */
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

/**
 * Handle FCM messages when the app is open (foreground).
 * Instead of showing a system notification, we dispatch
 * a window event that the React app can listen to.
 */
export function setupForegroundNotificationHandler() {
  onMessage(messaging, (payload) => {
    // console.log("Foreground message received:", payload);
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

/**
 * Base helper: create a notification row in the DB for a specific user,
 * then prune old notifications so the user only keeps the newest 100 entries.
 */
export async function createNotification(params: {
  userId: string;
  fromUserId?: string;
  type: NotificationType;
  title: string;
  body: string;
  actionText?: string;
  data: Record<string, any>;
}) {
  // 1) Insert the notification
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

  // 2) Prune old notifications for this user:
  //    keep only the latest 100 and delete anything older.
  //    Ensure you have created this RPC function in Supabase.
  const { error: rpcError } = await supabase.rpc("prune_old_notifications", {
    p_user_id: params.userId,
  });

  if (rpcError) {
    console.error("Failed to prune notifications:", rpcError);
  }
}

// --- Business Logic: Grouping Notifications ---

/**
 * Group LIKE notifications for the same event:
 * - If no 'reaction' notification exists for this event/user, create one.
 * - If there is one, update it to "X and N others liked your post".
 */
export async function notifyLike(event: SimpleEvent, actor: SimpleActor) {
  // Don't notify if the admin is the one liking their own post, or if no admin exists
  if (!event.admin_id || event.admin_id === actor.id) return;

  // 1) Try to find the latest 'reaction' notification for this event
  const { data: existing } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", event.admin_id)
    .eq("type", "reaction")
    .eq("data->>event_id", event.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const actorName = actor.username ?? "Someone";

  if (!existing) {
    // 2) No existing notification -> create a fresh one
    await createNotification({
      userId: event.admin_id,
      fromUserId: actor.id,
      type: "reaction",
      title: actorName,
      actionText: "liked your post",
      body: event.title ?? "New like",
      data: {
        event_id: event.id,
        actors: [actorName], // track who liked
        link: `/event/${event.id}`,
      },
    });
    return;
  }

  // 3) Existing notification -> update it
  const existingActors = Array.isArray((existing as any).data?.actors)
    ? [...(existing as any).data.actors]
    : [];

  if (!existingActors.includes(actorName)) {
    existingActors.push(actorName);
  }

  const count = existingActors.length;
  let body: string;

  if (count === 1) {
    body = `${existingActors[0]} liked your post`;
  } else if (count === 2) {
    body = `${existingActors[0]} and ${existingActors[1]} liked your post`;
  } else {
    body = `${existingActors[0]} and ${count - 1} others liked your post`;
  }

  await supabase
    .from("notifications")
    .update({
      title: event.title ?? "New likes",
      action_text: null,
      body, // e.g. "Alex and 3 others liked your post"
      data: {
        ...(existing as any).data,
        actors: existingActors,
        event_id: event.id,
        link: `/event/${event.id}`,
      },
      is_unread: true,
      read_at: null, // Mark as unread again so it pops up
    })
    .eq("id", existing.id);
}

/**
 * Group COMMENT notifications for the same event:
 * - If no 'comment' notification exists, create one.
 * - If there is one, update it to "X and N others commented on your post".
 */
export async function notifyComment(
  event: SimpleEvent,
  actor: SimpleActor,
  preview: string,   // short text of the latest comment
  commentId: string  // id of the latest comment
) {
  // Don't notify if the admin is the one commenting on their own post
  if (!event.admin_id || event.admin_id === actor.id) return;

  // 1) Try to find the latest 'comment' notification for this event
  const { data: existing } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", event.admin_id)
    .eq("type", "comment")
    .eq("data->>event_id", event.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const actorName = actor.username ?? "Someone";

  if (!existing) {
    // 2) No existing notification -> create a fresh one
    await createNotification({
      userId: event.admin_id,
      fromUserId: actor.id,
      type: "comment",
      title: event.title ?? "New comment",
      body: `${actorName} commented: ${preview}`,
      data: {
        event_id: event.id,
        actors: [actorName],
        last_comment_preview: preview,
        last_comment_id: commentId,
        link: `/event/${event.id}`,
      },
    });
    return;
  }

  // 3) Existing notification -> update it
  const existingActors = Array.isArray((existing as any).data?.actors)
    ? [...(existing as any).data.actors]
    : [];

  if (!existingActors.includes(actorName)) {
    existingActors.push(actorName);
  }

  const count = existingActors.length;
  let body: string;

  if (count === 1) {
    body = `${existingActors[0]} commented on your post`;
  } else if (count === 2) {
    body = `${existingActors[0]} and ${existingActors[1]} commented on your post`;
  } else {
    body = `${existingActors[0]} and ${count - 1} others commented on your post`;
  }

  await supabase
    .from("notifications")
    .update({
      title: event.title ?? "New comments",
      action_text: null,
      body, 
      data: {
        ...(existing as any).data,
        actors: existingActors,
        last_comment_preview: preview,
        last_comment_id: commentId,
        event_id: event.id,
        link: `/event/${event.id}`,
      },
      is_unread: true,
      read_at: null,
    })
    .eq("id", existing.id);
}