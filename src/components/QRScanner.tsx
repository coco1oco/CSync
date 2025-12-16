import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { Camera, X } from "lucide-react";
import { toast } from "sonner";

interface QRScannerProps {
  onClose?: () => void;
}

export default function QRScanner({ onClose }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (scannerRef.current && isScanning) {
        scannerRef.current
          .stop()
          .catch((err) => console.error("Error stopping scanner:", err));
      }
    };
  }, [isScanning]);

  const startScanning = async () => {
    try {
      setCameraError(null);
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Handle successful scan
          handleScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Handle scan error (ignore, as it happens frequently while scanning)
          console.debug("QR scan error:", errorMessage);
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error("Error starting scanner:", err);
      setCameraError(
        "Failed to access camera. Please ensure camera permissions are granted."
      );
      toast.error("Failed to access camera");
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    // Stop scanning immediately
    await stopScanning();

    try {
      // Try to parse as JSON
      const data = JSON.parse(decodedText);

      if (data.type === "pawpal-pet" && data.petId) {
        // Navigate to pet profile
        toast.success(`Found ${data.name}!`);
        navigate(`/PetDashboard/${data.petId}`);
        onClose?.();
      } else {
        toast.error("Invalid PawPal QR code");
      }
    } catch (err) {
      // Not a valid PawPal QR code
      toast.error("This is not a valid PawPal pet QR code");
      console.error("Failed to parse QR code:", err);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <div className="flex justify-between items-center w-full mb-4">
        <h2 className="text-xl font-semibold">Scan Pet QR Code</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="w-full max-w-md">
        <div
          id="qr-reader"
          className={`w-full ${isScanning ? "block" : "hidden"}`}
        />

        {!isScanning && (
          <div className="flex flex-col items-center justify-center gap-4 p-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
            <Camera className="w-16 h-16 text-gray-400" />
            <p className="text-sm text-gray-500 text-center">
              Point your camera at a PawPal QR code to scan
            </p>
          </div>
        )}

        {cameraError && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{cameraError}</p>
          </div>
        )}

        <div className="mt-6 flex gap-2">
          {!isScanning ? (
            <Button onClick={startScanning} className="w-full">
              <Camera className="w-4 h-4 mr-2" />
              Start Scanning
            </Button>
          ) : (
            <Button onClick={stopScanning} variant="outline" className="w-full">
              Stop Scanning
            </Button>
          )}
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>Tip:</strong> QR codes can be found on pet collars, tags, or
          in lost & found posts. Scanning will take you to the pet's profile
          with contact information.
        </p>
      </div>
    </div>
  );
}
