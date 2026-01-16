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
  | "vaccination"
  | "new_post"
  | "system"
  // ✅ NEW TYPES
  | "official_event"
  | "event_reminder";

/** Simple shapes so we don't depend heavily on your types file */
type SimpleEvent = {
  id: string;
  admin_id: string | null;
  title: string | null;
};
type SimpleActor = { id: string; username?: string | null };

export async function notifyRegistrationUpdate(
  userId: string,
  eventId: string,
  eventTitle: string,
  status:
    | "approved"
    | "waitlist"
    | "joined_waitlist"
    | "rejected"
    | "checked_in"
    | "removed",
  adminId: string
) {
  let type = "";
  let title = "";
  let body = "";

  switch (status) {
    case "approved":
      type = "registration_approved";
      title = "Registration Confirmed";
      body = `You are accepted to attend "${eventTitle}". See you there!`;
      break;

    case "joined_waitlist": // User joined normally but event was full
      type = "registration_waitlist";
      title = "Added to Waitlist";
      body = `You are on the waitlist for "${eventTitle}". We'll notify you if a spot opens.`;
      break;

    case "waitlist": // Admin manually moved user to waitlist
      type = "registration_waitlist";
      title = "Waitlist Update";
      body = `You have been moved to the waitlist for "${eventTitle}".`;
      break;

    case "rejected": // Admin explicitly declined the request
      type = "registration_rejected";
      title = "Registration Declined";
      body = `Your registration for "${eventTitle}" was not accepted at this time.`;
      break;

    case "removed": // User was deleted from the guest list
      type = "registration_removed";
      title = "Removed from Guest List";
      body = `You are no longer registered for "${eventTitle}".`; // ✅ FIXED: Removed waitlist mention
      break;

    case "checked_in":
      type = "event_checkin";
      title = "Welcome!";
      body = `Thanks for attending "${eventTitle}"!`;
      break;

    default:
      return;
  }
  try {
    // @ts-ignore (Ignore TS error until you update the type definition file)
    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      from_user_id: adminId,
      type: type, // ✅ Using specific type now
      title: title,
      body: body,
      data: { link: `/official-event/${eventId}`, event_id: eventId },
      is_unread: true,
    });

    if (error) throw error;
  } catch (err) {
    console.error("Failed to notify registration status:", err);
  }

  // Supabase insert logic follows...
}
// --- Permission & Token Management ---

// ... existing code ...

// ✅ NEW: Notify for Regular Posts (Replaces the deleted trigger)
export async function notifyNewPost(post: {
  id: string;
  admin_id: string;
  username: string;
}) {
  try {
    // 1. Get recipients (All users except author)
    // Note: If you have a "Followers" system, you would fetch followers here instead.
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id")
      .neq("id", post.admin_id);

    if (error || !users) throw error;
    if (users.length === 0) return;

    // 2. Prepare notifications
    const notifications = users.map((user) => ({
      user_id: user.id,
      from_user_id: post.admin_id,
      type: "new_post", // <--- This triggers the Blue Globe Icon
      title: "New Post",
      body: "posted a new update",
      data: {
        link: `/event/${post.id}`,
        event_id: post.id,
      },
      is_unread: true,
    }));

    // 3. Batch Insert
    await supabase.from("notifications").insert(notifications);
    console.log(`Sent new post notification to ${notifications.length} users.`);
  } catch (err) {
    console.error("Failed to notify new post:", err);
  }
}

export async function notifyAllUsers(event: {
  id: string;
  title: string;
  admin_id: string;
}) {
  try {
    // 1. Get ALL user IDs except the admin
    const { data: users, error } = await supabase
      .from("profiles")
      .select("id")
      .neq("id", event.admin_id); // Don't notify the sender

    if (error || !users) throw error;

    if (users.length === 0) return;

    // 2. Prepare notifications in bulk
    const notifications = users.map((user) => ({
      user_id: user.id,
      from_user_id: event.admin_id,
      type: "official_event",
      title: "New Official Event",
      body: event.title,
      data: {
        link: `/official-event/${event.id}`,
        event_id: event.id,
      },
      is_unread: true,
    }));

    // 3. Insert in one batch
    const { error: insertError } = await supabase
      .from("notifications")
      .insert(notifications);

    if (insertError) throw insertError;
    console.log(
      `Sent official event notification to ${notifications.length} users.`
    );
  } catch (err) {
    console.error("Failed to notify all users:", err);
  }
}

export async function notifyAttendees(
  eventId: string,
  eventTitle: string,
  message: string,
  adminId: string
) {
  try {
    // 1. Get everyone registered (Approved + Checked In)
    const { data: attendees, error } = await supabase
      .from("event_registrations")
      .select("user_id")
      .eq("event_id", eventId)
      .in("status", ["approved", "checked_in"]);

    if (error || !attendees) throw error;

    // Filter out the admin if they registered for testing
    const validAttendees = attendees.filter((a) => a.user_id !== adminId);

    if (validAttendees.length === 0) return;

    // 2. Prepare notifications
    const notifications = validAttendees.map((a) => ({
      user_id: a.user_id,
      from_user_id: adminId,
      type: "event_reminder",
      title: `Reminder: ${eventTitle}`,
      body: message,
      data: {
        link: `/official-event/${eventId}`,
        event_id: eventId,
      },
      is_unread: true,
    }));

    // 3. Insert
    await supabase.from("notifications").insert(notifications);
    console.log(`Sent reminder to ${notifications.length} attendees.`);
  } catch (err) {
    console.error("Failed to notify attendees:", err);
  }
}


