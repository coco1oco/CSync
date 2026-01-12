import { UpcomingEventsWidget } from "@/components/UpcomingEventsWidget";
import { ArrowLeft, Ticket } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function MyTicketsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ✅ Sticky Header */}
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm px-4 py-3 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon" 
          className="-ml-2 text-gray-600 hover:bg-gray-100 rounded-full h-10 w-10"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>
        
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white text-gray-900 rounded-lg">
            <Ticket className="w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">My Tickets</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-2xl mx-auto p-4">
        <UpcomingEventsWidget />
      </div>
    </div>
  );
}