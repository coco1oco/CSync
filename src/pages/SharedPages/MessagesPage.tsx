import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/authContext";
import { useChat } from "@/context/ChatContext";
import { supabase } from "@/lib/supabaseClient";
import { uploadImageToCloudinary } from "@/lib/cloudinary";
import { useQueryClient } from "@tanstack/react-query";
import {
  Users,
  Hash,
  Send,
  Loader2,
  Plus,
  X,
  ArrowLeft,
  Paperclip,
  ShieldCheck,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfile } from "@/types";
import FailedImageIcon from "@/assets/FailedImage.svg";
import { toast } from "sonner";
import { format, isToday, isYesterday, isSameDay } from "date-fns";

import {
  useChatRooms,
  useChatMessages,
  useSendMessage,
  useMarkRead,
  type MessageWithSender,
  type ChatRoom,
} from "@/hooks/useChatData";

export default function MessagesPage() {
  const { user } = useAuth();
  const { refreshUnreadCount } = useChat();
  const queryClient = useQueryClient();

  // --- DATA ---
  const { data: conversations = [], isLoading: loadingRooms } =
    useChatRooms(user);

  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const { data: messages = [] } = useChatMessages(activeRoom?.id);

  const sendMessageMutation = useSendMessage();
  const markReadMutation = useMarkRead();

  // --- LOCAL STATE ---
  const [newMessage, setNewMessage] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [revealedMessageId, setRevealedMessageId] = useState<
    number | string | null
  >(null);

  // Image Preview
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Search / New Chat
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [searching, setSearching] = useState(false);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<any>(null);
  const profileCache = useRef<Record<string, any>>({});

  // --- HISTORY & BACK BUTTON ---
  useEffect(() => {
    const handlePopState = () => {
      if (activeRoom) setActiveRoom(null);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeRoom]);

  const openRoom = (room: ChatRoom) => {
    window.history.pushState({ panel: "chat" }, "", "");

    // ⚡ OPTIMISTIC UPDATE: Mark as read INSTANTLY in the UI list
    queryClient.setQueryData(
      ["chat-rooms", user?.id],
      (old: ChatRoom[] | undefined) => {
        if (!old) return [];
        return old.map((c) =>
          c.id === room.id ? { ...c, hasUnread: false } : c
        );
      }
    );

    setActiveRoom(room);
  };

  const closeRoom = () => {
    if (window.history.state?.panel === "chat") {
      window.history.back();
    } else {
      setActiveRoom(null);
    }
  };

  // --- SCROLLING ---
  useEffect(() => {
    scrollToBottom();
  }, [messages.length, activeRoom?.id, previewUrl]);

  const scrollToBottom = () => {
    setTimeout(
      () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
      100
    );
  };

  // --- ⚡ LOGIC FIX: AUTO-JOIN OFFICIAL GROUPS ---
  useEffect(() => {
    const autoJoinOfficialGroups = async () => {
      if (!user || !conversations) return;

      const officialGroups = conversations.filter((c) => c.is_group);

      for (const group of officialGroups) {
        await supabase.from("conversation_members").upsert(
          {
            conversation_id: group.id,
            user_id: user.id,
            role: "member",
          },
          { onConflict: "conversation_id,user_id", ignoreDuplicates: true }
        );
      }
    };

    autoJoinOfficialGroups();
  }, [user, conversations.length]);

  // --- REALTIME & MARK READ ---
  useEffect(() => {
    if (!activeRoom || !user) return;

    markReadMutation
      .mutateAsync({ roomId: activeRoom.id, userId: user.id })
      .then(() => {
        refreshUnreadCount();
        queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
      });

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
          await markReadMutation.mutateAsync({
            roomId: activeRoom.id,
            userId: user.id,
          });
          refreshUnreadCount();

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

          const incomingMsg: MessageWithSender = {
            ...payload.new,
            sender: senderData,
          } as MessageWithSender;

          queryClient.setQueryData(
            ["chat-messages", activeRoom.id],
            (oldData: MessageWithSender[] | undefined) => {
              if (oldData?.find((m) => m.id === incomingMsg.id)) return oldData;
              return [...(oldData || []), incomingMsg];
            }
          );

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
        setTypingUsers((prev) => new Set(prev).add(username));
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
  }, [activeRoom?.id, user?.id]);

  // --- HANDLERS ---
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
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", user?.id)
        .or(`username.ilike.%${query}%,first_name.ilike.%${query}%`)
        .limit(5);
      setSearchResults((data as UserProfile[]) || []);
      setSearching(false);
    }, 500);
  };

  const startDM = async (targetUser: UserProfile) => {
    if (!user) return;
    const existing = conversations.find(
      (c) => !c.is_group && c.name === targetUser.username
    );
    if (existing) {
      openRoom(existing);
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
      queryClient.invalidateQueries({ queryKey: ["chat-rooms"] });
      const newRoom: ChatRoom = { ...conv, hasUnread: false };
      openRoom(newRoom);
      setIsNewChatOpen(false);
    } catch (err) {
      toast.error("Failed to start conversation");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearPreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (
      (!newMessage.trim() && !selectedFile) ||
      !activeRoom ||
      !user ||
      isSending
    )
      return;

    setIsSending(true);
    const content = newMessage.trim();

    try {
      let finalImageUrl = null;
      if (selectedFile) {
        finalImageUrl = await uploadImageToCloudinary(selectedFile, "chat");
      }

      await sendMessageMutation.mutateAsync({
        roomId: activeRoom.id,
        userId: user.id,
        content,
        imageUrl: finalImageUrl || undefined,
      });

      if (activeRoom.hasUnread) {
        queryClient.setQueryData(
          ["chat-rooms", user.id],
          (old: ChatRoom[] | undefined) => {
            return old?.map((c) =>
              c.id === activeRoom.id ? { ...c, hasUnread: false } : c
            );
          }
        );
      }

      setNewMessage("");
      clearPreview();
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d, yyyy");
  };

  const getRoomIcon = (room: ChatRoom) => {
    if (room.name === "General") return <Hash size={18} />;
    if (room.name === "Executive Board")
      return <ShieldCheck size={18} className="text-amber-500" />;
    return <Users size={18} />;
  };

  const toggleMessageTime = (id: number | string) => {
    setRevealedMessageId(revealedMessageId === id ? null : id);
  };

  if (loadingRooms) return <MessagesSkeleton />;

  return (
    // ✅ CHANGED: lg:h-full (Forces full height on Desktop/Laptop)
    // Mobile keeps h-[calc(100dvh-4rem)] to account for bottom nav
    <div className="flex flex-col lg:flex-row h-[calc(100dvh-4rem)] lg:h-full w-full bg-white lg:bg-gray-50 lg:rounded-2xl lg:border lg:border-gray-200 overflow-hidden shadow-sm">
      {/* SIDEBAR */}
      <div
        className={`w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col ${
          activeRoom ? "hidden lg:flex" : "flex"
        } h-full`}
      >
        <div className="h-16 px-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10 shrink-0">
          <h1 className="text-xl font-bold text-gray-900">Messages</h1>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-sm text-center">
              <p>No conversations yet.</p>
            </div>
          ) : (
            conversations
              .filter((room) => room.is_group)
              .map((room) => {
                const isActive = activeRoom?.id === room.id;
                const isUnread = room.hasUnread && !isActive;

                return (
                  <button
                    key={room.id}
                    onClick={() => openRoom(room)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`relative p-2 rounded-full shrink-0 ${
                        isActive ? "bg-blue-100" : "bg-gray-100"
                      }`}
                    >
                      {getRoomIcon(room)}
                      {isUnread && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-blue-600 border-2 border-white rounded-full"></span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex justify-between items-center">
                        <span
                          className={`truncate block ${
                            isUnread
                              ? "font-black text-gray-900"
                              : "font-semibold"
                          }`}
                        >
                          {room.name}
                        </span>
                        {isUnread && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 rounded-full font-bold">
                            New
                          </span>
                        )}
                      </div>
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
        className={`
            flex flex-col bg-white
            ${!activeRoom ? "hidden lg:flex" : "flex"}
            fixed inset-0 z-[100]
            lg:static lg:z-auto lg:flex-1 lg:h-full
        `}
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {activeRoom ? (
          <>
            <div className="h-16 px-4 border-b border-gray-100 flex items-center justify-between bg-white shadow-sm z-20 shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={closeRoom}
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
                        className={`flex gap-2 max-w-[85%] sm:max-w-[75%] ${
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
                          className="flex flex-col gap-1 min-w-0"
                        >
                          {msg.image_url && (
                            <img
                              src={msg.image_url}
                              alt="Attachment"
                              className="rounded-xl w-auto max-h-[320px] max-w-full object-cover border border-gray-100 shadow-sm cursor-pointer block"
                            />
                          )}
                          {msg.content && (
                            <div
                              className={`
                                px-4 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words
                                ${
                                  isMe
                                    ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm"
                                    : "bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm shadow-sm"
                                }
                            `}
                            >
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

            <div className="bg-white border-t border-gray-100 shrink-0 safe-area-bottom">
              {previewUrl && (
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-start justify-between animate-in slide-in-from-bottom-2">
                  <div className="relative group">
                    <img
                      src={previewUrl}
                      className="h-20 w-auto rounded-lg object-cover border border-gray-200 shadow-sm"
                    />
                    {isSending && (
                      <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={clearPreview}
                    disabled={isSending}
                    className="p-1.5 bg-gray-200 hover:bg-gray-300 rounded-full text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="p-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileSelect}
                />
                <form
                  onSubmit={handleSendMessage}
                  className="flex gap-2 items-center"
                >
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={`rounded-full shrink-0 ${
                      previewUrl
                        ? "bg-blue-100 text-blue-600"
                        : "text-gray-400 hover:text-blue-600"
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSending}
                  >
                    {previewUrl ? (
                      <ImageIcon size={20} />
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
                    placeholder={
                      previewUrl ? "Add a caption..." : "Type a message..."
                    }
                    className="flex-1 rounded-full bg-gray-100 border-none h-10 px-4"
                    disabled={isSending}
                  />

                  <Button
                    type="submit"
                    size="icon"
                    disabled={(!newMessage.trim() && !previewUrl) || isSending}
                    className="h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 shadow-md shrink-0"
                  >
                    {isSending ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <Send size={16} className="ml-0.5" />
                    )}
                  </Button>
                </form>
              </div>
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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
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
    // ✅ CHANGED: lg:h-full on skeleton too
    <div className="flex flex-col lg:flex-row h-[calc(100dvh-4rem)] lg:h-full w-full bg-white lg:bg-gray-50 lg:rounded-2xl lg:border lg:border-gray-200 overflow-hidden shadow-sm">
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
