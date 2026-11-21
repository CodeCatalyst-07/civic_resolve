import React, { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { MapPin } from 'lucide-react';

interface GoogleLatLng {
  lat: () => number;
  lng: () => number;
}

interface GoogleMapInstance {
  setCenter: (pos: { lat: number; lng: number }) => void;
  panTo: (pos: { lat: number; lng: number }) => void;
  addListener: (event: string, handler: (e: { latLng?: GoogleLatLng }) => void) => void;
}

interface GoogleMarkerInstance {
  position?: { lat: number; lng: number } | GoogleLatLng | null;
  map?: unknown;
  setPosition?: (pos: { lat: number; lng: number } | GoogleLatLng) => void;
  setMap?: (map: unknown) => void;
}

interface GoogleMapsNamespace {
  maps: {
    Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
    Marker?: new (options: Record<string, unknown>) => GoogleMarkerInstance;
    marker?: {
      AdvancedMarkerElement: new (options: Record<string, unknown>) => GoogleMarkerInstance;
    };
  };
}

declare const google: GoogleMapsNamespace;

export interface LocationMapProps {
  lat?: number;
  lng?: number;
  onCoordinatesChange: (coords: { lat: number; lng: number }) => void;
  className?: string;
}

const DEFAULT_CENTER = { lat: 12.9716, lng: 77.5946 }; // Bengaluru center
const DEFAULT_ZOOM = 13;

export const LocationMap: React.FC<LocationMapProps> = ({
  lat,
  lng,
  onCoordinatesChange,
  className = '',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const markerRef = useRef<GoogleMarkerInstance | null>(null);
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null);
  const initialCoordsRef = useRef({ lat, lng });

  useEffect(() => {
    // Only attempt to load if Google Maps Browser Key is provided
    const apiKey =
      (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_BROWSER_KEY ||
      (window as unknown as { __CIVIC_MAPS_KEY__?: string }).__CIVIC_MAPS_KEY__;
    const mapId =
      (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_MAP_ID ||
      (window as unknown as { __CIVIC_MAPS_MAP_ID__?: string }).__CIVIC_MAPS_MAP_ID__ ||
      'DEMO_MAP_ID';

    if (!apiKey) {
      setLoadError('Interactive map preview is disabled (no API key configured).');
      return;
    }

    let isMounted = true;
    const loader = new Loader({
      apiKey,
      version: 'weekly',
    });

    Promise.all([loader.importLibrary('maps'), loader.importLibrary('marker')])
      .then(([mapsLib, markerLib]: [unknown, unknown]) => {
        if (!isMounted || !mapContainerRef.current) return;

        const initLat = initialCoordsRef.current.lat;
        const initLng = initialCoordsRef.current.lng;
        const initialCenter = initLat && initLng ? { lat: initLat, lng: initLng } : DEFAULT_CENTER;

        const MapConstructor = (mapsLib as { Map?: typeof google.maps.Map })?.Map || google.maps.Map;
        const map = new MapConstructor(mapContainerRef.current, {
          center: initialCenter,
          zoom: DEFAULT_ZOOM,
          mapId,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });

        mapInstanceRef.current = map;

        // Use modern AdvancedMarkerElement (supported marker type requiring mapId)
        type MarkerCtor = new (options: Record<string, unknown>) => GoogleMarkerInstance;
        const MarkerConstructor =
          (markerLib as { AdvancedMarkerElement?: MarkerCtor })?.AdvancedMarkerElement ||
          (google.maps as { marker?: { AdvancedMarkerElement?: MarkerCtor }; Marker?: MarkerCtor })?.marker?.AdvancedMarkerElement ||
          google.maps.Marker;

        const createMarker = (position: { lat: number; lng: number } | GoogleLatLng) => {
          if (!MarkerConstructor) return null;
          return new MarkerConstructor({
            position,
            map,
            title: 'Reported Issue Location',
          });
        };

        // Create initial marker if coordinates are provided
        if (initLat && initLng) {
          markerRef.current = createMarker({ lat: initLat, lng: initLng });
        }

        // Map click listener to place/update pin
        map.addListener('click', (e: { latLng?: GoogleLatLng }) => {
          if (e.latLng) {
            const newLat = Number(e.latLng.lat().toFixed(6));
            const newLng = Number(e.latLng.lng().toFixed(6));
            const newPos = { lat: newLat, lng: newLng };

            if (markerRef.current) {
              if (markerRef.current.setPosition) {
                markerRef.current.setPosition(e.latLng);
              } else {
                markerRef.current.position = newPos;
              }
            } else {
              markerRef.current = createMarker(newPos);
            }

            onCoordinatesChange(newPos);
          }
        });

        setMapLoaded(true);
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoadError(`Interactive map could not be loaded (${(err as Error).message || 'network error'}).`);
      });

    return () => {
      isMounted = false;
      if (markerRef.current) {
        if (markerRef.current.setMap) {
          markerRef.current.setMap(null);
        } else {
          markerRef.current.map = null;
        }
      }
    };
  }, [onCoordinatesChange]);

  // Synchronize marker position when lat/lng change externally (e.g. geolocation)
  useEffect(() => {
    if (mapLoaded && mapInstanceRef.current && lat && lng) {
      const pos = { lat, lng };
      mapInstanceRef.current.panTo(pos);
      if (markerRef.current) {
        if (markerRef.current.setPosition) {
          markerRef.current.setPosition(pos);
        } else {
          markerRef.current.position = pos;
        }
      } else {
        const MarkerConstructor =
          google.maps.marker?.AdvancedMarkerElement ||
          google.maps.Marker;
        if (MarkerConstructor) {
          markerRef.current = new MarkerConstructor({
            position: pos,
            map: mapInstanceRef.current,
          });
        }
      }
    }
  }, [lat, lng, mapLoaded]);

  if (loadError) {
    return (
      <div
        className={`p-4 rounded-lg bg-page border border-border text-xs text-slate-500 flex items-start gap-2.5 ${className}`}
        role="region"
        aria-label="Interactive map unavailable notice"
      >
        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div>
          <span className="font-semibold text-ink block mb-0.5">Map Pinning Optional</span>
          <span>{loadError} You can proceed by selecting your ward and typing a nearby landmark below.</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden border border-border ${className}`}>
      <div
        ref={mapContainerRef}
        className="w-full h-64 bg-slate-100"
        role="region"
        aria-label="Map: click anywhere to pin issue location"
      />
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-page/80 text-xs text-slate-500">
          Loading Google Maps...
        </div>
      )}
    </div>
  );
};
