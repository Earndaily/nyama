// =============================================================
// FILE: src/components/MapComponents.js
// =============================================================
// Two components, both backed by Leaflet + OpenStreetMap tiles
// (free, no API key required).
//
//   <DinerMap
//       restaurants={[...]}   – array of restaurant objects with lat/lng
//       userCoords={coords}   – { lat, lng } | null  (from useGeolocation)
//       onSelectRestaurant={fn}
//   />
//       Shows every restaurant as a pin. If the diner's GPS is active,
//       shows a blue "You are here" pin. Tapping a restaurant pin calls
//       onSelectRestaurant(restaurant).
//
//   <OwnerMap
//       initialLat={number}
//       initialLng={number}
//       onPinChange={({ lat, lng }) => void}
//   />
//       Shows a single draggable marker. On drag-end or map-click,
//       calls onPinChange with the new coordinates. The owner sees
//       real-time lat/lng feedback.
// =============================================================

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// ── Fix Leaflet's default icon path (CRA / Vite break it) ──
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png"
});

// custom icon factory so we can colour pins
function colorIcon(color = "#D97706") {
  return L.divIcon({
    className: "",
    html: `<svg width="24" height="36" viewBox="0 0 24 36" fill="none">
             <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z" fill="${color}"/>
             <circle cx="12" cy="12" r="5" fill="#fff"/>
           </svg>`,
    iconSize:    [24, 36],
    iconAnchor:  [12, 36],
    popupAnchor: [0, -36]
  });
}

// ─── DINER MAP ────────────────────────────────────────────
export function DinerMap({ restaurants = [], userCoords, onSelectRestaurant }) {
  const mapRef   = useRef(null);
  const mapObj   = useRef(null);
  const layerRef = useRef([]);
  const userPin  = useRef(null);

  // initialise map once
  useEffect(() => {
    if (mapObj.current) return; // already mounted
    const map = L.map(mapRef.current, {
      center:  [0.3187, 32.5840], // Kampala default
      zoom:    12,
      zoomControl: true
    });
    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>' }
    ).addTo(map);
    mapObj.current = map;
    return () => { map.remove(); mapObj.current = null; };
  }, []);

  // update restaurant pins whenever the list changes
  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;

    // remove old pins
    layerRef.current.forEach((l) => map.removeLayer(l));
    layerRef.current = [];

    restaurants.forEach((r) => {
      if (r.lat == null || r.lng == null) return;
      const marker = L.marker([r.lat, r.lng], { icon: colorIcon("#D97706") })
        .addTo(map)
        .bindPopup(`<strong>${r.name}</strong><br/>${r.city}<br/>${r.address || ""}`)
        .on("click", () => onSelectRestaurant && onSelectRestaurant(r));
      layerRef.current.push(marker);
    });

    // auto-fit bounds to show all pins
    if (restaurants.length > 0) {
      const bounds = restaurants
        .filter((r) => r.lat != null && r.lng != null)
        .map((r) => [r.lat, r.lng]);
      if (bounds.length) map.fitBounds(bounds, { padding: [20, 20] });
    }
  }, [restaurants, onSelectRestaurant]);

  // show / update the user's own GPS pin
  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;

    if (userCoords) {
      const blueIcon = colorIcon("#3B82F6");
      if (userPin.current) {
        userPin.current.setLatLng([userCoords.lat, userCoords.lng]);
      } else {
        userPin.current = L.marker([userCoords.lat, userCoords.lng], { icon: blueIcon })
          .addTo(map)
          .bindPopup("📍 You are here");
      }
      map.setView([userCoords.lat, userCoords.lng], 14);
    } else if (userPin.current) {
      map.removeLayer(userPin.current);
      userPin.current = null;
    }
  }, [userCoords]);

  return (
    <div ref={mapRef} style={{ width: "100%", height: "260px", borderRadius: 12, zIndex: 0 }} />
  );
}

// ─── OWNER MAP (editable pin) ─────────────────────────────
export function OwnerMap({ initialLat = 0.3187, initialLng = 32.5840, onPinChange }) {
  const mapRef   = useRef(null);
  const mapObj   = useRef(null);
  const markerRef = useRef(null);
  const [pinCoords, setPinCoords] = useState({ lat: initialLat, lng: initialLng });

  useEffect(() => {
    if (mapObj.current) return;
    const map = L.map(mapRef.current, {
      center: [initialLat, initialLng],
      zoom:   13,
      zoomControl: true
    });
    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>' }
    ).addTo(map);

    // draggable marker
    const marker = L.marker([initialLat, initialLng], {
      icon:      colorIcon("#16A34A"),
      draggable: true
    }).addTo(map);

    const updatePin = (latlng) => {
      const coords = { lat: parseFloat(latlng.lat.toFixed(6)), lng: parseFloat(latlng.lng.toFixed(6)) };
      setPinCoords(coords);
      onPinChange && onPinChange(coords);
    };

    marker.on("dragend", (e) => updatePin(e.target.getLatLng()));
    markerRef.current = marker;

    // also allow click-to-move
    map.on("click", (e) => {
      marker.setLatLng(e.latlng);
      updatePin(e.latlng);
    });

    mapObj.current = map;
    return () => { map.remove(); mapObj.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // sync marker if props change from outside (e.g. Geocoding sync)
  useEffect(() => {
    if (mapObj.current && markerRef.current) {
      const currentPos = markerRef.current.getLatLng();
      if (currentPos.lat !== initialLat || currentPos.lng !== initialLng) {
        markerRef.current.setLatLng([initialLat, initialLng]);
        mapObj.current.setView([initialLat, initialLng], mapObj.current.getZoom());
        setPinCoords({ lat: initialLat, lng: initialLng });
      }
    }
  }, [initialLat, initialLng]);

  return (
    <div>
      <div ref={mapRef} style={{ width: "100%", height: "220px", borderRadius: 12, zIndex: 0 }} />
      <div style={{
        marginTop: 8, background: "#F0FDF4", borderRadius: 8, padding: "8px 12px",
        fontSize: 12, color: "#166534", fontWeight: 600, display: "flex", justifyContent: "space-between"
      }}>
        <span>📍 Lat: {pinCoords.lat.toFixed(6)}</span>
        <span>Lng: {pinCoords.lng.toFixed(6)}</span>
      </div>
      <p style={{ fontSize: 11, color: "#78716C", marginTop: 4, textAlign: "center" }}>
        Drag the green pin or tap the map to set your location
      </p>
    </div>
  );
}

// ─── READ ONLY MAP (for details page) ─────────────────────
export function ReadOnlyMap({ lat, lng, name }) {
  const mapRef = useRef(null);
  const mapObj = useRef(null);

  useEffect(() => {
    if (mapObj.current || !lat || !lng) return;
    const map = L.map(mapRef.current, {
      center: [lat, lng],
      zoom:   15,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false
    });
    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { attribution: '© OpenStreetMap' }
    ).addTo(map);

    L.marker([lat, lng], { icon: colorIcon("#D97706") })
      .addTo(map);

    mapObj.current = map;
    return () => { map.remove(); mapObj.current = null; };
  }, [lat, lng]);

  return (
    <div ref={mapRef} style={{ width: "100%", height: "100%", zIndex: 0 }} />
  );
}
