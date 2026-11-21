import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LocationMap } from './LocationMap.js';

// Mock @googlemaps/js-api-loader
const mockAddListener = vi.fn();
const mockSetPosition = vi.fn();
const mockPanTo = vi.fn();
const mockSetMap = vi.fn();

interface MapClickEvent {
  latLng?: {
    lat: () => number;
    lng: () => number;
  };
}

let mapClickListener: ((e: MapClickEvent) => void) | null = null;

class MockMap {
  center: unknown;
  zoom: unknown;
  constructor(_el: HTMLElement, options: { center?: unknown; zoom?: unknown }) {
    this.center = options.center;
    this.zoom = options.zoom;
  }
  addListener(event: string, handler: (e: MapClickEvent) => void) {
    if (event === 'click') {
      mapClickListener = handler;
    }
    mockAddListener(event, handler);
  }
  panTo(pos: unknown) {
    mockPanTo(pos);
  }
}

class MockMarker {
  position: unknown;
  map: unknown;
  constructor(options: { position?: unknown; map?: unknown }) {
    this.position = options.position;
    this.map = options.map;
  }
  setPosition(pos: unknown) {
    this.position = pos;
    mockSetPosition(pos);
  }
  setMap(m: unknown) {
    this.map = m;
    mockSetMap(m);
  }
}

vi.mock('@googlemaps/js-api-loader', () => {
  return {
    Loader: vi.fn().mockImplementation(() => ({
      importLibrary: vi.fn().mockResolvedValue({}),
    })),
  };
});

describe('LocationMap Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mapClickListener = null;

    (globalThis as unknown as { google: unknown }).google = {
      maps: {
        Map: MockMap,
        Marker: MockMarker,
        marker: {
          AdvancedMarkerElement: MockMarker,
        },
        Animation: { DROP: 1 },
      },
    };

    (window as unknown as { __CIVIC_MAPS_KEY__?: string }).__CIVIC_MAPS_KEY__ = 'test-fake-maps-key';
    (import.meta as unknown as { env: Record<string, string> }).env = {
      VITE_GOOGLE_MAPS_BROWSER_KEY: 'test-fake-maps-key',
      VITE_GOOGLE_MAPS_MAP_ID: 'test-map-id',
    };
  });

  it('renders interactive map region and initializes Google Map instance', async () => {
    const onCoordsChange = vi.fn();

    render(
      <LocationMap
        lat={12.9716}
        lng={77.5946}
        onCoordinatesChange={onCoordsChange}
      />
    );

    const region = screen.getByRole('region', { name: /map: click anywhere to pin issue location/i });
    expect(region).toBeInTheDocument();

    await waitFor(() => {
      expect(mockAddListener).toHaveBeenCalledWith('click', expect.any(Function));
    });

    // Simulate clicking the map to set a new pin
    if (mapClickListener) {
      mapClickListener({
        latLng: {
          lat: () => 12.9800,
          lng: () => 77.6000,
        },
      });
      expect(onCoordsChange).toHaveBeenCalledWith({ lat: 12.98, lng: 77.6 });
    }
  });

  it('pans map when coordinates are updated externally', async () => {
    const onCoordsChange = vi.fn();

    const { rerender } = render(
      <LocationMap
        lat={12.9716}
        lng={77.5946}
        onCoordinatesChange={onCoordsChange}
      />
    );

    await waitFor(() => {
      expect(mockAddListener).toHaveBeenCalled();
    });

    rerender(
      <LocationMap
        lat={12.9900}
        lng={77.6500}
        onCoordinatesChange={onCoordsChange}
      />
    );

    expect(mockPanTo).toHaveBeenCalledWith({ lat: 12.99, lng: 77.65 });
  });

  it('renders fallback notice when no API key is provided', () => {
    delete (window as unknown as { __CIVIC_MAPS_KEY__?: string }).__CIVIC_MAPS_KEY__;
    (import.meta as unknown as { env?: Record<string, string> }).env = {};

    render(
      <LocationMap
        onCoordinatesChange={() => {}}
      />
    );

    expect(screen.getByText(/map pinning optional/i)).toBeInTheDocument();
  });
});
