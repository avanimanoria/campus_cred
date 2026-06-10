"use client";

import { useState, useEffect } from "react";
import { useApiData } from "@/hooks/useApiData";
import { CreateCategoryModal } from "@/components/home/create-category-modal";
import toast from "react-hot-toast";
import { auth } from "@/firebase/client";

interface Student {
  user_id: number;
  name: string;
  email: string;
  semester?: number;
  dept_name?: string;
}

interface Event {
  event_id: number;
  title: string;
  description?: string;
  category: string;
  start_at?: string;
  status: string;
}

interface Category {
  category_id: number;
  name: string;
  max_points: number;
  status: string;
}

export function ProctorDashboard() {
  const [activeView, setActiveView] = useState<"students" | "events" | "categories">("students");
  const [students, setStudents] = useState<Student[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [semester, setSemester] = useState<number>(1);
  const [showCreateCategoryModal, setShowCreateCategoryModal] = useState(false);
  const api = useApiData();

  useEffect(() => {
    if (activeView === "students") loadStudents();
    if (activeView === "events") loadEvents();
    if (activeView === "categories") loadCategories();
  }, [activeView, semester]);

  async function loadStudents() {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const data = await api.get(`/proctor/${user.uid}/students?semester=${semester}`);
      setStudents(data.data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load students");
    }
  }

  async function loadEvents() {
    try {
      const data = await api.get("/events/approved");
      setEvents(data.data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load events");
    }
  }

  async function loadCategories() {
    try {
      const data = await api.get("/proctor/categories");
      // Filter to only show approved categories
      const approvedCategories = (data.data || []).filter((cat: Category) => cat.status === "approved");
      setCategories(approvedCategories);
    } catch (error: any) {
      toast.error(error.message || "Failed to load categories");
    }
  }

  return (
    <div className="space-y-6">
      {/* View Tabs */}
      <div className="flex gap-2 rounded-2xl bg-[var(--brand-blue-soft)] p-2">
        <button
          onClick={() => setActiveView("students")}
          className={`flex-1 rounded-xl px-6 py-3 font-semibold transition-all ${
            activeView === "students"
              ? "bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] text-white"
              : "text-black hover:bg-[var(--brand-border)]"
          }`}
        >
          👥 My Students
        </button>
        <button
          onClick={() => setActiveView("events")}
          className={`flex-1 rounded-xl px-6 py-3 font-semibold transition-all ${
            activeView === "events"
              ? "bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] text-white"
              : "text-black hover:bg-[var(--brand-border)]"
          }`}
        >
          📅 All Events
        </button>
        <button
          onClick={() => setActiveView("categories")}
          className={`flex-1 rounded-xl px-6 py-3 font-semibold transition-all ${
            activeView === "categories"
              ? "bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] text-white"
              : "text-black hover:bg-[var(--brand-border)]"
          }`}
        >
          📂 Categories
        </button>
      </div>

      {/* Students View */}
      {activeView === "students" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-black">
              My Students ({students.length})
            </h2>
            <select
              value={semester}
              onChange={(e) => setSemester(Number(e.target.value))}
              className="rounded-lg border border-[var(--brand-border)] bg-white px-4 py-2 text-black"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                <option key={sem} value={sem}>
                  Semester {sem}
                </option>
              ))}
            </select>
          </div>

          {api.loading && <div className="text-center text-[var(--brand-muted)]">Loading...</div>}
          {!api.loading && students.length === 0 && (
            <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-blue-soft)] p-8 text-center text-[var(--brand-muted)]">
              No students assigned to you for this semester
            </div>
          )}
          <div className="grid gap-4">
            {students.map((student) => (
              <div
                key={student.user_id}
                className="flex items-center justify-between rounded-lg border border-[var(--brand-border)] bg-white p-6"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)]">
                    <span className="text-xl font-bold text-white">
                      {student.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-black">{student.name}</h3>
                    <p className="text-sm text-[var(--brand-muted)]">{student.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  {student.dept_name && (
                    <p className="text-sm text-[var(--brand-blue)]">{student.dept_name}</p>
                  )}
                  {student.semester && (
                    <p className="text-xs text-[var(--brand-muted)]">Semester {student.semester}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events View */}
      {activeView === "events" && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-black">
            Approved Events ({events.length})
          </h2>
          {api.loading && <div className="text-center text-[var(--brand-muted)]">Loading...</div>}
          {!api.loading && events.length === 0 && (
            <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-blue-soft)] p-8 text-center text-[var(--brand-muted)]">
              No approved events available
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((event) => (
              <div key={event.event_id} className="rounded-lg border border-[var(--brand-border)] bg-white p-6">
                <h3 className="text-xl font-semibold text-black">{event.title}</h3>
                <p className="mt-2 text-sm text-[var(--brand-muted)]">{event.description}</p>
                <div className="mt-4 flex items-center gap-2">
                  <span className="rounded-full bg-[var(--brand-blue-soft)] px-3 py-1 text-sm text-[var(--brand-blue)]">
                    {event.category}
                  </span>
                  {event.start_at && (
                    <span className="text-xs text-[var(--brand-muted)]">
                      {new Date(event.start_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Categories View */}
      {activeView === "categories" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-black">
              Activity Categories ({categories.length})
            </h2>
            <button
              onClick={() => setShowCreateCategoryModal(true)}
              className="rounded-lg bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] px-6 py-2 font-semibold text-white transition hover:opacity-90"
            >
              + Add Category
            </button>
          </div>
          {api.loading && <div className="text-center text-[var(--brand-muted)]">Loading...</div>}
          {!api.loading && categories.length === 0 && (
            <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-blue-soft)] p-8 text-center text-[var(--brand-muted)]">
              No approved categories available. Submit a category for HOD approval to see it here.
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-3">
            {categories.map((category) => (
              <div
                key={category.category_id}
                className="rounded-lg border border-[var(--brand-border)] bg-white p-6"
              >
                <h3 className="text-lg font-semibold text-black">{category.name}</h3>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-2xl font-bold text-[var(--brand-blue)]">{category.max_points}</span>
                  <span className="text-xs text-[var(--brand-muted)]">Max Points</span>
                </div>
                <div className="mt-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      category.status === "approved"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-yellow-500/20 text-yellow-400"
                    }`}
                  >
                    {category.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateCategoryModal
        open={showCreateCategoryModal}
        onClose={() => setShowCreateCategoryModal(false)}
        onCreated={() => loadCategories()}
      />
    </div>
  );
}
