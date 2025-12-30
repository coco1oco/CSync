import { useState } from "react";
import { User, Mail, Lock, Camera, Save } from "lucide-react";
import { useAuth } from "@/context/authContext";

export function AccountSettings() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => setIsLoading(false), 1500);
  };

  return (
    <div className="animate-in fade-in duration-300 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900">Account Center</h2>
        <p className="text-sm text-gray-500">Manage your personal information and login security.</p>
      </div>

      {/* 1. Profile Section (Instagram Style) */}
      <div className="flex items-center gap-6 p-4 mb-8 bg-gray-50/80 rounded-xl border border-gray-100">
        <div className="relative group cursor-pointer shrink-0">
            <img 
                src={user?.avatar_url || "https://ui-avatars.com/api/?name=User&background=random"} 
                alt="Profile" 
                className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
            />
            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={18} className="text-white" />
            </div>
        </div>
        <div className="flex-1">
            <h3 className="font-bold text-gray-900 text-lg">{user?.first_name} {user?.last_name}</h3>
            <p className="text-xs text-gray-500">{user?.role || "User"}</p>
        </div>
        <button className="px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            Change photo
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* 2. Desktop Layout: Labels Left, Inputs Right */}
        
        {/* Email Field */}
        <div className="md:grid md:grid-cols-4 md:gap-6 items-start">
            <label className="text-sm font-medium text-gray-700 md:text-right md:pt-3 flex items-center gap-2 md:justify-end">
                <Mail size={16} className="text-gray-400" /> Email
            </label>
            <div className="md:col-span-3 mt-1 md:mt-0">
                <input 
                    type="email" 
                    defaultValue={user?.email} 
                    className="w-full max-w-lg p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                />
            </div>
        </div>

        {/* Password Field */}
        <div className="md:grid md:grid-cols-4 md:gap-6 items-start">
            <label className="text-sm font-medium text-gray-700 md:text-right md:pt-3 flex items-center gap-2 md:justify-end">
                <Lock size={16} className="text-gray-400" /> Password
            </label>
            <div className="md:col-span-3 mt-1 md:mt-0">
                <input 
                    type="password" 
                    placeholder="Leave blank to keep current"
                    className="w-full max-w-lg p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 outline-none transition-all"
                />
                <p className="text-[11px] text-gray-400 mt-1.5">
                    Minimum of 8 characters. Make it unique.
                </p>
            </div>
        </div>

        {/* Save Button */}
        <div className="md:grid md:grid-cols-4 md:gap-6 pt-4">
            <div className="md:col-start-2 md:col-span-3">
                <button 
                    disabled={isLoading}
                    className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm transition-colors flex items-center gap-2 disabled:opacity-70 shadow-sm"
                >
                    {isLoading ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </div>

      </form>
    </div>
  );
}