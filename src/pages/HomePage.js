// =============================================================
// FILE: src/pages/HomePage.js
// =============================================================
// • Fetches restaurants live from Firestore on mount.
// • Filters by city, category, and search text (client-side
//   for speed; swap to server-side queries if the list grows
//   past ~500 docs).
// • Integrates real GPS via useGeolocation → sortByDistance.
// • Renders DinerMap with all visible restaurants + user pin.
// • Restaurant cards link to DetailPage via onSelect prop.
// =============================================================

import { useState, useEffect, useCallback } from "react";
import { Search, MapPin, Star, Crown, ChevronRight } from "lucide-react";
import { useGeolocation } from "../hooks/useGeolocation";
import { getAllRestaurants } from "../utils/firestoreService";
import { DinerMap } from "../components/MapComponents";
import { UGANDAN_DISTRICTS } from "../constants/uganda";

const DISTRICTS = ["All Districts", ...UGANDAN_DISTRICTS];
const CATEGORIES  = [
  { id:"all",        label:"All",            icon:"🍽️" },
  { id:"local",      label:"Local Food",     icon:"🥘" },
  { id:"matooke",    label:"Matooke/Sauce",  icon:"🍌" },
  { id:"muchomo",    label:"Muchomo",        icon:"🥩" },
  { id:"luwombo",    label:"Luwombo",        icon:"🍲" },
  { id:"pilau",      label:"Pilau",          icon:"🍚" },
  { id:"breakfast",  label:"Breakfast/Chai", icon:"☕" },
  { id:"indian",     label:"Indian",         icon:"🫕" },
  { id:"fastfood",   label:"Fast Food",      icon:"🍔" },
  { id:"seafood",    label:"Seafood",        icon:"🐟" },
  { id:"vegetarian", label:"Vegetarian",     icon:"🥗" },
];

