// =============================================================
// FILE: src/firebase.config.js
// =============================================================
// SETUP INSTRUCTIONS:
//   1. Go to https://console.firebase.google.com
//   2. Click "Create a project" → name it "nyamaconnect"
//   3. Enable Google Analytics when prompted (optional)
//   4. In the project dashboard, click the </> (Web) icon
//   5. Register your app (name it "nyamaconnect-web")
//   6. Copy the firebaseConfig object below and replace the
//      placeholder values with YOUR actual keys.
//   7. Go to "Authentication" in the sidebar → "Get Started"
//      → Enable "Email/Password" and "Google" sign-in methods.
//   8. Go to "Firestore Database" → "Create database"
//      → Choose "Start in production mode" → select a region
//      (e.g., europe-west1 is closest to East Africa).
//   9. Go to Firestore → "Rules" tab and paste the rules
//      from the SECURITY RULES section below.
//  10. Go to "Storage" → "Get Started" → "Next" → "Done"
//      → Go to the "Rules" tab and paste the STORAGE RULES.
// =============================================================

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// ─── REPLACE THESE VALUES WITH YOUR OWN FROM FIREBASE CONSOLE ─
const firebaseConfig = {
  apiKey: "AIzaSyDas_aU090N7Ni3DNnLrpumYrETiVb5fys",
  authDomain: "nyamaconnect-web-4d32c.firebaseapp.com",
  projectId: "nyamaconnect-web-4d32c",
  storageBucket: "nyamaconnect-web-4d32c.firebasestorage.app",
  messagingSenderId: "1083779940428",
  appId: "1:1083779940428:web:9368aa7082f013d63d74e9",
  measurementId: "G-KMN1KNWE24"
};
// ─────────────────────────────────────────────────────────────

const app   = initializeApp(firebaseConfig);
export const db      = getFirestore(app);
export const auth    = getAuth(app);
export default app;


// =============================================================
// FIRESTORE SECURITY RULES
// =============================================================
// Paste these into Firebase Console → Firestore → Rules tab.
// They enforce:
//   • Anyone can READ restaurants / bookings (public browse).
//   • Only authenticated owners can WRITE their own restaurant.
//   • Only authenticated users can CREATE bookings.
//   • Owners can read bookings only for their own restaurant.
// =============================================================
/*
rules_version = '2';
service cloud.firestore {
  match /databases/(default)/documents {

    // ── restaurants collection ──
    match /restaurants/{restaurantId} {
      allow read: if true;

      // only the owner (matched by uid stored in the doc) can update
      allow create: if request.auth != null
                     && request.resource.data.ownerId == request.auth.uid;
      allow update: if request.auth != null
                     && resource.data.ownerId == request.auth.uid;
      allow delete: if request.auth != null
                     && resource.data.ownerId == request.auth.uid;
    }

    // ── bookings collection ──
    match /bookings/{bookingId} {
      // owner of the restaurant can read bookings for their place
      allow read: if request.auth != null
                   && resource.data.restaurantOwnerId == request.auth.uid;
      // any authenticated user can create a booking
      allow create: if request.auth != null;
      allow update: if request.auth != null
                     && resource.data.restaurantOwnerId == request.auth.uid;
      allow delete: if false;
    }

    // ── users collection (profile data) ──
    match /users/{userId} {
      allow read:  if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
*/

// =============================================================
// STORAGE SECURITY RULES (UNUSED - Moved to Cloudinary)
// =============================================================
/*
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /restaurants/{ownerId}/{allPaths=**} {
      // anyone can view images
      allow read: if true;
      // only the specific owner can upload/delete their images
      allow write: if request.auth != null && request.auth.uid == ownerId;
    }
  }
}
*/
