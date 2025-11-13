import { useAuth } from "@/context/authContext";
import { Button } from "@/components/ui/button";

export default function UserDashboard() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-4xl font-bold mb-4">Welcome, {user?.username}! 🐾</h1>
          <p className="text-gray-600 mb-8">This is your PawPal Dashboard</p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-blue-100 p-4 rounded-lg">
              <h3 className="font-bold">Email:</h3>
              <p>{user?.email}</p>
            </div>
            <div className="bg-blue-100 p-4 rounded-lg">
              <h3 className="font-bold">Role:</h3>
              <p className="capitalize">{user?.role}</p>
            </div>
          </div>

          <Button 
            onClick={signOut}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}


