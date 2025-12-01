import { useAuth } from "@/context/authContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from '@/components/BottomNavigation';
import BackIcon from '@/assets/BackButton.svg';

export default function MenuPage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut(); // Call the signOut function from AuthContext
      navigate("/Welcome"); // Redirect to SignIn page
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

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
            <h2 className="text-xl font-semibold">Menu</h2>
            {/* Right: empty placeholder to balance layout */}
            <div className="h-8 w-8" />
      </header>
        <Button
          onClick={handleSignOut}
          className="w-60 mt-6 bg-red-600 hover:bg-red-700  text-white rounded-lg py-2"
        >
          Sign Out
        </Button>
        <BottomNavigation userRole="admin" />
    </div>
  );
}
