'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  searchLocations,
  getBrowserPosition,
  type LocationSearchResult,
  type GeoPoint,
} from '@/lib/api/location';

export interface SelectedLocation {
  name: string;
  address: string;
  lat: number;
  lon: number;
}

interface LocationAutocompleteProps {
  value?: SelectedLocation | null;
  onChange: (location: SelectedLocation | null) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function LocationAutocomplete({
  value,
  onChange,
  placeholder = 'Search for a location...',
  className = '',
  disabled = false,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(value?.name || '');
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSelected, setHasSelected] = useState(!!value);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const positionRef = useRef<GeoPoint | null>(null);

  // Ask for the browser position once so nearby places rank first.
  // Denied/unavailable just means no proximity bias.
  useEffect(() => {
    let active = true;
    getBrowserPosition().then((pos) => {
      if (active) positionRef.current = pos;
    });
    return () => {
      active = false;
    };
  }, []);

  // Update query when value changes externally
  useEffect(() => {
    if (value) {
      setQuery(value.name);
      setHasSelected(true);
    } else {
      setQuery('');
      setHasSelected(false);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await searchLocations(searchQuery, {
        lat: positionRef.current?.lat,
        lon: positionRef.current?.lon,
      });
      setResults(searchResults);
      setShowResults(searchResults.length > 0);
    } catch (error) {
      console.warn('Location search failed:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setHasSelected(false);

    // Clear the selected location when user starts typing
    if (value) {
      onChange(null);
    }

    // Debounce the search
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      performSearch(newQuery);
    }, 300);
  };

  const handleSelectResult = (result: LocationSearchResult) => {
    // Prefer the backend's short_name, fall back to parsing display_name
    const shortName =
      result.short_name || result.display_name.split(',').slice(0, 2).join(',').trim();
    const address = result.display_name;

    const selectedLocation: SelectedLocation = {
      name: shortName,
      address: address,
      lat: result.lat,
      lon: result.lon,
    };

    setQuery(shortName);
    setHasSelected(true);
    setShowResults(false);
    setResults([]);
    onChange(selectedLocation);
  };

  const handleClear = () => {
    setQuery('');
    setHasSelected(false);
    setResults([]);
    setShowResults(false);
    onChange(null);
    inputRef.current?.focus();
  };

  const handleFocus = () => {
    if (results.length > 0 && !hasSelected) {
      setShowResults(true);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={`pl-9 ${hasSelected ? 'pr-16' : 'pr-9'}`}
          disabled={disabled}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {hasSelected && !isSearching && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="h-6 w-6 p-0 hover:bg-gray-100"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {results.map((result, index) => (
            <button
              key={result.place_id || index}
              type="button"
              onClick={() => handleSelectResult(result)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-0 transition-colors"
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 text-emerald-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-900 truncate">
                    {result.display_name.split(',')[0]}
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {result.display_name}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected location indicator */}
      {hasSelected && value && (
        <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          Location selected: {value.lat.toFixed(4)}, {value.lon.toFixed(4)}
        </p>
      )}
    </div>
  );
}
