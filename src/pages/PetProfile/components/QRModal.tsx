import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";

interface QRModalProps {
  name: string;
  petId: string;
  onClose: () => void;
}

export default function QRModal({ name, petId, onClose }: QRModalProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm relative text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
        >
          <X size={20} />
        </button>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-gray-900">
            {name}'s Digital ID
          </h3>
          <p className="text-sm text-gray-500">
            Scan this code to view {name}'s lost & found profile instantly.
          </p>
        </div>

        <div className="bg-white p-4 rounded-3xl border-2 border-dashed border-gray-200 inline-block shadow-sm">
          <QRCode
            value={`${window.location.origin}/lost-and-found/${petId}`}
            size={200}
            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            viewBox={`0 0 256 256`}
          />
        </div>

        <Button
          className="w-full rounded-xl bg-gray-900 hover:bg-black h-12 font-bold"
          onClick={() => window.print()}
        >
          <Download className="w-4 h-4 mr-2" /> Print ID Card
        </Button>
      </div>
    </div>
  );
}
