// This file assumes the Firebase v8 SDK is loaded via script tags in index.html
declare var firebase: any;

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA8bWJ0RPlhWyJPiWA6Qc9huE9EkFmzKZM",
  authDomain: "tappxi-21346.firebaseapp.com",
  projectId: "tappxi-21346",
  storageBucket: "tappxi-21346.firebasestorage.app",
  messagingSenderId: "673476741503",
  appId: "1:673476741503:web:3a5889a3ae8ebd6e34b24a",
  measurementId: "G-D9B359QTKC"
};

// Initialize Firebase if it hasn't been initialized yet
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Export the firestore database instance, which is what the API service needs
export const db = firebase.firestore();