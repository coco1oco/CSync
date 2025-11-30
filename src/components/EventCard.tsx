// src/components/EventCard.tsx
// Clean card-based design matching your mockup

import { useState, type JSX } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MoreVertical, Edit, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { OutreachEvent } from '@/types';

interface EventCardProps {
  event: OutreachEvent;
  isAdmin: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function EventCard({ event, isAdmin, onEdit, onDelete }: EventCardProps): JSX.Element {
  // Track which image is currently shown
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Destructure event data
  const { title, location, description, images = [], admin } = event;

  // Go to next image in carousel
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  // Go to previous image in carousel
  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <Card className="overflow-hidden bg-white">
      {/* ===== CARD HEADER: Admin Info + Menu ===== */}
      <div className="relative p-4">
        {/* Admin edit/delete menu (only for admins) */}
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8"
              >
                <MoreVertical className="h-4 w-4 text-gray-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDelete} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Admin avatar + name + location */}
        <div className="flex items-center gap-3">
          {/* Admin avatar circle */}
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            {admin?.avatar_url ? (
              <img
                src={admin.avatar_url}
                alt={admin.username}
                className="h-full w-full rounded-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-blue-700">
                {admin?.username?.slice(0, 2).toUpperCase() || 'A'}
              </span>
            )}
          </div>

          {/* Admin name + location */}
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">
              {admin?.username || 'Admin'}
            </h3>
            <p className="text-xs text-gray-600">{location}</p>
          </div>
        </div>
      </div>

      {/* ===== IMAGE CAROUSEL (Full Width) ===== */}
      {images.length > 0 && (
        <div className="relative bg-gray-200 aspect-square">
          {/* Current image */}
          <img
            src={images[currentImageIndex]}
            alt={`${title} - Image ${currentImageIndex + 1}`}
            className="h-full w-full object-cover"
          />

          {/* Previous button (left arrow) - only if multiple images */}
          {images.length > 1 && (
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/70 p-1.5 hover:bg-white transition-colors"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5 text-gray-800" />
            </button>
          )}

          {/* Next button (right arrow) - only if multiple images */}
          {images.length > 1 && (
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/70 p-1.5 hover:bg-white transition-colors"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5 text-gray-800" />
            </button>
          )}

          {/* Dot indicators at bottom - only if multiple images */}
          {images.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`rounded-full transition-all ${
                    index === currentImageIndex
                      ? 'h-2 w-2 bg-gray-900'
                      : 'h-1.5 w-1.5 bg-gray-400'
                  }`}
                  aria-label={`View image ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== CARD BODY: Title, Location, Description ===== */}
      <div className="p-4 space-y-3">
        {/* Event title (bold) */}
        <h2 className="text-base font-bold text-gray-900">{title}</h2>

        {/* Event location (gray) */}
        <p className="text-sm text-gray-600">{location}</p>

        {/* Event description */}
        <p className="text-sm text-gray-700 leading-relaxed">{description}</p>
      </div>
    </Card>
  );
}
