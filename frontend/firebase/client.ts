import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { collection, query, where, getDocs, limit } from "firebase/firestore";

// Firebase config copied from the other project (replace with env vars for production)
const firebaseConfig = {
  apiKey: "AIzaSyDTNrVrY4sNn6LpUV9-kJfd6t8Ms03v9MU",
  authDomain: "eventmanagement-tracker.firebaseapp.com",
  projectId: "eventmanagement-tracker",
  storageBucket: "eventmanagement-tracker.firebasestorage.app",
  messagingSenderId: "604001930407",
  appId: "1:604001930407:web:5dc6871b9397ebe68f9f82",
  measurementId: "G-7P86NT2DSN",
};

if (!getApps().length) {
  initializeApp(firebaseConfig);
}

const auth = getAuth();
const provider = new GoogleAuthProvider();
const db = getFirestore();

export async function signInWithGoogle(role: string) {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  const userRef = doc(db, "users", user.uid);

  // If there is no HOD yet in the system, enforce that the first
  // account to register must be HOD. This prevents arbitrary first
  // signups from creating non-HOD admin users.
  const hodQuery = query(collection(db, "users"), where("role", "==", "hod"), limit(1));
  const hodSnap = await getDocs(hodQuery);
  const hodExists = !hodSnap.empty;
  if (!hodExists && role !== "hod") {
    try {
      await signOut(auth);
    } catch (e) {}
    throw new Error("No HoD exists. The first account must register as 'hod'. Please sign in as HoD.");
  }

  // If the user is signing in as a student, proctor, or faculty, ensure their email is registered
  // by checking the backend database
  if (role === "student" || role === "proctor" || role === "faculty") {
    if (!user.email) {
      try {
        await signOut(auth);
      } catch (e) {}
      throw new Error("Unable to verify email.");
    }

    try {
      // Check if email is registered in the backend
      const response = await fetch(`http://localhost:5000/api/hod/check-email/${encodeURIComponent(user.email)}`);
      const data = await response.json();

      if (!data.registered) {
        try {
          await signOut(auth);
        } catch (e) {}
        throw new Error(data.message || "This email is not registered. Ask your HoD to add your email before signing up.");
      }
    } catch (error: any) {
      try {
        await signOut(auth);
      } catch (e) {}
      throw error;
    }
  }

  // Check existing role for this user (if any). If a role exists and
  // it doesn't match the requested role, prevent sign-in and sign the
  // user back out of Firebase Auth so the session isn't left open.
  const existing = await getDoc(userRef);
  if (existing.exists()) {
    const data = existing.data() as any;
    const existingRole = data?.role;
    if (existingRole && existingRole !== role) {
      // Sign the user out of the auth session we just created
      try {
        await signOut(auth);
      } catch (e) {
        // ignore signOut errors, we'll still prevent access
      }
      throw new Error(`This account is registered as '${existingRole}'. Please sign in as that role.`);
    }
  }

  // Either no existing role or the requested role matches the stored role.
  // Safe to write/merge the user document (sets role on first sign-up and
  // updates lastLogin on subsequent sign-ins).
  await setDoc(
    userRef,
    {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || "",
      role,
      photoURL: user.photoURL || "",
      lastLogin: serverTimestamp(),
    },
    { merge: true }
  );

  return user;
}

export { auth, provider, db, onAuthStateChanged, signOut, getDoc, doc };