function isOpen(openTime, closeTime) {
  if (!openTime || !closeTime) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [openH, openM] = openTime.split(":").map(Number);
  const [closeH, closeM] = closeTime.split(":").map(Number);
  
  const openMinutes = openH * 60 + openM;
  let closeMinutes = closeH * 60 + closeM;
  
  // Handle overnight hours (e.g., 18:00 to 02:00)
  if (closeMinutes < openMinutes) {
    closeMinutes += 24 * 60;
    // If it's early morning (e.g., 01:00), it's part of the "overnight" session
    if (currentMinutes < openMinutes) {
      return currentMinutes + 24 * 60 < closeMinutes || currentMinutes < closeMinutes - 24 * 60;
    }
  }
  
  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

export default function HomePage({ onSelectRestaurant, onBook }) {
  // ── state ───────────────────────────────────────────
  const [restaurants,     setRestaurants]     = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [fetchError,      setFetchError]      = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");
  const [selectedCat,     setSelectedCat]     = useState("all");
  const [searchQuery,     setSearchQuery]     = useState("");

  // real GPS
  const { coords, gpsLoading, gpsError, gpsActive, requestGPS, sortByDistance, clearGPS } = useGeolocation();

  // ── fetch from Firestore on mount ───────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setFetchError(null);
      try {
        const docs = await getAllRestaurants();
        if (!cancelled) setRestaurants(docs);
      } catch (err) {
        if (!cancelled) setFetchError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── client-side filter ──────────────────────────────
  const filtered = restaurants.filter((r) => {
    const matchDist = selectedDistrict === "All Districts" || r.city === selectedDistrict;
    const matchCat  = selectedCat  === "all"        || (r.categories || []).includes(selectedCat);
    const q         = searchQuery.toLowerCase();
    const matchQ    = !q ||
      (r.name || "").toLowerCase().includes(q) ||
      (r.city || "").toLowerCase().includes(q) ||
      (r.categories || []).some((c) => c.includes(q)) ||
      (r.address || "").toLowerCase().includes(q);
    return matchDist && matchCat && matchQ;
  });

  // if GPS is active, sort by real distance; otherwise leave as-is
  const displayed = gpsActive ? sortByDistance(filtered) : filtered;

  // featured banner — pick the first featured restaurant
  const featured = displayed.find((r) => r.featured) || displayed[0] || null;

  // ── handlers ────────────────────────────────────────
  const handleGPS = useCallback(() => {
    if (gpsActive) { clearGPS(); return; }
    requestGPS();
  }, [gpsActive, clearGPS, requestGPS]);

  // ── render ──────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ textAlign:"center", padding:"60px 16px", color:"#A8A29E" }}>
        <div style={{ fontSize:36, marginBottom:8 }}>🍽️</div>
        <div style={{ fontWeight:600, fontSize:15, color:"#57534E" }}>Loading restaurants…</div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ textAlign:"center", padding:"60px 16px" }}>
        <div style={{ fontSize:36, marginBottom:8 }}>⚠️</div>
        <div style={{ fontWeight:600, fontSize:15, color:"#EF4444", marginBottom:4 }}>Could not load data</div>
        <div style={{ fontSize:13, color:"#78716C", marginBottom:16 }}>{fetchError}</div>
        <button onClick={() => window.location.reload()} style={{ background:"#78350F", color:"#fff", borderRadius:8, padding:"8px 18px", fontSize:13, fontWeight:600 }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* ── Header ──────────────────────────────────── */}
      <header style={{ background:"linear-gradient(135deg,#78350F 0%,#92400E 100%)", padding:"20px 16px 14px", position:"sticky", top:0, zIndex:100 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ color:"#fff", fontSize:22, fontWeight:700, fontFamily:"'Playfair Display',serif" }}>
            Nyama<span style={{ color:"#F59E0B" }}>Connect</span>
          </div>
        </div>

        {/* search bar */}
        <div style={{ position:"relative" }}>
          <Search size={15} style={{ position:"absolute", left:12, top:"50%", transform:"translateY(-50%)", color:"#A8A29E", pointerEvents:"none" }} />
          <input
            type="text"
            placeholder="Search restaurants, cuisine…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width:"100%", background:"rgba(255,255,255,0.95)", borderRadius:12, padding:"11px 100px 11px 36px", border:"none", fontSize:14, outline:"none" }}
          />
          <button
            onClick={handleGPS}
            style={{
              position:"absolute", right:8, top:"50%", transform:"translateY(-50%)",
              background: gpsActive ? "#16A34A" : "#D97706",
              color:"#fff", border:"none", borderRadius:8, padding:"5px 10px",
              fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:3, cursor:"pointer"
            }}
          >
            <MapPin size={11} /> {gpsLoading ? "…" : gpsActive ? "GPS On" : "Near Me"}
          </button>
        </div>

        {/* GPS error toast */}
        {gpsError && (
          <div style={{ marginTop:8, background:"#FEE2E2", borderRadius:8, padding:"6px 10px", fontSize:11, color:"#991B1B" }}>
            ⚠️ {gpsError}
          </div>
        )}
      </header>

      {/* ── District chips ──────────────────────────── */}
      <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"10px 16px", WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}>
        {DISTRICTS.map((dist) => (
          <button key={dist}
            onClick={() => { setSelectedDistrict(dist); clearGPS(); }}
            style={{
              background: selectedDistrict === dist ? "#78350F" : "#fff",
              color:      selectedDistrict === dist ? "#fff"    : "#57534E",
              border:     selectedDistrict === dist ? "none"    : "1.5px solid #E7E5E4",
              borderRadius:20, padding:"6px 14px", fontSize:13, fontWeight:500,
              whiteSpace:"nowrap", cursor:"pointer", transition:"all 0.2s"
            }}
          >{dist}</button>
        ))}
      </div>

      {/* ── Category chips ──────────────────────────── */}
      <div style={{ display:"flex", gap:8, overflowX:"auto", padding:"4px 16px 10px", WebkitOverflowScrolling:"touch", scrollbarWidth:"none" }}>
        {CATEGORIES.map((cat) => (
          <button key={cat.id}
            onClick={() => setSelectedCat(cat.id)}
            style={{
              background: selectedCat === cat.id ? "#FEF3C7" : "#fff",
              border:     selectedCat === cat.id ? "1.5px solid #D97706" : "1.5px solid #E7E5E4",
              color:      selectedCat === cat.id ? "#78350F"            : "#57534E",
              borderRadius:12, padding:"7px 10px", fontSize:11, fontWeight:500,
              whiteSpace:"nowrap", textAlign:"center", minWidth:68, cursor:"pointer", transition:"all 0.2s"
            }}
          >
            <div style={{ fontSize:18, marginBottom:1 }}>{cat.icon}</div>
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Live Map ──────────────────────────────────── */}
      <div style={{ padding:"0 16px", marginBottom:12 }}>
        <DinerMap
          restaurants={displayed}
          userCoords={coords}
          onSelectRestaurant={onSelectRestaurant}
        />
      </div>

      {/* ── Featured banner ─────────────────────────── */}
      {featured && (
        <div style={{ margin:"0 16px 8px" }}>
          <div
            onClick={() => onSelectRestaurant(featured)}
            style={{
              background:"linear-gradient(135deg,#78350F 0%,#92400E 60%,#D97706 100%)",
              borderRadius:16, padding:18, cursor:"pointer", position:"relative", overflow:"hidden"
            }}
          >
            <div style={{ position:"absolute", top:-18, right:-18, width:90, height:90, background:"rgba(255,255,255,0.06)", borderRadius:"50%" }}/>
            <div style={{ display:"inline-flex", alignItems:"center", gap:4, background:"#D97706", color:"#fff", borderRadius:6, padding:"2px 7px", fontSize:10, fontWeight:700, textTransform:"uppercase", marginBottom:6 }}>
              <Crown size={9}/> Featured
            </div>
            <div style={{ color:"#fff", fontSize:19, fontWeight:700, marginBottom:3 }}>{featured.name}</div>
            <div style={{ color:"rgba(255,255,255,0.7)", fontSize:12, display:"flex", gap:10, marginBottom:10 }}>
              <span style={{ display:"flex", alignItems:"center", gap:3 }}><Star size={11} fill="#F59E0B" color="#F59E0B"/> {featured.rating || "—"}</span>
              <span><MapPin size={11}/> {featured.city}</span>
            </div>
            <div style={{ background:"rgba(255,255,255,0.15)", color:"#fff", borderRadius:8, padding:"7px 14px", fontSize:12, fontWeight:600, display:"inline-flex", alignItems:"center", gap:3 }}>
              View Menu <ChevronRight size={13}/>
            </div>
          </div>
        </div>
      )}

      {/* ── Section header ──────────────────────────── */}
      <div style={{ padding:"12px 16px 6px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <span style={{ fontSize:17, fontWeight:700, fontFamily:"'Playfair Display',serif", color:"#1C1917" }}>
          {gpsActive ? "🔍 Near You" : "Restaurants"}
        </span>
        <span style={{ fontSize:12, color:"#D97706", fontWeight:600 }}>{displayed.length} found</span>
      </div>

      {/* ── Restaurant cards ──────────────────────────── */}
      <div style={{ padding:"0 16px", display:"flex", flexDirection:"column", gap:10 }}>
        {displayed.map((r, i) => (
          <div key={r.id} style={{
            background:"#fff", borderRadius:16, boxShadow:"0 1px 3px rgba(28,25,23,0.08)",
            overflow:"hidden", animation:`fadeIn 0.25s ease ${i*0.05}s both`
          }}>
            {/* card top row */}
            <div onClick={() => onSelectRestaurant(r)} style={{ display:"flex", gap:12, padding:14, cursor:"pointer" }}>
              <div style={{ width:52, height:52, background:"#FFFBEB", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", overflow:"hidden", flexShrink:0 }}>
                {r.profilePic ? (
                  <img src={r.profilePic} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="logo" />
                ) : (
                  <span style={{ fontSize:26 }}>{r.emoji || "🍽️"}</span>
                )}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                  <span style={{ fontSize:15, fontWeight:600, color:"#1C1917", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{r.name}</span>
                  {r.verified && (
                    <span style={{ background:"#16A34A", color:"#fff", borderRadius:4, padding:"1px 5px", fontSize:9, fontWeight:700, display:"flex", alignItems:"center", gap:2 }}>
                      ✓ Verified
                    </span>
                  )}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#57534E", flexWrap:"wrap" }}>
                  <span style={{ color:"#D97706", fontWeight:600, display:"flex", alignItems:"center", gap:2 }}>
                    <Star size={11} fill="#F59E0B" color="#F59E0B"/> {r.rating || "New"}
                  </span>
                  <span style={{ color:"#57534E" }}>{r.city}</span>
                  {r.distance != null && <span style={{ color:"#D97706", fontWeight:600 }}>📍 {r.distance} km</span>}
                </div>
              </div>
            </div>

            {/* hours row */}
            <div style={{ padding:"0 14px 8px", fontSize:11, color:"#78716C", display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ color: isOpen(r.openTime, r.closeTime) ? "#16A34A" : "#EF4444", fontWeight:600 }}>
                {isOpen(r.openTime, r.closeTime) ? "🟢 Open" : "🔴 Closed"}
              </span>
              <span>{r.openTime && r.closeTime ? `${r.openTime} – ${r.closeTime}` : ""}</span>
            </div>

            {/* action buttons */}
            <div style={{ display:"flex", gap:8, padding:"0 14px 12px" }}>
              <button onClick={() => onSelectRestaurant(r)} style={{ flex:1, background:"#FFFBEB", color:"#78350F", borderRadius:8, padding:"8px 0", fontSize:12, fontWeight:600, border:"none", cursor:"pointer" }}>📖 Menu</button>
              <button onClick={() => onBook(r)} style={{ flex:1, background:"#D97706", color:"#fff", borderRadius:8, padding:"8px 0", fontSize:12, fontWeight:600, border:"none", cursor:"pointer" }}>🗓️ Book</button>
            </div>
          </div>
        ))}

        {/* empty state */}
        {displayed.length === 0 && (
          <div style={{ textAlign:"center", padding:"40px 16px", color:"#A8A29E" }}>
            <div style={{ fontSize:38, marginBottom:6 }}>🍽️</div>
            <div style={{ fontWeight:600, fontSize:15, color:"#57534E", marginBottom:3 }}>No restaurants found</div>
            <div style={{ fontSize:13 }}>Try changing your filters or search</div>
          </div>
        )}
      </div>

      {/* keyframes injected via style tag */}
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  );
}
