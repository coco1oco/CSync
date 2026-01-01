import { useState } from "react";

export function DisplaySettings() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <div className="space-y-6 animate-in fade-in">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Display</h2>
        <p className="text-sm text-gray-500">Manage your appearance preferences.</p>
      </div>
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
        <h3 className="font-medium text-gray-900 mb-3">Dark Mode</h3>
        <div className="bg-white p-1 rounded-lg border border-gray-200 flex relative">
          <button 
            onClick={() => setTheme('light')} 
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${theme === 'light' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            Light
          </button>
          <button 
            onClick={() => setTheme('dark')} 
            className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${theme === 'dark' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500'}`}
          >
            Dark
          </button>
        </div>
      </div>
    </div>
  );
}