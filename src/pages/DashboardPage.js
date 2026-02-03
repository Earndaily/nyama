// =============================================================
// FILE: src/pages/DashboardPage.js
// =============================================================
// Two states:
//   1. Not logged in  → Login / Register form (real Firebase Auth).
//   2. Logged in as owner → Dashboard with:
//        • Stats fetched from Firestore (booking count, etc.)
//        • Restaurant info editor (name, city, address, hours)
//        • Menu editor (add / remove / edit items)
//        • OwnerMap for real lat/lng pinning
//        • Save buttons that call updateRestaurant() or createRestaurant()
// =============================================================

import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Check, Plus, Minus, LogOut, Camera, Upload, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext.js"; // Added .js
import { 
  getOwnerRestaurants, 
  createRestaurant, 
  updateRestaurant, 
  getRestaurantBookings,
  uploadImage 
} from "../utils/firestoreService.js"; // Added .js
import { OwnerMap } from "../components/MapComponents.js"; // Added .js
import { UGANDAN_DISTRICTS } from "../constants/uganda.js"; // Added .js

const DISTRICTS = UGANDAN_DISTRICTS;

export default function DashboardPage({ onBack, showToast }) {
  const { user, userProfile, loading: authLoading, signUp, loginEmail, loginGoogle, logout } = useAuth();

  // ── states ────────────────────────────────────────
  const [loginTab,     setLoginTab]     = useState("login");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [regName,      setRegName]      = useState("");
  const [authErr,      setAuthErr]      = useState(null);
  const [authBusy,     setAuthBusy]     = useState(false);

  const [restaurants,  setRestaurants]  = useState([]);
  const [activeRes,    setActiveRes]    = useState(null);
  const [bookingCount, setBookingCount] = useState(0);
  const [dashLoading,  setDashLoading]  = useState(false);
  const [saveBusy,     setSaveBusy]     = useState(false);

  const [form, setForm] = useState({
    name:      "",
    city:      "Kampala",
    address:   "",
    phone:     "",
    openTime:  "08:00",
    closeTime: "22:00",
    emoji:     "🍽️",
    menu:      [{ category: "Main Course", items: [{ name: "", price: "", image: "" }] }],
    lat:       0.3187,
    lng:       32.5840,
    profilePic: "",
    coverPhoto: "",
    boosted:    false,
    boostRequested: false
  });

  // ── image upload local states (files) ──────────────
  const [uploadProgress, setUploadProgress] = useState({}); // { field: boolean }

  // ── sync geocoding ────────────────────────────────
  const handleGeocode = async () => {
    if (!form.address) return;
    try {
      const q = encodeURIComponent(`${form.address}, ${form.city}, Uganda`);
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`);
      const data = await res.json();
      if (data && data[0]) {
        const { lat, lon } = data[0];
        setForm(p => ({ ...p, lat: parseFloat(lat), lng: parseFloat(lon) }));
        showToast("📍 Map updated to address");
      }
    } catch (e) {
      console.error("Geocode failed", e);
    }
  };

  // ── file handlers ─────────────────────────────────
  const handleFileUpload = async (e, type, si = null, ii = null) => {
    const file = e.target.files[0];
    if (!file || !user) return;

    const fieldKey = type === 'menu' ? `menu-${si}-${ii}` : type;
    setUploadProgress(p => ({ ...p, [fieldKey]: true }));

    try {
      const url = await uploadImage(file);
      
      if (type === 'profile') setForm(p => ({ ...p, profilePic: url }));
      else if (type === 'cover') setForm(p => ({ ...p, coverPhoto: url }));
      else if (type === 'menu') {
        setForm(p => ({
          ...p,
          menu: p.menu.map((s, idx) => idx === si 
            ? { ...s, items: s.items.map((it, jdx) => jdx === ii ? { ...it, image: url } : it) }
            : s)
        }));
      }
      showToast("📸 Photo uploaded!");
    } catch (err) {
      showToast("⚠️ Upload failed: " + err.message);
    } finally {
      setUploadProgress(p => ({ ...p, [fieldKey]: false }));
    }
  };

  // ── fetch / populate ──────────────────────────────
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    async function load() {
      setDashLoading(true);
      try {
        const docs = await getOwnerRestaurants(user.uid);
        if (!cancelled) {
          setRestaurants(docs);
          if (docs.length > 0) {
            setActiveRes(docs[0]);
            populateForm(docs[0]);
            const bookings = await getRestaurantBookings(docs[0].id);
            if (!cancelled) setBookingCount(bookings.length);
          }
        }
      } catch (err) {
        showToast("⚠️ Error: " + err.message);
      } finally {
        if (!cancelled) setDashLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [user]);

  function populateForm(doc) {
    // Migration: if menu is old format [{name, price}], wrap it in a category
    let cleanMenu = doc.menu || [{ category: "Main Course", items: [{ name: "", price: "", image: "" }] }];
    if (cleanMenu.length > 0 && !cleanMenu[0].items) {
      cleanMenu = [{ category: "Main Course", items: cleanMenu }];
    }

    setForm({
      name:       doc.name       || "",
      city:       doc.city       || "Kampala",
      address:    doc.address    || "",
      phone:      doc.phone      || "",
      openTime:   doc.openTime   || "08:00",
      closeTime:  doc.closeTime  || "22:00",
      emoji:      doc.emoji      || "🍽️",
      menu:       cleanMenu,
      lat:        doc.lat        || 0.3187,
      lng:        doc.lng        || 32.5840,
      profilePic: doc.profilePic || "",
      coverPhoto: doc.coverPhoto || "",
      boosted:    doc.boosted    || false,
      boostRequested: doc.boostRequested || false
    });
  }

  // ── auth handlers ─────────────────────────────────
  const handleLogin = async () => {
    setAuthBusy(true); setAuthErr(null);
    const res = await loginEmail(email, password);
    if (!res.success) setAuthErr(res.error);
    setAuthBusy(false);
  };

  const handleRegister = async () => {
    setAuthBusy(true); setAuthErr(null);
    const res = await signUp(email, password, regName || "Owner", "owner");
    if (!res.success) setAuthErr(res.error);
    setAuthBusy(false);
  };

  const handleGoogleAuth = async () => {
    setAuthBusy(true); setAuthErr(null);
    const res = await loginGoogle();
    if (!res.success) setAuthErr(res.error);
    setAuthBusy(false);
  };

  // ── menu helpers ──────────────────────────────────
  const addSection = () => setForm(p => ({ ...p, menu: [...p.menu, { category: "New Section", items: [{ name: "", price: "", image: "" }] }] }));
  const addItem = (si) => setForm(p => ({
    ...p,
    menu: p.menu.map((s, i) => i === si ? { ...s, items: [...s.items, { name: "", price: "", image: "" }] } : s)
  }));

  // ── save ──────────────────────────────────────────
  const handleSave = async () => {
    setSaveBusy(true);
    const payload = {
      ...form,
      menu: form.menu.map(s => ({
        category: s.category,
        items: s.items.filter(i => i.name).map(i => ({ 
          name: i.name, 
          price: parseInt(i.price, 10) || 0,
          image: i.image || ""
        }))
      })).filter(s => s.items.length > 0)
    };

    try {
      if (activeRes) {
        await updateRestaurant(activeRes.id, payload);
        showToast("✅ Saved!");
      } else {
        const id = await createRestaurant(payload, user.uid);
        showToast("✅ Registered!");
        const docs = await getOwnerRestaurants(user.uid);
        setRestaurants(docs);
        if (docs.length) { setActiveRes(docs[0]); populateForm(docs[0]); }
      }
    } catch (err) {
      showToast("⚠️ Save failed: " + err.message);
    } finally {
      setSaveBusy(false);
    }
  };

  if (authLoading) return <div style={{ textAlign:"center", padding:60 }}>Loading…</div>;

  if (!user) {
    return (
      <div style={{ paddingBottom:80 }}>
        {/* Simple Login Form */}
        <div style={{ background:"linear-gradient(135deg,#78350F,#92400E)", padding:"60px 16px 30px", textAlign:"center", color:"#fff" }}>
          <div style={{ fontSize:24, fontWeight:800, fontFamily:"'Playfair Display',serif" }}>Restaurant Portal</div>
          <div style={{ opacity:0.8, fontSize:14, marginTop:4 }}>Manage your digital presence</div>
        </div>

        <div style={{ margin:"-20px 16px 0", background:"#fff", borderRadius:20, padding:24, boxShadow:"0 10px 25px rgba(0,0,0,0.05)" }}>
          <div style={{ display:"flex", background:"#F3F4F6", borderRadius:12, padding:4, marginBottom:20 }}>
            {['login','register'].map(t => (
              <button key={t} onClick={() => setLoginTab(t)} style={{ flex:1, border:"none", padding:"10px 0", borderRadius:9, fontSize:14, fontWeight:600, background: loginTab===t?"#fff":"transparent", color: loginTab===t?"#78350F":"#6B7280", cursor:"pointer", transition:"0.2s" }}>
                {t==='login'?'Sign In':'Register'}
              </button>
            ))}
          </div>

          {loginTab === 'register' && (
            <input value={regName} onChange={e => setRegName(e.target.value)} placeholder="Full Name" style={{ width:"100%", padding:12, borderRadius:10, border:"1px solid #E5E7EB", marginBottom:12, outline:"none" }} />
          )}
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" style={{ width:"100%", padding:12, borderRadius:10, border:"1px solid #E5E7EB", marginBottom:12, outline:"none" }} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" type="password" style={{ width:"100%", padding:12, borderRadius:10, border:"1px solid #E5E7EB", marginBottom:20, outline:"none" }} />

          {authErr && <div style={{ color:"#EF4444", fontSize:12, marginBottom:12 }}>{authErr}</div>}

          <button onClick={loginTab==='login'?handleLogin:handleRegister} disabled={authBusy} style={{ width:"100%", background:"#78350F", color:"#fff", border:"none", padding:14, borderRadius:12, fontWeight:700, cursor:"pointer", marginBottom:12 }}>
            {authBusy ? "Processing..." : loginTab==='login'?'Sign In':'Create Account'}
          </button>

          <button onClick={handleGoogleAuth} disabled={authBusy} style={{ width:"100%", background:"#fff", color:"#1C1917", border:"1px solid #D1D5DB", padding:12, borderRadius:12, fontWeight:600, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" height="18" alt="G" />
            {loginTab==='login'?'Sign In with Google':'Register with Google'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom:100, background:"#FDFBF7", minHeight:"100vh" }}>
      {/* Dashboard Header */}
      <div style={{ background:"#78350F", padding:"50px 16px 20px", color:"#fff" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:20, fontWeight:800, fontFamily:"'Playfair Display',serif" }}>Manager Dashboard</div>
            <div style={{ fontSize:12, opacity:0.7 }}>Logged in as {user.email}</div>
          </div>
          <button onClick={logout} style={{ background:"rgba(255,255,255,0.1)", border:"none", padding:"8px 12px", borderRadius:10, color:"#fff", fontSize:12, fontWeight:600, cursor:"pointer" }}>
            Logout
          </button>
        </div>
      </div>

      <div style={{ padding:16 }}>
        {/* Boost / Featured Status */}
        <div style={{ background:"#fff", borderRadius:16, padding:16, marginBottom:16, border:"1px solid #FEF3C7", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize:14, fontWeight:700, display:"flex", alignItems:"center", gap:5 }}>
              <Zap size={16} color={form.boosted ? "#D97706" : form.boostRequested ? "#3B82F6" : "#A8A29E"} fill={form.boosted ? "#D97706" : "none"} />
              Boost Status: <span style={{ color: form.boosted ? "#16A34A" : form.boostRequested ? "#3B82F6" : "#A8A29E" }}>
                {form.boosted ? "ACTIVE" : form.boostRequested ? "PENDING APPROVAL" : "Standard"}
              </span>
            </div>
            <div style={{ fontSize:11, color:"#78716C", marginTop:2 }}>
              {form.boosted 
                ? "Your restaurant is featured at the top!" 
                : form.boostRequested 
                  ? "Admin is reviewing your boost request. Contact support for faster activation." 
                  : "Get featured at the top of search results for a small fee."}
            </div>
          </div>
          <div style={{ marginLeft: 12 }}>
            {!form.boosted && (
              <button 
                onClick={() => {
                  if (!form.boostRequested) {
                    setForm(p => ({ ...p, boostRequested: true }));
                    window.open(`https://wa.me/256700000000?text=I%20want%20to%20boost%20my%20restaurant:%20${form.name}`, '_blank');
                  }
                }}
                disabled={form.boostRequested}
                style={{ 
                  background: form.boostRequested ? "#F3F4F6" : "#78350F", 
                  color: form.boostRequested ? "#9CA3AF" : "#fff",
                  border: "none", borderRadius:10, padding:"8px 16px", fontSize:12, fontWeight:700, cursor: form.boostRequested ? "default" : "pointer"
                }}
              >
                {form.boostRequested ? "Requested" : "🚀 Boost Now"}
              </button>
            )}
            {form.boosted && (
              <div style={{ fontSize:10, color:"#16A34A", fontWeight:800 }}>⭐ LIVE</div>
            )}
          </div>
        </div>

        {/* Media Section (Profile / Cover) */}
        <div style={{ background:"#fff", borderRadius:16, padding:16, marginBottom:16, boxShadow:"0 2px 8px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>Photos & Branding</div>
          
          <div style={{ display:"flex", gap:12 }}>
            {/* Profile Pic */}
            <div style={{ flex:1 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#78716C", marginBottom:6 }}>LOGO / PROFILE</label>
              <div style={{ position:"relative", width:80, height:80, background:"#F3F4F6", borderRadius:20, overflow:"hidden", border:"2px dashed #D1D5DB" }}>
                {form.profilePic ? (
                  <img src={form.profilePic} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="profile" />
                ) : (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#9CA3AF" }}><Camera size={24}/></div>
                )}
                <input type="file" onChange={e => handleFileUpload(e, 'profile')} style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer" }} />
                {uploadProgress.profile && <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,0.8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10 }}>...</div>}
              </div>
            </div>

            {/* Cover Photo */}
            <div style={{ flex:2 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#78716C", marginBottom:6 }}>COVER PHOTO</label>
              <div style={{ position:"relative", height:80, background:"#F3F4F6", borderRadius:20, overflow:"hidden", border:"2px dashed #D1D5DB" }}>
                {form.coverPhoto ? (
                  <img src={form.coverPhoto} style={{ width:"100%", height:"100%", objectFit:"cover" }} alt="cover" />
                ) : (
                  <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", color:"#9CA3AF" }}><Upload size={24}/></div>
                )}
                <input type="file" onChange={e => handleFileUpload(e, 'cover')} style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer" }} />
                {uploadProgress.cover && <div style={{ position:"absolute", inset:0, background:"rgba(255,255,255,0.8)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10 }}>...</div>}
              </div>
            </div>
          </div>
        </div>

        {/* Basic Info */}
        <div style={{ background:"#fff", borderRadius:16, padding:16, marginBottom:16 }}>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:12 }}>Restaurant Details</div>
          <input value={form.name} onChange={e => setForm(p=>({...p, name:e.target.value}))} placeholder="Restaurant Name" style={{ width:"100%", padding:12, borderRadius:10, border:"1px solid #E5E7EB", marginBottom:10 }} />
          
          <div style={{ display:"flex", gap:10, marginBottom:10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#78716C", marginBottom:4 }}>DISTRICT</label>
              <select value={form.city} onChange={e => setForm(p=>({...p, city:e.target.value}))} style={{ width:"100%", padding:12, borderRadius:10, border:"1px solid #E5E7EB" }}>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#78716C", marginBottom:4 }}>PHONE</label>
              <input value={form.phone} onChange={e => setForm(p=>({...p, phone:e.target.value}))} placeholder="Phone Number" style={{ width:"100%", padding:12, borderRadius:10, border:"1px solid #E5E7EB" }} />
            </div>
          </div>

          <div style={{ display:"flex", gap:10, marginBottom:10 }}>
            <div style={{ flex:1 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#78716C", marginBottom:4 }}>OPENING TIME</label>
              <input type="time" value={form.openTime} onChange={e => setForm(p=>({...p, openTime:e.target.value}))} style={{ width:"100%", padding:12, borderRadius:10, border:"1px solid #E5E7EB" }} />
            </div>
            <div style={{ flex:1 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:600, color:"#78716C", marginBottom:4 }}>CLOSING TIME</label>
              <input type="time" value={form.closeTime} onChange={e => setForm(p=>({...p, closeTime:e.target.value}))} style={{ width:"100%", padding:12, borderRadius:10, border:"1px solid #E5E7EB" }} />
            </div>
          </div>

          <div style={{ display:"flex", gap:6 }}>
            <input value={form.address} onChange={e => setForm(p=>({...p, address:e.target.value}))} placeholder="Street Address / Location" style={{ flex:1, padding:12, borderRadius:10, border:"1px solid #E5E7EB" }} />
            <button onClick={handleGeocode} style={{ padding:"0 12px", background:"#FEF3C7", border:"none", borderRadius:10, color:"#78350F", fontWeight:700, fontSize:12 }}>Sync Map</button>
          </div>
        </div>

        {/* Map */}
        <div style={{ background:"#fff", borderRadius:16, padding:12, marginBottom:16 }}>
          <div style={{ fontSize:13, fontWeight:600, color:"#78716C", marginBottom:8 }}>PIN YOUR EXACT LOCATION</div>
          <OwnerMap initialLat={form.lat} initialLng={form.lng} onPinChange={({lat, lng}) => setForm(p=>({...p, lat, lng}))} />
        </div>

        {/* Menu Editor */}
        <div style={{ background:"#fff", borderRadius:16, padding:16, marginBottom:16 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:15, fontWeight:700 }}>Menu & Pricing</div>
            <button onClick={addSection} style={{ background:"#FEF3C7", border:"none", borderRadius:8, padding:"4px 10px", fontSize:11, fontWeight:700, color:"#78350F" }}>+ Section</button>
          </div>

          {form.menu.map((sec, si) => (
            <div key={si} style={{ marginBottom:20, borderBottom:"1px solid #F3F4F6", pb:12 }}>
              <input value={sec.category} onChange={e => {
                const newMenu = [...form.menu];
                newMenu[si].category = e.target.value;
                setForm(p=>({...p, menu: newMenu}));
              }} style={{ fontWeight:700, border:"none", fontSize:14, color:"#78350F", width:"100%", marginBottom:8 }} />
              
              {sec.items.map((it, ii) => (
                <div key={ii} style={{ display:"flex", gap:8, alignItems:"center", marginBottom:8 }}>
                  {/* Item Image Upload */}
                  <div style={{ position:"relative", width:40, height:40, background:"#F3F4F6", borderRadius:8, overflow:"hidden", flexShrink:0 }}>
                    {it.image ? <img src={it.image} style={{width:"100%", height:"100%", objectFit:"cover"}} alt="item"/> : <Camera size={16} style={{margin:"12px", color:"#9CA3AF"}}/>}
                    <input type="file" onChange={e => handleFileUpload(e, 'menu', si, ii)} style={{ position:"absolute", inset:0, opacity:0, cursor:"pointer" }} />
                  </div>

                  <input value={it.name} onChange={e => {
                    const newMenu = [...form.menu];
                    newMenu[si].items[ii].name = e.target.value;
                    setForm(p=>({...p, menu: newMenu}));
                  }} placeholder="Item name" style={{ flex:2, padding:8, borderRadius:8, border:"1px solid #E5E7EB", fontSize:12 }} />
                  
                  <input value={it.price} onChange={e => {
                    const newMenu = [...form.menu];
                    newMenu[si].items[ii].price = e.target.value;
                    setForm(p=>({...p, menu: newMenu}));
                  }} placeholder="Price" style={{ flex:1, padding:8, borderRadius:8, border:"1px solid #E5E7EB", fontSize:12 }} />
                  
                  <button onClick={() => {
                    const newMenu = [...form.menu];
                    newMenu[si].items.splice(ii, 1);
                    setForm(p=>({...p, menu: newMenu}));
                  }} style={{ background:"none", border:"none", color:"#EF4444" }}><Minus size={16}/></button>
                </div>
              ))}
              <button onClick={() => addItem(si)} style={{ background:"none", border:"none", fontSize:11, color:"#D97706", fontWeight:600 }}>+ Add Item</button>
            </div>
          ))}
        </div>

        {/* Save Button */}
        <button 
          onClick={handleSave} 
          disabled={saveBusy}
          style={{ 
            width:"100%", background:"#16A34A", color:"#fff", border:"none", 
            padding:16, borderRadius:16, fontWeight:800, fontSize:16, 
            boxShadow:"0 10px 20px rgba(22,163,74,0.2)", cursor:"pointer" 
          }}
        >
          {saveBusy ? "SAVING..." : "SAVE ALL CHANGES"}
        </button>
      </div>
    </div>
  );
}
