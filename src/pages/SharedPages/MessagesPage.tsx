import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/authContext";
import { useChat } from "@/context/ChatContext";
import { supabase } from "@/lib/supabaseClient";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import {
  Users,
  Lock,
  Hash,
  Send,
  Loader2,
  Plus,
  X,
  ArrowLeft,
  Paperclip,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Message, Conversation, UserProfile } from "@/types";
import FailedImageIcon from "@/assets/FailedImage.svg";
import { toast } from "sonner";
import { format, isToday, isYesterday, isSameDay } from "date-fns";

// --- TYPES ---
interface MessageWithSender extends Omit<Message, "sender"> {
  sender?: {
    username: string;
    avatar_url: string | null;
    first_name: string | null;
  };
  image_url?: string | null;
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { refreshUnreadCount } = useChat();

  // Data State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeRoom, setActiveRoom] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [loading, setLoading] = useState(true);

  // Input State
  const [newMessage, setNewMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());

  // UI State
  const [revealedMessageId, setRevealedMessageId] = useState<
    number | string | null
  >(null);
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileCache = useRef<Record<string, any>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    fetchRooms();
  }, [user]);

  const fetchRooms = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("conversation_members")
        .select("conversation:conversations(id, name, is_group)")
        .eq("user_id", user.id);

      if (error) throw error;

      let rooms = data.map((item: any) => item.conversation);

      // ✅ ENFORCE VISIBILITY RULES (Fully Type-Safe)
      const filteredRooms = rooms.filter((room) => {
        if (!room || !room.name) return false;

        // 1. General is visible to everyone
        if (room.name === "General") return true;

        // 2. Executive Board visibility (using your fix)
        if (room.name === "Executive Board") {
          return ["admin", "president", "vice_president"].includes(
            user.role ?? ""
          );
        }

        // 3. Committee Chat visibility
        if (
          room.is_group &&
          !["General", "Executive Board"].includes(room.name)
        ) {
          // Presidents and Admins see all committee chats they are in
          if (["admin", "president"].includes(user.role ?? "")) return true;

          // Apply the same fix here for committee
          const userCommittee = user.committee ?? "";
          return userCommittee !== "" && room.name === userCommittee;
        }

        // 4. Direct Messages are always visible
        return !room.is_group;
      });

      // ✅ SORTING
      filteredRooms.sort((a: Conversation, b: Conversation) => {
        if (!a.name || !b.name) return 0;
        if (a.name === "Executive Board") return -1;
        if (b.name === "Executive Board") return 1;
        if (a.name === "General") return -1;
        if (b.name === "General") return 1;
        return a.name.localeCompare(b.name);
      });

      setConversations(filteredRooms);
    } catch (err) {
      console.error("Room fetch error:", err);
    } finally {
      setLoading(false);
    }
  };
  // --- ROOM LOGIC (Messages + Realtime) ---
  useEffect(() => {
    if (!activeRoom || !user) return;

    const markReadAndFetch = async () => {
      await supabase.rpc("mark_room_as_read", {
        room_id: activeRoom.id,
        user_id: user.id,
      });
      await refreshUnreadCount();
    };
    markReadAndFetch();

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*, sender:profiles(username, avatar_url, first_name)")
        .eq("conversation_id", activeRoom.id)
        .order("created_at", { ascending: true })
        .limit(100);
      if (data) {
        setMessages(data as any);
        scrollToBottom();
      }
    };
    fetchMessages();

    const channel = supabase.channel(`room-${activeRoom.id}`);
    channelRef.current = channel;

    channel
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeRoom.id}`,
        },
        async (payload) => {
          if (payload.new.sender_id === user.id) return;

          markReadAndFetch();

          let senderData = profileCache.current[payload.new.sender_id];
          if (!senderData) {
            const { data } = await supabase
              .from("profiles")
              .select("username, avatar_url, first_name")
              .eq("id", payload.new.sender_id)
              .single();
            if (data) {
              senderData = data;
              profileCache.current[payload.new.sender_id] = data;
            }
          }

          setMessages((p) => [
            ...p,
            { ...payload.new, sender: senderData } as any,
          ]);
          scrollToBottom();

          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(senderData?.first_name || "Someone");
            return next;
          });
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload.userId === user.id) return;
        const username = payload.payload.username;
        setTypingUsers((prev) => {
          const next = new Set(prev);
          next.add(username);
          return next;
        });
        setTimeout(() => {
          setTypingUsers((prev) => {
            const next = new Set(prev);
            next.delete(username);
            return next;
          });
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      setTypingUsers(new Set());
    };
  }, [activeRoom, user?.id]);

  const scrollToBottom = () => {
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  };

  const handleTyping = () => {
    if (!channelRef.current || !user) return;
    if (!typingTimeoutRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: user.id, username: user.first_name || "Member" },
      });
      typingTimeoutRef.current = setTimeout(() => {
        typingTimeoutRef.current = null;
      }, 2000);
    }
  };

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", user?.id)
      .or(`username.ilike.%${query}%,first_name.ilike.%${query}%`)
      .limit(5);
    setSearchResults((data as UserProfile[]) || []);
    setSearching(false);
  };

  const startDM = async (targetUser: UserProfile) => {
    if (!user) return;
    const existing = conversations.find(
      (c) => !c.is_group && c.name === targetUser.username
    );
    if (existing) {
      setActiveRoom(existing);
      setIsNewChatOpen(false);
      return;
    }

    try {
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert([{ name: targetUser.username, is_group: false }])
        .select()
        .single();

      if (error) throw error;

      await supabase.from("conversation_members").insert([
        { conversation_id: conv.id, user_id: user.id, role: "owner" },
        { conversation_id: conv.id, user_id: targetUser.id, role: "member" },
      ]);

      await fetchRooms();
      setActiveRoom(conv);
      setIsNewChatOpen(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to start conversation");
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, imageUrl?: string) => {
    if (e) e.preventDefault();
    if ((!newMessage.trim() && !imageUrl) || !activeRoom || !user) return;

    const content = newMessage.trim();
    const tempId = Date.now();
    setNewMessage("");

    const optimisticMsg: any = {
      id: tempId,
      conversation_id: activeRoom.id,
      sender_id: user.id,
      content: content,
      image_url: imageUrl || null,
      created_at: new Date().toISOString(),
      sender: {
        username: user.username,
        avatar_url: user.avatar_url,
        first_name: user.first_name,
      },
    };

    setMessages((p) => [...p, optimisticMsg]);
    scrollToBottom();

    const { error } = await supabase.from("messages").insert([
      {
        conversation_id: activeRoom.id,
        sender_id: user.id,
        content: content,
        image_url: imageUrl || null,
      },
    ]);

    if (error) {
      console.error("Send error:", error);
      toast.error("Failed to send message");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const url = await uploadImageToCloudinary(file, "chat");
      await handleSendMessage(undefined, url);
    } catch (err) {
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- HELPERS ---
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d, yyyy");
  };

  const getRoomIcon = (room: Conversation) => {
    if (room.name === "General") return <Hash size={18} />;
    if (room.name === "Executive Board")
      return <ShieldCheck size={18} className="text-amber-500" />;
    if (room.is_group) return <Users size={18} />;
    return <Users size={18} />;
  };

  const toggleMessageTime = (id: number | string) => {
    setRevealedMessageId(revealedMessageId === id ? null : id);
  };

  if (loading) return <MessagesSkeleton />;

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100dvh-64px)] lg:h-full w-full bg-white lg:bg-gray-50 lg:rounded-2xl lg:border lg:border-gray-200 overflow-hidden shadow-sm">
      {/* SIDEBAR */}
      <div
        className={`w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col ${
          activeRoom ? "hidden lg:flex" : "flex"
        } h-full`}
      >
        <div className="h-16 px-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10 shrink-0">
          <h1 className="text-xl font-bold text-gray-900">Messages</h1>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsNewChatOpen(true)}
            className="rounded-full text-blue-600 hover:bg-blue-50"
          >
            <Plus size={24} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm text-center">
              <p>No conversations yet.</p>
              <Button variant="link" onClick={() => setIsNewChatOpen(true)}>
                Start a chat
              </Button>
            </div>
          ) : (
            conversations.map((room) => {
              const isActive = activeRoom?.id === room.id;
              return (
                <button
                  key={room.id}
                  onClick={() => setActiveRoom(room)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                    isActive
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <div
                    className={`p-2 rounded-full shrink-0 ${
                      isActive ? "bg-blue-100" : "bg-gray-100"
                    }`}
                  >
                    {getRoomIcon(room)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="truncate block font-semibold">
                      {room.name}
                    </span>
                    {room.is_group &&
                      room.name !== "General" &&
                      room.name !== "Executive Board" && (
                        <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">
                          Committee
                        </span>
                      )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div
        className={`flex-1 flex flex-col bg-white ${
          !activeRoom ? "hidden lg:flex" : "flex"
        } h-full min-h-0 relative`}
      >
        {activeRoom ? (
          <>
            <div className="h-16 px-4 border-b border-gray-100 flex items-center justify-between bg-white shadow-sm z-20 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveRoom(null)}
                  className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full"
                >
                  <ArrowLeft size={20} />
                </button>
                <div>
                  <h2 className="font-bold text-gray-900 leading-tight">
                    {activeRoom.name}
                  </h2>
                  {activeRoom.is_group && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />{" "}
                      Active
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-1">
              {messages.map((msg, index) => {
                const isMe = msg.sender_id === user?.id;
                const currentDate = new Date(msg.created_at);
                const previousDate =
                  index > 0 ? new Date(messages[index - 1].created_at) : null;
                const showDateHeader =
                  !previousDate || !isSameDay(currentDate, previousDate);
                const isRevealed = revealedMessageId === msg.id;

                return (
                  <div key={msg.id} className="flex flex-col">
                    {showDateHeader && (
                      <div className="flex justify-center my-6 sticky top-0 z-0">
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-200/50 px-3 py-1 rounded-full uppercase tracking-wide backdrop-blur-sm">
                          {getDateLabel(msg.created_at)}
                        </span>
                      </div>
                    )}
                    <div
                      className={`flex flex-col mb-2 ${
                        isMe ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`flex gap-2 max-w-[85%] ${
                          isMe ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        {!isMe && (
                          <img
                            src={msg.sender?.avatar_url || FailedImageIcon}
                            alt="Sender"
                            className="w-8 h-8 rounded-full border bg-gray-200 self-end mb-1 shrink-0"
                          />
                        )}
                        <div
                          onClick={() => toggleMessageTime(msg.id)}
                          className={`cursor-pointer active:scale-[0.98] transition-transform shadow-sm overflow-hidden ${
                            isMe
                              ? "bg-blue-600 text-white rounded-2xl rounded-br-sm"
                              : "bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-bl-sm"
                          }`}
                        >
                          {msg.image_url && (
                            <img
                              src={msg.image_url}
                              alt="Attachment"
                              className="w-full h-auto max-w-[240px] object-cover block border-b border-black/10"
                            />
                          )}
                          {msg.content && (
                            <div className="px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words">
                              {msg.content}
                            </div>
                          )}
                        </div>
                      </div>
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-in-out ${
                          isRevealed
                            ? "max-h-10 opacity-100 mt-1"
                            : "max-h-0 opacity-0"
                        }`}
                      >
                        <p
                          className={`text-[10px] text-gray-400 font-medium px-1 ${
                            isMe ? "text-right mr-1" : "text-left ml-11"
                          }`}
                        >
                          {format(new Date(msg.created_at), "h:mm a")}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {typingUsers.size > 0 && (
                <div className="flex items-center gap-2 ml-10 mb-2 animate-in fade-in slide-in-from-bottom-2">
                  <div className="bg-gray-200 rounded-full px-3 py-2 flex gap-1">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
                  </div>
                  <span className="text-xs text-gray-400">
                    {Array.from(typingUsers).join(", ")} is typing...
                  </span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white border-t border-gray-100 shrink-0 lg:pb-3 pb-7">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileUpload}
              />
              <form
                onSubmit={handleSendMessage}
                className="flex gap-2 items-center"
              >
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="rounded-full text-gray-400 hover:text-blue-600 shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Paperclip size={20} />
                  )}
                </Button>
                <Input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full bg-gray-100 border-none h-10 px-4"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!newMessage.trim() && !isUploading}
                  className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 shadow-md shrink-0"
                >
                  <Send size={16} className="ml-0.5" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300 bg-gray-50/50">
            <Users size={48} className="mb-4 opacity-20" />
            <p className="font-medium">
              Select a conversation to start chatting
            </p>
          </div>
        )}
      </div>

      {/* NEW CHAT MODAL */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-bold">New Direct Message</h2>
              <button onClick={() => setIsNewChatOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-4 border-b">
              <Input
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  handleSearchUsers(e.target.value);
                }}
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {searching ? (
                <Loader2 className="animate-spin mx-auto mt-4" />
              ) : (
                searchResults.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => startDM(u)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl text-left"
                  >
                    <img
                      src={u.avatar_url || FailedImageIcon}
                      className="w-10 h-10 rounded-full bg-gray-200 object-cover"
                    />
                    <div>
                      <p className="font-bold text-sm">
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="text-xs text-gray-500">@{u.username}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessagesSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-white lg:bg-gray-50 lg:rounded-2xl lg:border lg:border-gray-200 overflow-hidden shadow-sm">
      <div className="w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col h-full">
        <div className="h-16 px-4 border-b border-gray-100 flex justify-between items-center">
          <Skeleton className="h-6 w-24 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <div className="p-2 space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-3 w-16 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden lg:flex flex-1 flex-col bg-white h-full relative">
        <div className="h-16 px-4 border-b border-gray-100 flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-32 rounded-md" />
        </div>
        <div className="flex-1 p-6 space-y-6">
          <Skeleton className="h-20 w-1/2 rounded-xl" />
          <Skeleton className="h-10 w-1/3 rounded-xl self-end" />
        </div>
      </div>
    </div>
  );
}
