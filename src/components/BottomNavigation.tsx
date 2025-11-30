// src/components/BottomNavigation.tsx

// Import navigation and icon components
import HomeIcon from '@/assets/Home.svg';
import MessageIcon from '@/assets/Message.svg';
import NotificationIcon from '@/assets/Notification.svg';
import PetIcon from '@/assets/Pet.svg';
import { useNavigate, useLocation } from 'react-router-dom';
import type { UserRole } from '@/types';
import type { JSX } from 'react';
import { Home } from 'lucide-react';

// Props: current user's role
interface BottomNavigationProps {
  userRole: UserRole | null;
}

// Bottom navigation bar component (fixed at bottom of screen)
export function BottomNavigation({ userRole }: Readonly<BottomNavigationProps>): JSX.Element {
  // React Router hook to navigate to different pages
  const navigate = useNavigate();
  // React Router hook to get current page path
  const location = useLocation();

  // Helper function: check if a path is currently active
  const isActive = (path: string): boolean => location.pathname === path;

  // Navigation items configuration
  // Each has: path (where to go), icon (which lucide icon), label (for accessibility)
  const navItems = [
    { path: '/', icon: HomeIcon, label: 'Home' },
    { path: '/messages', icon: MessageIcon, label: 'Messages' },
    { path: '/notifications', icon: NotificationIcon, label: 'Notifications' },
    // 4th item changes based on role
    {
      path: userRole === 'admin' ? '/admin' : '/rewards',
      icon: userRole === 'admin' ? PetIcon : PetIcon,
      label: userRole === 'admin' ? 'PetDashboard' : 'Rewards',
    },
  ];

  return (
    // Fixed nav bar at bottom of screen
    <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
      {/* Container centered with max width */}
      <div className="mx-auto flex max-w-md items-center justify-around px-4 py-3">
        {/* Create a button for each nav item */}
        {navItems.map(({ path, icon: Icon, label }) => (
          <button
            key={path}
            onClick={() => navigate(path)} // Navigate when clicked
            className={`flex flex-col items-center gap-1 rounded-lg p-2 transition-colors ${
              // Style changes if this is the active page
              isActive(path)
                ? 'text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            aria-label={label}
          >
            {/* Icon component */}
            <span className={`h-6 w-6 ${isActive(path) ? 'fill-current' : ''}`}>
              <img src={Icon} alt={label} className="h-6 w-6" />
            </span>
            
          </button>
          
        ))}
      </div>
    </nav>
  );
}
