import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Unauthorized() {
  return (
    <div className="flex h-[100dvh] w-full items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md text-center space-y-6">
        {/* Icon Container */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50">
          <ShieldAlert className="h-10 w-10 text-red-500" />
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            Access Denied
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Sorry, you don't have permission to view this page. This area is
            restricted to administrators.
          </p>
        </div>

        {/* Action Button */}
        <Button
          asChild
          className="w-full h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
        >
          <Link to="/">Go back to Home</Link>
        </Button>

        {/* Alternative Link */}
        <div className="mt-4">
          <Link
            to="/SignIn"
            className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Switch Account
          </Link>
        </div>
      </div>
    </div>
  );
}
