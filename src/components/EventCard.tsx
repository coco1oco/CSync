import { useState } from "react";
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
import { motion, AnimatePresence } from "framer-motion";

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

  // 1. New State for Lightbox
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

  // Helper to prevent body scroll when lightbox is open
  if (typeof document !== "undefined") {
    document.body.style.overflow = isLightboxOpen ? "hidden" : "";
  }

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

      {/* MEDIA - FACEBOOK STYLE & CLICKABLE */}
      {images.length > 0 && (
        <div
          className="mt-2 relative w-full aspect-[4/3] bg-gray-50 overflow-hidden group cursor-pointer"
          // 2. Click handler to open Lightbox
          onClick={() => setIsLightboxOpen(true)}
        >
          {/* Layer 1: Blurred Background (Ambient Color) */}
          <div
            className="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-60"
            style={{ backgroundImage: `url(${images[currentImageIndex]})` }}
          />

          {/* Layer 2: Main Image (Fully Visible) */}
          <img
            src={images[currentImageIndex]}
            alt="Event content"
            className="relative w-full h-full object-contain z-10"
          />

          {/* Navigation Controls */}
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

      {/* 3. LIGHTBOX PORTAL */}
      <AnimatePresence>
        {isLightboxOpen &&
          createPortal(
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
              onClick={() => setIsLightboxOpen(false)}
            >
              {/* Close Button */}
              <button className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-50">
                <X size={24} />
              </button>

              {/* Main Image Container */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative max-w-5xl max-h-full w-full h-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image itself
              >
                {/* Blurred Background for Lightbox too */}
                <div
                  className="absolute inset-0 bg-cover bg-center blur-3xl scale-110 opacity-30"
                  style={{
                    backgroundImage: `url(${images[currentImageIndex]})`,
                  }}
                />
                <img
                  src={images[currentImageIndex]}
                  alt="Fullscreen view"
                  className="relative w-auto h-auto max-w-full max-h-[90vh] object-contain shadow-2xl z-10 rounded-lg"
                />

                {/* Navigation Controls (Fullscreen) */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImage();
                      }}
                      className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-20"
                    >
                      <ChevronLeft size={32} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImage();
                      }}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-20"
                    >
                      <ChevronRight size={32} />
                    </button>
                  </>
                )}
              </motion.div>
            </motion.div>,
            document.body
          )}
      </AnimatePresence>
    </article>
  );
}
