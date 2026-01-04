import { useState } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { X, Download, Loader2 } from "lucide-react";

interface QRModalProps {
  name: string;
  petId: string;
  onClose: () => void;
}

export default function QRModal({ name, petId, onClose }: QRModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = () => {
    setIsDownloading(true);

    // 1. Setup the Canvas (High Resolution)
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setIsDownloading(false);
      return;
    }

    // Set dimensions (1200x1600 provides high quality for print)
    canvas.width = 1200;
    canvas.height = 1600;

    // 2. Draw Background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 3. Draw Header Text
    ctx.fillStyle = "#111827"; // Dark Gray
    ctx.font = "900 80px sans-serif"; // Bold font
    ctx.textAlign = "center";
    ctx.fillText(`${name}'s ID`, canvas.width / 2, 250);

    ctx.fillStyle = "#6b7280"; // Light Gray
    ctx.font = "500 40px sans-serif";
    ctx.fillText("Scan to view Lost & Found profile", canvas.width / 2, 330);

    // 4. Draw QR Code
    // ✅ FIX: Select the SVG inside the wrapper, not the wrapper itself
    const wrapper = document.getElementById("qr-code-svg");
    const svgElement = wrapper?.querySelector("svg");

    if (svgElement) {
      // Create XML String
      const serializer = new XMLSerializer();
      let svgString = serializer.serializeToString(svgElement);

      // ✅ FIX: Ensure namespace exists (browsers often omit it for inline SVGs, but it's needed for Image src)
      if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgString = svgString.replace(
          "<svg",
          '<svg xmlns="http://www.w3.org/2000/svg"'
        );
      }

      // Convert to Blob URL (Safer than Base64)
      const blob = new Blob([svgString], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);

      const img = new Image();

      img.onload = () => {
        // Draw Container Box (Dashed Look)
        const boxSize = 700;
        const boxX = (canvas.width - boxSize) / 2;
        const boxY = 450;

        ctx.save();
        ctx.strokeStyle = "#e5e7eb";
        ctx.lineWidth = 15;
        ctx.setLineDash([40, 30]); // Dashed border effect
        ctx.strokeRect(boxX, boxY, boxSize, boxSize);
        ctx.restore();

        // Draw QR Image Centered inside box
        const qrSize = 550;
        const qrX = boxX + (boxSize - qrSize) / 2;
        const qrY = boxY + (boxSize - qrSize) / 2;
        ctx.drawImage(img, qrX, qrY, qrSize, qrSize);

        // 5. Draw Footer Text
        ctx.fillStyle = "#d1d5db"; // Very light gray
        ctx.font = "700 30px sans-serif";
        ctx.fillText("PAWPAL SECURE TAG", canvas.width / 2, 1250);

        // 6. Trigger Download
        const link = document.createElement("a");
        link.download = `${name}-ID-Card.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

        // Clean up
        URL.revokeObjectURL(url);
        setIsDownloading(false);
      };

      img.onerror = (err) => {
        console.error("Failed to load QR image", err);
        setIsDownloading(false);
      };

      img.src = url;
    } else {
      console.error("SVG element not found");
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm relative text-center space-y-6 shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition z-50"
        >
          <X size={20} />
        </button>

        {/* Visible UI (Uses Tailwind as normal) */}
        <div className="space-y-6 p-6 rounded-xl bg-white">
          <div className="space-y-2">
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {name}'s ID
            </h3>
            <p className="text-sm text-gray-500 font-medium">
              Scan to view Lost & Found profile
            </p>
          </div>

          <div className="bg-white p-4 rounded-3xl border-2 border-dashed border-gray-200 inline-block shadow-sm">
            {/* ID allows us to find the container */}
            <div id="qr-code-svg">
              <QRCode
                value={`${window.location.origin}/lost-and-found/${petId}`}
                size={200}
                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                viewBox={`0 0 256 256`}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-gray-50 mt-4">
            <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">
              PawPal Secure Tag
            </p>
          </div>
        </div>

        {/* Download Button */}
        <Button
          className="w-full rounded-xl bg-gray-900 hover:bg-black h-12 font-bold text-white shadow-xl shadow-gray-200 transition-transform active:scale-95"
          onClick={handleDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {isDownloading ? "Generating..." : "Save Image to Phone"}
        </Button>
      </div>
    </div>
  );
}
