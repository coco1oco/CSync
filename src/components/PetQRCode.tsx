import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";
import { Button } from "./ui/button";
import { toast } from "sonner";
import type { Pet } from "@/lib/usePets";

interface PetQRCodeProps {
  pet: Pet;
  ownerName?: string;
  ownerContact?: string;
}

export default function PetQRCode({ pet, ownerName, ownerContact }: PetQRCodeProps) {
  // Create QR code data with pet information
  const qrData = JSON.stringify({
    petId: pet.id,
    name: pet.name,
    species: pet.species,
    breed: pet.breed,
    microchipId: pet.microchip_id,
    ownerName,
    ownerContact,
    type: "pawpal-pet",
  });

  const downloadQRCode = () => {
    const svg = document.getElementById(`qr-${pet.id}`);
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      console.error("Failed to get canvas context");
      toast.error("Unable to download QR code. Please try again.");
      return;
    }
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");

      const downloadLink = document.createElement("a");
      downloadLink.download = `${pet.name}-qrcode.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg shadow-sm border">
      <div className="text-center mb-2">
        <h3 className="font-semibold text-lg">Pet QR Code</h3>
        <p className="text-sm text-gray-500">
          Scan this code to access {pet.name}'s information
        </p>
      </div>

      <div className="p-4 bg-white rounded-lg border-2 border-gray-200">
        <QRCodeSVG
          id={`qr-${pet.id}`}
          value={qrData}
          size={200}
          level="H"
          includeMargin={true}
        />
      </div>

      <Button
        onClick={downloadQRCode}
        className="w-full flex items-center justify-center gap-2"
        variant="outline"
      >
        <Download className="w-4 h-4" />
        Download QR Code
      </Button>

      <p className="text-xs text-gray-400 text-center">
        Print and attach this QR code to {pet.name}'s collar or tag for lost & found purposes
      </p>
    </div>
  );
}
