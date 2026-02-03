// =============================================================
// FILE: src/App.js
// =============================================================
// Top-level router (simple state machine — no react-router
// dependency needed for this mobile SPA).
//
// Pages:   home | detail | dashboard
// Shared:  cart state, toast, bottom nav
// =============================================================

import { useState, useCallback } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import HomePage      from "./pages/HomePage";
import DetailPage    from "./pages/DetailPage";
import DashboardPage from "./pages/DashboardPage";
import BookingModal  from "./components/BookingModal";
import { Search, User } from "lucide-react";

// ... (existing Font/Leaflet injection) ...

function AppContent() {
  const { user } = useAuth();
  // ── routing ─────────────────────────────────────
  const [page,               setPage]               = useState("home");
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  // ... (existing state) ...
  const [cart,              setCart]              = useState({});
  const [cartRestaurantId,  setCartRestaurantId]  = useState(null);
  const [bookingOpen,          setBookingOpen]          = useState(false);
  const [bookingRestaurant,    setBookingRestaurant]    = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  }, []);

  // ── navigation helpers ──────────────────────────
  const goDetail = useCallback((restaurant) => {
    if (cartRestaurantId && cartRestaurantId !== restaurant.id) {
      setCart({});
      setCartRestaurantId(null);
    }
    setSelectedRestaurant(restaurant);
    setPage("detail");
  }, [cartRestaurantId]);

  const goHome = useCallback(() => {
    setPage("home");
    setSelectedRestaurant(null);
  }, []);

  const addToCart = useCallback((item, restaurantId) => {
    if (cartRestaurantId && cartRestaurantId !== restaurantId) {
      setCart({});
    }
    setCartRestaurantId(restaurantId);
    setCart((prev) => ({
      ...prev,
      [item.name]: prev[item.name]
        ? { ...prev[item.name], qty: prev[item.name].qty + 1 }
        : { ...item, qty: 1 }
    }));
  }, [cartRestaurantId]);

  const clearCart = useCallback(() => {
    setCart({});
    setCartRestaurantId(null);
  }, []);

  const openBooking = useCallback((restaurant) => {
    setBookingRestaurant(restaurant);
    setBookingOpen(true);
  }, []);

  const closeBooking = useCallback(() => {
    setBookingOpen(false);
    clearCart();
  }, [clearCart]);

  return (
    <div style={{ fontFamily:"'DM Sans', sans-serif", background:"#FFFBEB", minHeight:"100vh" }}>
      <div style={{ maxWidth:480, margin:"0 auto", position:"relative", minHeight:"100vh" }}>

        {page === "home" && (
          <HomePage
            onSelectRestaurant={goDetail}
            onBook={openBooking}
          />
        )}

        {page === "detail" && selectedRestaurant && (
          <DetailPage
            restaurant={selectedRestaurant}
            onBack={goHome}
            cart={cart}
            onAddToCart={(item) => addToCart(item, selectedRestaurant.id)}
            onOpenBooking={() => openBooking(selectedRestaurant)}
            currentUser={user}
          />
        )}

        {page === "dashboard" && (
          <DashboardPage
            onBack={goHome}
            showToast={showToast}
          />
        )}

        <nav style={{
          position:"fixed", bottom:0, left:"50%", transform:"translateX(-50%)",
          width:"100%", maxWidth:480, background:"#fff",
          borderTop:"1px solid #E7E5E4", display:"flex", zIndex:100,
          boxShadow:"0 -2px 10px rgba(0,0,0,0.06)"
        }}>
          {[
            { id:"home",      label:"Explore",  Icon: Search },
            { id:"dashboard", label:"Owner",    Icon: User   }
          ].map(({ id, label, Icon }) => (
            <div key={id}
              onClick={() => { if (id === "home") goHome(); else setPage(id); }}
              style={{ flex:1, padding:"10px 0 12px", textAlign:"center", cursor:"pointer" }}
            >
              <div style={{ display:"flex", justifyContent:"center", marginBottom:2 }}>
                <Icon size={20} color={page === id ? "#78350F" : "#A8A29E"} />
              </div>
              <div style={{ fontSize:10, color: page === id ? "#78350F" : "#A8A29E", fontWeight: page === id ? 700 : 500 }}>
                {label}
              </div>
            </div>
          ))}
        </nav>

        {bookingOpen && bookingRestaurant && (
          <BookingModal
            restaurant={bookingRestaurant}
            cart={cart}
            onClose={closeBooking}
          />
        )}

        {toast && (
          <div style={{
            position:"fixed", top:16, left:"50%", transform:"translateX(-50%)",
            background:"#78350F", color:"#fff", borderRadius:10, padding:"11px 18px",
            fontSize:13, fontWeight:500, zIndex:300, boxShadow:"0 8px 30px rgba(28,25,23,0.2)",
            display:"flex", alignItems:"center", gap:6, maxWidth:"90%", whiteSpace:"nowrap",
            animation:"toastIn 0.3s ease"
          }}>
            {toast}
          </div>
        )}
      </div>

      <style>{`
        @keyframes toastIn { from { top:-60px; opacity:0; } to { top:16px; opacity:1; } }
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        input:focus, select:focus { outline: none; border-color: #D97706 !important; }
      `}</style>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
