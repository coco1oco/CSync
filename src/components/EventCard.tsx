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
import { motion, AnimatePresence } from "framer-motion";

interface EventCardProps {
  event: OutreachEvent;
  isAdmin: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

// Animation Variants for the slide effect
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 1000 : -1000,
    opacity: 0,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? 1000 : -1000,
    opacity: 0,
  }),
};

// Swipe configuration
const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

export function EventCard({
  event,
  isAdmin,
  onEdit,
  onDelete,
}: Readonly<EventCardProps>) {
  const [[page, direction], setPage] = useState([0, 0]);
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

  const imageIndex = Math.abs(page % images.length);

  const paginate = (newDirection: number) => {
    setPage([page + newDirection, newDirection]);
  };

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
                  <a
                    href={`http://googleusercontent.com/maps.google.com/?q=${encodeURIComponent(
                      location
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-blue-600 hover:text-blue-800 hover:underline transition-colors cursor-pointer"
                    onClick={(e) => e.stopPropagation()}
                    title="View on Google Maps"
                  >
                    <MapPin size={10} />
                    <span className="truncate max-w-[150px]">{location}</span>
                  </a>
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
          {/* ✅ CLICK-TO-COLLAPSE LOGIC */}
          {isExpanded || !shouldTruncate ? (
            <span
              onClick={() => {
                if (shouldTruncate) setIsExpanded(false);
              }}
              className={
                shouldTruncate ? "cursor-pointer active:opacity-70" : ""
              }
              title={shouldTruncate ? "Click to collapse" : undefined}
            >
              {description}
            </span>
          ) : (
            <>
              {description.slice(0, MAX_LENGTH)}...
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(true);
                }}
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
          <motion.div
            key={images[imageIndex]}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 bg-cover bg-center blur-2xl scale-110"
            style={{ backgroundImage: `url(${images[imageIndex]})` }}
          />

          {/* Animated Image Carousel */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
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
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={1}
                onDragEnd={(e, { offset, velocity }) => {
                  const swipe = swipePower(offset.x, velocity.x);
                  if (swipe < -swipeConfidenceThreshold) {
                    paginate(1);
                  } else if (swipe > swipeConfidenceThreshold) {
                    paginate(-1);
                  }
                }}
                alt="Event content"
                className="absolute w-full h-full object-contain z-10"
              />
            </AnimatePresence>
          </div>

          {/* Arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  paginate(-1);
                }}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm hover:bg-black/60 z-20"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  paginate(1);
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
                      i === imageIndex ? "w-4 bg-white" : "w-1.5 bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* LIGHTBOX PORTAL */}
      {isLightboxOpen &&
        createPortal(
          <div
            className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm"
            style={{ zIndex: 9999 }}
            onClick={() => setIsLightboxOpen(false)}
          >
            <button className="absolute top-6 right-6 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-colors z-50">
              <X size={28} />
            </button>

            <div
              className="relative max-w-5xl w-full h-full flex items-center justify-center overflow-hidden"
              onClick={(e) => e.stopPropagation()}
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
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = swipePower(offset.x, velocity.x);
                    if (swipe < -swipeConfidenceThreshold) {
                      paginate(1);
                    } else if (swipe > swipeConfidenceThreshold) {
                      paginate(-1);
                    }
                  }}
                  className="absolute max-w-full max-h-[90vh] object-contain rounded-md shadow-2xl"
                />
              </AnimatePresence>

              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      paginate(-1);
                    }}
                    className="absolute left-0 lg:-left-12 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white transition-colors z-30"
                  >
                    <ChevronLeft size={48} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      paginate(1);
                    }}
                    className="absolute right-0 lg:-right-12 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white transition-colors z-30"
                  >
                    <ChevronRight size={48} />
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </article>
  );
}
