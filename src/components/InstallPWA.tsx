import { useState, useEffect } from "react";
import { Share, X, PlusSquare } from "lucide-react";

export default function InstallPWA() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Check if user is on iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(userAgent);

    // 2. Check if app is NOT already installed
    const isStandalone = window.matchMedia(
      "(display-mode: standalone)"
    ).matches;

    // ✅ Reverted to production logic: Only show on iOS browsers (not installed)
    if (isIOS && !isStandalone) {
      setIsVisible(true);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 fade-in duration-700">
      <div className="bg-white/95 backdrop-blur-md border border-gray-200 shadow-2xl rounded-2xl p-4 relative mx-auto max-w-sm ring-1 ring-black/5">
        {/* Close Button */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4">
          {/* App Icon Preview */}
          <div className="h-12 w-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold shadow-md">
            P
          </div>

          <div className="flex-1 space-y-2">
            <h3 className="font-bold text-gray-900 leading-tight">
              Install PawPal App
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              For the best experience, add this app to your home screen.
            </p>

            {/* Instructions */}
            <div className="flex flex-col gap-2 mt-2 text-sm text-gray-800 font-medium">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-gray-100 rounded text-xs text-gray-500">
                  1
                </span>
                <span>
                  Tap the{" "}
                  <Share size={14} className="inline mx-1 text-blue-600" />{" "}
                  Share button
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-5 h-5 bg-gray-100 rounded text-xs text-gray-500">
                  2
                </span>
                <span>
                  Select{" "}
                  <PlusSquare size={14} className="inline mx-1 text-gray-900" />{" "}
                  <strong>Add to Home Screen</strong>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
