import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/authContext";
import { useChat } from "@/context/ChatContext";
import { supabase } from "@/lib/supabaseClient";
import { Users, Lock, Hash, Send, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Message, Conversation, UserProfile } from "@/types";
import FailedImageIcon from "@/assets/FailedImage.svg";
import { toast } from "sonner";

interface MessageWithSender extends Omit<Message, "sender"> {
  sender?: {
    username: string;
    avatar_url: string | null;
    first_name: string | null;
  };
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { refreshUnreadCount } = useChat();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeRoom, setActiveRoom] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // New Chat State
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileCache = useRef<Record<string, any>>({});

  // 1. FETCH ROOMS
  useEffect(() => {
    if (!user) return;
    fetchRooms();
  }, [user]);

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from("conversation_members")
      .select("conversation:conversations(id, name, is_group)")
      .eq("user_id", user?.id);

    if (!error && data) {
      const rooms = data.map((item: any) => item.conversation);
      // Priority Sort: Executive -> General -> Committees -> DMs
      rooms.sort((a: Conversation, b: Conversation) => {
        if (a.name === "Executive Board") return -1;
        if (b.name === "Executive Board") return 1;
        if (a.name === "General") return -1;
        if (b.name === "General") return 1;
        if (a.is_group && !b.is_group) return -1;
        if (!a.is_group && b.is_group) return 1;
        return a.name.localeCompare(b.name);
      });
      setConversations(rooms);
    }
    setLoading(false);
  };

  // 2. ACTIVE ROOM LOGIC
  useEffect(() => {
    if (!activeRoom || !user) return;

    // Mark Read
    supabase.rpc("mark_room_as_read", {
      room_id: activeRoom.id,
      user_id: user.id,
    });
    refreshUnreadCount();

    // Fetch Messages
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

    // Subscribe
    const channel = supabase
      .channel(`room-${activeRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeRoom.id}`,
        },
        async (payload) => {
          if (payload.new.sender_id !== user.id) {
            // Fetch sender info if missing from cache
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
            const newMsg = { ...payload.new, sender: senderData } as any;
            setMessages((p) => [...p, newMsg]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoom, user?.id]);

  const scrollToBottom = () => {
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom || !user) return;
    const content = newMessage.trim();
    setNewMessage("");

    // Optimistic Update
    const tempId = Date.now();
    const optimisticMsg: any = {
      id: tempId,
      conversation_id: activeRoom.id,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      sender: {
        username: user.username,
        avatar_url: user.avatar_url,
        first_name: user.first_name,
      },
    };
    setMessages((p) => [...p, optimisticMsg]);
    scrollToBottom();

    await supabase
      .from("messages")
      .insert([
        { conversation_id: activeRoom.id, sender_id: user.id, content },
      ]);
  };

  // 3. START DM LOGIC
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

    // Check local list first
    const existing = conversations.find(
      (c) => !c.is_group && c.name === targetUser.username
    );
    if (existing) {
      setActiveRoom(existing);
      setIsNewChatOpen(false);
      return;
    }

    try {
      // Create new DM conversation
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert([{ name: targetUser.username, is_group: false }])
        .select()
        .single();
      if (error) throw error;

      // Add members
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

  const getIcon = (name: string) => {
    if (name === "General") return Hash;
    if (name.includes("Executive")) return Lock;
    if (name.includes("Committee")) return Users;
    return Users;
  };

  if (loading)
    return (
      <div className="flex justify-center h-full items-center">
        <Loader2 className="animate-spin text-blue-600" />
      </div>
    );

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 bg-gray-50 lg:rounded-2xl lg:border lg:border-gray-200 overflow-hidden">
      {/* SIDEBAR */}
      <div
        className={`w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col ${
          activeRoom ? "hidden lg:flex" : "flex"
        } min-h-0`}
      >
        <div className="p-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h1 className="text-xl font-bold text-gray-900">Chats</h1>
          {/* New DM Button */}
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsNewChatOpen(true)}
            className="rounded-full text-blue-600 hover:bg-blue-50"
          >
            <Plus size={24} />
          </Button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-10 text-gray-400 text-sm">
              No conversations yet.
              <br />
              Click + to start one.
            </div>
          ) : (
            conversations.map((room) => {
              const Icon = getIcon(room.name);
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
                    className={`p-2 rounded-full ${
                      isActive ? "bg-blue-100" : "bg-gray-100"
                    }`}
                  >
                    {room.is_group ? <Icon size={18} /> : <Users size={18} />}
                  </div>
                  <span className="truncate flex-1">{room.name}</span>
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
        } min-h-0`}
      >
        {activeRoom ? (
          <>
            <div className="h-16 border-b border-gray-100 flex items-center px-4 justify-between bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveRoom(null)}
                  className="lg:hidden p-1 -ml-2 text-gray-500"
                >
                  <X size={20} />
                </button>
                <h2 className="font-bold text-gray-900">{activeRoom.name}</h2>
              </div>
            </div>
            <div className="flex-1 min-h-0 p-4 overflow-y-auto bg-gray-50/30 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${
                    msg.sender_id === user?.id ? "justify-end" : "justify-start"
                  }`}
                >
                  {msg.sender_id !== user?.id && (
                    <img
                      src={msg.sender?.avatar_url || FailedImageIcon}
                      alt={msg.sender?.username || "Sender"}
                      className="w-8 h-8 rounded-full border bg-gray-200"
                    />
                  )}
                  <div
                    className={`px-4 py-2 rounded-2xl text-sm max-w-[75%] ${
                      msg.sender_id === user?.id
                        ? "bg-blue-600 text-white rounded-br-none"
                        : "bg-white border rounded-bl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div className="p-3 border-t bg-white pb-[calc(var(--safe-area-inset-bottom)+0.75rem)] lg:pb-3">
              <form
                onSubmit={handleSendMessage}
                className="flex gap-2 relative"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="rounded-full pr-12 bg-gray-50 border-none"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-1 top-1 h-8 w-8 rounded-full bg-blue-600"
                  disabled={!newMessage.trim()}
                >
                  <Send size={14} />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <p>Select a chat</p>
          </div>
        )}
      </div>

      {/* NEW DM MODAL */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
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
                onChange={(e) => handleSearchUsers(e.target.value)}
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
              {!searching && searchResults.length === 0 && (
                <p className="text-center text-gray-400 py-4 text-sm">
                  Type to search users.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
