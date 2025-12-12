import { Bell, Calendar, Syringe, AlertCircle } from "lucide-react";

export default function NotificationsPage() {
  const notifications = [
    {
      id: 1,
      title: "Vaccination Reminder",
      body: "Potchi is due for the Rabies Vaccine tomorrow.",
      time: "2 hours ago",
      icon: <Syringe className="text-orange-500" />,
      bg: "bg-orange-50",
    },
    {
      id: 2,
      title: "Community Event",
      body: "Join us for the 'Paws & Play' drive this weekend!",
      time: "1 day ago",
      icon: <Calendar className="text-blue-500" />,
      bg: "bg-blue-50",
    },
    {
      id: 3,
      title: "Urgent Alert",
      body: "Lost dog reported near the main gate. Keep an eye out.",
      time: "2 days ago",
      icon: <AlertCircle className="text-red-500" />,
      bg: "bg-red-50",
    },
  ];

  return (
    <div className="p-4 space-y-4 pb-24">
      <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className="flex gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm items-start"
          >
            <div className={`p-2 rounded-full ${n.bg} shrink-0`}>{n.icon}</div>
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 text-sm">{n.title}</h4>
              <p className="text-sm text-gray-600 leading-snug">{n.body}</p>
              <span className="text-xs text-gray-400 mt-1 block">{n.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
