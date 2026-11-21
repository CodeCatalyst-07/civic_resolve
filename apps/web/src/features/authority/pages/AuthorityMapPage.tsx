import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { Urgency } from '@civicresolve/shared';
import { AlertCircle, Info } from 'lucide-react';
import { STRINGS } from '../../../content/strings.js';
import { AuthorityNav } from '../components/AuthorityNav.js';
import { AuthorityGate } from '../components/AuthorityGate.js';
import { TicketDetailSheet } from '../components/TicketDetailSheet.js';
import { useQueue } from '../hooks/index.js';
import { useRole } from '../../../hooks/useRole.js';
import { UrgencyBadge } from '../../../components/UrgencyBadge.js';
import { StatusPill } from '../../../components/StatusPill.js';

const URGENCY_PINS = {
  [Urgency.LOW]: { color: '#475569', shape: 'rounded-full', label: 'Circle (Low)' },
  [Urgency.MEDIUM]: { color: '#A16207', shape: 'rounded-none', label: 'Square (Medium)' },
  [Urgency.HIGH]: { color: '#C2410C', shape: 'rotate-45', label: 'Diamond (High)' },
  [Urgency.CRITICAL]: { color: '#B91C1C', shape: 'rotate-45 ring-2 ring-red-400', label: 'Diamond (Critical)' },
};

