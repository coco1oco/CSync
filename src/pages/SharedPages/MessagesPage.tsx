import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/authContext";
import { supabase } from "@/lib/supabaseClient";
import { Users, Lock, Hash, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Message, Conversation } from "@/types";

export default function MessagesPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeRoom, setActiveRoom] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Fetch the Rooms I belong to
  useEffect(() => {
    if (!user) return;

    const fetchRooms = async () => {
      // We join 'conversation_members' to filter, then get the actual 'conversations' data
      const { data, error } = await supabase
        .from("conversation_members")
        .select("conversation:conversations(id, name, is_group)")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching rooms:", error);
      } else if (data) {
        // Flatten the structure
        const rooms = data.map((item: any) => item.conversation);

        // Custom Sort: Exec -> Committees -> General
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

  // 2. Fetch Messages & Subscribe to Realtime
  useEffect(() => {
    if (!activeRoom) return;

    // A. Initial Load
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*, sender:profiles(username, avatar_url, first_name)")
        .eq("conversation_id", activeRoom.id)
        .order("created_at", { ascending: true });

      if (error) console.error("Error fetching messages:", error);
      else setMessages(data || []);

      scrollToBottom();
    };

    fetchMessages();

    // B. Realtime Subscription
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
          // Fetch the sender details for the new message
          const { data: senderData } = await supabase
            .from("profiles")
            .select("username, avatar_url, first_name")
            .eq("id", payload.new.sender_id)
            .single();

          const newMsg = { ...payload.new, sender: senderData } as Message;
          setMessages((prev) => [...prev, newMsg]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoom]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeRoom || !user) return;

    const content = newMessage.trim();
    setNewMessage(""); // Clear input immediately for UX

    const { error } = await supabase.from("messages").insert([
      {
        conversation_id: activeRoom.id,
        sender_id: user.id,
        content: content,
      },
    ]);

    if (error) {
      console.error("Failed to send:", error);
      // Optional: Show error toast/restore input
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
      {/* LEFT: Room List */}
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

      {/* RIGHT: Chat Area */}
      <div className="flex-1 flex flex-col bg-white">
        {activeRoom ? (
          <>
            {/* Header */}
            <div className="h-16 border-b border-gray-100 flex items-center px-6 justify-between bg-white shadow-sm z-10">
              <div className="flex items-center gap-3">
                {/* Mobile Menu Button could go here */}
                <div>
                  <h2 className="font-bold text-gray-900">{activeRoom.name}</h2>
                  <p className="text-xs text-gray-500">
                    {activeRoom.is_group ? "Group Channel" : "Direct Message"}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
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
                      <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                        {msg.sender?.avatar_url ? (
                          <img
                            src={msg.sender.avatar_url}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-gray-500">
                            {msg.sender?.username?.[0]?.toUpperCase()}
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
                          {msg.sender?.first_name || "Unknown"}
                        </span>
                      )}
                      <div
                        className={`px-4 py-2 rounded-2xl text-sm ${
                          isMe
                            ? "bg-blue-600 text-white rounded-br-none"
                            : "bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm"
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

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100">
              <form
                onSubmit={handleSendMessage}
                className="flex gap-2 relative"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message ${activeRoom.name}...`}
                  className="rounded-full pr-12 border-gray-200 bg-gray-50 focus:bg-white transition-all"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="absolute right-1 top-1 h-8 w-8 rounded-full bg-blue-600 hover:bg-blue-700"
                  disabled={!newMessage.trim()}
                >
                  <Send size={14} />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            Select a channel
          </div>
        )}
      </div>
    </div>
  );
}
