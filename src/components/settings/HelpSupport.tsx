export function HelpSupport() {
  return (
    <div className="space-y-4 animate-in fade-in">
      <h2 className="text-xl font-bold text-gray-900">Help & Support</h2>
      <p className="text-sm text-gray-600">Need assistance? Check our common topics below or contact support.</p>
      <div className="grid gap-3 mt-4">
        <button className="text-left p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <h3 className="font-semibold text-gray-900">How do I reset my password?</h3>
          <p className="text-xs text-gray-500 mt-1">Instructions for account recovery.</p>
        </button>
      </div>
    </div>
  );
}