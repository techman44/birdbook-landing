'use client';

import { useEffect, useMemo, useState } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Popup, useMap, LayersControl, CircleMarker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import { type MapSighting, type MapHotspot } from '@/lib/api/maps';
import { buildImageUrl, getApiBase } from '@/lib/api/client';
import { useAuthStore } from '@/lib/stores/auth-store';

// Badge color mapping to Tailwind classes (used in inline styles for leaflet)
const badgeColors: Record<string, { bg: string; text: string }> = {
  red: { bg: '#dc2626', text: '#ffffff' },
  orange: { bg: '#ea580c', text: '#ffffff' },
  yellow: { bg: '#ca8a04', text: '#ffffff' },
  amber: { bg: '#d97706', text: '#ffffff' },
  purple: { bg: '#9333ea', text: '#ffffff' },
  indigo: { bg: '#4f46e5', text: '#ffffff' },
  green: { bg: '#16a34a', text: '#ffffff' },
  blue: { bg: '#2563eb', text: '#ffffff' },
  teal: { bg: '#0d9488', text: '#ffffff' },
  cyan: { bg: '#0891b2', text: '#ffffff' },
  emerald: { bg: '#059669', text: '#ffffff' },
  pink: { bg: '#db2777', text: '#ffffff' },
};

// Fix default marker icon issue with webpack
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface SightingsMapProps {
  sightings: MapSighting[];
  onSightingClick: (sighting: MapSighting) => void;
  center?: { lat: number; lon: number } | null;
  zoom?: number;
  hotspots?: MapHotspot[];
  showHotspots?: boolean;
  showHeatmap?: boolean;
}

