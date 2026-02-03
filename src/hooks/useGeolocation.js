// =============================================================
// FILE: src/hooks/useGeolocation.js
// =============================================================
// Real browser Geolocation API wrapper.
//
// Returns:
//   coords        – { lat, lng } | null
//   gpsLoading    – true while the browser is fetching position
//   gpsError      – error string or null
//   gpsActive     – true once a valid position has been obtained
//   requestGPS()  – call this to trigger geolocation (needs user
//                   permission; browsers only ask once per origin)
//   sortByDistance(list) – pure helper: returns a new array sorted
//                   ascending by Haversine distance from coords.
//                   Each item gains a `distance` property (km).
// =============================================================

import { useState, useCallback } from "react";

// ── Haversine formula ─────────────────────────────────────
// Returns distance in kilometres between two lat/lng points.
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function useGeolocation() {
  const [coords,     setCoords]     = useState(null);   // { lat, lng }
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError,   setGpsError]   = useState(null);
  const [gpsActive,  setGpsActive]  = useState(false);

  // ── trigger the browser permission prompt ──────────
  const requestGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Your browser does not support geolocation.");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setGpsActive(true);
        setGpsLoading(false);
      },
      (err) => {
        // err.code: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT
        const messages = {
          1: "Location permission denied. Please enable it in your browser settings.",
          2: "Unable to determine your location. Check your GPS or Wi-Fi.",
          3: "Location request timed out. Please try again."
        };
        setGpsError(messages[err.code] || "Unknown geolocation error.");
        setGpsLoading(false);
      },
      {
        enableHighAccuracy: true,   // use GPS when available
        timeout:            10000,  // 10 s max wait
        maximumAge:         300000  // cache for 5 min
      }
    );
  }, []);

  // ── pure helper: attach distance and sort ──────────
  // Each item in `list` must have { lat, lng } properties
  // (these come from Firestore restaurant documents).
  const sortByDistance = useCallback((list) => {
    if (!coords) return list; // can't sort without a position
    return list
      .map((item) => ({
        ...item,
        distance: parseFloat(haversine(coords.lat, coords.lng, item.lat, item.lng).toFixed(2))
      }))
      .sort((a, b) => a.distance - b.distance);
  }, [coords]);

  // ── clear / reset ───────────────────────────────────
  const clearGPS = useCallback(() => {
    setCoords(null);
    setGpsActive(false);
    setGpsError(null);
  }, []);

  return { coords, gpsLoading, gpsError, gpsActive, requestGPS, sortByDistance, clearGPS };
}
