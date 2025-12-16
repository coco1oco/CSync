import { NotificationCenter } from "@/components/NotificationCenter";

export function NotificationsPage() {
  return (
    <div className="flex flex-col flex-1 min-h-screen bg-gray-50">
      <main className="flex-1 flex justify-center px-4 py-6 lg:ml-64">
        <div className="w-full max-w-xl">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Notifications
          </h1>
          <NotificationCenter />
        </div>
      </main>
    </div>
  );
}
