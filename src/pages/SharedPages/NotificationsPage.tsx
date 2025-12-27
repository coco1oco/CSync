import { NotificationCenter } from "../../components/NotificationCenter";

export function NotificationsPage() {
  return (
    <div className="flex min-h-screen bg-white">
      <main className="flex-1 lg:ml-64 flex justify-start">
        <div className="w-full max-w-md border-r border-gray-100 min-h-screen">
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-6 py-5">
            <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          </div>
          <div className="mt-2">
            <NotificationCenter variant="page" />
          </div>
        </div>
      </main>
    </div>
  );
}
