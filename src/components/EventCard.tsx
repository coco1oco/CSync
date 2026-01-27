import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, MapPin, X } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OutreachEvent } from "@/types";
import { motion, AnimatePresence } from "framer-motion";

// Helper function to format relative time
const formatRelativeTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Show relative time for less than 1 month
  if (diffInSeconds < 2629746) {
    if (diffInSeconds < 60) return `${diffInSeconds}s`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`;
    return `${Math.floor(diffInSeconds / 604800)}w`;
  }

  // Show year if more than 1 year old
  if (diffInSeconds >= 31556952) {
    return `${Math.floor(diffInSeconds / 31556952)}y`;
  }

  // Show actual date for 1 month to 1 year (e.g., "Sep 2")
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getInitialsFromName = (name: string) => {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const s = parts[0];
    return (s[0] + (s[1] ?? "")).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

interface EventCardProps {
  event: OutreachEvent;
  isAdmin: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onTagClick?: (tag: string) => void;
  children?: React.ReactNode;
  customUsername?: string;
  customAvatar?: string;
}

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
  }),
  center: { zIndex: 1, x: 0, opacity: 1 },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
  }),
};

export function EventCard({
  event,
  isAdmin,
  onEdit,
  onDelete,
  onTagClick,
  children,
  customUsername,
  customAvatar,
}: Readonly<EventCardProps>) {
  const [[page, direction], setPage] = useState([0, 0]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const lastDragRef = useRef(0);

  // ✅ FIX: Check 'admin' first (from Dashboard fetch), then 'profiles' (standard join)
  const displayName =
    customUsername ||
    (event as any).admin?.username ||
    (event as any).profiles?.username ||
    "Youth For Animals";

  const displayAvatar =
    customAvatar ||
    (event as any).admin?.avatar_url ||
    (event as any).profiles?.avatar_url ||
    null;

  const initials = getInitialsFromName(displayName);

  const { title, location, description, images = [], created_at } = event;

  const imageIndex = Math.abs(page % images.length);

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  };

  const swipeConfidenceThreshold = 10000;
  const swipeOffsetThreshold = 120;
  const swipePower = (offset: number, velocity: number) =>
    Math.abs(offset) * velocity;

  const dateStr = formatRelativeTime(created_at);

  // Adjusted limit so "Show more" appears for medium-length posts too
  const isLongText = description && description.length > 150;

  const renderWithHashtags = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(#[\w]+)/g);
    return parts.map((part, index) => {
      if (part.startsWith("#")) {
        return (
          <span
            key={index}
            className="text-blue-600 font-normal hover:underline cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onTagClick?.(part);
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

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
    <article className="bg-white border-b border-gray-100 pb-2 md:rounded-3xl md:border md:shadow-sm md:mb-6 transition-colors hover:bg-gray-50/30">
      {/* 1. HEADER */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div className="flex gap-3">
          <div className="h-10 w-10 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100 flex items-center justify-center font-bold text-sm text-gray-700">
            {displayAvatar ? (
              <img
                src={displayAvatar}
                alt={displayName}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/PawPal.png";
                }}
              />
            ) : (
              initials
            )}
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-gray-900 leading-none">
                {displayName}
              </span>
              <span className="text-xs text-gray-400">· {dateStr}</span>
            </div>
            {location && (
              <a
                href={`http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(
                  location,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-gray-500 mt-1 hover:text-blue-600"
                onClick={(e) => e.stopPropagation()}
              >
                <MapPin size={10} />
                <span>{location}</span>
              </a>
            )}
          </div>
        </div>

        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 -mt-1 -mr-2"
              >
                <MoreHorizontal className="h-5 w-5" />
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

      {/* 2. TEXT CONTENT */}
      <div className="px-4 pb-3">
        {title && (
          <h4 className="font-bold text-gray-900 mb-1 text-base">{title}</h4>
        )}

        <div className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap">
          <span className={!isExpanded ? "line-clamp-3" : ""}>
            {renderWithHashtags(description)}
          </span>

          {isLongText && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 text-xs font-semibold mt-1 hover:text-gray-600 block"
            >
              {isExpanded ? "Show less" : "...more"}
            </button>
          )}
        </div>
      </div>

      {/* 3. MEDIA */}
      {images.length > 0 && (
        <div className="px-0 md:px-4 pb-3">
          <div
            className="relative w-full aspect-square bg-gray-100 md:rounded-2xl overflow-hidden cursor-pointer border-y md:border border-gray-100 shadow-sm"
            onClick={() => {
              if (!isDragging && Date.now() - lastDragRef.current > 200) {
                setIsLightboxOpen(true);
              }
            }}
          >
            <AnimatePresence initial={false} custom={direction}>
              <motion.img
                key={page}
                src={images[imageIndex]}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  x: { type: "spring", stiffness: 300, damping: 30 },
                  opacity: { duration: 0.2 },
                }}
                drag={images.length > 1 ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.15}
                onDragStart={() => {
                  setIsDragging(true);
                  lastDragRef.current = Date.now();
                }}
                onDragEnd={(e, { offset, velocity }) => {
                  void e;
                  lastDragRef.current = Date.now();
                  const swipe = swipePower(offset.x, velocity.x);
                  if (
                    Math.abs(offset.x) > swipeOffsetThreshold ||
                    Math.abs(swipe) > swipeConfidenceThreshold
                  ) {
                    paginate(offset.x > 0 ? -1 : 1);
                  }
                  setIsDragging(false);
                }}
                alt="Post"
                className="absolute w-full h-full object-cover"
              />
            </AnimatePresence>

            {/* Pagination Dots */}
            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm">
                {images.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all shadow-sm ${
                      idx === imageIndex ? "w-4 bg-white" : "w-1.5 bg-white/60"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. ACTION FOOTER */}
      <div className="px-4 pb-1">{children}</div>

      {/* Lightbox */}
      {isLightboxOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center animate-in fade-in"
            onClick={() => setIsLightboxOpen(false)}
          >
            <button className="absolute top-6 right-6 text-white p-2">
              <X size={32} />
            </button>
            <img
              src={images[imageIndex]}
              className="max-w-full max-h-[90vh] rounded-md"
              alt="Lightbox"
            />
          </div>,
          document.body,
        )}
    </article>
  );
}
