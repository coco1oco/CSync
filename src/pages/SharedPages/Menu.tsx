import { useAuth } from "@/context/authContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from '@/components/BottomNavigation';
import BackIcon from '@/assets/BackButton.svg';
import MenuIcon from '@/assets/Menu.svg';


export default function MenuPage() {
  const { user, signOut } = useAuth();
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
    
        <Button
          onClick={handleSignOut}
          className="w-60 mt-6 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2"
        >
          Sign Out
        </Button>
        <BottomNavigation userRole="admin" />
    </div>
  );
}