export const AuthorityMapPage: React.FC = () => {
  const { isAuthority } = useRole();
  const browserKey = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY;
  const mapId = import.meta.env.VITE_GOOGLE_MAPS_MAP_ID || 'DEMO_MAP_ID';

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<unknown[]>([]);

  const { tickets } = useQueue({ limit: 100 });

  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Filter tickets that possess coordinates
  const geoTickets = useMemo(() => {
    return tickets.filter(
      (t) =>
        t.location?.lat !== undefined &&
        t.location?.lng !== undefined &&
        !isNaN(t.location.lat) &&
        !isNaN(t.location.lng)
    );
  }, [tickets]);

  useEffect(() => {
    if (!isAuthority || !browserKey || !mapContainerRef.current) return;

    let isCancelled = false;

    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: browserKey,
          version: 'weekly',
          libraries: ['marker', 'maps'],
        });

        const [{ Map }, markerLib] = await Promise.all([
          loader.importLibrary('maps'),
          loader.importLibrary('marker'),
        ]);

        if (isCancelled || !mapContainerRef.current) return;

        // Default center: Bengaluru municipal center
        const defaultCenter = { lat: 12.9716, lng: 77.5946 };

        const map = new Map(mapContainerRef.current, {
          center: geoTickets[0]?.location ? { lat: geoTickets[0].location.lat!, lng: geoTickets[0].location.lng! } : defaultCenter,
          zoom: 12,
          mapId,
          mapTypeControl: false,
          streetViewControl: false,
        });

        mapInstanceRef.current = map;

        // Clear existing markers
        markersRef.current.forEach((m) => {
          if (m && typeof (m as { map: unknown }).map !== 'undefined') {
            (m as { map: unknown }).map = null;
          }
        });
        markersRef.current = [];

        // Plot tickets
        const AdvancedMarker =
          (markerLib as { AdvancedMarkerElement?: new (options: Record<string, unknown>) => { addListener: (event: string, handler: () => void) => void } })?.AdvancedMarkerElement ||
          (google.maps as { marker?: { AdvancedMarkerElement?: new (options: Record<string, unknown>) => { addListener: (event: string, handler: () => void) => void } } })?.marker?.AdvancedMarkerElement;

        const infoWindow = new google.maps.InfoWindow();

        geoTickets.forEach((t) => {
          const lat = t.location!.lat!;
          const lng = t.location!.lng!;
          const pinConfig = URGENCY_PINS[t.urgency] || URGENCY_PINS[Urgency.LOW];

          if (AdvancedMarker) {
            // Create custom shaped badge element
            const pinDiv = document.createElement('div');
            pinDiv.style.width = '18px';
            pinDiv.style.height = '18px';
            pinDiv.style.backgroundColor = pinConfig.color;
            pinDiv.style.border = '2px solid #FFFFFF';
            pinDiv.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
            pinDiv.style.cursor = 'pointer';

            if (t.urgency === Urgency.LOW) {
              pinDiv.style.borderRadius = '50%';
            } else if (t.urgency === Urgency.HIGH || t.urgency === Urgency.CRITICAL) {
              pinDiv.style.transform = 'rotate(45deg)';
            }

            const marker = new AdvancedMarker({
              map,
              position: { lat, lng },
              title: `${t.id}: ${t.category} (${t.urgency})`,
              content: pinDiv,
            });

            marker.addListener('click', () => {
              const content = document.createElement('div');
              content.style.padding = '8px';
              content.style.fontSize = '12px';
              content.innerHTML = `
                <div style="font-family: monospace; font-weight: bold; color: #1D4ED8; margin-bottom: 4px;">${t.id}</div>
                <div style="font-weight: 600; margin-bottom: 2px;">${t.category}</div>
                <div style="color: #64748B; margin-bottom: 6px;">${t.ward || ''}</div>
                <button id="view-btn-${t.id}" style="padding: 4px 8px; font-size: 11px; background: #1D4ED8; color: white; border: none; border-radius: 4px; cursor: pointer;">
                  View Details
                </button>
              `;

              infoWindow.setContent(content);
              infoWindow.open({ anchor: marker, map });

              setTimeout(() => {
                const btn = document.getElementById(`view-btn-${t.id}`);
                if (btn) {
                  btn.onclick = () => {
                    setSelectedTicketId(t.id);
                    setSheetOpen(true);
                  };
                }
              }, 50);
            });

            markersRef.current.push(marker);
          }
        });
      } catch (err: unknown) {
        if (!isCancelled) {
          setMapError(err instanceof Error ? err.message : String(err));
        }
      }
    };

    initMap();

    return () => {
      isCancelled = true;
    };
  }, [isAuthority, browserKey, mapId, geoTickets]);

  if (!isAuthority) {
    return (
      <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-6">
        <AuthorityGate />
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1360px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">
          {STRINGS.authority.title} — Geographic Map
        </h1>
        <p className="text-xs text-slate-600 mt-1">
          Spatial overview of municipal grievances across wards. Distinctive shapes and colors indicate urgency.
        </p>
      </div>

      <AuthorityNav />

      {/* Map Legend */}
      <div className="flex flex-wrap items-center gap-6 p-3 bg-surface rounded-lg border border-border text-xs text-ink">
        <span className="font-semibold text-slate-700">Map Legend:</span>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-slate-600 inline-block" aria-hidden="true" />
          <span>Circle: Minor (Low)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 bg-amber-600 inline-block" aria-hidden="true" />
          <span>Square: Routine (Medium)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rotate-45 bg-orange-600 inline-block" aria-hidden="true" />
          <span>Diamond: Urgent (High)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rotate-45 bg-red-600 ring-2 ring-red-400 inline-block" aria-hidden="true" />
          <span>Diamond: Immediate Danger (Critical)</span>
        </div>
      </div>

      {/* Map or Key Fallback */}
      {!browserKey ? (
        <div className="p-8 bg-surface rounded-xl border border-slate-300 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-primary flex items-center justify-center mx-auto">
            <Info className="w-6 h-6" aria-hidden="true" />
          </div>
          <h2 className="text-base font-bold text-ink">Interactive Map Key Not Configured</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            To view grievances on the interactive Google Map, configure <code>VITE_GOOGLE_MAPS_BROWSER_KEY</code> and <code>VITE_GOOGLE_MAPS_MAP_ID</code> in your web environment.
          </p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-subtle relative h-[500px]">
          <div
            ref={mapContainerRef}
            className="w-full h-full"
            aria-label="Municipal Geographic Dispatch Map"
          />
          {mapError && (
            <div className="absolute inset-0 bg-white/90 flex items-center justify-center p-6 text-center">
              <div className="space-y-2">
                <AlertCircle className="w-8 h-8 text-red-600 mx-auto" aria-hidden="true" />
                <p className="text-xs font-semibold text-ink">Failed to load Google Maps: {mapError}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Accessible Text Alternative */}
      <details className="p-4 bg-surface rounded-xl border border-border space-y-3">
        <summary className="cursor-pointer text-xs font-bold text-slate-700 uppercase tracking-wider select-none">
          Accessible List of Plotted Grievance Locations ({geoTickets.length})
        </summary>
        <div className="divide-y divide-border pt-2">
          {geoTickets.map((t) => (
            <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary">{t.id}</span>
                  <UrgencyBadge urgency={t.urgency} />
                  <StatusPill status={t.status} />
                </div>
                <div className="text-slate-600">
                  {t.ward} — {t.location?.address || `${t.location?.lat?.toFixed(4)}, ${t.location?.lng?.toFixed(4)}`}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedTicketId(t.id);
                  setSheetOpen(true);
                }}
                className="px-3 py-1 font-semibold rounded border border-slate-500 hover:bg-page"
              >
                Open Details
              </button>
            </div>
          ))}
        </div>
      </details>

      <TicketDetailSheet
        ticketId={selectedTicketId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
};
