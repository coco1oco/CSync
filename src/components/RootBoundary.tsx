import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function RootBoundary() {
  const error = useRouteError() as any;

  useEffect(() => {
    // ✅ AUTO-FIX: If it's a "missing file" error (ChunkLoadError), reload the page automatically.
    if (
      error?.message?.includes("Failed to fetch dynamically imported module") ||
      error?.message?.includes("Importing a module script failed") ||
      error?.name === "ChunkLoadError"
    ) {
      window.location.reload();
    }
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <div className="mb-4 rounded-full bg-red-100 p-4">
        <AlertTriangle className="h-8 w-8 text-red-600" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900">Something went wrong</h1>

      {isRouteErrorResponse(error) ? (
        <p className="mt-2 text-gray-600">
          {error.status} - {error.statusText}
        </p>
      ) : (
        <p className="mt-2 max-w-md text-gray-600">
          We just updated the app with new features. Please refresh to get the
          latest version.
        </p>
      )}

      <Button
        onClick={() => window.location.reload()}
        className="mt-6 gap-2 rounded-full bg-blue-600 px-8 font-bold hover:bg-blue-700"
      >
        <RefreshCcw className="h-4 w-4" />
        Reload App
      </Button>
    </div>
  );
}
