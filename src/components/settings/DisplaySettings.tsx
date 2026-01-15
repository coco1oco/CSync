import { Switch } from "@/components/ui/switch";
import { Moon, Sun, Smartphone } from "lucide-react";

export function DisplaySettings() {
  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white transition-colors">
          Display & Accessibility
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 transition-colors">
          Manage your viewing experience.
        </p>
      </div>

      {/* 🛑 HIDDEN FOR DEFENSE: Dark Mode Toggle 
        (Uncomment this block after the defense to re-enable the feature)
      */}
      {/* <div className="bg-white dark:bg-gray-900 p-0 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-colors">
        <div className="flex items-center justify-between p-5">
          <div className="flex items-center gap-4">
            <div
              className={`p-2.5 rounded-full transition-colors ${
                isDark ? "bg-gray-800 text-purple-400" : "bg-gray-100 text-gray-600"
              }`}
            >
              {isDark ? <Moon size={22} /> : <Sun size={22} />}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">
                Dark Mode
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {isDark ? "On" : "Off"}
              </p>
            </div>
          </div>

          <Switch
            checked={isDark}
            onCheckedChange={toggleTheme}
            className="data-[state=checked]:bg-gray-900 dark:data-[state=checked]:bg-purple-600"
          />
        </div>
      </div> 
      */}

      {/* ✅ SAFE PLACEHOLDER: Shows "System Default" (Non-interactive) */}
      <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
        <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
          <Smartphone className="text-gray-400" size={24} />
        </div>
        <h3 className="font-bold text-gray-900 dark:text-white">
          System Default
        </h3>
        <p className="text-xs text-gray-500 mt-1 max-w-[200px] mx-auto">
          PawPal automatically adjusts to match your device's display settings.
        </p>
      </div>
    </div>
  );
}
