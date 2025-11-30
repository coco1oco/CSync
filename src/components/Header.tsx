// src/components/shared/Header.tsx
// Reusable header component for all pages
// Contains logo, app name, and profile button

// Import useNavigate hook for navigation
import { useNavigate } from 'react-router-dom';
// Import User icon from lucide-react
import type { JSX } from 'react';

import ProfileIcon from '@/assets/Profile.svg';

// Define props for this component
interface HeaderProps {
  // Optional title to display (defaults to "PawPal")
  title?: string;
  // Whether to show the profile button (defaults to true)
  showProfile?: boolean;
}

// Component function - reusable header
export function Header({ 
  title = 'PawPal', 
  showProfile = true, 
}: Readonly<HeaderProps>): JSX.Element {
  // Hook to navigate to different pages
  const navigate = useNavigate();

  return (
    // Sticky header at top of page with border
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-4">
      {/* Left: Logo and app name */}
      <div className="flex items-center gap-2">
        {/* Logo placeholder with paw emoji */}
        <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center">
          🐾
        </div>
        {/* App name or custom title */}
        <h1 className="text-xl font-bold text-gray-900">
          {title}
        </h1>
      </div>

      {/* Right: Profile button OR Back button (depends on showBack prop) */}
      {showProfile && (
        // Profile button - navigate to profile page
        <button
          // Navigate to profile page when clicked
          onClick={() => navigate('/ProfilePage')}
          // Hover effect: light background on hover
          className="rounded-full p-2 hover:bg-gray-100 transition-colors"
        >
          {/* Profile SVG icon */}
          <img src={ProfileIcon} alt="Profile" className="h-6 w-6" />
        </button>
      )}
    </header>
  );
}
