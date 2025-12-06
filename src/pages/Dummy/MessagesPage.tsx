import { User } from "lucide-react";

export default function MessagesPage() {
  const chats = [
    {
      id: 1,
      name: "Dr. Emily Chan (Vet)",
      msg: "Potchi's results look great!",
      time: "10:30 AM",
      active: true,
    },
    {
      id: 2,
      name: "YFA Admin",
      msg: "Thanks for registering for the event.",
      time: "Yesterday",
      active: false,
    },
    {
      id: 3,
      name: "Mark (Pet Owner)",
      msg: "Is the clinic open today?",
      time: "Mon",
      active: false,
    },
  ];

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
      <div className="space-y-1">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className="flex gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition"
          >
            <div className="relative">
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                <User className="text-gray-500 w-6 h-6" />
              </div>
              {chat.active && (
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
              )}
            </div>
            <div className="flex-1 border-b border-gray-50 pb-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900">{chat.name}</h3>
                <span className="text-xs text-gray-400">{chat.time}</span>
              </div>
              <p className="text-sm text-gray-500 truncate">{chat.msg}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
