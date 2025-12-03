import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OutreachEvent } from "@/types";

interface EventCardProps {
  event: OutreachEvent;
  isAdmin: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function EventCard({
  event,
  isAdmin,
  onEdit,
  onDelete,
}: Readonly<EventCardProps>) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { title, location, description, images = [], admin } = event;

  const nextImage = () =>
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () =>
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="overflow-hidden bg-white">
      {/* ===== CARD HEADER ===== */}
      <div className="relative p-3 flex items-center gap-3">
        {/* Avatar */}
        <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {admin?.avatar_url ? (
            <img
              src={admin.avatar_url}
              alt={admin.username}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-xs font-bold text-blue-700">
              {admin?.username?.slice(0, 2).toUpperCase() || "A"}
            </span>
          )}
        </div>

        {/* Name & Loc */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-gray-900 truncate">
            {admin?.username || "Youth For Animals"}
          </h3>
          <p className="text-xs text-gray-500 truncate">{location}</p>
        </div>

        {/* Menu (Admin Only) */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2">
                <MoreVertical className="h-4 w-4 text-gray-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* ===== DESCRIPTION ===== */}
      {/* Moved description ABOVE image (like Facebook/Twitter) or keep below? 
          Wireframe has it below. Let's keep it below but tighter. */}

      <div className="px-3 pb-3">
        <h2 className="text-base font-bold text-gray-900 mb-1 leading-tight">
          {title}
        </h2>
        <p className="text-sm text-gray-700 leading-normal whitespace-pre-wrap">
          {description}
        </p>
      </div>

      {/* ===== IMAGE ===== */}
      {images.length > 0 && (
        <div className="relative bg-gray-100 w-full aspect-[4/3] overflow-hidden">
          <img
            src={images[currentImageIndex]}
            alt="Event"
            className="h-full w-full object-cover"
          />
          {images.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 text-white rounded-full"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 bg-black/50 text-white rounded-full"
              >
                <ChevronRight size={16} />
              </button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {images.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 w-1.5 rounded-full ${
                      i === currentImageIndex ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