// Create a custom bird photo marker icon
function createBirdMarkerIcon(imageUrl: string): L.DivIcon {
  return L.divIcon({
    className: 'bird-marker',
    html: `
      <div class="bird-bubble">
        <div class="bird-bubble-inner" style="background-image: url('${imageUrl}')"></div>
      </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 50],
    popupAnchor: [0, -50],
  });
}

// Create hotspot marker icon
function createHotspotMarkerIcon(count: number): L.DivIcon {
  const size = Math.min(60, 30 + Math.log2(count + 1) * 6);
  return L.divIcon({
    className: 'hotspot-marker',
    html: `
      <div class="hotspot-bubble" style="width: ${size}px; height: ${size}px;">
        <span>${count}</span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

// Component to fly to a specific center point
function MapCenter({ center, zoom }: { center: { lat: number; lon: number }; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.flyTo([center.lat, center.lon], zoom, { duration: 1 });
    }
  }, [center, zoom, map]);

  return null;
}

// Component to fit map bounds to markers
function MapBounds({ sightings }: { sightings: MapSighting[] }) {
  const map = useMap();

  useEffect(() => {
    if (sightings.length > 0) {
      const bounds = L.latLngBounds(
        sightings.map((s) => [s.lat, s.lon] as [number, number])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    }
  }, [sightings, map]);

  return null;
}

// Create cluster custom icon
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClusterCustomIcon = (cluster: any): L.DivIcon => {
  const count = cluster.getChildCount();
  let size = 'small';
  let dimension = 40;

  if (count >= 100) {
    size = 'large';
    dimension = 60;
  } else if (count >= 10) {
    size = 'medium';
    dimension = 50;
  }

  return L.divIcon({
    html: `<div class="cluster-marker cluster-${size}"><span>${count}</span></div>`,
    className: 'custom-marker-cluster',
    iconSize: L.point(dimension, dimension, true),
  });
};

// Heatmap layer component using circle markers
function HeatmapLayer({ sightings }: { sightings: MapSighting[] }) {
  // Group sightings by approximate location (grid-based)
  const heatmapData = useMemo(() => {
    const gridSize = 0.01; // ~1km grid cells
    const grid = new Map<string, { lat: number; lon: number; count: number }>();
    
    sightings.forEach((s) => {
      const gridLat = Math.floor(s.lat / gridSize) * gridSize + gridSize / 2;
      const gridLon = Math.floor(s.lon / gridSize) * gridSize + gridSize / 2;
      const key = `${gridLat.toFixed(3)},${gridLon.toFixed(3)}`;
      
      if (grid.has(key)) {
        grid.get(key)!.count++;
      } else {
        grid.set(key, { lat: gridLat, lon: gridLon, count: 1 });
      }
    });
    
    return Array.from(grid.values());
  }, [sightings]);

  return (
    <>
      {heatmapData.map((point, idx) => {
        const radius = Math.min(50, 10 + point.count * 3);
        const opacity = Math.min(0.8, 0.3 + point.count * 0.05);
        return (
          <CircleMarker
            key={idx}
            center={[point.lat, point.lon]}
            radius={radius}
            pathOptions={{
              fillColor: '#f59e0b',
              fillOpacity: opacity,
              color: '#d97706',
              weight: 1,
              opacity: opacity,
            }}
          >
            <Popup>
              <div className="text-sm font-medium">{point.count} sightings in this area</div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}

export default function SightingsMap({ 
  sightings, 
  onSightingClick, 
  center, 
  zoom,
  hotspots = [],
  showHotspots = false,
  showHeatmap = false,
}: SightingsMapProps) {
  // Get auth token for authenticated image URLs
  const accessToken = useAuthStore((state) => state.accessToken);

  // Default center (Australia)
  const defaultCenter: [number, number] = [-33.8688, 151.2093];
  const defaultZoom = 5;
  const targetZoom = zoom || 11;

  // Helper to build image URL - use direct path for reliability through proxies/tunnels
  const getSightingImageUrl = (sighting: MapSighting): string => {
    return buildImageUrl(sighting.image_path);
  };

  // Create markers with images
  const markers = useMemo(() => {
    return sightings.map((sighting) => {
      const imageUrl = getSightingImageUrl(sighting);

      return {
        sighting,
        icon: createBirdMarkerIcon(imageUrl),
        position: [sighting.lat, sighting.lon] as [number, number],
      };
    });
  }, [sightings, accessToken]);

  // Create hotspot markers
  const hotspotMarkers = useMemo(() => {
    return hotspots.filter(h => h.lat && h.lon).map((hotspot) => ({
      hotspot,
      icon: createHotspotMarkerIcon(hotspot.sighting_count),
      position: [hotspot.lat, hotspot.lon] as [number, number],
    }));
  }, [hotspots]);

  return (
    <>
      <style jsx global>{`
        .bird-bubble {
          width: 50px;
          height: 50px;
          position: relative;
        }

        .bird-bubble::before {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          border-width: 8px 6px 0 6px;
          border-style: solid;
          border-color: #10b981 transparent transparent transparent;
        }

        .bird-bubble-inner {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: 3px solid #10b981;
          background-size: cover;
          background-position: center;
          background-color: white;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .bird-marker:hover .bird-bubble-inner {
          transform: scale(1.15);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
        }

        .hotspot-bubble {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 12px;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5);
          border: 3px solid white;
          animation: pulse-hotspot 2s infinite;
        }

        @keyframes pulse-hotspot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
          50% { box-shadow: 0 0 0 10px rgba(245, 158, 11, 0); }
        }

        .cluster-marker {
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 14px;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
          border: 3px solid white;
        }

        .cluster-small {
          width: 40px;
          height: 40px;
          font-size: 12px;
        }

        .cluster-medium {
          width: 50px;
          height: 50px;
          font-size: 14px;
        }

        .cluster-large {
          width: 60px;
          height: 60px;
          font-size: 16px;
        }

        .custom-marker-cluster {
          background: transparent !important;
        }

        .hotspot-marker {
          background: transparent !important;
        }

        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          padding: 0;
          overflow: hidden;
        }

        .leaflet-popup-content {
          margin: 0;
          width: 200px !important;
        }

        .sighting-popup {
          cursor: pointer;
        }

        .sighting-popup-image {
          width: 100%;
          height: 120px;
          object-fit: cover;
        }

        .sighting-popup-content {
          padding: 12px;
        }

        .sighting-popup-species {
          font-weight: 600;
          font-size: 14px;
          color: #1f2937;
          margin-bottom: 4px;
        }

        .sighting-popup-meta {
          font-size: 12px;
          color: #6b7280;
        }

        .sighting-popup-user {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #e5e7eb;
        }

        .sighting-popup-avatar {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #d1fae5;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .sighting-popup-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .sighting-popup-username {
          font-size: 12px;
          color: #374151;
        }

        .sighting-popup-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin: 6px 0;
        }

        .sighting-badge {
          display: inline-block;
          padding: 2px 6px;
          border-radius: 9999px;
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.025em;
          white-space: nowrap;
        }

        .hotspot-popup {
          text-align: center;
          padding: 8px;
        }

        .hotspot-popup-title {
          font-weight: 600;
          font-size: 14px;
          color: #1f2937;
          margin-bottom: 8px;
        }

        .hotspot-popup-stats {
          font-size: 12px;
          color: #6b7280;
          line-height: 1.6;
        }

        .hotspot-popup-time {
          font-size: 11px;
          color: #9ca3af;
          margin-top: 8px;
        }

        .leaflet-control-layers {
          border-radius: 8px !important;
          border: none !important;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
        }

        .leaflet-control-layers-toggle {
          width: 36px !important;
          height: 36px !important;
          background-size: 20px 20px !important;
        }
      `}</style>

      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        className="w-full h-full"
        style={{ background: '#f3f4f6' }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Street Map">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellite">
            <TileLayer
              attribution='Tiles &copy; Esri'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Terrain">
            <TileLayer
              attribution='Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
              url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
              maxZoom={17}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        {/* Fly to center if specified, otherwise fit bounds to sightings */}
        {center && <MapCenter center={center} zoom={targetZoom} />}
        {!center && sightings.length > 0 && <MapBounds sightings={sightings} />}

        {/* Heatmap layer (shown behind markers) */}
        {showHeatmap && <HeatmapLayer sightings={sightings} />}

        {/* Hotspot markers */}
        {showHotspots && hotspotMarkers.map(({ hotspot, icon, position }) => (
          <Marker
            key={`hotspot-${hotspot.location_name}`}
            position={position}
            icon={icon}
          >
            <Popup>
              <div className="hotspot-popup">
                <div className="hotspot-popup-title">{hotspot.location_name}</div>
                <div className="hotspot-popup-stats">
                  <div>{hotspot.sighting_count} sightings</div>
                  <div>{hotspot.species_count} species</div>
                  <div>{hotspot.observer_count} birders</div>
                </div>
                <div className="hotspot-popup-time">Latest: {hotspot.time_ago}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Sighting markers with clustering */}
        {!showHeatmap && (
          <MarkerClusterGroup
            chunkedLoading
            iconCreateFunction={createClusterCustomIcon}
            showCoverageOnHover={false}
            maxClusterRadius={50}
            spiderfyOnMaxZoom
            disableClusteringAtZoom={15}
          >
            {markers.map(({ sighting, icon, position }) => {
              const imageUrl = getSightingImageUrl(sighting);

              return (
                <Marker
                  key={sighting.id}
                  position={position}
                  icon={icon}
                  eventHandlers={{
                    click: () => onSightingClick(sighting),
                  }}
                >
                  <Popup>
                    <div className="sighting-popup" onClick={() => onSightingClick(sighting)}>
                      <img
                        src={imageUrl}
                        alt={sighting.species || sighting.species_name}
                        className="sighting-popup-image"
                      />
                      <div className="sighting-popup-content">
                        <div className="sighting-popup-species">{sighting.species || sighting.species_name}</div>
                        {sighting.badges && sighting.badges.length > 0 && (
                          <div className="sighting-popup-badges">
                            {sighting.badges.slice(0, 3).map((badge, idx) => {
                              const colors = badgeColors[badge.color] || badgeColors.green;
                              return (
                                <span
                                  key={idx}
                                  className="sighting-badge"
                                  style={{
                                    backgroundColor: colors.bg,
                                    color: colors.text,
                                  }}
                                >
                                  {badge.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        <div className="sighting-popup-meta">
                          {sighting.location_name || 'Location not specified'}
                        </div>
                        <div className="sighting-popup-user">
                          <div className="sighting-popup-avatar">
                            {sighting.profile_photo_url ? (
                              <img src={buildImageUrl(sighting.profile_photo_url)} alt={sighting.username} />
                            ) : (
                              <span style={{ fontSize: '12px' }}>🐦</span>
                            )}
                          </div>
                          <span className="sighting-popup-username">{sighting.username}</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        )}
      </MapContainer>
    </>
  );
}
