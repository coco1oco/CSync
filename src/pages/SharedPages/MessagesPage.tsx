import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/authContext";
import { useChat } from "@/context/ChatContext";
import { supabase } from "@/lib/supabaseClient";
import {
  Users,
  Lock,
  Hash,
  Send,
  Loader2,
  Plus,
  X,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton"; // ✅ Import
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

  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileCache = useRef<Record<string, any>>({});

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
      rooms.sort((a: Conversation, b: Conversation) => {
        if (a.name === "Executive Board") return -1;
        if (b.name === "Executive Board") return 1;
        if (a.name === "General") return -1;
        if (b.name === "General") return 1;
        return a.name.localeCompare(b.name);
      });
      setConversations(rooms);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!activeRoom || !user) return;
    supabase.rpc("mark_room_as_read", {
      room_id: activeRoom.id,
      user_id: user.id,
    });
    refreshUnreadCount();

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

    const tempId = Date.now();
    setMessages((p) => [
      ...p,
      {
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
      } as any,
    ]);
    scrollToBottom();

    await supabase
      .from("messages")
      .insert([
        { conversation_id: activeRoom.id, sender_id: user.id, content },
      ]);
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

  const getIcon = (name: string) => {
    if (name === "General") return Hash;
    if (name.includes("Executive")) return Lock;
    if (name.includes("Committee")) return Users;
    return Users;
  };

  // ✅ SKELETON LOADING
  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row h-full w-full bg-white lg:bg-gray-50 lg:rounded-2xl lg:border lg:border-gray-200 overflow-hidden shadow-sm">
        {/* Sidebar Skeleton */}
        <div className="w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col h-full">
          <div className="h-16 px-4 border-b border-gray-100 flex justify-between items-center">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
          <div className="p-2 space-y-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Area Skeleton */}
        <div className="hidden lg:flex flex-1 flex-col bg-white h-full relative">
          <div className="h-16 px-4 border-b border-gray-100 flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex-1 p-6 space-y-6">
            <div className="flex flex-col items-start gap-2">
              <Skeleton className="h-10 w-48 rounded-2xl rounded-bl-none" />
              <Skeleton className="h-10 w-32 rounded-2xl rounded-bl-none" />
            </div>
            <div className="flex flex-col items-end gap-2">
              <Skeleton className="h-12 w-56 rounded-2xl rounded-br-none" />
            </div>
          </div>
          <div className="p-4 border-t border-gray-100">
            <Skeleton className="h-10 w-full rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full w-full bg-white lg:bg-gray-50 lg:rounded-2xl lg:border lg:border-gray-200 overflow-hidden shadow-sm">
      {/* SIDEBAR */}
      <div
        className={`w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col ${
          activeRoom ? "hidden lg:flex" : "flex"
        } h-full`}
      >
        <div className="h-16 px-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
          <h1 className="text-xl font-bold text-gray-900">Chats</h1>
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
                    className={`p-2 rounded-full shrink-0 ${
                      isActive ? "bg-blue-100" : "bg-gray-100"
                    }`}
                  >
                    {room.is_group ? <Icon size={18} /> : <Users size={18} />}
                  </div>
                  <div className="min-w-0">
                    <span className="truncate block">{room.name}</span>
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
                    <p className="text-xs text-green-600">Active now</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-4">
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
                      alt="Sender"
                      className="w-8 h-8 rounded-full border bg-gray-200 self-end mb-1"
                    />
                  )}
                  <div
                    className={`px-4 py-2 rounded-2xl text-sm max-w-[75%] break-words shadow-sm ${
                      msg.sender_id === user?.id
                        ? "bg-blue-600 text-white rounded-br-sm"
                        : "bg-white border border-gray-100 text-gray-800 rounded-bl-sm"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-3 bg-white border-t border-gray-100 shrink-0 pb-[calc(var(--safe-area-inset-bottom)+5rem)] lg:pb-3">
              <form
                onSubmit={handleSendMessage}
                className="flex gap-2 items-center"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 rounded-full bg-gray-100 border-none focus-visible:ring-blue-500"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!newMessage.trim()}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
