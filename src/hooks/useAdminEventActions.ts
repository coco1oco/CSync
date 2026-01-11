import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { notifyRegistrationUpdate } from "@/lib/NotificationService";

export function useAdminEventActions() {
  const queryClient = useQueryClient();

  // --- 1. EVENT ACTIONS ---

  const deleteEvent = useMutation({
    mutationFn: async (eventId: string) => {
      const { error } = await supabase
        .from("outreach_events")
        .delete()
        .eq("id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
    onError: () => toast.error("Failed to delete event"),
  });

  const toggleEventHide = useMutation({
    mutationFn: async ({ id, isHidden }: { id: string; isHidden: boolean }) => {
      const { error } = await supabase
        .from("outreach_events")
        .update({ is_hidden: !isHidden })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.isHidden ? "Event is now visible" : "Event hidden"
      );
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
  });

  const toggleRegistrationLock = useMutation({
    mutationFn: async ({ id, isClosed }: { id: string; isClosed: boolean }) => {
      const { error } = await supabase
        .from("outreach_events")
        .update({ registration_closed_manually: !isClosed })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast.success(
        variables.isClosed ? "Registration Re-opened" : "Registration Closed"
      );
      queryClient.invalidateQueries({
        queryKey: ["event-details", variables.id],
      });
    },
  });

  // --- 2. GUEST ACTIONS ---

  const updateGuestStatus = useMutation({
    mutationFn: async ({
      registrationId,
      newStatus,
      eventId,
      eventTitle,
      userId,
      adminId,
    }: {
      registrationId: string;
      newStatus: string;
      eventId: string;
      eventTitle: string;
      userId: string;
      adminId: string;
    }) => {
      const { error } = await supabase
        .from("event_registrations")
        .update({ status: newStatus })
        .eq("id", registrationId);
      if (error) throw error;

      // ✅ FIX: Strict mapping to allowed NotificationTypes
      // allowed: "waitlist" | "approved" | "checked_in" | "rejected" | "joined_waitlist" | "removed"

      let notifType:
        | "waitlist"
        | "approved"
        | "checked_in"
        | "rejected"
        | null = null;

      if (newStatus === "waitlist") notifType = "waitlist";
      else if (newStatus === "approved") notifType = "approved";
      else if (newStatus === "checked_in") notifType = "checked_in";
      else if (newStatus === "rejected") notifType = "rejected";

      // Only send if it matches a valid notification type
      if (notifType) {
        await notifyRegistrationUpdate(
          userId,
          eventId,
          eventTitle,
          notifType,
          adminId
        );
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["event-details", variables.eventId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });

      if (variables.newStatus === "checked_in") toast.success("Checked in!");
      else if (variables.newStatus === "approved")
        toast.success("Guest Approved");
      else if (variables.newStatus === "waitlist")
        toast.success("Moved to Waitlist");
      else if (variables.newStatus === "rejected")
        toast.success("Guest Rejected");
    },
    onError: () => toast.error("Failed to update status"),
  });

  const removeGuest = useMutation({
    mutationFn: async ({
      registrationId,
      userId,
      eventId,
      eventTitle,
      adminId,
    }: any) => {
      const { error } = await supabase
        .from("event_registrations")
        .delete()
        .eq("id", registrationId);
      if (error) throw error;

      await notifyRegistrationUpdate(
        userId,
        eventId,
        eventTitle,
        "removed",
        adminId
      );
    },
    onSuccess: (_, variables) => {
      toast.success("Guest removed");
      queryClient.invalidateQueries({
        queryKey: ["event-details", variables.eventId],
      });
      queryClient.invalidateQueries({ queryKey: ["admin-events"] });
    },
  });

  return {
    deleteEvent,
    toggleEventHide,
    toggleRegistrationLock,
    updateGuestStatus,
    removeGuest,
  };
}
