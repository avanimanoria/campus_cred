"use client";

import { useEffect, useState } from "react";
import Home from "@/components/home";
import { auth, onAuthStateChanged } from "@/firebase/client";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("/signup");
      } else {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!loading) return;
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 30;
      });
    }, 300);

    return () => clearInterval(interval);
  }, [loading]);

  return (
    <div className="relative min-h-screen w-full bg-white">
      {/* Content */}
      <div className="relative z-10">
        {loading ? (
          <div className="min-h-screen bg-white flex items-center justify-center relative overflow-hidden">
            <div className="fixed inset-0 bg-gradient-to-br from-white via-[var(--brand-blue-soft)] to-white"></div>
            <div className="relative z-10 text-center">
              <div className="mb-8">
                <div className="inline-block">
                  <div className="animate-spin h-16 w-16 border-4 border-[var(--brand-border)] border-t-[var(--brand-blue)] rounded-full"></div>
                </div>
              </div>
              <p className="text-[var(--brand-blue)] font-semibold text-lg">Loading...</p>
            </div>
            <div className="fixed bottom-8 right-8 text-right">
              <div className="text-6xl font-bold text-[var(--brand-blue)] opacity-30">
                {Math.round(progress)}%
              </div>
            </div>
          </div>
        ) : (
          <Home />
        )}
      </div>
    </div>
  );
}
