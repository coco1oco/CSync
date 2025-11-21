// components/BottomNavigation.jsx
import { Home, MessageSquare, Bell, PawPrint } from 'lucide-react';

export function BottomNavigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-8 py-4">
      <div className="flex justify-between items-center max-w-md mx-auto">
        <button className="flex flex-col items-center gap-1">
          <Home className="w-6 h-6" />
        </button>
        <button className="flex flex-col items-center gap-1">
          <MessageSquare className="w-6 h-6" />
        </button>
        <button className="flex flex-col items-center gap-1">
          <Bell className="w-6 h-6" />
        </button>
        <button className="flex flex-col items-center gap-1">
          <PawPrint className="w-6 h-6" />
        </button>
      </div>
    </nav>
  );
}
