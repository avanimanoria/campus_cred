'use client'
import { useEffect, useState } from "react";
import { auth, onAuthStateChanged, signOut } from "@/firebase/client";
import { useUserRole } from "@/firebase/hooks";
import { getNotifications, markNotificationRead } from "@/lib/api";
import { useRouter } from "next/navigation";

type HeaderProps = {
  role?: string;
};

export default function Header({ role = "Student" }: HeaderProps) {
  const { role: mappedRole, loading } = useUserRole();
  const effectiveRole = mappedRole || role;
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [uid, setUid] = useState<string | undefined>(undefined);
  const [user, setUser] = useState<any>(null);
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();

  const displayName =
    user?.displayName ||
    (user?.email ? user.email.split("@")[0] : "");

  useEffect(() => {
    const u = auth.currentUser;
    if (u) {
      setUid(u.uid);
      setUser(u);
      if (mappedRole) {
        localStorage.setItem("userRole", mappedRole);
      }
      if (u.email) {
        localStorage.setItem("userEmail", u.email);
      }
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      setUid(user?.uid);
      setUser(user);
      if (user?.email) {
        localStorage.setItem("userEmail", user.email);
      }
    });
    return () => unsub();
  }, [mappedRole]);

  useEffect(() => {
    if (!open) return;
    // fetch notifications when dropdown opens
    (async () => {
      try {
        const data = await getNotifications(uid, mappedRole || "student");
        // assume data is array
        setNotifications(Array.isArray(data) ? data : []);
      } catch (e: any) {
        console.error("Failed to fetch notifications", e);
      }
    })();
  }, [open, uid, mappedRole]);

  async function handleMarkRead(id: string) {
    try {
      await markNotificationRead(uid, mappedRole || "student", id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  }

  async function handleSignOut() {
    try {
      setSigningOut(true);
      await signOut(auth);
      setProfileOpen(false);
      router.push("/signup");
    } catch (e) {
      console.error("Sign out failed:", e);
      setSigningOut(false);
    }
  }

  function handleSignIn() {
    setProfileOpen(false);
    router.push("/signin");
  }

  return (
    <>
      {signingOut && (
        <div className="fixed inset-0 z-[10000] bg-white" />
      )}
      <header className="relative z-[100] flex items-center justify-between rounded-2xl border border-[var(--brand-border)] bg-white px-10 py-8 shadow-md shadow-black/10">
      <h1 className="flex items-baseline gap-3 text-5xl font-serif italic">
        <span className="font-light text-black">Welcome</span>
        {displayName && (
          <span className="font-semibold text-[var(--brand-blue)]">{displayName}</span>
        )}
      </h1>

      <div className="flex items-center gap-4 relative z-[100]">
        {!loading && effectiveRole === "Student" && (
          <button className="rounded-lg bg-[var(--brand-blue)] px-6 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--brand-blue-dark)]">
            Generate Report
          </button>
        )}

        {/* Notification button */}
        <div className="relative z-[9999]">
          <button
            onClick={() => setOpen((s) => !s)}
            aria-label="Notifications"
            className="relative flex h-12 w-12 items-center justify-center rounded-full border border-[var(--brand-border)] bg-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6 text-[var(--brand-blue)]" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118.6 14.6V11a6 6 0 10-12 0v3c0 .538-.214 1.055-.595 1.435L4 17h5m6 0a3 3 0 11-6 0h6z" />
            </svg>
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--brand-blue)] text-xs text-white">{notifications.length}</span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-96 max-h-[500px] overflow-y-auto rounded-xl border-2 border-[var(--brand-border)] bg-white shadow-2xl z-[9999]">
              <div className="sticky top-0 flex items-center justify-between border-b border-[var(--brand-border)] bg-[var(--brand-blue-soft)] px-6 py-4">
                <h3 className="text-lg font-bold text-black">Notifications</h3>
                <button 
                  className="text-sm font-semibold text-[var(--brand-blue)] transition hover:text-[var(--brand-blue-dark)]" 
                  onClick={() => setNotifications([])}
                >
                  Clear All
                </button>
              </div>
              {notifications.length === 0 && (
                <div className="flex flex-col items-center justify-center gap-3 py-12 px-4">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-12 w-12 text-[var(--brand-border)]" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118.6 14.6V11a6 6 0 10-12 0v3c0 .538-.214 1.055-.595 1.435L4 17h5m6 0a3 3 0 11-6 0h6z" />
                  </svg>
                  <p className="text-center text-sm text-[var(--brand-muted)]">No notifications yet</p>
                </div>
              )}
              <div className="divide-y divide-[var(--brand-border)]">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start justify-between gap-3 border-b border-[var(--brand-border)] bg-white p-4 transition hover:bg-[var(--brand-blue-soft)]">
                    <div className="flex-1">
                      <div className="font-semibold text-black">{n.title || "Notification"}</div>
                      <div className="mt-1 text-sm text-[var(--brand-muted)]">{n.body || n.message || ""}</div>
                      {n.timestamp && <div className="mt-1 text-xs text-[var(--brand-border)]">{new Date(n.timestamp).toLocaleString()}</div>}
                    </div>
                    <button 
                      onClick={() => handleMarkRead(n.id)} 
                      className="ml-2 flex-shrink-0 rounded-lg bg-[var(--brand-blue)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--brand-blue-dark)]"
                    >
                      Dismiss
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profile button with dropdown */}
        <div className="relative z-[9999]">
          <button
            onClick={() => setProfileOpen((s) => !s)}
            aria-label="Profile"
            className="flex h-12 w-12 items-center justify-center rounded-full border border-[var(--brand-border)] bg-white transition-transform hover:scale-105"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              className="h-6 w-6 text-[var(--brand-blue)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="12" cy="9" r="3.5" />
              <path d="M5.5 19c0-3.038 3.038-5.5 6.5-5.5s6.5 2.462 6.5 5.5" />
            </svg>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-lg border border-[var(--brand-border)] bg-white p-3 text-sm text-black shadow-lg z-[9999]">
              {user ? (
                <>
                  <div className="mb-3 border-b border-gray-200 pb-3">
                    <div className="font-semibold">{user.displayName || "User"}</div>
                    <div className="text-xs text-[var(--brand-muted)]">{user.email}</div>
                    <div className="mt-1 inline-block rounded-full bg-[var(--brand-blue)] px-2 py-1 text-xs text-white">
                      {effectiveRole}
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="w-full rounded-md bg-[var(--brand-blue)] px-4 py-2 text-white transition-colors hover:bg-[var(--brand-blue-dark)]"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <div className="mb-3 text-center text-[var(--brand-muted)]">Not signed in</div>
                  <button
                    onClick={handleSignIn}
                    className="w-full rounded-md bg-[var(--brand-blue)] px-4 py-2 text-white transition-colors hover:bg-[var(--brand-blue-dark)]"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
    </>
  );
}