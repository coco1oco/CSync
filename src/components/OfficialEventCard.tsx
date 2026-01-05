import { format, isPast, isSameDay } from "date-fns";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom"; 
import {
  MapPin,
  Clock,
  Users,
  MoreHorizontal,
  CalendarCheck,
  CheckCircle2,
  PawPrint,
  Briefcase,
  Tent,
  AlertCircle,
  XCircle,
  CalendarPlus,
  Hourglass,
  Edit,
  Trash2,
  UserCheck,
  Radio,
  Loader2,
  Eye,
  EyeOff,
  Timer // ✅ Added Timer icon for deadline
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OutreachEvent } from "@/types";
import { createGoogleCalendarLink } from "@/lib/calendarUtil";
import { notifyRegistrationUpdate } from "@/lib/NotificationService";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { toast } from "react-toastify";

interface OfficialEventCardProps {
  event: OutreachEvent;
  isRegistered: boolean;
  registrationStatus?: "approved" | "waitlist" | "checked_in" | "pending" | "rejected" | null;
  onRegister: () => void;
  onUnregister?: () => void;
  onEdit: () => void;
  onDelete?: () => void;
  onHide?: () => void;
  isHidden?: boolean;
  isAdmin: boolean;
  currentCount?: number;
  onSuccess?: () => void;
}

