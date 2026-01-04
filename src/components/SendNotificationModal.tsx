import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog"; 
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, BellRing } from "lucide-react";
import { useState } from "react";

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (message: string) => Promise<void>;
  eventTitle: string;
}

// ✅ ADDED "export" HERE so other files can use it
export function SendNotificationModal({ isOpen, onClose, onSend, eventTitle }: SendNotificationModalProps) {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    await onSend(message);
    setSending(false);
    setMessage(""); // Reset after send
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md z-[150]">
        <DialogHeader>
          <DialogTitle>Send Update to Guests</DialogTitle>
          <DialogDescription>
            Notify all attendees of <strong>{eventTitle}</strong> about updates or changes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              placeholder="e.g., We are starting in 10 minutes! Please head to the main hall."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="h-32 resize-none"
            />
          </div>
        </div>
        <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={onClose} disabled={sending}>Cancel</Button>
            <Button onClick={handleSend} disabled={!message.trim() || sending} className="bg-blue-600 hover:bg-blue-700 text-white">
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <BellRing className="mr-2 h-4 w-4" /> Send Notification
                </>
              )}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}