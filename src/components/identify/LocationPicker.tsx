'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Search, Navigation, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchLocation, reverseGeocode, type LocationResult } from '@/lib/api/identification';

// Leaflet types
declare global {
  interface Window {
    L: typeof import('leaflet');
  }
}

interface LocationPickerProps {
  initialLocation?: { lat: number; lon: number; name?: string } | null;
  onLocationChange: (location: { lat: number; lon: number; name: string } | null) => void;
  exifHasGps?: boolean;
}

export function LocationPicker({
  initialLocation,
  onLocationChange,
  exifHasGps = false,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [location, setLocation] = useState<{ lat: number; lon: number; name: string } | null>(
    initialLocation ? { ...initialLocation, name: initialLocation.name || '' } : null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [leafletLoaded, setLeafletLoaded] = useState(false);

  // Load Leaflet dynamically (client-side only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if Leaflet is already loaded
    if (window.L) {
      setLeafletLoaded(true);
      return;
    }

    // Load Leaflet CSS
    const linkEl = document.createElement('link');
    linkEl.rel = 'stylesheet';
    linkEl.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(linkEl);

    // Load Leaflet JS
    const scriptEl = document.createElement('script');
    scriptEl.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    scriptEl.onload = () => setLeafletLoaded(true);
    document.body.appendChild(scriptEl);

    return () => {
      // Cleanup if needed
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!leafletLoaded || !mapRef.current || mapInstanceRef.current) return;

    const L = window.L;
    const initialLat = location?.lat || initialLocation?.lat || -32.9;
    const initialLon = location?.lon || initialLocation?.lon || 151.75;

    const map = L.map(mapRef.current).setView([initialLat, initialLon], location ? 14 : 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Add click handler
    map.on('click', async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setMarker(lat, lng);
      const name = await reverseGeocode(lat, lng);
      const newLocation = { lat, lon: lng, name };
      setLocation(newLocation);
      onLocationChange(newLocation);
    });

    mapInstanceRef.current = map;

    // Set initial marker if location exists
    if (location) {
      setMarker(location.lat, location.lon);
      map.setView([location.lat, location.lon], 14);
    }

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, [leafletLoaded]);

  // Update location from props
  useEffect(() => {
    if (initialLocation && !location) {
      const newLoc = {
        lat: initialLocation.lat,
        lon: initialLocation.lon,
        name: initialLocation.name || '',
      };
      setLocation(newLoc);

      if (mapInstanceRef.current) {
        setMarker(newLoc.lat, newLoc.lon);
        mapInstanceRef.current.setView([newLoc.lat, newLoc.lon], 14);

        // Get name if not provided
        if (!newLoc.name) {
          reverseGeocode(newLoc.lat, newLoc.lon).then((name) => {
            const updatedLoc = { ...newLoc, name };
            setLocation(updatedLoc);
            onLocationChange(updatedLoc);
          });
        }
      }
    }
  }, [initialLocation]);

  const setMarker = useCallback((lat: number, lon: number) => {
    if (!mapInstanceRef.current || !window.L) return;

    const L = window.L;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lon]);
    } else {
      markerRef.current = L.marker([lat, lon]).addTo(mapInstanceRef.current);
    }
  }, []);

  const handleSearch = async () => {
    if (searchQuery.length < 3) return;

    setIsSearching(true);
    try {
      const results = await searchLocation(searchQuery);
      setSearchResults(results);
      setShowResults(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = async (result: LocationResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    const name = result.display_name.split(',').slice(0, 3).join(', ');

    const newLocation = { lat, lon, name };
    setLocation(newLocation);
    setSearchQuery(name);
    setShowResults(false);
    onLocationChange(newLocation);

    if (mapInstanceRef.current) {
      setMarker(lat, lon);
      mapInstanceRef.current.setView([lat, lon], 14);
    }
  };

  const handleUseCurrentLocation = async () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setIsGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      const name = await reverseGeocode(lat, lon);

      const newLocation = { lat, lon, name };
      setLocation(newLocation);
      onLocationChange(newLocation);

      if (mapInstanceRef.current) {
        setMarker(lat, lon);
        mapInstanceRef.current.setView([lat, lon], 14);
      }
    } catch (error) {
      alert('Could not get your location. Please search or click on the map.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* EXIF GPS detected banner */}
      {exifHasGps && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <Check className="h-5 w-5 text-emerald-600" />
          <div>
            <p className="text-sm font-medium text-emerald-700">Location detected from photo</p>
            {location?.name && (
              <p className="text-xs text-emerald-600">{location.name}</p>
            )}
          </div>
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.length >= 3) {
                  handleSearch();
                }
              }}
              onFocus={() => searchResults.length > 0 && setShowResults(true)}
              placeholder="Search for a location..."
              className="pr-10"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>
          <Button type="button" variant="outline" onClick={handleSearch} disabled={isSearching}>
            <Search className="h-4 w-4" />
          </Button>
        </div>

        {/* Search results dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {searchResults.map((result) => (
              <button
                key={result.place_id}
                type="button"
                onClick={() => handleSelectResult(result)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-0"
              >
                <p className="font-medium text-gray-900">
                  {result.display_name.split(',')[0]}
                </p>
                <p className="text-sm text-gray-500 truncate">{result.display_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Use current location button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleUseCurrentLocation}
        disabled={isGettingLocation}
        className="w-full gap-2"
      >
        {isGettingLocation ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Getting location...
          </>
        ) : (
          <>
            <Navigation className="h-4 w-4" />
            Use my current location
          </>
        )}
      </Button>

      {/* Map */}
      <div className="border rounded-lg overflow-hidden">
        <div ref={mapRef} className="h-[300px] w-full" />
        <div className="p-3 border-t bg-gray-50">
          <p className="text-sm text-gray-600 flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span className="font-medium">Selected:</span>
            <span>{location?.name || 'Click on map or search above'}</span>
          </p>
        </div>
      </div>

      <p className="text-center text-sm text-gray-500">
        Location helps other birders find this species
      </p>
    </div>
  );
}
