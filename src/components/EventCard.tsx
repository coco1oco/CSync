import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Edit,
  Trash2,
  MapPin,
  X,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OutreachEvent } from "@/types";
import { motion } from "framer-motion";

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const {
    title,
    location,
    description,
    images = [],
    admin,
    created_at,
  } = event;

  const nextImage = () =>
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  const prevImage = () =>
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);

  const dateStr = new Date(created_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });

  const MAX_LENGTH = 150;
  const shouldTruncate = description && description.length > MAX_LENGTH;

  // Lock body scroll when lightbox is open
  useEffect(() => {
    if (isLightboxOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isLightboxOpen]);

  return (
    <article className="bg-white lg:rounded-2xl lg:shadow-sm lg:border border-gray-100 overflow-hidden flex flex-col">
      {/* HEADER */}
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden border border-blue-100">
            {admin?.avatar_url ? (
              <img
                src={admin.avatar_url}
                alt={admin.username}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-sm font-bold text-blue-600">
                {admin?.username?.slice(0, 2).toUpperCase() || "YFA"}
              </span>
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 leading-none">
              {admin?.username || "Youth For Animals"}
            </span>
            <div className="flex items-center text-xs text-gray-500 mt-1 gap-1">
              <span>{dateStr}</span>
              {location && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-0.5 text-blue-600">
                    <MapPin size={10} />
                    <span className="truncate max-w-[150px]">{location}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-gray-700"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-3.5 w-3.5" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="text-red-600 focus:text-red-600 focus:bg-red-50"
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* CONTENT */}
      <div className="px-4 pb-2">
        {title && (
          <h3 className="font-bold text-gray-900 text-base mb-1">{title}</h3>
        )}
        <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
          {isExpanded || !shouldTruncate ? (
            description
          ) : (
            <>
              {description.slice(0, MAX_LENGTH)}...
              <button
                onClick={() => setIsExpanded(true)}
                className="text-gray-500 font-semibold hover:underline ml-1 cursor-pointer"
              >
                See more
              </button>
            </>
          )}
        </div>
      </div>

      {/* MEDIA */}
      {images.length > 0 && (
        <div
          className="mt-2 relative w-full aspect-[4/3] bg-gray-50 overflow-hidden group cursor-pointer"
          onClick={() => setIsLightboxOpen(true)}
        >
          {/* Ambient Background */}
          <div
            className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-60"
            style={{ backgroundImage: `url(${images[currentImageIndex]})` }}
          />

          {/* Main Image */}
          <img
            src={images[currentImageIndex]}
            alt="Event content"
            className="relative w-full h-full object-contain z-10"
          />

          {/* Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/60 z-20"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/60 z-20"
              >
                <ChevronRight size={20} />
              </button>

              <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20">
                {images.map((_, i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all shadow-sm ${
                      i === currentImageIndex
                        ? "w-4 bg-white"
                        : "w-1.5 bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* LIGHTBOX PORTAL - WITHOUT ANIMATEPRESENCE FOR STABILITY */}
      {isLightboxOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
            style={{ zIndex: 9999 }} // Force highest Z-Index
            onClick={() => setIsLightboxOpen(false)}
          >
            <button className="absolute top-6 right-6 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors z-50">
              <X size={28} />
            </button>

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-5xl w-full h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={images[currentImageIndex]}
                alt="Fullscreen view"
                className="relative max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl"
              />

              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      prevImage();
                    }}
                    className="absolute left-0 lg:-left-12 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white transition-colors"
                  >
                    <ChevronLeft size={48} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      nextImage();
                    }}
                    className="absolute right-0 lg:-right-12 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white transition-colors"
                  >
                    <ChevronRight size={48} />
                  </button>
                </>
              )}
            </motion.div>
          </div>,
          document.body
        )}
    </article>
  );
}
