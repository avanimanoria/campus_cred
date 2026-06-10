"use client";

import { useState } from "react";
import { signInWithGoogle } from "@/firebase/client";
import { useRouter } from "next/navigation";

const ROLES: { key: string; title: string; desc: string }[] = [
  { key: "hod", title: "Head of Department", desc: "Manage events, approvals, and student progress across the department" },
  { key: "proctor", title: "Proctor", desc: "Track student participation and manage activity categories" },
  { key: "faculty", title: "Faculty", desc: "Create and manage events for students" },
  { key: "student", title: "Student", desc: "Track your activity points and registered events" },
];

export default function SignupLanding() {
  const [loadingRole, setLoadingRole] = useState<string | null>(null);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleRoleClick(roleKey: string) {
    setError("");
    setLoadingRole(roleKey);
    try {
      await signInWithGoogle(roleKey);
      // On success, navigate to the home dashboard which renders `components/home.tsx`
      router.push("/");
    } catch (err: any) {
      setError(err?.message || "Sign-in failed");
      setLoadingRole(null);
    }
  }

  return (
    <main className="min-h-screen bg-white text-black flex flex-col items-center py-12">
      <div className="max-w-5xl w-full px-6">
        <h1 className="mb-6 text-6xl font-light italic text-center bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] bg-clip-text text-transparent" style={{ fontFamily: 'var(--font-playfair)', letterSpacing: '0.05em' }}>CampusCred</h1>
        <p className="mb-10 text-center text-lg text-[var(--brand-muted)] font-light">A comprehensive platform for managing and tracking student activity points across multiple roles</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {ROLES.map((r) => (
            <button
              key={r.key}
              onClick={() => handleRoleClick(r.key)}
              className={`group relative block w-full text-left rounded-2xl p-6 transition-shadow hover:shadow-lg focus:outline-none ${loadingRole === r.key ? "opacity-80" : ""}`}
            >
              <div className="rounded-2xl bg-gradient-to-br from-[var(--brand-blue-soft)] to-[#e0e8ff] border-2 border-[var(--brand-border)] p-6 text-black">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--brand-blue)]">{r.title}</h3>
                    <p className="mt-2 text-sm text-[var(--brand-muted)]">{r.desc}</p>
                  </div>
                  <div className="ml-4 flex items-center">
                    <span className="inline-block rounded-full bg-[var(--brand-blue)] px-3 py-1 text-sm text-white font-semibold">Access Dashboard</span>
                  </div>
                </div>
              </div>
              {loadingRole === r.key && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl">
                  <div className="animate-pulse px-4 py-2 rounded bg-white/10">Signing in…</div>
                </div>
              )}
            </button>
          ))}
        </div>

        {error && <p className="mt-6 text-center text-red-400">{error}</p>}

        <section className="mt-12">
          <h2 className="text-xl mb-4 text-black font-bold">Key Features</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-blue-soft)] p-4 text-black">
              <div className="font-semibold text-[var(--brand-blue)]">Track Progress</div>
              <span className="text-sm text-[var(--brand-muted)]">Monitor student activity points and progress across different categories</span>
            </div>
            <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-blue-soft)] p-4 text-black">
              <div className="font-semibold text-[var(--brand-blue)]">Multi-Role Support</div>
              <span className="text-sm text-[var(--brand-muted)]">Different dashboards for HoD, Faculty, Proctor, and Students</span>
            </div>
            <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-blue-soft)] p-4 text-black">
              <div className="font-semibold text-[var(--brand-blue)]">Activity Categories</div>
              <span className="text-sm text-[var(--brand-muted)]">10 major categories with detailed sub-activities and point values</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
