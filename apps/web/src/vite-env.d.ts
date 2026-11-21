/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_MAPS_BROWSER_KEY?: string;
  readonly VITE_GOOGLE_MAPS_MAP_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace google {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options?: Record<string, unknown>);
      setCenter(pos: { lat: number; lng: number }): void;
      panTo(pos: { lat: number; lng: number }): void;
      addListener(event: string, handler: (...args: unknown[]) => void): void;
    }
    class Marker {
      constructor(options?: Record<string, unknown>);
      map: unknown;
      setPosition(pos: unknown): void;
      addListener(event: string, handler: (...args: unknown[]) => void): void;
    }
    class InfoWindow {
      constructor(options?: Record<string, unknown>);
      setContent(content: string | Node): void;
      open(options?: Record<string, unknown>): void;
      close(): void;
    }
    namespace marker {
      class AdvancedMarkerElement {
        constructor(options?: Record<string, unknown>);
        map: unknown;
        position: unknown;
        content: unknown;
        addListener(event: string, handler: (...args: unknown[]) => void): void;
      }
    }
  }
}
