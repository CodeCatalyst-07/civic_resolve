import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { LocationInput } from '@civicresolve/shared';
import { getApiClient } from '../../../lib/apiClient.js';
import { STRINGS } from '../../../content/strings.js';
import { LocationMap } from './LocationMap.js';
import { Navigation, ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';

export interface StepLocationProps {
  value: LocationInput;
  onChange: (patch: Partial<LocationInput>) => void;
  onNext: () => void;
  onBack: () => void;
}

const FALLBACK_WARDS = [
  'Ward 1 - Kempegowda Ward',
  'Ward 2 - Chowdeshwari Ward',
  'Ward 3 - Atturu',
  'Ward 4 - Yelahanka Satellite Town',
  'Ward 5 - Jakkuru',
  'Ward 6 - Thanisandra',
  'Ward 7 - Byatarayanapura',
  'Ward 8 - Kodigehalli',
  'Ward 12 - Indiranagar',
  'Ward 18 - Koramangala',
];

export const StepLocation: React.FC<StepLocationProps> = ({
  value,
  onChange,
  onNext,
  onBack,
}) => {
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const { data: wards } = useQuery({
    queryKey: ['wards'],
    queryFn: () => getApiClient().getWards(),
  });

  const wardOptions =
    wards && wards.length > 0
      ? wards.map((w) => w.name)
      : FALLBACK_WARDS;

  const handleDetectLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported by your browser.');
      return;
    }

    setIsDetecting(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsDetecting(false);
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        onChange({ lat, lng });
      },
      (error) => {
        setIsDetecting(false);
        if (error.code === error.PERMISSION_DENIED) {
          setGeoError('Location permission denied. Please select your ward or enter landmark manually.');
        } else {
          setGeoError('Could not detect location. Please specify below.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext();
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-ink">{STRINGS.report.locationHeader}</h2>
        <p className="text-xs text-slate-500 leading-relaxed">{STRINGS.report.locationHelp}</p>
      </div>

      <div className="space-y-4">
        {/* Ward Selector */}
        <div className="space-y-1.5">
          <label htmlFor="ward-select" className="block text-xs font-semibold text-ink">
            {STRINGS.report.locationWardLabel} (Optional)
          </label>
          <select
            id="ward-select"
            value={value.ward || ''}
            onChange={(e) => onChange({ ward: e.target.value || undefined })}
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-ink focus-visible:outline-2 focus-visible:outline-primary"
          >
            <option value="">{STRINGS.report.locationWardPlaceholder}</option>
            {wardOptions.map((wardName, idx) => (
              <option key={idx} value={wardName}>
                {wardName}
              </option>
            ))}
          </select>
        </div>

        {/* Address / Landmark text */}
        <div className="space-y-1.5">
          <label htmlFor="address-input" className="block text-xs font-semibold text-ink">
            {STRINGS.report.locationAddressLabel}
          </label>
          <input
            id="address-input"
            type="text"
            value={value.address || ''}
            onChange={(e) => onChange({ address: e.target.value || undefined })}
            placeholder={STRINGS.report.locationAddressPlaceholder}
            maxLength={200}
            className="w-full px-3 py-2 text-sm bg-surface border border-border rounded-lg text-ink focus-visible:outline-2 focus-visible:outline-primary"
          />
        </div>

        {/* Geolocation Button and Coordinates Badge */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={handleDetectLocation}
            disabled={isDetecting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-surface text-ink hover:bg-page transition-colors focus-visible:outline-2 focus-visible:outline-primary"
          >
            <Navigation className={`w-3.5 h-3.5 text-primary ${isDetecting ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>{isDetecting ? 'Detecting GPS...' : STRINGS.report.locationDetectButton}</span>
          </button>

          {value.lat !== undefined && value.lng !== undefined && (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200"
              aria-live="polite"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              <span>
                {value.lat.toFixed(4)}, {value.lng.toFixed(4)}
              </span>
            </span>
          )}
        </div>

        {geoError && (
          <p role="alert" className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-md border border-amber-200">
            {geoError}
          </p>
        )}

        {/* Interactive Map */}
        <div className="space-y-1 pt-1">
          <span className="block text-xs font-semibold text-ink">Map Pin (Optional)</span>
          <LocationMap
            lat={value.lat}
            lng={value.lng}
            onCoordinatesChange={(coords) => onChange(coords)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg border border-border text-ink hover:bg-page transition-colors focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          <span>{STRINGS.report.backButton}</span>
        </button>

        <button
          type="submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-primary text-white hover:bg-blue-700 shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-primary"
        >
          <span>Review AI Analysis</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </form>
  );
};
