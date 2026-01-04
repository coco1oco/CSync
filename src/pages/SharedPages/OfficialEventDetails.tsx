import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/context/authContext";
import { format, isPast, isSameDay } from "date-fns";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  Hourglass,
  Loader2,
  PawPrint,
  Briefcase,
  Tent,
  CalendarCheck,
  Search,
  UserCheck,
  Radio // ✅ Added for Happening Now
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyRegistrationUpdate } from "@/lib/NotificationService";
import { cn } from "@/lib/utils";

// Types
type OfficialEventDetails = {
  id: string;
  title: string;
  description: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  location: string;
  images: string[];
  max_attendees: number | null;
  event_type: string;
  registration_deadline: string | null;
  registration_closed_manually: boolean;
  admin_id: string;
};

type Attendee = {
  id: string;
  user_id: string;
  status: "approved" | "waitlist" | "checked_in" | "pending" | "rejected";
  user: {
    first_name: string;
    last_name: string;
    username: string;
    avatar_url: string | null;
  };
  pet?: {
    name: string;
  };
};

export default function OfficialEventDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<OfficialEventDetails | null>(null);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'going' | 'waitlist'>('going');
  
  // ✅ Happening Now State
  const [currentTime, setCurrentTime] = useState(new Date());

  const myRegistration = attendees.find((a) => a.user_id === user?.id);
  const isRegistered = !!myRegistration && myRegistration.status !== 'rejected';
  
  // Counts
  const currentCount = attendees.filter(a => ['approved', 'checked_in'].includes(a.status)).length;
  const waitlistCount = attendees.filter(a => a.status === 'waitlist').length;

  useEffect(() => {
    if (id) fetchEventData();
  }, [id]);

  // ✅ Timer for "Happening Now"
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  const fetchEventData = async () => {
    try {
      setLoading(true);
      const { data: eventData, error: eventError } = await supabase
        .from("outreach_events")
        .select("*")
        .eq("id", id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      const { data: attendeeData, error: attendeeError } = await supabase
        .from("event_registrations")
        .select(`
          id, status, user_id,
          user:profiles(first_name, last_name, username, avatar_url),
          pet:pets(name)
        `)
        .eq("event_id", id);

      if (attendeeError) throw attendeeError;
      setAttendees(attendeeData as any || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load event details");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user || !event) return;
    setRegistering(true);
    
    const isWaitlist = event.max_attendees && currentCount >= event.max_attendees;
    const dbStatus = isWaitlist ? "waitlist" : "approved";

    try {
      const { error } = await supabase.from("event_registrations").insert({
        event_id: event.id,
        user_id: user.id,
        status: dbStatus,
      });

      if (error) {
         if (error.code === '23505') {
             toast.info("You are already registered.");
             return; 
         }
        throw error;
      }

      const notificationStatus = dbStatus === "waitlist" ? "joined_waitlist" : "approved";
      await notifyRegistrationUpdate(
          user.id, 
          event.id, 
          event.title, 
          notificationStatus, 
          event.admin_id || user.id
      );

      toast.success(isWaitlist ? "Joined Waitlist" : "Registered successfully!");
      fetchEventData();
    } catch (err) {
      toast.error("Registration failed");
    } finally {
      setRegistering(false);
    }
  };

  const handleUnregister = async () => {
    if (!user || !event || !myRegistration) return;
    if (!confirm("Are you sure you want to leave?")) return;
    setRegistering(true);
    try {
      const { error } = await supabase.rpc('leave_event', {
        p_event_id: event.id,
        p_user_id: user.id
      });
      if (error) throw error;
      toast.success("You have left the event.");
      fetchEventData();
    } catch (err) {
      toast.error("Failed to leave event");
    } finally {
      setRegistering(false);
    }
  };

  const getBadgeIcon = (type: string) => {
    switch(type) {
      case 'pet': return <PawPrint className="w-4 h-4" />;
      case 'member': return <Briefcase className="w-4 h-4" />;
      case 'campus': return <Tent className="w-4 h-4" />;
      default: return <CalendarCheck className="w-4 h-4" />;
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600 w-10 h-10" /></div>;
  if (!event) return <div className="p-8 text-center font-bold text-gray-500">Event not found</div>;

  const eventDateObj = new Date(event.event_date);
  const deadline = event.registration_deadline ? new Date(event.registration_deadline) : null;
  const isDeadlinePassed = deadline ? isPast(deadline) : false;
  const isClosed = event.registration_closed_manually || isDeadlinePassed;
  const isWaitlistMode = event.max_attendees && currentCount >= event.max_attendees;

  // ✅ Happening Now Logic
  const isHappeningNow = (() => {
    const isToday = isSameDay(eventDateObj, new Date());
    if (!isToday || !event.start_time || !event.end_time) return false;
    const now = currentTime;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [startH, startM] = event.start_time.split(":").map(Number);
    const startTotal = startH * 60 + startM;
    const [endH, endM] = event.end_time.split(":").map(Number);
    const endTotal = endH * 60 + endM;
    return currentMinutes >= startTotal && currentMinutes <= endTotal;
  })();

  const goingList = attendees.filter(a => ['approved', 'checked_in'].includes(a.status));
  const waitlistList = attendees.filter(a => a.status === 'waitlist');
  const currentList = activeTab === 'going' ? goingList : waitlistList;

  const displayList = currentList.filter(a => 
    a.user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.user.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* --- HERO HEADER --- */}
      <div className="relative h-[35vh] md:h-[45vh] w-full bg-gray-900">
        {event.images?.[0] && (
          <img src={event.images[0]} className="w-full h-full object-cover opacity-60" alt="Cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-transparent to-black/20" />
        
        <div className="absolute top-6 left-6 z-20">
          <Button variant="secondary" size="sm" className="rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 text-white border-none shadow-xl" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-6 md:p-12 z-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {/* ✅ Happening Now Badge */}
              {isHappeningNow && (
                <div className="bg-red-600 text-white px-3 py-1 rounded shadow-lg flex items-center gap-1.5 text-xs md:text-sm font-bold uppercase tracking-widest animate-pulse">
                  <Radio size={14} className="relative inline-flex" />
                  Happening Now
                </div>
              )}
              
              <div className="bg-blue-600 text-white px-3 py-1 rounded shadow-lg flex items-center gap-1.5 text-xs md:text-sm font-bold uppercase tracking-widest">
                {getBadgeIcon(event.event_type)}
                {event.event_type} Event
              </div>
            </div>

            <h1 className="text-4xl md:text-6xl font-black text-white mb-4 drop-shadow-md leading-tight">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 md:gap-8 text-white/90 font-medium">
              <span className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-lg"><MapPin size={18} className="text-blue-400"/> {event.location}</span>
              <span className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-lg"><Calendar size={18} className="text-blue-400"/> {format(eventDateObj, "MMMM d, yyyy")}</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- CONTENT GRID --- */}
      <div className="max-w-7xl mx-auto px-4 md:px-12 mt-8">
        <div className="flex flex-col lg:flex-row gap-8">
          
          {/* LEFT: About & Guests */}
          <div className="flex-1 space-y-8 order-2 lg:order-1">
            <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
              <h3 className="font-bold text-2xl mb-6 text-gray-900">About this Event</h3>
              <p className="text-gray-600 text-lg leading-relaxed whitespace-pre-wrap">
                {event.description || "No description provided."}
              </p>
              
              <div className="mt-8">
                <div className={cn(
                  "p-4 rounded-2xl inline-flex items-center gap-4 border",
                  isHappeningNow ? "bg-red-50 border-red-100" : "bg-blue-50/50 border-blue-100/50"
                )}>
                  <div className={cn(
                    "p-3 rounded-xl text-white shadow-lg",
                    isHappeningNow ? "bg-red-600 shadow-red-200" : "bg-blue-600 shadow-blue-200"
                  )}>
                    <Clock size={24} />
                  </div>
                  <div>
                    <p className={cn(
                      "text-xs font-bold uppercase tracking-tight",
                      isHappeningNow ? "text-red-600" : "text-blue-600"
                    )}>Time</p>
                    <p className="font-bold text-gray-900 text-lg">
                      {event.start_time ? format(new Date(`2000-01-01T${event.start_time}`), "h:mm a") : "TBD"}
                      {event.end_time && ` — ${format(new Date(`2000-01-01T${event.end_time}`), "h:mm a")}`}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="font-bold text-2xl text-gray-900">Guest List</h3>
                  <p className="text-gray-500 font-medium">See who's attending</p>
                </div>
                <div className="relative group w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <Input 
                    placeholder="Search guests..." 
                    className="pl-10 h-11 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500/20" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl mb-6 w-fit">
                <button 
                  onClick={() => setActiveTab('going')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                    activeTab === 'going' ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Going ({currentCount})
                </button>
                <button 
                  onClick={() => setActiveTab('waitlist')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                    activeTab === 'waitlist' ? "bg-white text-amber-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                  )}
                >
                  Waitlist ({waitlistCount})
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {displayList.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-400 font-medium">
                        {activeTab === 'going' ? "No approved guests yet." : "Waitlist is empty."}
                    </p>
                  </div>
                ) : (
                  displayList.map((att) => (
                    <div key={att.id} className={cn(
                      "flex items-center justify-between p-4 hover:shadow-md hover:scale-[1.01] rounded-2xl transition-all border",
                      activeTab === 'waitlist' ? "bg-amber-50/50 border-amber-100/50" : "bg-gray-50/50 border-transparent hover:border-gray-100"
                    )}>
                      <div className="flex items-center gap-3">
                        <img src={att.user.avatar_url || "/default-avatar.png"} className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm" />
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{att.user.first_name} {att.user.last_name}</p>
                          <p className="text-xs text-gray-500 font-medium">@{att.user.username}</p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {att.status === 'checked_in' ? (
                          <span className="bg-blue-100 text-blue-700 p-1.5 rounded-lg flex items-center shadow-sm"><UserCheck size={16}/></span>
                        ) : att.status === 'waitlist' ? (
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold uppercase px-2 py-1 rounded-md flex items-center gap-1">
                            <Hourglass size={12}/> Waitlist
                          </span>
                        ) : (
                            <span className="bg-green-100 text-green-700 text-[10px] font-bold uppercase px-2 py-1 rounded-md flex items-center gap-1">
                                <CheckCircle2 size={12}/> Going
                            </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* RIGHT: Sticky Registration */}
          <div className="lg:w-96 order-1 lg:order-2">
            <div className="lg:sticky lg:top-8 space-y-6">
              <div className="bg-white rounded-3xl p-8 shadow-xl shadow-blue-900/5 border border-gray-100">
                <h3 className="font-bold text-xl text-gray-900 mb-2">Registration</h3>
                
                <div className="mb-6">
                  {isClosed && !isRegistered ? (
                    <div className="p-4 bg-red-50 text-red-700 rounded-2xl text-sm font-bold flex items-center gap-3 border border-red-100">
                      <XCircle size={20} /> Registration Closed
                    </div>
                  ) : user?.id === event.admin_id ? (
                    // Admin View (No text needed here, handled by button)
                    <p className="text-gray-500 font-medium">You are managing this event.</p>
                  ) : (
                    <p className="text-gray-500 font-medium">
                      {isRegistered ? "Successfully registered! We can't wait to see you." : "Claim your spot for this exclusive campus event."}
                    </p>
                  )}
                </div>

                {/* ✅ UPDATED BUTTON LOGIC */}
                {user?.id === event.admin_id ? (
                    // 1. ADMIN VIEW
                    <Button 
                      className="w-full h-14 text-lg font-bold rounded-2xl bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200 shadow-none hover:bg-gray-100"
                      disabled
                    >
                      You are the Host
                    </Button>
                ) : isRegistered ? (
                    // 2. REGISTERED USER VIEW
                    <Button 
                      variant="outline" 
                      className={cn(
                        "w-full h-14 text-lg font-bold rounded-2xl border-2 transition-all",
                        myRegistration?.status === 'checked_in' 
                          ? "border-green-100 bg-green-50 text-green-700 hover:bg-green-100" 
                          : myRegistration?.status === 'rejected'
                          ? "border-red-100 bg-red-50 text-red-700 hover:bg-red-100 cursor-not-allowed"
                          : "border-gray-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      )}
                      onClick={myRegistration?.status === 'checked_in' || myRegistration?.status === 'rejected' ? undefined : handleUnregister}
                      disabled={registering || myRegistration?.status === 'checked_in' || myRegistration?.status === 'rejected'}
                    >
                      {registering ? <Loader2 className="animate-spin" /> : myRegistration?.status === 'checked_in' ? "Checked In" : myRegistration?.status === 'rejected' ? "Declined" : "Leave Event"}
                    </Button>
                ) : (
                    // 3. GUEST VIEW (Register)
                    <Button 
                      className={cn(
                          "w-full h-14 text-lg font-bold rounded-2xl shadow-xl transition-all",
                          isWaitlistMode ? "bg-amber-500 hover:bg-amber-600 shadow-amber-200" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                      )}
                      onClick={handleRegister}
                      disabled={isClosed || registering}
                    >
                      {registering ? <Loader2 className="animate-spin" /> : isWaitlistMode ? "Join Waitlist" : "Register Now"}
                    </Button>
                )}

                <div className="mt-8">
                  <div className="flex justify-between items-end mb-3">
                    <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Going</span>
                    <span className="font-black text-2xl text-gray-900">{currentCount} <span className="text-gray-300 font-light">/</span> {event.max_attendees || "∞"}</span>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-1000 ease-out shadow-inner" 
                      style={{ width: `${Math.min(100, (currentCount / (event.max_attendees || 1)) * 100)}%` }} 
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}