import { useState, useEffect } from 'react';

const DEFAULT_LAT = 32.2211;
const DEFAULT_LNG = 35.2544;
const DEFAULT_LABEL = 'Nablus, Palestine';

interface GeoCoords {
  lat: number;
  lng: number;
}

interface UseGeolocationResult {
  coords: GeoCoords | null;
  locationName: string;
  refresh: () => void;
}

/**
 * Requests the browser's current position on mount.
 * Falls back to the Nablus, Palestine default coordinates if denied or unavailable.
 */
export function useGeolocation(defaultLabel = DEFAULT_LABEL): UseGeolocationResult {
  const [coords, setCoords] = useState<GeoCoords | null>(null);
  const [locationName, setLocationName] = useState('Detecting location…');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const refresh = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    const fallback = { lat: DEFAULT_LAT, lng: DEFAULT_LNG };

    if (!navigator.geolocation) {
      setCoords(fallback);
      setLocationName(`Default: ${defaultLabel}`);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocationName(`${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`);
        setCoords(loc);
      },
      () => {
        setCoords(fallback);
        setLocationName(`Default: ${defaultLabel}`);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }, [defaultLabel, refreshTrigger]);

  return { coords, locationName, refresh };
}
