import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface LocationPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface PlaceResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    amenity?: string;
    building?: string;
    road?: string;
    city?: string;
    municipality?: string;
    town?: string;
    state?: string;
  };
}

export function LocationPicker({
  value,
  onChange,
  placeholder = "Search venue...",
  className,
}: LocationPickerProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = (text: string) => {
    setQuery(text);
    onChange(text);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (text.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Debounce to prevent lag while typing
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setIsOpen(true);
      try {
        // ✅ ADDED: &countrycodes=ph to restrict to Philippines
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            text
          )}&limit=5&addressdetails=1&countrycodes=ph`,
          {
            headers: { "User-Agent": "PawPal-StudentApp/1.0" },
          }
        );
        const data = await response.json();
        setResults(data);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms delay makes it feel smoother
  };

  const handleSelect = (place: PlaceResult) => {
    // Smart Formatting: Pick the most specific name available
    const mainName =
      place.address?.amenity ||
      place.address?.building ||
      place.display_name.split(",")[0];

    // Clean up the full address for the subtitle
    // Remove the main name from the start if it repeats
    let fullAddress = place.display_name;
    if (fullAddress.startsWith(mainName + ",")) {
      fullAddress = fullAddress.replace(mainName + ", ", "");
    }

    const finalString = `${mainName}, ${fullAddress}`; // Storing both allows better context

    // Actually, storing just the clean string is usually better for UI:
    setQuery(place.display_name); // Or use finalString if you prefer formatted
    onChange(place.display_name);
    setIsOpen(false);
  };

  // Helper to make the list look nice
  const formatResult = (place: PlaceResult) => {
    const mainName = place.display_name.split(",")[0];
    const secondaryName = place.display_name
      .split(",")
      .slice(1)
      .join(",")
      .trim();
    return { main: mainName, sub: secondaryName };
  };

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 bg-gray-100 rounded-md text-gray-500 group-focus-within:bg-blue-50 group-focus-within:text-blue-600 transition-colors">
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <MapPin className="w-3.5 h-3.5" />
          )}
        </div>

        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => query.length >= 3 && setIsOpen(true)}
          placeholder={placeholder}
          className="pl-12 bg-white h-12 text-base transition-shadow focus:ring-2 focus:ring-blue-100 border-gray-200"
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl shadow-gray-200/50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-1">
            {results.map((place) => {
              const { main, sub } = formatResult(place);
              return (
                <button
                  key={place.place_id}
                  type="button"
                  onClick={() => handleSelect(place)}
                  className="w-full text-left px-3 py-2.5 hover:bg-blue-50 rounded-lg flex items-center gap-3 transition-colors group"
                >
                  <div className="bg-gray-100 p-2 rounded-full text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 shrink-0">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {main}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{sub}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-3 py-2 border-t border-gray-50 bg-gray-50/50 rounded-b-xl flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Philippines Only
            </span>
            <Search className="w-3 h-3 text-gray-300" />
          </div>
        </div>
      )}
    </div>
  );
}
