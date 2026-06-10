import { auth } from "@/firebase/client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api";

async function fetchWithAuth(path: string, opts: RequestInit = {}, uid?: string, role?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers as Record<string, string>),
  };

  // For staff roles, use numeric ID; for student role, use email prefix or uid
  if (uid) {
    if (role?.toLowerCase() === "student") {
      headers["x-user-id"] = uid; // uid is email prefix for students
    } else {
      headers["x-user-id"] = "1"; // Default numeric ID for staff
    }
  }
  if (role) headers["x-user-role"] = role;

  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    ...opts,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  // Try JSON, otherwise return text
  const type = res.headers.get("content-type") || "";
  if (type.includes("application/json")) return res.json();
  return res.text();
}

export async function getNotifications(uid?: string, role?: string) {
  return fetchWithAuth(`/students/notifications`, { method: "GET" }, uid, role);
}

export async function markNotificationRead(uid?: string, role?: string, id?: string) {
  if (!id) throw new Error("Missing notification id");
  return fetchWithAuth(`/students/notifications/${id}/read`, { method: "PATCH" }, uid, role);
}

export default { getNotifications, markNotificationRead };