export function OfficialEventCard({
  event,
  isRegistered,
  registrationStatus,
  onRegister,
  onUnregister,
  onEdit,
  onDelete,
  onHide,
  isHidden,
  isAdmin,
  currentCount = 0,
  onSuccess,
}: OfficialEventCardProps) {
  const navigate = useNavigate(); 
  const [isHoveringRegistered, setIsHoveringRegistered] = useState(false);
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const handleCardClick = () => {
    navigate(`/official-event/${event.id}`);
  };

  const getCategoryBadge = (type?: string) => {
    switch (type) {
      case "pet": return { icon: PawPrint, label: "Pet Service", color: "text-orange-600 bg-orange-50 border-orange-100" };
      case "member": return { icon: Briefcase, label: "Members Only", color: "text-blue-600 bg-blue-50 border-blue-100" };
      case "campus": return { icon: Tent, label: "Campus Event", color: "text-green-600 bg-green-50 border-green-100" };
      default: return { icon: CalendarCheck, label: "Official Event", color: "text-purple-600 bg-purple-50 border-purple-100" };
    }
  };

  const badge = getCategoryBadge(event.event_type);
  const BadgeIcon = badge.icon;
  const eventDate = event.event_date ? new Date(event.event_date) : new Date();
  const month = format(eventDate, "MMM").toUpperCase();
  const day = format(eventDate, "d");

  // --- 📅 DEADLINE LOGIC ---
  const deadlineDate = event.registration_deadline ? new Date(event.registration_deadline) : null;
  const isDeadlinePassed = deadlineDate ? isPast(deadlineDate) : false;
  const isClosedManually = event.registration_closed_manually;
  
  // Determine Deadline Badge State
  const getDeadlineBadge = () => {
    if (isClosedManually) {
      return { label: "Registration Closed", color: "text-red-600 bg-red-50 border-red-100", icon: XCircle };
    }
    if (isDeadlinePassed) {
      return { label: "Deadline Passed", color: "text-gray-500 bg-gray-100 border-gray-200", icon: Timer };
    }
    if (deadlineDate) {
      return { label: `Register by ${format(deadlineDate, "MMM d")}`, color: "text-green-600 bg-green-50 border-green-100", icon: Clock };
    }
    return null; // No deadline set
  };

  const deadlineBadge = getDeadlineBadge();
  const DeadlineIcon = deadlineBadge?.icon;
  // --------------------------

  const isEventToday = isSameDay(eventDate, new Date());

  const isHappeningNow = (() => {
    if (!isEventToday || !event.start_time || !event.end_time) return false;
    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = event.start_time.split(":").map(Number);
    const startTotal = startH * 60 + startM;
    const [endH, endM] = event.end_time.split(":").map(Number);
    const endTotal = endH * 60 + endM;
    return currentMinutes >= startTotal && currentMinutes <= endTotal;
  })();

  const max = event.max_attendees;
  const isWaitlistMode = max ? currentCount >= max : false;
  const googleCalendarUrl = createGoogleCalendarLink(event);
  const isWaitlisted = registrationStatus === "waitlist";
  const isCheckedIn = registrationStatus === "checked_in";
  const isRejected = registrationStatus === "rejected";

  const handleRegisterInternal = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user || isRegistering) return;
    setIsRegistering(true);
    
    const isWaitlist = event.max_attendees && (currentCount || 0) >= event.max_attendees;
    const dbStatus = isWaitlist ? "waitlist" : "approved"; 

    try {
      const { error } = await supabase.from("event_registrations").insert({
        event_id: event.id,
        user_id: user.id,
        status: dbStatus,
      });

      if (error) {
        if (error.code === '23505') {
             toast.info("You are already registered for this event.");
             if (onSuccess) onSuccess(); 
             return; 
        }
        throw error;
      }

      const notificationStatus = isWaitlist ? "joined_waitlist" : "approved";

      await notifyRegistrationUpdate(
          user.id, 
          event.id, 
          event.title, 
          notificationStatus, 
          user.id
      );
      
      toast.success(isWaitlist ? "Added to waitlist" : "Successfully registered!");
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error(error);
      toast.error("Registration failed");
    } finally {
      setIsRegistering(false);
    }
  };

  const handleUnregisterInternal = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!user) return;
    if (!window.confirm("Are you sure you want to leave this event?")) return;
    setIsRegistering(true);

    try {
      const { data: promotedUserId, error } = await supabase.rpc("leave_event", {
        p_event_id: event.id,
        p_user_id: user.id,
      });
      if (error) throw error;
      toast.success("You have left the event.");
      if (promotedUserId) {
        await notifyRegistrationUpdate(promotedUserId, event.id, event.title, "approved", event.admin_id || user.id);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error("Failed to leave event");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div
      onClick={handleCardClick} 
      className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all overflow-hidden mb-4 group relative cursor-pointer ${
        isEventToday ? "border-red-200 shadow-red-50 ring-1 ring-red-100" : "border-gray-200"
      } ${isHidden ? "opacity-75 bg-gray-50" : ""}`}
    >
      {isAdmin && (
        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                onClick={(e) => e.stopPropagation()} 
                className="p-1.5 bg-white/90 backdrop-blur rounded-full text-gray-500 hover:text-blue-600 shadow-sm transition-colors focus:outline-none"
              >
                <MoreHorizontal size={18} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white shadow-lg rounded-xl border border-gray-100 p-1 min-w-[140px]">
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer"
              >
                <Edit size={14} /> Edit
              </DropdownMenuItem>

              {onHide && (
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onHide(); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                  {isHidden ? "Unhide Event" : "Hide Event"}
                </DropdownMenuItem>
              )}

              {onDelete && (
                <DropdownMenuItem
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 focus:bg-red-50 focus:text-red-700 cursor-pointer"
                >
                  <Trash2 size={14} /> Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {isHidden && (
        <div className="absolute top-3 right-12 z-10 px-2 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold uppercase rounded-md border border-gray-200 shadow-sm">
          Hidden
        </div>
      )}

      {event.images && event.images.length > 0 && (
        <div className="h-40 w-full relative">
          <img src={event.images[0]} className={`w-full h-full object-cover ${isHidden ? "grayscale" : ""}`} alt="Event Cover" />
          
          <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
             {/* 1. Happening Now or Category Badge */}
             {isHappeningNow ? (
                <div className="px-2.5 py-1 rounded-md border border-red-500 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 shadow-sm">
                  <Radio size={12} className="relative inline-flex" /> HAPPENING NOW
                </div>
              ) : (
                <div className={`px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 shadow-sm bg-white/95 ${badge.color.replace("bg-", "text-")}`}>
                  <BadgeIcon size={12} /> {badge.label}
                </div>
              )}

             {/* 2. ✅ NEW: Deadline Badge */}
             {deadlineBadge && (
                <div className={`px-2 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wide flex items-center gap-1.5 shadow-sm ${deadlineBadge.color}`}>
                   {DeadlineIcon && <DeadlineIcon size={12} />} {deadlineBadge.label}
                </div>
             )}
          </div>
        </div>
      )}

      <div className="p-5 flex gap-4">
        <div className={`shrink-0 flex flex-col items-center justify-center w-14 h-16 rounded-xl border shadow-sm ${isEventToday ? "bg-red-50 border-red-100" : "bg-gray-50 border-gray-100"}`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${isEventToday ? "text-red-600" : "text-red-500"}`}>{month}</span>
          <span className={`text-2xl font-black leading-none ${isEventToday ? "text-red-700" : "text-gray-900"}`}>{day}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-900 leading-tight mb-1 truncate">{event.title}</h3>
          <div className="space-y-1 mt-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className={`w-4 h-4 shrink-0 ${isHappeningNow ? "text-red-500" : "text-gray-400"}`} />
              <span className={`truncate ${isHappeningNow ? "font-bold text-red-600" : ""}`}>
                {isEventToday ? "Today, " : ""}
                {event.start_time ? format(new Date(`2000-01-01T${event.start_time}`), "h:mm a") : "TBD"}
                {event.end_time && ` - ${format(new Date(`2000-01-01T${event.end_time}`), "h:mm a")}`}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
              <Users className="w-3.5 h-3.5 text-gray-400" />
                {event.max_attendees ? `${currentCount} / ${event.max_attendees} spots filled` : `${currentCount} attending`}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="flex -space-x-2 overflow-hidden">
              <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-gray-500">?</div>
            </div>

            <div className="flex items-center gap-2">
              {isRegistered && (
                <a 
                  href={googleCalendarUrl} 
                  target="_blank" 
                  rel="noreferrer" 
                  onClick={(e) => e.stopPropagation()} 
                  className="inline-flex"
                >
                  <Button size="sm" variant="outline" className="h-9 w-9 p-0 rounded-full border-gray-200 text-gray-500 hover:text-blue-600 hover:bg-blue-50">
                    <CalendarPlus size={18} />
                  </Button>
                </a>
              )}

              {!isAdmin && (
                <>
                  {isRegistered ? (
                    <Button
                      onClick={isCheckedIn || isRejected ? undefined : handleUnregisterInternal}  
                      disabled={isRegistering || isRejected}
                      onMouseEnter={() => setIsHoveringRegistered(true)}
                      onMouseLeave={() => setIsHoveringRegistered(false)}
                      size="sm"
                      variant="outline"
                      className={`h-9 gap-1.5 border transition-all w-32 ${
                        isHoveringRegistered && !isCheckedIn
                          ? "bg-red-50 text-red-600 border-red-200"
                          : isCheckedIn
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : isWaitlisted
                          ? "bg-amber-50 text-amber-600 border-amber-200"
                          : isRejected 
                          ? "bg-red-100 text-red-700 border-red-200 opacity-100" 
                          : "bg-green-50 text-green-600 border-green-200"
                      }`}
                    >
                      {isHoveringRegistered && !isCheckedIn ? (
                        <> <XCircle size={16} /> Leave </>
                      ) : isCheckedIn ? (
                        <> <UserCheck size={16} /> Checked In </>
                      ) : isWaitlisted ? (
                        <> <Hourglass size={16} /> Waitlisted </>
                      ) :  isRejected ? (
                        <> <XCircle size={16} /> Declined </> 
                      ):(
                        <> <CheckCircle2 size={16} /> Going </>
                      )}
                    </Button>
                  ) : (
                    <Button
                      onClick={handleRegisterInternal} 
                      disabled={isRegistering || isClosedManually || isDeadlinePassed}
                      size="sm"
                      className={`h-9 px-6 font-bold rounded-full shadow-sm transition-all ${
                        isClosedManually || isDeadlinePassed
                          ? "bg-gray-100 text-gray-400 border border-gray-200" // Grayed out style
                          : isWaitlistMode
                          ? "bg-amber-100 text-amber-700 border border-amber-200"
                          : "bg-black text-white"
                      }`}
                    >
                      {isRegistering ? (
                        <> <Loader2 className="animate-spin w-4 h-4 mr-2" /> Processing... </>
                      ) : isClosedManually ? "Closed" : isDeadlinePassed ? "Ended" : isWaitlistMode ? "Join Waitlist" : "Register"}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}