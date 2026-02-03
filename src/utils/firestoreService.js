// =============================================================
// FILE: src/utils/firestoreService.js
// =============================================================
// All Firestore read / write operations live here.
// Components never import firebase directly — they call these.
//
// Collections layout:
//   /restaurants/{autoId}
//       ownerId        string   – Firebase Auth uid of the owner
//       name           string
//       city           string   – e.g. "Kampala"
//       categories     string[] – e.g. ["local","matooke"]
//       address        string
//       lat            number   – latitude  (from owner's map pin)
//       lng            number   – longitude
//       phone          string
//       openTime       string   – "HH:MM"
//       closeTime      string   – "HH:MM"
//       menu           array    – [{ category, items: [{ name, price }] }]
//       verified       boolean
//       featured       boolean
//       rating         number   – average (updated via trigger or client)
//       reviewCount    number
//       createdAt      timestamp
//
//   /bookings/{autoId}
//       restaurantId          string
//       restaurantOwnerId     string  – for security-rule read access
//       restaurantName        string  – denormalised for the diner's view
//       userName              string
//       userPhone             string
//       userId               string  – Auth uid (or null for anon)
//       date                  string  – "YYYY-MM-DD"
//       time                  string  – "HH:MM"
//       guests                number
//       type                  string  – "dine-in" | "pickup"
//       notes                 string
//       status                string  – "pending" | "confirmed" | "cancelled"
//       createdAt             timestamp
// =============================================================

import {
  collection, doc,
  addDoc, updateDoc,
  getDoc, getDocs,
  query, where, orderBy, limit,
  serverTimestamp,
  onSnapshot
} from "firebase/firestore";
import { db } from "../firebase.config.js";

// ─── FILE UPLOADS (Cloudinary) ─────────────────────────────

/**
 * Uploads a file to Cloudinary and returns the public URL.
 * Requires VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET 
 * in your .env file.
 */
export async function uploadImage(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "your_cloud_name";
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "your_unsigned_preset";

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Upload failed");
    }

    const data = await response.json();
    return data.secure_url;
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    throw err;
  }
}

// ─── RESTAURANTS ──────────────────────────────────────────

// Create a new restaurant (owner registration)
export async function createRestaurant(data, ownerId) {
  const ref = await addDoc(collection(db, "restaurants"), {
    ...data,
    ownerId,
    verified:    false,
    featured:    false,
    boosted:     false,
    rating:      0,
    reviewCount: 0,
    createdAt:   serverTimestamp()
  });
  return ref.id;   // the new document ID
}

// Update an existing restaurant doc (owner edits)
export async function updateRestaurant(restaurantId, data) {
  await updateDoc(doc(db, "restaurants", restaurantId), {
    ...data,
    updatedAt: serverTimestamp()
  });
}

// Fetch ONE restaurant by ID
export async function getRestaurant(restaurantId) {
  const snap = await getDoc(doc(db, "restaurants", restaurantId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// Fetch ALL restaurants (optionally filtered by city)
export async function getAllRestaurants(city = null) {
  let q = collection(db, "restaurants");
  if (city && city !== "All Cities") {
    q = query(q, where("city", "==", city));
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Fetch restaurants owned by a specific user
export async function getOwnerRestaurants(ownerId) {
  const q = query(
    collection(db, "restaurants"),
    where("ownerId", "==", ownerId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Fetch featured restaurants (for the hero banner)
export async function getFeaturedRestaurants(limit_ = 3) {
  const q = query(
    collection(db, "restaurants"),
    where("featured", "==", true),
    orderBy("rating", "desc"),
    limit(limit_)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─── BOOKINGS ─────────────────────────────────────────────

// Create a new booking
export async function createBooking(bookingData) {
  const ref = await addDoc(collection(db, "bookings"), {
    ...bookingData,
    status:    "pending",
    createdAt: serverTimestamp()
  });
  return ref.id;   // reference code for the diner
}

// Fetch all bookings for a specific restaurant (owner view)
export async function getRestaurantBookings(restaurantId) {
  const q = query(
    collection(db, "bookings"),
    where("restaurantId", "==", restaurantId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// Owner confirms or cancels a booking
export async function updateBookingStatus(bookingId, status) {
  await updateDoc(doc(db, "bookings", bookingId), {
    status,
    updatedAt: serverTimestamp()
  });
}

// ─── MESSAGING ──────────────────────────────────────────

/**
 * Sends a message in a chat thread.
 */
export async function sendMessage(restaurantId, senderId, senderName, text) {
  await addDoc(collection(db, "messages"), {
    restaurantId,
    senderId,
    senderName,
    text,
    createdAt: serverTimestamp()
  });
}

/**
 * Listens to live messages for a specific restaurant.
 */
export function listenToMessages(restaurantId, callback) {
  const q = query(
    collection(db, "messages"),
    where("restaurantId", "==", restaurantId),
    orderBy("createdAt", "asc")
  );
  return onSnapshot(q, (snap) => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(msgs);
  });
}
