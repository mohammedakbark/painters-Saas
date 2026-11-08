'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import {
  type KeyboardEvent,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
} from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import {
  addressAt,
  type OsmPlace,
  searchPlaces,
  TILE_ATTRIBUTION,
  TILE_MAX_ZOOM,
  TILE_URL,
} from '@/lib/maps/openstreetmap';
import { DEFAULT_MAP_CENTER } from '@/lib/shops/geolocation';
import { type SuggestedAddress, suggestAddress } from '@/lib/shops/map-address';
import type { PickedLocation } from './location-picker';

const PIN = L.divIcon({
  className: '',
  html: '<span class="block size-7 rounded-badge border-4 border-surface-default bg-brand-primary shadow-lg ring-2 ring-brand-primary/30"></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

/**
 * OpenStreetMap part of the location picker (SHP-006, D-041): place search,
 * a map that can be clicked, and a draggable pin. Address fields are only
 * *suggested* from the pin; the owner confirms them.
 */
export default function OsmLocationMap({
  value,
  onPick,
  onSuggestAddress,
  searchLabel = 'Search for your shop or street',
}: {
  value: PickedLocation | null;
  onPick: (latitude: number, longitude: number) => void;
  /** Offers the address at the pin; left out where there is no address form. */
  onSuggestAddress?: (suggestion: SuggestedAddress) => void;
  searchLabel?: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <PlaceSearch onPlace={onPick} label={searchLabel} />
      <LeafletMap value={value} onPick={onPick} />
      {onSuggestAddress ? (
        <SuggestFromPin value={value} onSuggestAddress={onSuggestAddress} />
      ) : null}
    </div>
  );
}

function LeafletMap({
  value,
  onPick,
}: {
  value: PickedLocation | null;
  onPick: (latitude: number, longitude: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const marker = useRef<L.Marker | null>(null);
  const pick = useEffectEvent(onPick);
  const [initial] = useState(value);

  useEffect(() => {
    if (!host.current) {
      return;
    }
    const center = initial
      ? L.latLng(initial.latitude, initial.longitude)
      : L.latLng(DEFAULT_MAP_CENTER.lat, DEFAULT_MAP_CENTER.lng);
    const created = L.map(host.current, {
      center,
      zoom: initial ? 17 : 12,
      // The page scrolls past the map; zoom with the buttons or a pinch.
      scrollWheelZoom: false,
    });
    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTRIBUTION,
      maxZoom: TILE_MAX_ZOOM,
    }).addTo(created);
    created.attributionControl.setPrefix(
      '<a href="https://leafletjs.com">Leaflet</a>',
    );
    created.on('click', (event: L.LeafletMouseEvent) =>
      pick(event.latlng.lat, event.latlng.lng),
    );
    map.current = created;
    return () => {
      created.remove();
      map.current = null;
      marker.current = null;
    };
  }, [initial]);

  // Places, moves or removes the pin when the location changes.
  const lat = value?.latitude;
  const lng = value?.longitude;
  useEffect(() => {
    const current = map.current;
    if (!current) {
      return;
    }
    if (lat === undefined || lng === undefined) {
      marker.current?.remove();
      marker.current = null;
      return;
    }
    if (marker.current) {
      marker.current.setLatLng([lat, lng]);
    } else {
      marker.current = L.marker([lat, lng], {
        icon: PIN,
        draggable: true,
        title: 'Shop location',
        alt: 'Shop location',
      })
        .on('dragend', (event) => {
          const position = (event.target as L.Marker).getLatLng();
          pick(position.lat, position.lng);
        })
        .addTo(current);
    }
    // Street level, so the owner can check the pin is on the shop.
    current.setView([lat, lng], Math.max(current.getZoom(), 17));
  }, [lat, lng]);

  return (
    <div
      ref={host}
      role="application"
      aria-label="Map. Click to place the shop pin, or drag the pin."
      className="isolate z-0 h-80 overflow-hidden rounded-card border border-card-border"
    />
  );
}

/** Suggests address fields for a pin the owner moved (not for the saved pin). */
function SuggestFromPin({
  value,
  onSuggestAddress,
}: {
  value: PickedLocation | null;
  onSuggestAddress: (suggestion: SuggestedAddress) => void;
}) {
  const [initial] = useState(value);
  const lat = value?.latitude;
  const lng = value?.longitude;
  const suggest = useEffectEvent(onSuggestAddress);

  useEffect(() => {
    if (lat === undefined || lng === undefined) {
      return;
    }
    if (lat === initial?.latitude && lng === initial?.longitude) {
      return;
    }
    const controller = new AbortController();
    // Waits until the pin settles, so a drag makes one lookup.
    const timer = setTimeout(() => {
      addressAt(lat, lng, controller.signal)
        .then((address) => {
          const suggestion = suggestAddress(address);
          if (suggestion) {
            suggest(suggestion);
          }
        })
        // A failed lookup only means no suggestion; the owner types the address.
        .catch(() => undefined);
    }, 600);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [lat, lng, initial]);
  return null;
}

type SearchState =
  | { kind: 'idle' }
  | { kind: 'searching' }
  | { kind: 'results'; places: OsmPlace[] }
  | { kind: 'error' };

/**
 * Search for a shop, street or area in India. Runs when the owner presses
 * Search (or Enter); suggestions while typing are not allowed by the free
 * service's usage policy. This sits inside the profile form, so it is not a
 * form itself: Enter is handled here instead of submitting the profile.
 */
function PlaceSearch({
  onPlace,
  label,
}: {
  onPlace: (latitude: number, longitude: number) => void;
  label: string;
}) {
  const [text, setText] = useState('');
  const [state, setState] = useState<SearchState>({ kind: 'idle' });

  async function search() {
    const query = text.trim();
    if (query.length < 3) {
      return;
    }
    setState({ kind: 'searching' });
    try {
      setState({ kind: 'results', places: await searchPlaces(query) });
    } catch {
      setState({ kind: 'error' });
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault();
      void search();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 medium:flex-row medium:items-end">
        <div className="w-full">
          <Field
            label={label}
            name="mapSearch"
            type="search"
            leadingIcon="search"
            placeholder="For example: MG Road, Kochi"
            maxLength={120}
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            // Only for the map; not part of the saved profile.
            form="map-search-only"
          />
        </div>
        <Button
          variant="secondary"
          className="shrink-0"
          onClick={() => void search()}
          pending={state.kind === 'searching'}
          pendingLabel="Searching…"
          disabled={text.trim().length < 3}
        >
          Search
        </Button>
      </div>

      <div aria-live="polite">
        {state.kind === 'error' ? (
          <p role="alert" className="text-body text-status-error">
            The search isn&apos;t available right now. Place the pin on the map
            instead.
          </p>
        ) : null}
        {state.kind === 'results' && state.places.length === 0 ? (
          <p className="text-body text-text-secondary">
            No places found. Try a street, area or town, or place the pin on the
            map.
          </p>
        ) : null}
        {state.kind === 'results' && state.places.length > 0 ? (
          <ul
            aria-label="Search results"
            className="flex flex-col divide-y divide-border-default rounded-panel border border-panel-border"
          >
            {state.places.map((place) => (
              <li key={place.id} className="p-1">
                <Button
                  variant="tertiary"
                  className="w-full"
                  onClick={() => {
                    onPlace(place.latitude, place.longitude);
                    setState({ kind: 'idle' });
                  }}
                >
                  <span className="block w-full py-2 text-left text-body font-medium">
                    {place.label}
                  </span>
                </Button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
