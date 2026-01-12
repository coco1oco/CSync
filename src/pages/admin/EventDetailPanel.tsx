import { 
  XCircle, BellRing, Lock, Unlock, Search, Loader2, 
  CheckCircle2, MoreHorizontal, Trash2, UserMinus, RotateCcw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isPast } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Type Definitions
interface Attendee {
  id: string;
  user: {
    first_name: string;
    last_name: string;
    username: string;
    avatar_url: string | null;
  };
  pet?: { name: string; species: string };
  status: "pending" | "approved" | "rejected" | "checked_in" | "waitlist";
}

interface EventDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  attendees: Attendee[];
  allAttendees: Attendee[];
  loading: boolean;
  filters: { searchQuery: string; guestFilter: string };
  setFilters: { setSearchQuery: (s: string) => void; setGuestFilter: (s: any) => void };
  activeTab: "guests" | "analytics";
  setActiveTab: (t: "guests" | "analytics") => void;
  actions: {
    checkIn: (id: string, status: string) => void;
    promote: (id: string) => void;
    demote: (id: string) => void;
    reject: (id: string) => void;
    remove: (id: string) => void;
    sendUpdate: () => void;
    toggleRegistration: () => void;
    exportCSV: () => void;
  };
  status: {
    isRegistrationClosed: boolean;
    eventDeadline: Date | null;
  };
}

