// =============================================================
// FILE: src/pages/DetailPage.js
// =============================================================
// Receives `restaurant` prop (the full Firestore doc).
// • Renders hero, stats, badges.
// • Call button  → tel: deep link (real phone call on mobile).
// • Directions   → Google Maps directions deep link.
// • Menu rendered from restaurant.menu array.
// • Add-to-cart updates the cart state lifted to App.
// • "Book" opens the BookingModal.
// =============================================================

import { useState } from "react";
import { ArrowLeft, Phone, MapPin, Star, Plus, Copy, Check, ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import { ReadOnlyMap } from "../components/MapComponents.js"; // Added .js
import ChatWindow from "../components/ChatWindow.js"; // Added .js

export default function DetailPage({ restaurant: r, onBack, cart, onAddToCart, onOpenBooking, currentUser }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showChat, setShowChat] = useState(false);

  if (!r) return null;

  // ── helpers ─────────────────────────────────────────
  const phoneRaw     = (r.phone || "").replace(/\s/g, "");
  const telLink       = `tel:${phoneRaw}`;
  
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(r.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const directionsUrl = r.lat && r.lng
    ? `https://www.openstreetmap.org/directions?from=&to=${r.lat}%2C${r.lng}`
    : null;

  // cart count for this restaurant
  const cartCount = Object.values(cart).reduce((s, i) => s + i.qty, 0);
  const cartTotal = Object.values(cart).reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div style={{ paddingBottom: 80 }}>
      {/* ── Hero ──────────────────────────────────────── */}
      <div style={{ 
        background: r.coverPhoto ? `url(${r.coverPhoto}) center/cover no-repeat` : "linear-gradient(135deg,#78350F 0%,#92400E 100%)", 
        padding:"60px 16px 30px", position:"relative", textAlign:"center",
        minHeight: 180, display:"flex", flexDirection:"column", justifyContent:"center"
      }}>
        {/* overlay for cover photo readability */}
        {r.coverPhoto && <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,0.4)" }}></div>}
        
        <button onClick={onBack} style={{ position:"absolute", top:14, left:14, background:"rgba(0,0,0,0.3)", border:"none", borderRadius:10, padding:8, color:"#fff", cursor:"pointer", zIndex:2 }}>
          <ArrowLeft size={18}/>
        </button>
        
        <div style={{ position:"relative", zIndex:2 }}>
          {r.profilePic ? (
            <img src={r.profilePic} style={{ width:70, height:70, borderRadius:20, objectFit:"cover", border:"3px solid #fff", boxShadow:"0 4px 12px rgba(0,0,0,0.2)", marginBottom:10 }} alt="logo" />
          ) : (
            <div style={{ fontSize:52, marginBottom:6 }}>{r.emoji || "🍽️"}</div>
          )}
          <div style={{ color:"#fff", fontSize:24, fontWeight:800, fontFamily:"'Playfair Display',serif", marginBottom:3, textShadow:"0 2px 4px rgba(0,0,0,0.3)" }}>{r.name}</div>
          <div style={{ color:"rgba(255,255,255,0.9)", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center", gap:4, marginBottom:10 }}>
            <MapPin size={13}/> {r.address || r.city}
          </div>
        </div>

        {/* stats row */}
        <div style={{ display:"flex", justifyContent:"center", gap:24 }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ color:"#F59E0B", fontSize:18, fontWeight:700 }}>{r.rating || "—"}</div>
            <div style={{ color:"rgba(255,255,255,0.55)", fontSize:10, textTransform:"uppercase", letterSpacing:0.5 }}>Rating</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ color:"#fff", fontSize:18, fontWeight:700 }}>{r.reviewCount || 0}</div>
            <div style={{ color:"rgba(255,255,255,0.55)", fontSize:10, textTransform:"uppercase", letterSpacing:0.5 }}>Reviews</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ color:"#fff", fontSize:18, fontWeight:700 }}>{r.city}</div>
            <div style={{ color:"rgba(255,255,255,0.55)", fontSize:10, textTransform:"uppercase", letterSpacing:0.5 }}>City</div>
          </div>
        </div>

        {/* badges */}
        <div style={{ display:"flex", gap:6, justifyContent:"center", marginTop:10, flexWrap:"wrap" }}>
          {r.verified && <span style={{ background:"rgba(34,197,94,0.2)", color:"#86efac", borderRadius:14, padding:"3px 10px", fontSize:11 }}>✓ Verified</span>}
          {r.featured && <span style={{ background:"rgba(217,119,6,0.2)", color:"#fcd34d", borderRadius:14, padding:"3px 10px", fontSize:11 }}>⭐ Featured</span>}
          <span style={{ background:"rgba(255,255,255,0.12)", color:"rgba(255,255,255,0.85)", borderRadius:14, padding:"3px 10px", fontSize:11 }}>
            🕐 {r.openTime || "—"} – {r.closeTime || "—"}
          </span>
        </div>
      </div>

      {/* ── Leaflet Map (Collapsible) ───────────────── */}
      {r.lat && r.lng && (
        <div style={{ padding: "0 16px", marginTop: -12, position: "relative", zIndex: 10 }}>
          <div style={{ background: "#fff", borderRadius: 16, boxShadow: "0 4px 15px rgba(0,0,0,0.1)", overflow: "hidden" }}>
            <button 
              onClick={() => setShowMap(!showMap)}
              style={{ width: "100%", padding: "12px 16px", background: "#fff", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#78350F" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <MapPin size={15}/> {showMap ? "Hide Map" : "Show Map"}
              </div>
              {showMap ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
            {showMap && (
              <div style={{ height: 200, borderTop: "1px solid #F3F4F6" }}>
                <ReadOnlyMap lat={r.lat} lng={r.lng} name={r.name} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Action buttons ──────────────────────────── */}
      <div style={{ display:"flex", flexDirection:"column", gap:8, padding:"14px 16px" }}>
        <div style={{ display:"flex", gap:8 }}>
          {!revealed ? (
            <button 
              onClick={() => setRevealed(true)}
              style={{ flex:1, background:"#22C55E", color:"#fff", border:"none", borderRadius:10, padding:"10px 0", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:4, cursor:"pointer" }}
            >
              <Phone size={13}/> Call
            </button>
          ) : (
            <div style={{ flex:2, background:"#DCFCE7", border:"1px solid #22C55E", borderRadius:10, padding:"8px 12px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <a href={telLink} style={{ color:"#166534", fontSize:13, fontWeight:700, textDecoration:"none", display:"flex", alignItems:"center", gap:6 }}>
                <Phone size={14}/> {r.phone}
              </a>
              <button onClick={handleCopy} style={{ background:"#fff", border:"1px solid #BBF7D0", borderRadius:6, padding:4, cursor:"pointer", color:"#166534" }}>
                {copied ? <Check size={14}/> : <Copy size={14}/>}
              </button>
            </div>
          )}
          
          {directionsUrl ? (
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer" style={{ flex:1, background:"#3B82F6", color:"#fff", borderRadius:10, padding:"10px 0", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:4, textDecoration:"none" }}>
              <MapPin size={13}/> Directions
            </a>
          ) : (
            <div style={{ flex:1, background:"#9CA3AF", color:"#fff", borderRadius:10, padding:"10px 0", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
              <MapPin size={13}/> No location
            </div>
          )}
        </div>
        
        <div style={{ display:"flex", gap:8 }}>
          <button 
            onClick={() => setShowChat(true)}
            style={{ flex:1, background:"#78350F", color:"#fff", border:"none", borderRadius:10, padding:"12px 0", fontSize:12, fontWeight:600, display:"flex", alignItems:"center", justifyContent:"center", gap:4, cursor:"pointer" }}
          >
            <MessageCircle size={15}/> Message
          </button>
          
          <button onClick={onOpenBooking} style={{ flex:1, background:"#D97706", color:"#fff", border:"none", borderRadius:10, padding:"12px 0", fontSize:12, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:4 }}>
            🗓️ Reserve
          </button>
        </div>
      </div>

      {/* ── Chat Modal ────────────────────────────────── */}
      {showChat && (
        <ChatWindow 
          restaurantId={r.id} 
          restaurantName={r.name} 
          currentUser={currentUser} 
          onClose={() => setShowChat(false)} 
        />
      )}

      {/* ── Menu ────────────────────────────────────── */}
      {(r.menu || []).map((section, si) => (
        <div key={si} style={{ padding:"0 16px", marginBottom:14 }}>
          <div style={{ fontSize:15, fontWeight:700, fontFamily:"'Playfair Display',serif", color:"#1C1917", padding:"10px 0 6px", borderBottom:"2px solid #FEF3C7", marginBottom:6 }}>
            {section.category}
          </div>
          {(section.items || []).map((item, ii) => (
            <div key={ii} style={{ display:"flex", gap:12, alignItems:"center", padding:"12px 0", borderBottom:"1px solid #F3F4F6" }}>
              {item.image && (
                <div style={{ width:60, height:60, borderRadius:12, overflow:"hidden", flexShrink:0 }}>
                  <img src={item.image} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt={item.name} />
                </div>
              )}
              <div style={{ flex:1 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                  <div>
                    <span style={{ fontSize:14, fontWeight:600, color:"#1C1917" }}>{item.name}</span>
                    {item.popular && (
                      <span style={{ display:"inline-flex", alignItems:"center", gap:2, background:"#FEF3C7", color:"#78350F", borderRadius:4, padding:"1px 5px", fontSize:9, fontWeight:700, marginLeft:6, textTransform:"uppercase" }}>
                        🔥 Popular
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize:14, fontWeight:700, color:"#78350F" }}>{(item.price || 0).toLocaleString()} UGX</span>
                </div>
                <div style={{ display:"flex", justifyContent:"flex-end", marginTop:6 }}>
                  <button
                    onClick={() => onAddToCart(item)}
                    style={{ background:"#D97706", color:"#fff", border:"none", borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700, display:"flex", alignItems:"center", gap:4, cursor:"pointer" }}
                  >
                    <Plus size={14}/> Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* ── Floating cart bar ─────────────────────────── */}
      {cartCount > 0 && (
        <div
          onClick={onOpenBooking}
          style={{
            position:"fixed", bottom:20, left:"50%", transform:"translateX(-50%)",
            background:"#78350F", color:"#fff", borderRadius:14, padding:"11px 18px",
            display:"flex", alignItems:"center", gap:10, boxShadow:"0 8px 30px rgba(28,25,23,0.2)",
            cursor:"pointer", zIndex:150, maxWidth:"calc(100% - 32px)"
          }}
        >
          <span style={{ background:"#D97706", borderRadius:6, padding:"2px 8px", fontSize:12, fontWeight:700 }}>{cartCount}</span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:11, opacity:0.7 }}>{cartCount} item{cartCount>1?"s":""}</div>
            <div style={{ fontSize:14, fontWeight:700 }}>{cartTotal.toLocaleString()} UGX</div>
          </div>
          <span style={{ opacity:0.7, fontSize:13 }}>→</span>
        </div>
      )}
    </div>
  );
}
