// TypeScript 6 loads no global @types by default; the Maps API types are global.
/// <reference types="google.maps" />
'use client';

import {
  AdvancedMarker,
  APIProvider,
  Map,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { DEFAULT_MAP_CENTER } from '@/lib/shops/geolocation';
import {
  type MapAddressComponent,
  type SuggestedAddress,
  suggestAddress,
} from '@/lib/shops/map-address';
import type { PickedLocation } from './location-picker';

/**
 * Google Maps part of the location picker (SHP-003): place search, a map
 * that can be clicked, and a draggable pin. Address fields are only
 * *suggested* from the pin (reverse geocoding); the owner confirms them.
 *
 * Uses the Maps JavaScript API, Places API (New) and Geocoding API with the
 * restricted browser key. Not verified until the product owner creates keys.
 */
export default function GoogleLocationMap({
  apiKey,
  mapId,
  value,
  onPick,
  onSuggestAddress,
}: {
  apiKey: string;
  mapId: string | null;
  value: PickedLocation | null;
  onPick: (latitude: number, longitude: number) => void;
  onSuggestAddress: (suggestion: SuggestedAddress) => void;
}) {
  const position = value ? { lat: value.latitude, lng: value.longitude } : null;

  return (
    <APIProvider apiKey={apiKey} region="IN" language="en">
      {/* The pin it sets is reverse-geocoded below, like any other pin. */}
      <PlaceSearch onPlace={onPick} />
      <div className="h-80 overflow-hidden rounded-card border border-card-border">
        <Map
          mapId={mapId ?? 'DEMO_MAP_ID'}
          defaultCenter={position ?? DEFAULT_MAP_CENTER}
          defaultZoom={position ? 17 : 12}
          gestureHandling="cooperative"
          clickableIcons={false}
          streetViewControl={false}
          onClick={(event) => {
            const latLng = event.detail.latLng;
            if (latLng) {
              onPick(latLng.lat, latLng.lng);
            }
          }}
        >
          {position ? (
            <AdvancedMarker
              position={position}
              draggable
              title="Shop location"
              onDragEnd={(event) => {
                if (event.latLng) {
                  onPick(event.latLng.lat(), event.latLng.lng());
                }
              }}
            />
          ) : null}
          <FollowPin position={position} />
        </Map>
      </div>
      <SuggestFromPin position={position} onSuggestAddress={onSuggestAddress} />
    </APIProvider>
  );
}

/** Pans to the pin when it moves from outside the map (search, current location). */
function FollowPin({
  position,
}: {
  position: google.maps.LatLngLiteral | null;
}) {
  const map = useMap();
  const lat = position?.lat;
  const lng = position?.lng;
  useEffect(() => {
    if (map && lat !== undefined && lng !== undefined) {
      map.panTo({ lat, lng });
    }
  }, [map, lat, lng]);
  return null;
}

/** Suggests address fields for a pin the owner moved (not for the saved pin). */
function SuggestFromPin({
  position,
  onSuggestAddress,
}: {
  position: google.maps.LatLngLiteral | null;
  onSuggestAddress: (suggestion: SuggestedAddress) => void;
}) {
  const geocoding = useMapsLibrary('geocoding');
  // The pin when the map opened (the saved location) needs no suggestion.
  const [initial] = useState(position);
  const initialLat = initial?.lat;
  const initialLng = initial?.lng;
  const lat = position?.lat;
  const lng = position?.lng;
  const suggest = useEffectEvent(onSuggestAddress);

  useEffect(() => {
    if (!geocoding || lat === undefined || lng === undefined) {
      return;
    }
    if (lat === initialLat && lng === initialLng) {
      return;
    }
    let cancelled = false;
    new geocoding.Geocoder()
      .geocode({ location: { lat, lng } })
      .then(({ results }) => {
        const components: MapAddressComponent[] =
          results[0]?.address_components ?? [];
        const suggestion = suggestAddress(components);
        if (!cancelled && suggestion) {
          suggest(suggestion);
        }
      })
      // A failed lookup only means no suggestion; the owner types the address.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [geocoding, lat, lng, initialLat, initialLng]);
  return null;
}

/** Places API (New) autocomplete element, limited to India. */
function PlaceSearch({
  onPlace,
}: {
  onPlace: (lat: number, lng: number) => void;
}) {
  const places = useMapsLibrary('places');
  const container = useRef<HTMLDivElement>(null);
  const handlePlace = useEffectEvent(onPlace);

  useEffect(() => {
    const host = container.current;
    if (!places || !host) {
      return;
    }
    const element = new places.PlaceAutocompleteElement({
      includedRegionCodes: ['in'],
    });
    element.setAttribute('aria-label', 'Search for your shop or street');
    const onSelect = async (
      event: google.maps.places.PlacePredictionSelectEvent,
    ) => {
      const place = event.placePrediction.toPlace();
      await place.fetchFields({ fields: ['location'] });
      if (place.location) {
        handlePlace(place.location.lat(), place.location.lng());
      }
    };
    const listener = (event: google.maps.places.PlacePredictionSelectEvent) => {
      void onSelect(event).catch(() => undefined);
    };
    element.addEventListener('gmp-select', listener);
    host.replaceChildren(element);
    return () => {
      element.removeEventListener('gmp-select', listener);
      element.remove();
    };
  }, [places]);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-body font-medium text-text-primary">
        Search for your shop or street
      </span>
      <div ref={container} />
    </div>
  );
}