export async function requestNotificationPermission(): Promise<string | null> {
  // ✅ FIX: This check MUST be at the very top to prevent crashes on iOS Safari
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return null;
  }

  try {
    // Check if permission is already granted
    // Now safe to access 'Notification' because we passed the check above
    if (Notification.permission === "granted") {
      return await getFCMToken();
    }

    // Request permission
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      return await getFCMToken();
    } else {
      console.warn("Notification permission denied.");
    }
  } catch (err) {
    console.error("Error requesting notification permission:", err);
  }
  return null;
}

async function getFCMToken(): Promise<string | null> {
  try {
    // ❌ REMOVED: This check was blocking your hardcoded key below
    // if (!import.meta.env.VITE_FIREBASE_VAPID_KEY) { ... }

    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );

      await navigator.serviceWorker.ready;

      const token = await getToken(messaging, {
        // ✅ Your hardcoded key is now guaranteed to run
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,

        serviceWorkerRegistration: registration,
      });

      if (token) {
        await saveTokenToDatabase(token);
      }

      return token || null;
    } else {
      console.error("Service workers are not supported in this browser.");
      return null;
    }
  } catch (error) {
    console.error("Error retrieving FCM token:", error);
    return null;
  }
}

// Helper to save token (if you aren't doing this elsewhere)
async function saveTokenToDatabase(token: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    // Upsert logic for your fcm_tokens table
    const { error } = await supabase.from("fcm_tokens").upsert(
      {
        user_id: user.id,
        token: token,
        device_type: /iPhone|iPad|iPod/.test(navigator.userAgent)
          ? "ios"
          : "web",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "token" }
    );

    if (error) console.error("Error saving FCM token:", error);
  }
}

export function setupForegroundNotificationHandler() {
  onMessage(messaging, (payload) => {
    console.log("Foreground Message Received:", payload);
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
// src/lib/NotificationService.ts

export async function notifyScheduleCreation(
  userId: string,
  petId: string,
  scheduleTitle: string,
  date: string,
  type: string // This receives "vaccine", "grooming", "checkup", etc.
) {
  try {
    const { data: pet } = await supabase
      .from("pets")
      .select("name")
      .eq("id", petId)
      .single();

    const petName = pet?.name || "your pet";

    const { error } = await supabase.from("notifications").insert({
      user_id: userId,
      from_user_id: userId,
      type: "schedule", // ✅ Keeps DB clean: Always "schedule"
      title: "Appointment Scheduled",
      body: `You scheduled "${scheduleTitle}" (${type}) for ${petName} on ${date}.`,
      data: { 
        link: `/pet-profile/${petId}`, 
        pet_id: petId,
        subtype: type // ✅ Stores "vaccine", "grooming", etc. here
      },
      is_unread: true,
    });

    if (error) throw error;
  } catch (err) {
    console.error("Failed to notify:", err);
  }
}

export async function notifyLike(event: SimpleEvent, actor: SimpleActor) {
  if (!event.admin_id || event.admin_id === actor.id) return;

  const actorName = actor.username ?? "Someone";

  const { error } = await supabase.rpc("send_grouped_notification", {
    p_user_id: event.admin_id,
    p_from_user_id: actor.id,
    p_type: "reaction",
    p_event_id: event.id,
    p_actor_name: actorName,
    // 👇 CHANGE THIS: This becomes the "New like" text in your screenshot
    p_preview_text: "New like",
    p_link: `/event/${event.id}?action=like`,
    p_title: "Post Activity", // Keep title generic or internal
  });

  if (error) console.error("Error sending like notification:", error);
}

export async function notifyComment(
  event: SimpleEvent,
  actor: SimpleActor,
  preview: string, // This is the "hey" from your screenshot
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
    // 👇 CHANGE THIS: This passes the actual comment content (e.g., "hey")
    p_preview_text: shortPreview,
    p_link: `/event/${event.id}?comment_id=${commentId}`,
    p_title: "New Comment",
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
  // ✅ FIX 1: Robust Regex
  // Matches @user, @user.name, @user-name (allows dots and dashes)
  const mentionRegex = /@([\w.-]+)/g;

  // 1. Extract matches
  const rawMatches = [...commentContent.matchAll(mentionRegex)].map(
    (m) => m[1]
  );

  if (rawMatches.length === 0) return;

  // ✅ FIX 2: Normalize to Lowercase
  // This ensures that if I type "@Mihhg", it still finds "mihhg" in the database
  const uniqueUsernames = [
    ...new Set(rawMatches.map((name) => name.toLowerCase())),
  ];

  // 2. Fetch User IDs from Database
  const { data: mentionedUsers, error } = await supabase
    .from("profiles")
    .select("id, username")
    .in("username", uniqueUsernames); // Looking up normalized names

  if (error || !mentionedUsers || mentionedUsers.length === 0) {
    if (error) console.error("Error fetching mentioned users:", error);
    return;
  }

  const actorName = actor.username ?? "Someone";

  // 3. Loop through and Notify
  for (const user of mentionedUsers) {
    // 🛑 Prevent Self-Notification
    if (user.id === actor.id) continue;

    // 🛑 Prevent Double Notification (Reply + Mention)
    // If we already sent a "Reply" notification to this user, skip the "Mention"
    if (excludeUserIds.includes(user.id)) continue;

    // ✅ Send Notification
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
