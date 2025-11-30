import { useAuth } from "@/context/authContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from '@/components/BottomNavigation';
import BackIcon from '@/assets/BackButton.svg';
import MenuIcon from '@/assets/Menu.svg';


export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-4">
            <button
            type="button"
            onClick={() => navigate(-1)} // go to previous page in history
            className="h-8 w-8 rounded flex items-center justify-center"
            >
            <img src={BackIcon} alt="Back" className="h-6 w-6" />
            </button>
           <button
            // Navigate to profile page when clicked
            onClick={() => navigate('/MenuPage')}
                  // Hover effect: light background on hover
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
            >
                {/* Menu SVG icon */}
            <img src={MenuIcon} alt="Menu" className="h-6 w-6" />
            </button>
      </header>

      <div className="w-full min-h-screen bg-white p-6 space-y-10">
        <section className="w-full max-w-xs mx-auto text-center space-y-4">

        <h2 className="text-xl font-semibold">Your Profile</h2>

        <div className="flex flex-col items-center space-y-2">
          <div className="w-20 h-20 bg-gray-300 rounded-xl"></div>

          <p className="font-semibold">NAME</p>
          <p className="text-gray-500 text-sm"> {user?.username}</p>
           <p className="text-gray-500 text-sm"> {user?.email}</p>
          <p className="text-gray-500 text-sm">{user?.bio}</p>
        </div>

        <Button className="bg-gray-200 text-sm py-2 px-4 rounded-xl">
          Edit Profile
        </Button>
      </section>

        <BottomNavigation userRole="admin" />
      </div>
    </div>
  );
}
