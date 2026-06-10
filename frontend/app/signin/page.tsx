"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/firebase/client";
import { useRouter } from "next/navigation";

export default function SignInPage() {
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSignIn() {
    if (!role) {
      setError("Please select a role");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await signInWithGoogle(role);
      // after successful sign-in, navigate to home which renders `components/home.tsx`
      router.push("/");
    } catch (err: any) {
      setError(err?.message || "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-black">
      <div className="w-full max-w-md rounded-lg border-2 border-[var(--brand-border)] bg-[var(--brand-blue-soft)] p-8 shadow-lg">
        <h2 className="mb-6 text-2xl font-bold text-[var(--brand-blue)]">Sign in with Google</h2>

        <label className="block mb-2 text-sm font-semibold text-black">Select role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full mb-6 rounded-lg border border-[var(--brand-border)] bg-white p-3 text-black font-medium focus:outline-none focus:border-[var(--brand-blue)]"
        >
          <option value="student">Student</option>
          <option value="hod">Head of Department</option>
          <option value="proctor">Proctor</option>
          <option value="superadmin">Superadmin</option>
          <option value="faculty">Faculty</option>
        </select>

        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full rounded-lg bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] p-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Signing in…" : "Sign in with Google"}
        </button>

        {error && <p className="mt-4 text-sm text-red-600 font-medium">{error}</p>}
      </div>
    </div>
  );
}
