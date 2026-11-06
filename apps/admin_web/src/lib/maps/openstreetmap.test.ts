import { afterEach, describe, expect, it, vi } from 'vitest';
import { addressAt, searchPlaces } from './openstreetmap';

function mockFetch(body: unknown) {
  const fetchMock = vi.fn<(url: string) => Promise<Response>>(
    async () => new Response(JSON.stringify(body)),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('OpenStreetMap services', () => {
  it('searches places in India only and maps the results', async () => {
    const fetchMock = mockFetch([
      {
        place_id: 7,
        display_name: 'MG Road, Kochi, Kerala',
        lat: '9.97',
        lon: '76.28',
      },
    ]);
    const places = await searchPlaces('MG Road Kochi');
    const url = new URL(fetchMock.mock.calls[0]?.[0] ?? '');
    expect(url.origin + url.pathname).toBe(
      'https://nominatim.openstreetmap.org/search',
    );
    expect(url.searchParams.get('q')).toBe('MG Road Kochi');
    expect(url.searchParams.get('countrycodes')).toBe('in');
    expect(url.searchParams.get('limit')).toBe('5');
    expect(places).toEqual([
      {
        id: '7',
        label: 'MG Road, Kochi, Kerala',
        latitude: 9.97,
        longitude: 76.28,
      },
    ]);
  });

  it('returns the address at a point, or null when there is none', async () => {
    mockFetch({
      place_id: 1,
      display_name: 'x',
      lat: '0',
      lon: '0',
      address: { road: 'MG Road' },
    });
    expect(await addressAt(9.97, 76.28)).toEqual({ road: 'MG Road' });
    mockFetch({ error: 'Unable to geocode' });
    expect(await addressAt(0, 0)).toBeNull();
  });

  it('keeps requests at least a second apart', async () => {
    vi.useFakeTimers();
    const fetchMock = mockFetch([]);
    const first = searchPlaces('Kochi');
    const second = searchPlaces('Thrissur');
    await vi.advanceTimersByTimeAsync(0);
    const callsBefore = fetchMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(5000);
    await Promise.all([first, second]);
    expect(callsBefore).toBeLessThan(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws when the service fails, so the page can say so', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('busy', { status: 429 })),
    );
    await expect(searchPlaces('Kochi')).rejects.toThrow('429');
  });
});
