/* ============================================================
   Mushroom Mandi — Firebase configuration (v2 upgrade)
   ============================================================
   v1 of this website stores all data in the browser (localStorage).
   That works perfectly for demo/testing within one browser.

   To make the marketplace REAL (seller submissions & admin approvals
   visible on every device), create a FREE Firebase project and paste
   your config below:

   1. Go to https://console.firebase.google.com
   2. "Add project" → name it e.g. "mushroom-mandi" (no card needed)
   3. Build → Firestore Database → Create database (start in test mode)
   4. Build → Storage → Get started
   5. Project settings (gear) → Your apps → Web app (</>) → register
   6. Copy the firebaseConfig object values into the template below
   7. Replace the placeholder values and remove the leading "// " comments

   Example (filled):
   window.MM = window.MM || {};
   MM.firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "mushroom-mandi.firebaseapp.com",
     projectId: "mushroom-mandi",
     storageBucket: "mushroom-mandi.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abc123"
   };

   While this file stays as-is (no real apiKey), the site runs in
   fast local mode. The data layer in js/data.js is already structured
   to switch to Firebase without any other changes.
   ============================================================ */
window.MM = window.MM || {};

// Uncomment and fill after creating your Firebase project:
// MM.firebaseConfig = {
//   apiKey: "PASTE_YOUR_API_KEY",
//   authDomain: "YOUR_PROJECT.firebaseapp.com",
//   projectId: "YOUR_PROJECT_ID",
//   storageBucket: "YOUR_PROJECT.appspot.com",
//   messagingSenderId: "SENDER_ID",
//   appId: "APP_ID"
// };
