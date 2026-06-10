"use client";

import { useEffect, useState } from "react";
import { auth, onAuthStateChanged, db, getDoc, doc } from "./client";

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          setRole(data?.role || null);
        } else {
          setRole(null);
        }
      } catch (e) {
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  return { role, loading };
}

export function mapRoleToTitle(role: string | null) {
  if (!role) return null;
  const r = role.toLowerCase();
  if (r === "hod") return "HOD";
  if (r === "proctor") return "Proctor";
  if (r === "faculty") return "Faculty";
  if (r === "student") return "Student";
  if (r === "superadmin") return "Superadmin";
  return role;
}
