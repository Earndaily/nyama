// =============================================================
// FILE: src/components/BookingModal.js
// =============================================================
// • Renders as a bottom-sheet modal.
// • If cart items exist, shows a pre-order summary.
// • On submit: writes a real /bookings/{id} document to Firestore
//   with the authenticated user's uid, the restaurant's id and
//   ownerId (so the owner's security rule lets them read it).
// • On success: shows a confirmation card with the Firestore
//   doc ID as the booking reference — no fake IDs.
// =============================================================

import { useState } from "react";
import { Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createBooking } from "../utils/firestoreService";

export default function BookingModal({ restaurant, cart, onClose }) {
  const { user } = useAuth();

  const [form, setForm] = useState({
    name:   user?.displayName || "",
    phone:  "",
    date:   new Date().toISOString().split("T")[0],
    time:   "12:00",
    guests: "2",
    type:   "dine-in",
    notes:  ""
  });

  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);
  const [bookingId,  setBookingId]  = useState(null); // success state

  // cart totals
  const cartCount = Object.values(cart).reduce((s, i) => s + i.qty, 0);
  const cartTotal = Object.values(cart).reduce((s, i) => s + i.price * i.qty, 0);

  // ── submit → real Firestore write ─────────────────
  const handleSubmit = async () => {
    if (!form.name || !form.phone) {
      setError("Please fill in your name and phone number.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const id = await createBooking({
        restaurantId:         restaurant.id,
        restaurantOwnerId:    restaurant.ownerId,   // for security rules
        restaurantName:       restaurant.name,
        userName:             form.name,
        userPhone:            form.phone,
        userId:              user ? user.uid : null,
        date:                 form.date,
        time:                 form.time,
        guests:               parseInt(form.guests, 10),
        type:                 form.type,
        notes:                form.notes,
        preOrder:             cartCount > 0 ? Object.values(cart) : [],
        preOrderTotal:        cartTotal
      });
      setBookingId(id);   // triggers success screen
    } catch (err) {
      setError("Failed to submit booking: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── success screen ──────────────────────────────
  if (bookingId) {
    return (
      <div style={{ position:"fixed", inset:0, background:"rgba(28,25,23,0.55)", zIndex:250, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
        <div style={{ background:"#fff", borderRadius:20, padding:"28px 22px", textAlign:"center", maxWidth:340, width:"100%" }}>
          <div style={{ width:68, height:68, background:"#DCFCE7", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px" }}>
            <Check size={30} color="#16A34A"/>
          </div>
          <div style={{ fontSize:20, fontWeight:700, fontFamily:"'Playfair Display',serif", color:"#1C1917", marginBottom:4 }}>Booking Confirmed!</div>
          <div style={{ fontSize:13, color:"#78716C", marginBottom:14, lineHeight:1.5 }}>
            Your {form.type === "pickup" ? "pre-order" : "table"} at <strong>{restaurant.name}</strong> has been saved. They will contact you shortly.
          </div>
          <div style={{ background:"#FFFBEB", borderRadius:8, padding:"10px 14px", fontSize:12, color:"#57534E", marginBottom:16 }}>
            <span style={{ color:"#78350F", fontWeight:700 }}>Ref: NC-{bookingId.slice(-8).toUpperCase()}</span>
            <br/>{form.date} at {form.time}
            {cartCount > 0 && <><br/>Pre-order total: <strong>{cartTotal.toLocaleString()} UGX</strong></>}
          </div>
          <button onClick={onClose} style={{ width:"100%", background:"#78350F", color:"#fff", border:"none", borderRadius:10, padding:12, fontSize:14, fontWeight:600, cursor:"pointer" }}>
            Done
          </button>
        </div>
      </div>
    );
  }

  // ── booking form ────────────────────────────────
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(28,25,23,0.45)", zIndex:200, display:"flex", alignItems:"flex-end" }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background:"#fff", width:"100%", maxWidth:480, margin:"0 auto", borderRadius:"20px 20px 0 0", maxHeight:"90vh", overflowY:"auto", padding:"20px 16px 28px" }}>
        {/* handle */}
        <div style={{ width:36, height:4, background:"#E7E5E4", borderRadius:2, margin:"-12px auto 14px" }}/>

        <div style={{ fontSize:20, fontWeight:700, fontFamily:"'Playfair Display',serif", marginBottom:2 }}>
          📋 {cartCount > 0 ? "Pre-Order & Book" : "Book a Table"}
        </div>
        <div style={{ fontSize:13, color:"#A8A29E", marginBottom:18 }}>{restaurant.name} • {restaurant.city}</div>

        {/* pre-order summary */}
        {cartCount > 0 && (
          <div style={{ background:"#FEF3C7", borderRadius:10, padding:12, marginBottom:14 }}>
            <div style={{ fontSize:12, fontWeight:700, color:"#78350F", marginBottom:6 }}>🛒 Your Pre-Order</div>
            {Object.values(cart).map((item) => (
              <div key={item.name} style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#92400E", padding:"2px 0" }}>
                <span>{item.name} ×{item.qty}</span>
                <span style={{ fontWeight:600 }}>{(item.price * item.qty).toLocaleString()} UGX</span>
              </div>
            ))}
            <div style={{ borderTop:"1px solid #D97706", marginTop:6, paddingTop:6, display:"flex", justifyContent:"space-between", fontSize:13, fontWeight:700, color:"#78350F" }}>
              <span>Total</span><span>{cartTotal.toLocaleString()} UGX</span>
            </div>
          </div>
        )}

        {/* type selector */}
        <label style={{ display:"block", fontSize:13, fontWeight:600, color:"#57534E", marginBottom:6 }}>Pick Up or Dine In?</label>
        <div style={{ display:"flex", gap:8, marginBottom:14 }}>
          {["dine-in","pickup"].map((t) => (
            <div key={t}
              onClick={() => setForm(p => ({...p, type: t}))}
              style={{
                flex:1, border: form.type===t ? "1.5px solid #D97706" : "1.5px solid #E7E5E4",
                background: form.type===t ? "#FEF3C7" : "#fff",
                borderRadius:10, padding:10, textAlign:"center", cursor:"pointer", transition:"all 0.2s"
              }}
            >
              <div style={{ fontSize:20 }}>{t==="dine-in"?"🍽️":"🥡"}</div>
              <div style={{ fontSize:12, fontWeight:600, color: form.type===t ? "#78350F" : "#57534E" }}>
                {t==="dine-in" ? "Dine In" : "Pick Up"}
              </div>
            </div>
          ))}
        </div>

        {/* name + phone */}
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <div style={{ flex:1 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#57534E", marginBottom:4 }}>Name</label>
            <input value={form.name} onChange={e => setForm(p=>({...p,name:e.target.value}))} placeholder="John Doe"
              style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #E7E5E4", borderRadius:10, fontSize:14, outline:"none" }} />
          </div>
          <div style={{ flex:1 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#57534E", marginBottom:4 }}>Phone</label>
            <input value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))} placeholder="+256…" type="tel"
              style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #E7E5E4", borderRadius:10, fontSize:14, outline:"none" }} />
          </div>
        </div>

        {/* date + time */}
        <div style={{ display:"flex", gap:8, marginBottom:10 }}>
          <div style={{ flex:1 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#57534E", marginBottom:4 }}>Date</label>
            <input type="date" value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))}
              style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #E7E5E4", borderRadius:10, fontSize:14, outline:"none" }} />
          </div>
          <div style={{ flex:1 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#57534E", marginBottom:4 }}>Time</label>
            <input type="time" value={form.time} onChange={e => setForm(p=>({...p,time:e.target.value}))}
              style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #E7E5E4", borderRadius:10, fontSize:14, outline:"none" }} />
          </div>
        </div>

        {/* guests (dine-in only) */}
        {form.type === "dine-in" && (
          <div style={{ marginBottom:10 }}>
            <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#57534E", marginBottom:4 }}>Guests</label>
            <select value={form.guests} onChange={e => setForm(p=>({...p,guests:e.target.value}))}
              style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #E7E5E4", borderRadius:10, fontSize:14, outline:"none", background:"#fff" }}>
              {[1,2,3,4,5,6,8,10].map(n => <option key={n} value={n}>{n} guest{n>1?"s":""}</option>)}
            </select>
          </div>
        )}

        {/* notes */}
        <div style={{ marginBottom:12 }}>
          <label style={{ display:"block", fontSize:12, fontWeight:600, color:"#57534E", marginBottom:4 }}>Notes (optional)</label>
          <input value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} placeholder="e.g. window table, allergies…"
            style={{ width:"100%", padding:"10px 12px", border:"1.5px solid #E7E5E4", borderRadius:10, fontSize:14, outline:"none" }} />
        </div>

        {/* service fee notice */}
        <div style={{ background:"#F3F4F6", borderRadius:8, padding:"7px 10px", fontSize:11, color:"#6B7280", marginBottom:8, display:"flex", alignItems:"center", gap:5 }}>
          💳 A service fee of 500 UGX applies to confirmed bookings.
        </div>

        {/* error */}
        {error && <div style={{ background:"#FEE2E2", borderRadius:8, padding:"7px 10px", fontSize:12, color:"#991B1B", marginBottom:8 }}>⚠️ {error}</div>}

        {/* submit */}
        <button onClick={handleSubmit} disabled={submitting}
          style={{ width:"100%", background: submitting ? "#A8A29E" : "#78350F", color:"#fff", border:"none", borderRadius:12, padding:14, fontSize:15, fontWeight:600, cursor: submitting?"not-allowed":"pointer", transition:"background 0.2s" }}>
          {submitting ? "Saving…" : form.type==="pickup" ? "🥡 Confirm Pre-Order" : "🗓️ Confirm Booking"}
        </button>
        <button onClick={onClose} style={{ width:"100%", background:"transparent", color:"#A8A29E", border:"none", borderRadius:10, padding:10, fontSize:13, cursor:"pointer", marginTop:4 }}>Cancel</button>
      </div>
    </div>
  );
}
