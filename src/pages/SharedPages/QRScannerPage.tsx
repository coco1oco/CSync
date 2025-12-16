import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import QRScanner from "@/components/QRScanner";

export default function QRScannerPage() {
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-gray-100 p-4 pb-24">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl p-4 shadow-md">
          {/* Header */}
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate(-1)}
              className="p-1 hover:bg-gray-100 rounded-lg mr-3"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <span className="font-semibold text-lg">Scan QR Code</span>
          </div>

          {/* Scanner Component */}
          <QRScanner onClose={() => navigate(-1)} />
        </div>
      </div>
    </div>
  );
}
