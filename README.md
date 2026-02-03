# NyamaConnect — Uganda's Restaurant Hub

A production-ready, mobile-first full-stack web app that connects Ugandan diners with restaurants. Real Firebase Auth, real Firestore database, real browser GPS geolocation, and real Leaflet maps. Zero simulations.

---

## Architecture at a glance

```
src/
├── firebase.config.js          ← Firebase SDK initialisation + Firestore rules (comments)
├── index.js                    ← React entry point
├── App.js                      ← Root router, cart state, toast, bottom nav
├── context/
│   └── AuthContext.js          ← Firebase Auth + Firestore user profiles
├── hooks/
│   └── useGeolocation.js       ← Browser Geolocation API + Haversine distance
├── utils/
│   └── firestoreService.js     ← All Firestore CRUD (restaurants & bookings)
├── components/
│   ├── MapComponents.js        ← Leaflet DinerMap + OwnerMap (draggable pin)
│   └── BookingModal.js         ← Bottom-sheet booking form → real Firestore write
└── pages/
    |- HomePage.js              ← Browse, filter, GPS sort, map, restaurant cards
    ├── DetailPage.js           ← Full menu, tel: call link, Google Maps directions
    └── DashboardPage.js        ← Owner login/register, restaurant editor, menu editor, map pin
```

---

## 1. Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| npm | 9+ |
| A Google account | (for Firebase Console) |

---

## 2. Create your Firebase project

1. Open **https://console.firebase.google.com**
2. Click **Create a project** → name it `nyamaconnect` (or anything you like)
3. Accept Google Analytics prompt (optional)
4. In the project dashboard click the **`</>`** (Web) icon
5. Register the app — name it `nyamaconnect-web`
6. Copy the `firebaseConfig` object — you will paste it into `src/firebase.config.js` in the next step

### Enable Authentication providers

1. Left sidebar → **Authentication** → **Get started**
2. Click **Email/Password** → toggle **Enabled** → Save
3. Click **Google** → toggle **Enabled** → pick a support email → Save

### Create Firestore database

1. Left sidebar → **Firestore Database** → **Create database**
2. Choose **Start in production mode**
3. Select region **europe-west1** (closest to East Africa)
4. Wait for provisioning

### Deploy Security Rules

1. Left sidebar → **Firestore Database** → **Rules** tab
2. Replace the default rules with the rules block printed inside `src/firebase.config.js` (scroll to the bottom of that file — they are in a block comment)
3. Click **Publish**

---

## 3. Configure the app

Open **`src/firebase.config.js`** and replace the placeholder strings:

```js
const firebaseConfig = {
  apiKey:            "AIza…",              // ← paste yours
  authDomain:        "nyamaconnect-xxxxx.firebaseapp.com",
  projectId:         "nyamaconnect-xxxxx",
  storageBucket:     "nyamaconnect-xxxxx.firebasestorage.app",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc…"
};
```

---

## 4. Install & run locally

```bash
cd nyamaconnect
npm install
npm start          # opens http://localhost:3000
```

---

## 5. Seed sample data (optional)

Firestore starts empty. To populate it with sample restaurants you can run the small helper below in the browser console (after logging in as an owner) or write a one-off Node script. Here is a quick example of one restaurant document you can paste into the **Firestore Emulator** or the **Console → Add document** UI:

```
Collection: restaurants
Document ID: (auto-generate)

Fields:
  ownerId:     "paste-a-real-uid-here"
  name:        "Mama Mira's Kitchen"
  city:        "Kampala"
  categories:  ["local", "matooke", "luwombo"]
  address:     "Kabalagala, Kampala"
  lat:         0.3103
  lng:         32.5816
  phone:       "+256 701 234567"
  openTime:    "07:00"
  closeTime:   "22:00"
  emoji:       "🏠"
  verified:    true
  featured:    true
  rating:      4.8
  reviewCount: 234
  menu: [
    {
      category: "Matooke & Sauces",
      items: [
        { name: "Matooke w/ Groundnut Sauce", price: 8500, popular: true },
        { name: "Matooke w/ Beef Stew",       price: 12000 },
        { name: "Matooke w/ Beans",           price: 6500 }
      ]
    },
    {
      category: "Luwombo",
      items: [
        { name: "Beef Luwombo",    price: 15000, popular: true },
        { name: "Chicken Luwombo", price: 14000 },
        { name: "Fish Luwombo",    price: 16000 }
      ]
    }
  ]
```

Repeat for as many restaurants as you like.

---

## 6. Deploy to Vercel (free)

1. Push the project to a **GitHub** repo
2. Go to **https://vercel.com** → **New Project** → import the repo
3. Framework preset: **Create React App**
4. Click **Deploy** — Vercel auto-detects `package.json` and runs `npm run build`
5. Your app is live at `https://your-project.vercel.app` with free SSL

> **Note:** Firebase SDK calls go directly from the browser to Firebase — no server-side code is needed, so Vercel's free tier is sufficient.

---

## 7. How each "real" integration works

| Feature | How it works |
|---|---|
| **Authentication** | `firebase/auth` — `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`, `signInWithPopup` (Google). Session persists across reloads via `onAuthStateChanged`. |
| **User profiles** | Written to `/users/{uid}` in Firestore on first sign-up. Read back on every auth state change. |
| **Restaurant CRUD** | `firestoreService.js` wraps `addDoc / updateDoc / getDocs`. Security rules ensure only the owner (matched by `ownerId == request.auth.uid`) can write. |
| **Bookings** | `createBooking()` writes to `/bookings/{autoId}`. The doc stores `restaurantOwnerId` so the owner's security rule grants them read access. The Firestore auto-generated ID is shown to the diner as the reference code. |
| **Geolocation** | `navigator.geolocation.getCurrentPosition()` — real GPS on mobile, Wi-Fi/cell on desktop. Permission is requested once; the browser caches the decision. |
| **Distance sorting** | Haversine formula in `useGeolocation.js` computes the great-circle distance (km) between the user's real coordinates and each restaurant's stored `lat/lng`. |
| **Maps** | Leaflet + OpenStreetMap tiles (no API key). `DinerMap` shows all restaurants + user pin. `OwnerMap` has a draggable green marker; drag-end or click fires `onPinChange` with real coordinates. |
| **Call button** | Renders an `<a href="tel:+256…">` — tapping it on Android/iOS initiates a real phone call. |
| **Directions button** | Opens `https://www.google.com/maps/dir/?api=1&destination={lat},{lng}` in a new tab — works on any device with Google Maps installed. |

---

## 8. Monetisation touchpoints (already wired in)

| Stream | Where in code |
|---|---|
| Featured listings | `featured: true` flag on restaurant doc; HomePage sorts featured first |
| Booking commission | 500 UGX service-fee notice shown in BookingModal before submit |
| Verified badge | `verified: true` flag; green badge rendered on cards and detail page |
| Premium analytics | Placeholder in DashboardPage (extend with Firestore aggregation queries) |

---

## License

MIT — use, modify, deploy freely.
