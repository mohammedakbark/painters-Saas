'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RequiredMark } from '@/components/ui/field-label';
import { cn } from '@/lib/cn';
import {
  GEOLOCATION_MESSAGES,
  geolocationErrorMessage,
  isInIndia,
  MAX_LOCATION_ACCURACY_METERS,
} from '@/lib/shops/geolocation';
import type { SuggestedAddress } from '@/lib/shops/map-address';
import {
  formatCoordinates,
  type LocationSource,
  locationSourceLabel,
} from '@/lib/shops/profile';

export interface PickedLocation {
  latitude: number;
  longitude: number;
  source: LocationSource;
}

// Leaflet needs the browser, so the map loads on the client only.
const OsmLocationMap = dynamic(() => import('./osm-location-map'), {
  ssr: false,
  loading: () => (
    <p className="text-body text-text-secondary" aria-busy="true">
      Loading the map…
    </p>
  ),
});

type Status = { tone: 'error' | 'info'; message: string } | null;

export interface PickerCopy {
  legend: string;
  description: string;
  searchLabel: string;
  required: boolean;
}

const SHOP_COPY: PickerCopy = {
  legend: 'Map location',
  description:
    'Customers will find your shop with this pin. Stand at the shop and use your current location, or search and place the pin on the map.',
  searchLabel: 'Search for your shop or street',
  required: true,
};

/** A painter's site (ORD-004): the pin is optional. */
export const SITE_COPY: PickerCopy = {
  legend: 'Site on the map',
  description:
    'Search for the place and drag the pin to the building, or use your current location when you are at the site.',
  searchLabel: 'Search for the place or street',
  required: false,
};

/**
 * A map location: the shop's (D-027) or a painter's site (ORD-004), D-041: an OpenStreetMap map with search
 * and a draggable pin, and "Use my current location".
 */
export function LocationPicker({
  value,
  onChange,
  onSuggestAddress,
  error,
  disabled = false,
  copy = SHOP_COPY,
}: {
  value: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
  onSuggestAddress?: (suggestion: SuggestedAddress) => void;
  /** Wording for where the picker is used; the shop's by default. */
  copy?: PickerCopy;
  error?: string;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<Status>(null);
  const [locating, setLocating] = useState(false);

  function locateDevice() {
    if (!window.isSecureContext) {
      setStatus({ tone: 'error', message: GEOLOCATION_MESSAGES.insecure });
      return;
    }
    if (!('geolocation' in navigator)) {
      setStatus({ tone: 'error', message: GEOLOCATION_MESSAGES.unsupported });
      return;
    }
    setLocating(true);
    setStatus(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        const { latitude, longitude, accuracy } = position.coords;
        if (accuracy > MAX_LOCATION_ACCURACY_METERS) {
          setStatus({
            tone: 'error',
            message: GEOLOCATION_MESSAGES.inaccurate(accuracy),
          });
          return;
        }
        if (!isInIndia(latitude, longitude)) {
          setStatus({
            tone: 'error',
            message: GEOLOCATION_MESSAGES.outsideIndia,
          });
          return;
        }
        onChange({ latitude, longitude, source: 'DEVICE_GPS' });
        setStatus({
          tone: 'info',
          message: `Location found, accurate to about ${Math.max(1, Math.round(accuracy))} m. Check it is the shop, then save.`,
        });
      },
      (failure) => {
        setLocating(false);
        setStatus({
          tone: 'error',
          message: geolocationErrorMessage(failure.code),
        });
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 },
    );
  }

  const errorId = error ? 'location-error' : undefined;

  return (
    <fieldset
      className="flex flex-col gap-3"
      disabled={disabled}
      aria-describedby={errorId}
    >
      <legend className="text-heading3 font-semibold">
        {copy.legend}
        {copy.required ? (
          <>
            <RequiredMark />
            <span className="sr-only"> (required)</span>
          </>
        ) : null}
      </legend>
      <p className="text-body text-text-secondary">{copy.description}</p>

      <OsmLocationMap
        value={value}
        onPick={(latitude, longitude) => {
          if (!isInIndia(latitude, longitude)) {
            setStatus({
              tone: 'error',
              message: GEOLOCATION_MESSAGES.outsideIndia,
            });
            return;
          }
          setStatus(null);
          onChange({ latitude, longitude, source: 'MAP_PIN' });
        }}
        onSuggestAddress={onSuggestAddress}
        searchLabel={copy.searchLabel}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="secondary"
          onClick={locateDevice}
          pending={locating}
          pendingLabel="Finding your location…"
        >
          Use my current location
        </Button>
        <p className="text-body text-text-primary" aria-live="polite">
          {value
            ? `Pin: ${formatCoordinates(value.latitude, value.longitude)} (${locationSourceLabel(value.source)})`
            : 'No location chosen yet.'}
        </p>
      </div>

      {status ? (
        <p
          role={status.tone === 'error' ? 'alert' : 'status'}
          className={cn(
            'text-body',
            status.tone === 'error'
              ? 'text-status-error'
              : 'text-text-secondary',
          )}
        >
          {status.message}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-body text-status-error">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
