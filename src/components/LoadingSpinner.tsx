import React from "react";
import { Loader2 } from "lucide-react"; // Using lucide-react since you already use it

const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center h-full w-full">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  );
};

export default LoadingSpinner;
