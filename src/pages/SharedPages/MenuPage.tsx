import { useAuth } from "@/context/authContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { BottomNavigation } from '@/components/BottomNavigation';
import BackIcon from '@/assets/BackButton.svg';
import { QrCode } from 'lucide-react';

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
      <div className="flex flex-col items-center gap-4 p-6">
        <Button
          onClick={() => navigate("/ScanQR")}
          className="w-60 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 flex items-center justify-center gap-2"
        >
          <QrCode className="w-5 h-5" />
          Scan QR Code
        </Button>
        <Button
          onClick={handleSignOut}
          className="w-60 bg-red-600 hover:bg-red-700  text-white rounded-lg py-2"
        >
          Sign Out
        </Button>
      </div>
        <BottomNavigation userRole="admin" />
    </div>
  );
}
