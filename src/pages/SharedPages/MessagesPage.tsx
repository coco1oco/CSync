import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/authContext";
import { useChat } from "@/context/ChatContext";
import { supabase } from "@/lib/supabaseClient";
import { Users, Lock, Hash, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Message, Conversation } from "@/types";

export default function MessagesPage() {
  const { user } = useAuth();
  const { refreshUnreadCount } = useChat();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeRoom, setActiveRoom] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ⚡ PERFORMANCE REFS
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef<number>(0); // Tracks last time we told Supabase we are typing
  const profileCache = useRef<Record<string, any>>({}); // Caches user profiles to avoid slow fetches

  // 1. FETCH ROOMS
  useEffect(() => {
    if (!user) return;

    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from("conversation_members")
        .select("conversation:conversations(id, name, is_group)")
        .eq("user_id", user.id);

      if (!error && data) {
        const rooms = data.map((item: any) => item.conversation);
        rooms.sort((a: Conversation, b: Conversation) => {
          if (a.name.includes("Executive")) return -1;
          if (b.name.includes("Executive")) return 1;
          if (a.name.includes("General")) return 1;
          if (b.name.includes("General")) return -1;
          return a.name.localeCompare(b.name);
        });

        setConversations(rooms);
        if (rooms.length > 0) setActiveRoom(rooms[0]);
      }
      setLoading(false);
    };

    fetchRooms();
  }, [user]);

  // 2. ACTIVE ROOM LOGIC
  useEffect(() => {
    if (!activeRoom || !user) return;

    const markAsRead = async () => {
      await supabase.rpc("mark_room_as_read", {
        room_id: activeRoom.id,
        user_id: user.id,
      });
      refreshUnreadCount();
    };
    markAsRead();

    // A. Load Initial Messages
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*, sender:profiles(username, avatar_url, first_name)")
        .eq("conversation_id", activeRoom.id)
        .order("created_at", { ascending: true })
        .limit(100);

      if (!error && data) {
        setMessages(data as any);
        // Cache the profiles we just loaded
        data.forEach((msg: any) => {
          if (msg.sender_id && msg.sender) {
            profileCache.current[msg.sender_id] = msg.sender;
          }
        });
      }
      scrollToBottom();
    };

    fetchMessages();

    // B. Setup Realtime Channel
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
          if (payload.new.sender_id === user.id) return; // Ignore my own messages (Optimistic UI)

          markAsRead();

          // ⚡ FAST FETCH: Check Cache First
          let senderData = profileCache.current[payload.new.sender_id];

          if (!senderData) {
            // Only fetch from DB if not in cache
            const { data } = await supabase
              .from("profiles")
              .select("username, avatar_url, first_name")
              .eq("id", payload.new.sender_id)
              .single();

            if (data) {
              senderData = data;
              profileCache.current[payload.new.sender_id] = data; // Save to cache
            }
          }

          const newMsg = { ...payload.new, sender: senderData } as Message;
          setMessages((prev) => [...prev, newMsg]);
          scrollToBottom();
        }
      )
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const typing: string[] = [];
        for (const id in state) {
          const person = state[id][0] as any;
          if (person && person.user_id !== user.id && person.isTyping) {
            typing.push(person.first_name || person.username);
          }
        }
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user_id: user.id,
            username: user.username,
            first_name: user.first_name,
            isTyping: false,
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      setTypingUsers([]);
    };
  }, [activeRoom, user?.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // ⚡ OPTIMIZED TYPING HANDLER (Throttled)
  const handleTyping = async () => {
    if (!activeRoom || !user) return;

    const now = Date.now();
    // Only update Supabase once every 2 seconds, not every keystroke
    if (now - lastTypingSentRef.current < 2000) return;

    lastTypingSentRef.current = now;

    const channel = supabase
      .getChannels()
      .find((c) => c.topic === `room-${activeRoom.id}`);

    if (channel) {
      await channel.track({
        user_id: user.id,
        username: user.username,
        first_name: user.first_name,
        isTyping: true,
      });

      // Reset the "Stop Typing" timer
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      typingTimeoutRef.current = setTimeout(async () => {
        await channel.track({
          user_id: user.id,
          username: user.username,
          first_name: user.first_name,
          isTyping: false,
        });
      }, 3000); // Stop typing after 3 seconds of silence
    }
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
      content: content,
      created_at: new Date().toISOString(),
      sender: {
        username: user.username || "Me",
        avatar_url: user.avatar_url || null,
        first_name: user.first_name || "Me",
      },
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    scrollToBottom();

    const { error } = await supabase.from("messages").insert([
      {
        conversation_id: activeRoom.id,
        sender_id: user.id,
        content: content,
      },
    ]);

    if (error) {
      console.error("Failed to send:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      alert("Failed to send message.");
    }
  };

  const getIcon = (name: string) => {
    if (name.includes("General")) return Hash;
    if (name.includes("Executive")) return Lock;
    return Users;
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-[calc(100vh-64px)]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] bg-gray-50 border-t border-gray-200">
      <div className="w-full lg:w-80 bg-white border-r border-gray-200 overflow-y-auto hidden lg:block">
        <div className="p-5 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">Conversations</h1>
        </div>
        <div className="p-3 space-y-1">
          {conversations.map((room) => {
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
                <Icon size={18} />
                <span className="truncate">{room.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        {activeRoom ? (
          <>
            <div className="h-16 border-b border-gray-100 flex items-center px-6 justify-between bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                <div>
                  <h2 className="font-bold text-gray-900">{activeRoom.name}</h2>
                  <p className="text-xs text-gray-500">
                    {activeRoom.is_group ? "Group Channel" : "Direct Message"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-gray-50/50">
              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${
                      isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isMe && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border border-gray-200">
                        {msg.sender?.avatar_url ? (
                          <img
                            src={msg.sender.avatar_url}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">
                            {msg.sender?.username?.[0]?.toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                    )}

                    <div
                      className={`max-w-[75%] space-y-1 ${
                        isMe ? "items-end" : "items-start"
                      } flex flex-col`}
                    >
                      {!isMe && (
                        <span className="text-xs text-gray-400 ml-1">
                          {msg.sender?.first_name ||
                            msg.sender?.username ||
                            "Unknown"}
                        </span>
                      )}
                      <div
                        className={`px-4 py-2 rounded-2xl text-sm leading-relaxed shadow-sm ${
                          isMe
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-white border border-gray-200 text-gray-800 rounded-bl-none"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {typingUsers.length > 0 && (
              <div className="px-6 py-2 text-xs text-gray-400 italic bg-white animate-pulse">
                {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"}{" "}
                typing...
              </div>
            )}

            <div className="p-4 bg-white border-t border-gray-100">
              <form
                onSubmit={handleSendMessage}
                className="flex gap-2 relative"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    handleTyping();
                  }}
                  placeholder={`Message ${activeRoom.name}...`}
                  className="rounded-full pr-12 border-gray-200 bg-gray-50 focus:bg-white transition-all h-11"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-1 top-1 h-9 w-9 rounded-full bg-blue-600 hover:bg-blue-700 shadow-sm"
                  disabled={!newMessage.trim()}
                >
                  <Send size={16} />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a channel to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
