import { useRouteError, isRouteErrorResponse } from "react-router-dom";
import { useEffect } from "react";

export default function RootBoundary() {
  const error = useRouteError() as any;

  useEffect(() => {
    // Automatically reload the page if it's a chunk load error
    if (
      error?.message?.includes("Failed to fetch dynamically imported module") ||
      error?.message?.includes("Importing a module script failed")
    ) {
      window.location.reload();
    }
  }, [error]);

  if (isRouteErrorResponse(error)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <h1 className="text-2xl font-bold">{error.status}</h1>
        <p className="mt-2 text-gray-600">{error.statusText}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-gray-600">
        We just updated the app. Please refresh the page.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 rounded-full bg-blue-600 px-6 py-2 text-white font-bold"
      >
        Refresh
      </button>
    </div>
  );
}
