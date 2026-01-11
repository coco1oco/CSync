import { useState, useEffect, useRef, useMemo } from "react";
import { MapPin, Loader2, Search, School, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface LocationPickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

interface PlaceResult {
  place_id: number;
  display_name: string;
  lat?: string;
  lon?: string;
  address?: {
    amenity?: string;
    building?: string;
    road?: string;
    city?: string;
    municipality?: string;
    town?: string;
    state?: string;
  };
  type?: "api" | "local"; // ✅ Added to distinguish sources
}

// 📍 YOUR CUSTOM CAMPUS SPOTS
const CAMPUS_PLACES = [
  "University Mall",
  "Saluysoy",
  "Oval",
  "Grandstand",
  "Quadrangle",
  "Softball Field",
  "Library",
  "International House I",
  "International House II",
  "ICON",
  "SM Rolle Hall",
  "Gate 1",
  "Gate 2",
  "U-Mall Gate",
  "Admin",
  "OSAS",
  "CSPEAR",
  "CEd",
  "CEIT",
  "CON",
  "CAS",
  "CVMBS",
  "CEMBS",
  "CAFENR",
].sort();

export function LocationPicker({
  value,
  onChange,
  placeholder = "Search location...",
  className,
}: LocationPickerProps) {
  const [query, setQuery] = useState(value);
  const [apiResults, setApiResults] = useState<PlaceResult[]>([]);
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

  // 🔍 Filter Local Places based on input
  const localResults = useMemo(() => {
    if (!query) return CAMPUS_PLACES; // Show all on focus if empty
    return CAMPUS_PLACES.filter((place) =>
      place.toLowerCase().includes(query.toLowerCase())
    );
  }, [query]);

  const handleSearch = (text: string) => {
    setQuery(text);
    onChange(text);
    setIsOpen(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Only fetch API if text is long enough
    if (text.length < 3) {
      setApiResults([]);
      return;
    }

    // Debounce API calls
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            text
          )}&limit=5&addressdetails=1&countrycodes=ph`,
          {
            headers: { "User-Agent": "PawPal-StudentApp/1.0" },
          }
        );
        const data = await response.json();
        setApiResults(data);
      } catch (error) {
        console.error("Search failed", error);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (name: string) => {
    setQuery(name);
    onChange(name);
    setIsOpen(false);
  };

  const formatApiResult = (place: PlaceResult) => {
    const mainName = place.display_name.split(",")[0];
    const secondaryName = place.display_name
      .split(",")
      .slice(1)
      .join(",")
      .trim();
    return { main: mainName, sub: secondaryName };
  };

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
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
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="pl-12 bg-white h-12 text-base transition-shadow focus:ring-2 focus:ring-blue-100 border-gray-200"
        />
      </div>

      {isOpen && (localResults.length > 0 || apiResults.length > 0) && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl shadow-gray-200/50 max-h-[300px] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200 scrollbar-thin scrollbar-thumb-gray-200">
          {/* 🏫 SECTION 1: CAMPUS SPOTS */}
          {localResults.length > 0 && (
            <div className="p-1">
              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <School className="w-3 h-3" /> Campus Zones
              </div>
              {localResults.map((place) => (
                <button
                  key={place}
                  type="button"
                  onClick={() => handleSelect(place)}
                  className="w-full text-left px-3 py-2.5 hover:bg-blue-50 rounded-lg flex items-center gap-3 transition-colors group"
                >
                  <div className="bg-blue-50 p-2 rounded-full text-blue-500 group-hover:bg-blue-100 group-hover:text-blue-600 shrink-0 border border-blue-100">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {place}
                  </p>
                </button>
              ))}
            </div>
          )}

          {/* 🌍 SECTION 2: MAP SEARCH RESULTS */}
          {apiResults.length > 0 && (
            <div className="p-1 border-t border-gray-50">
              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-1 flex items-center gap-2">
                <Search className="w-3 h-3" /> Other Locations
              </div>
              {apiResults.map((place) => {
                const { main, sub } = formatApiResult(place);
                return (
                  <button
                    key={place.place_id}
                    type="button"
                    onClick={() => handleSelect(main)} // Select just the main name for cleanness
                    className="w-full text-left px-3 py-2.5 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors group"
                  >
                    <div className="bg-gray-100 p-2 rounded-full text-gray-400 group-hover:bg-gray-200 group-hover:text-gray-600 shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-700 truncate">
                        {main}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