export function EventDetailPanel({ 
  isOpen, onClose, title, attendees, allAttendees, loading, 
  filters, setFilters, activeTab, setActiveTab, actions, status 
}: Readonly<EventDetailPanelProps>) {
  if (!isOpen) return null;

  const goingCount = allAttendees.filter(a => ['approved', 'checked_in'].includes(a.status)).length;
  const waitlistCount = allAttendees.filter(a => a.status === 'waitlist').length;
  const checkedInCount = allAttendees.filter(a => a.status === 'checked_in').length;
  
  const isDeadlinePassed = status.eventDeadline ? isPast(status.eventDeadline) : false;
  const isClosed = status.isRegistrationClosed || isDeadlinePassed;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-in fade-in" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-100 p-6 pb-0">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="font-bold text-xl text-gray-900 leading-tight pr-4">{title}</h2>
              <button onClick={actions.sendUpdate} className="mt-2 flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors w-fit">
                <BellRing size={14} /> Send Update
              </button>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <XCircle className="w-6 h-6 text-gray-300" />
            </Button>
          </div>

          <div className="flex gap-6 mb-6 mt-4">
            <div><p className="text-3xl font-black text-gray-900">{goingCount}</p><p className="text-xs font-bold text-gray-400 uppercase">Going</p></div>
            <div><p className="text-3xl font-black text-amber-500">{waitlistCount}</p><p className="text-xs font-bold text-amber-500/70 uppercase">Waitlist</p></div>
            <div><p className="text-3xl font-black text-green-600">{checkedInCount}</p><p className="text-xs font-bold text-green-600/70 uppercase">Checked In</p></div>
          </div>

          <div className={`flex items-center justify-between p-4 rounded-xl mb-6 border transition-colors ${isClosed ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${isClosed ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                {isClosed ? <Lock size={18} /> : <Unlock size={18} />}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">{isDeadlinePassed ? "Closed (Deadline)" : isClosed ? "Closed Manually" : "Registration Open"}</p>
                <p className="text-xs text-gray-500">{isClosed ? "No new signups." : "Accepting guests."}</p>
              </div>
            </div>
            <button 
              onClick={isDeadlinePassed ? undefined : actions.toggleRegistration} 
              disabled={isDeadlinePassed}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isClosed ? 'bg-red-500' : 'bg-green-500'} ${isDeadlinePassed ? 'opacity-50' : ''}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isClosed ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex gap-6 border-b border-gray-100">
            <button onClick={() => setActiveTab("guests")} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "guests" ? "border-black text-black" : "border-transparent text-gray-400"}`}>Guests</button>
            <button onClick={() => setActiveTab("analytics")} className={`pb-3 text-sm font-bold border-b-2 transition-colors ${activeTab === "analytics" ? "border-black text-black" : "border-transparent text-gray-400"}`}>Insights</button>
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          {activeTab === "guests" ? (
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                {['all', 'going', 'waitlist', 'rejected'].map(f => (
                  <button 
                    key={f} 
                    onClick={() => setFilters.setGuestFilter(f)} 
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border capitalize whitespace-nowrap ${filters.guestFilter === f ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input 
                  placeholder="Search guests..." 
                  className="pl-9 bg-white" 
                  value={filters.searchQuery} 
                  onChange={(e) => setFilters.setSearchQuery(e.target.value)} 
                />
              </div>
              
              {loading ? (
                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-400" /></div>
              ) : attendees.length === 0 ? (
                <div className="text-center py-10 text-gray-400">No guests found.</div>
              ) : (
                <div className="space-y-2">
                  {attendees.map((a) => (
                    <div key={a.id} className={`p-3 rounded-xl border flex items-center gap-3 shadow-sm bg-white ${a.status === 'rejected' ? 'opacity-60' : ''}`}>
                      <img src={a.user.avatar_url || "/default-avatar.png"} className="w-10 h-10 rounded-full bg-gray-100 object-cover" alt="Avatar" />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 text-sm truncate">{a.user.first_name} {a.user.last_name}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          @{a.user.username} 
                          {a.status === 'waitlist' && <span className="bg-amber-100 text-amber-700 px-1.5 rounded uppercase font-bold">Waitlist</span>}
                          {a.status === 'rejected' && <span className="bg-red-100 text-red-700 px-1.5 rounded uppercase font-bold">Rejected</span>}
                        </div>
                      </div>
                      
                      {/* --- ACTIONS COLUMN --- */}
                      <div className="flex items-center gap-2">
                        {/* Primary Action Button */}
                        {a.status === 'waitlist' ? (
                          <button onClick={() => actions.promote(a.id)} className="w-20 h-8 rounded-lg font-bold text-xs bg-amber-500 text-white hover:bg-amber-600 transition-colors">Approve</button>
                        ) : a.status === 'rejected' ? (
                          <span className="text-xs font-bold text-red-400 px-2">Declined</span>
                        ) : (
                          <button 
                            onClick={() => actions.checkIn(a.id, a.status)} 
                            className={`w-24 h-8 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-colors ${a.status === 'checked_in' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-black text-white hover:bg-gray-800'}`}
                          >
                            {a.status === 'checked_in' ? <><CheckCircle2 className="w-3.5 h-3.5"/> In</> : 'Check In'}
                          </button>
                        )}
                        
                        {/* More Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 outline-none">
                            <MoreHorizontal className="w-4 h-4" />
                          </DropdownMenuTrigger>
                          {/* ✅ FIXED: Added z-[150] to appear above the panel and restored icons */}
                          <DropdownMenuContent align="end" className="z-[150] w-48 bg-white border border-gray-100 shadow-xl rounded-xl p-1">
                            
                            {/* APPROVED USER ACTIONS */}
                            {a.status === 'approved' && (
                              <>
                                <DropdownMenuItem onClick={() => actions.demote(a.id)} className="cursor-pointer text-gray-600 focus:bg-amber-50 focus:text-amber-700">
                                  <UserMinus className="w-4 h-4 mr-2" /> Move to Waitlist
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => actions.reject(a.id)} className="cursor-pointer text-amber-600 focus:bg-amber-50 focus:text-amber-700">
                                  <XCircle className="w-4 h-4 mr-2" /> Reject
                                </DropdownMenuItem>
                              </>
                            )}

                            {/* WAITLIST USER ACTIONS */}
                            {a.status === 'waitlist' && (
                              <DropdownMenuItem onClick={() => actions.reject(a.id)} className="cursor-pointer text-amber-600 focus:bg-amber-50 focus:text-amber-700">
                                <XCircle className="w-4 h-4 mr-2" /> Reject
                              </DropdownMenuItem>
                            )}

                            {/* REJECTED USER ACTIONS */}
                            {a.status === 'rejected' && (
                              <DropdownMenuItem onClick={() => actions.promote(a.id)} className="cursor-pointer text-green-600 focus:bg-green-50">
                                <RotateCcw className="w-4 h-4 mr-2" /> Restore to Going
                              </DropdownMenuItem>
                            )}

                            {/* GLOBAL ACTIONS */}
                            <DropdownMenuItem onClick={() => actions.remove(a.id)} className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-700">
                              <Trash2 className="w-4 h-4 mr-2" /> Remove Completely
                            </DropdownMenuItem>

                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">Analytics coming soon!</div>
          )}
        </div>
      </div>
    </div>
  );
}