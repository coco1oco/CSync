import { useAuth } from "@/context/authContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await signOut(); // Call the signOut function from AuthContext
      navigate("/SignIn"); // Redirect to SignIn page
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow">
        <h1 className="text-4xl font-bold text-center mb-6">
          Welcome, {user?.username}! 🐾
        </h1>
        <p className="text-center text-gray-600 mb-6">This is your Admin Dashboard</p>

        <div className="space-y-4">
          {/* Email Display */}
          <div className="p-4 bg-blue-100 rounded-lg">
            <p className="font-bold">Email:</p>
            <p className="text-lg">{user?.email || "No email found"}</p>
          </div>

          {/* Username Display */}
          <div className="p-4 bg-blue-100 rounded-lg">
            <p className="font-bold">Username:</p>
            <p className="text-lg">{user?.username || "No username found"}</p>
          </div>

          {/* Role Display */}
          <div className="p-4 bg-blue-100 rounded-lg">
            <p className="font-bold">Role:</p>
            <p className="text-lg">{user?.role || "No role found"}</p>
          </div>
        </div>

        {/* Sign Out Button */}
        <Button
          onClick={handleSignOut}
          className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white rounded-lg py-2"
        >
          Sign Out
        </Button>
      </div>
    </div>
  );
}
