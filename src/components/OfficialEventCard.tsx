import { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ Import useNavigate
import { format, isPast, isSameDay } from "date-fns";
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
  ArrowRight,
  Hourglass,
  Radio,
  XCircle,
  UserCheck,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OutreachEvent } from "@/types";

interface OfficialEventCardProps {
  event: OutreachEvent;
  isRegistered: boolean;
  registrationStatus?: string;
  onRegister: () => Promise<void> | void;
  onUnregister?: () => Promise<void> | void;
  onEdit: () => void;
  isAdmin: boolean;
  currentCount?: number;
  onDelete?: () => void;
  onSuccess?: () => void;
  onHide?: () => void;
  onRefresh?: () => void;
  isHidden?: boolean;
}

export function OfficialEventCard({
  event,
  isRegistered,
  registrationStatus,
  onRegister,
  onUnregister,
  onEdit,
  isAdmin,
  currentCount = 0,
}: OfficialEventCardProps) {
  const navigate = useNavigate(); // ✅ Initialize hook
  const [isLoading, setIsLoading] = useState(false);

  // ✅ New Handler: Navigates to details page
  const handleCardClick = () => {
    navigate(`/official-event/${event.id}`);
  };

  // --- 1. INTERACTION HANDLERS ---
  const handleRegisterClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // ✅ Stop click from bubbling to card
    setIsLoading(true);
    try {
      await onRegister();
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnregisterClick = async (e: React.MouseEvent) => {
    e.stopPropagation(); // ✅ Stop click from bubbling to card
    if (!confirm("Are you sure you want to leave this event?")) return;

    setIsLoading(true);
    try {
      if (onUnregister) await onUnregister();
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. THEME & DISPLAY LOGIC ---
  const getTheme = (type?: string) => {
    switch (type) {
      case "pet":
        return {
          icon: PawPrint,
          label: "Pet Service",
          gradient: "from-orange-400 to-red-400",
          text: "text-orange-700",
        };
      case "member":
        return {
          icon: Briefcase,
          label: "Members Only",
          gradient: "from-blue-400 to-indigo-400",
          text: "text-blue-700",
        };
      case "campus":
        return {
          icon: Tent,
          label: "Campus Event",
          gradient: "from-emerald-400 to-teal-400",
          text: "text-emerald-700",
        };
      default:
        return {
          icon: CalendarCheck,
          label: "Official Event",
          gradient: "from-purple-400 to-pink-400",
          text: "text-purple-700",
        };
    }
  };

  const theme = getTheme(event.event_type);
  const BadgeIcon = theme.icon;
  const eventDate = event.event_date ? new Date(event.event_date) : new Date();

  // Happening Now Logic
  const isHappeningNow = (() => {
    const isToday = isSameDay(eventDate, new Date());
    if (!isToday || !event.start_time || !event.end_time) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = event.start_time.split(":").map(Number);
    const [endH, endM] = event.end_time.split(":").map(Number);
    return (
      currentMinutes >= startH * 60 + startM &&
      currentMinutes <= endH * 60 + endM
    );
  })();

  // Deadline Logic
  const deadlineDate = event.registration_deadline
    ? new Date(event.registration_deadline)
    : null;
  const isDeadlinePassed = deadlineDate ? isPast(deadlineDate) : false;
  const isClosed = event.registration_closed_manually || isDeadlinePassed;
  const isUrgent =
    deadlineDate && !isClosed
      ? deadlineDate.getTime() - Date.now() < 48 * 60 * 60 * 1000
      : false;

  // Waitlist Logic
  const limit = event.max_attendees || 0;
  const isWaitlistMode = limit > 0 && currentCount >= limit;

  return (
    // ✅ Added onClick and cursor-pointer to main container
    <div
      onClick={handleCardClick}
      className="group relative bg-white rounded-[1.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col h-full cursor-pointer"
    >
      {/* Hero Image Section */}
      <div className="relative h-48 w-full shrink-0 overflow-hidden">
        {event.images && event.images.length > 0 ? (
          <img
            src={event.images[0]}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            alt={event.title}
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${theme.gradient} relative`}
          >
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
            <div className="absolute inset-0 flex items-center justify-center text-white/20">
              <BadgeIcon size={64} />
            </div>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-60" />

        <div className="absolute top-4 left-4 flex flex-col items-center justify-center w-12 h-14 rounded-xl bg-white/90 backdrop-blur-md shadow-lg text-center border border-white/50">
          <span className="text-[10px] font-bold text-gray-500 uppercase leading-none mt-1">
            {format(eventDate, "MMM")}
          </span>
          <span className="text-xl font-black text-gray-900 leading-none">
            {format(eventDate, "d")}
          </span>
        </div>

        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          <div
            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5 shadow-sm backdrop-blur-md bg-white/90 ${theme.text}`}
          >
            <BadgeIcon size={12} /> {theme.label}
          </div>
          {isHappeningNow && (
            <div className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide flex items-center gap-1.5 shadow-sm backdrop-blur-md bg-red-600 text-white animate-pulse">
              <Radio size={12} /> Live
            </div>
          )}
        </div>
      </div>

      {/* Content Section */}
      <div className="p-5 flex-1 flex flex-col">
        <h3 className="text-xl font-black text-gray-900 leading-tight mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {event.title}
        </h3>

        <div className="space-y-2 mt-1 mb-4">
          <div
            className={`flex items-center gap-2 text-sm font-medium ${
              isHappeningNow ? "text-red-600" : "text-gray-500"
            }`}
          >
            <Clock
              className={`w-4 h-4 ${
                isHappeningNow ? "text-red-600" : "text-blue-500/70"
              }`}
            />
            <span>
              {event.start_time
                ? format(new Date(`2000-01-01T${event.start_time}`), "h:mm a")
                : "TBD"}
              {event.end_time &&
                ` - ${format(
                  new Date(`2000-01-01T${event.end_time}`),
                  "h:mm a"
                )}`}
            </span>
          </div>

          <a
            href={`http://googleusercontent.com/maps.google.com/search?q=${encodeURIComponent(
              event.location
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()} // ✅ Stop propagation
            className="flex items-start gap-2 text-sm text-gray-500 hover:text-blue-600 hover:bg-blue-50 p-1 -ml-1 rounded-lg transition-colors group/loc"
          >
            <MapPin className="w-4 h-4 text-red-500/70 mt-0.5 group-hover/loc:text-red-600" />
            <span className="truncate underline decoration-dotted decoration-gray-300 underline-offset-4">
              {event.location}
            </span>
          </a>

          {(deadlineDate || event.registration_closed_manually) && (
            <div
              className={`flex items-center gap-2 text-[12px] font-bold pt-1 transition-all ${
                isClosed
                  ? "text-gray-400"
                  : isUrgent
                  ? "text-red-600 animate-pulse"
                  : "text-amber-600"
              }`}
            >
              {isClosed ? (
                <XCircle className="w-4 h-4 text-gray-300" />
              ) : (
                <CalendarCheck
                  className={`w-4 h-4 ${
                    isUrgent ? "text-red-500" : "text-amber-500"
                  }`}
                />
              )}
              <span>
                {event.registration_closed_manually
                  ? "Registration Closed"
                  : isDeadlinePassed
                  ? `Deadline Passed (${format(deadlineDate!, "MMM d")})`
                  : isUrgent
                  ? `Ends Soon: ${format(deadlineDate!, "MMM d @ h:mm a")}`
                  : `Deadline: ${format(deadlineDate!, "MMM d")}`}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-auto border-t border-gray-100 pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[9px] font-bold text-gray-400">
              <Users size={12} />
            </div>
            <span className="text-xs text-gray-500 font-medium pl-1">
              {event.max_attendees ? (
                <>
                  <span className="text-gray-500">{currentCount}</span>
                  <span className="text-gray-400 mx-1">/</span>
                  {event.max_attendees}
                </>
              ) : (
                <>{currentCount} Going</>
              )}
            </span>
          </div>

          {/* --- BUTTON LOGIC --- */}
          {isAdmin ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation(); // ✅ Stop propagation
                onEdit();
              }}
              className="text-gray-400 hover:text-gray-900"
            >
              <MoreHorizontal size={18} />
            </Button>
          ) : isRegistered ? (
            registrationStatus === "rejected" ? (
              <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-3 py-1.5 rounded-full text-xs font-bold border border-red-100 cursor-not-allowed">
                <ShieldAlert size={14} /> Declined
              </div>
            ) : (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-opacity hover:opacity-80 ${
                  isLoading ? "opacity-50 pointer-events-none" : ""
                } ${
                  registrationStatus === "waitlist"
                    ? "text-amber-600 bg-amber-50"
                    : registrationStatus === "checked_in"
                    ? "text-blue-600 bg-blue-50"
                    : "text-green-600 bg-green-50"
                }`}
                onClick={handleUnregisterClick} // ✅ Already has stopPropagation
              >
                {isLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : registrationStatus === "waitlist" ? (
                  <>
                    <Hourglass size={14} /> Waitlist
                  </>
                ) : registrationStatus === "checked_in" ? (
                  <>
                    <UserCheck size={14} /> Checked In
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} /> Going
                  </>
                )}
              </div>
            )
          ) : (
            <Button
              disabled={isClosed || isLoading}
              onClick={handleRegisterClick} // ✅ Already has stopPropagation
              className={`rounded-full font-bold text-xs h-9 px-5 shadow-lg transition-all active:scale-95 ${
                isClosed
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                  : isWaitlistMode
                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200"
                  : "bg-gray-900 text-white shadow-gray-200 hover:bg-blue-600 hover:shadow-blue-200"
              }`}
            >
              {isLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : isClosed ? (
                "Closed"
              ) : isWaitlistMode ? (
                "Join Waitlist"
              ) : (
                "Register"
              )}
              {!isClosed && !isLoading && (
                <ArrowRight size={14} className="ml-1 opacity-70" />
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
