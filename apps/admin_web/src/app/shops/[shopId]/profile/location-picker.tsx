'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
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

/** Browser key and map ID, or null when Google Maps isn't configured. */
export interface MapsConfig {
  apiKey: string;
  mapId: string | null;
}

// Loaded only when a key is configured, so the no-map page ships no map code.
const GoogleLocationMap = dynamic(() => import('./google-location-map'), {
  ssr: false,
  loading: () => (
    <p className="text-body text-text-secondary" aria-busy="true">
      Loading the map…
    </p>
  ),
});

type Status = { tone: 'error' | 'info'; message: string } | null;

/**
 * The shop's map location (D-027): a Google map with search and a draggable
 * pin when configured, and "Use my current location" in every case.
 */
export function LocationPicker({
  value,
  onChange,
  onSuggestAddress,
  maps,
  error,
  disabled = false,
}: {
  value: PickedLocation | null;
  onChange: (location: PickedLocation) => void;
  onSuggestAddress: (suggestion: SuggestedAddress) => void;
  maps: MapsConfig | null;
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
      <legend className="text-heading3 font-semibold">Map location</legend>
      <p className="text-body text-text-secondary">
        Customers will find your shop with this pin. Stand at the shop and use
        your current location, or{' '}
        {maps
          ? 'search or place the pin on the map.'
          : 'set it later on the map.'}
      </p>

      {maps ? (
        <GoogleLocationMap
          apiKey={maps.apiKey}
          mapId={maps.mapId}
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
        />
      ) : (
        <div className="rounded-medium border border-border-default bg-surface-subtle px-4 py-3 text-body text-text-secondary">
          The map isn&apos;t set up yet. You can still save the location with
          &ldquo;Use my current location&rdquo;.
        </div>
      )}

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
