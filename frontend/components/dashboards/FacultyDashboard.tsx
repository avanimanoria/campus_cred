"use client";

import { useState, useEffect } from "react";
import { useApiData } from "@/hooks/useApiData";
import toast from "react-hot-toast";
import { auth } from "@/firebase/client";

interface Event {
  event_id: number;
  title: string;
  description?: string;
  category: string;
  start_at?: string;
  end_at?: string;
  status: string;
  max_participants?: number;
  current_participants?: number;
}

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: () => void;
}

function CreateEventModal({ isOpen, onClose, onEventCreated }: CreateEventModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    start_at: "",
    end_at: "",
    venue: "",
    dept_id: "1",
    is_external: false,
  });
  const api = useApiData();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("You must be signed in");
        return;
      }

      await api.post("/faculty/create-event", {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        start_at: formData.start_at,
        end_at: formData.end_at || formData.start_at,
        venue: formData.venue,
        dept_id: parseInt(formData.dept_id, 10),
        is_external: formData.is_external,
        payment: { amount: 0, options: [] },
        created_by: user.uid,
      });

      toast.success("Event created! Waiting for HOD approval");
      setFormData({
        title: "",
        description: "",
        category: "",
        start_at: "",
        end_at: "",
        venue: "",
        dept_id: "1",
        is_external: false,
      });
      onEventCreated();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to create event");
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--brand-border)] bg-white p-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-black">Create New Event</h2>
          <button
            onClick={onClose}
            className="text-[var(--brand-muted)] hover:text-black"
            disabled={api.loading}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-black">Title *</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-4 py-3 text-black placeholder-[var(--brand-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
              placeholder="Enter event title"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-black">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-4 py-3 text-black placeholder-[var(--brand-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
              placeholder="Describe your event"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-black">Category *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-4 py-3 text-black placeholder-[var(--brand-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
              >
                <option value="">Select category</option>
                <option value="Technical">Technical</option>
                <option value="Cultural">Cultural</option>
                <option value="Sports">Sports</option>
                <option value="Workshop">Workshop</option>
                <option value="Seminar">Seminar</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-black">Venue *</label>
              <input
                type="text"
                required
                value={formData.venue}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-4 py-3 text-black placeholder-[var(--brand-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                placeholder="Event venue"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-black">Start Date *</label>
              <input
                type="datetime-local"
                required
                value={formData.start_at}
                onChange={(e) => setFormData({ ...formData, start_at: e.target.value })}
                className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-black">End Date</label>
              <input
                type="datetime-local"
                value={formData.end_at}
                onChange={(e) => setFormData({ ...formData, end_at: e.target.value })}
                className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-semibold text-black">Department ID</label>
              <input
                type="number"
                min="1"
                value={formData.dept_id}
                onChange={(e) => setFormData({ ...formData, dept_id: e.target.value })}
                className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-4 py-3 text-black placeholder-[var(--brand-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
                placeholder="Department ID (default: 1)"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="is_external"
                checked={formData.is_external}
                onChange={(e) => setFormData({ ...formData, is_external: e.target.checked })}
                className="h-5 w-5 rounded border border-[var(--brand-border)] bg-white text-[var(--brand-blue)] focus:ring-2 focus:ring-[var(--brand-blue)]"
              />
              <label htmlFor="is_external" className="text-sm font-semibold text-black">
                External Event
              </label>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={api.loading}
              className="flex-1 rounded-xl bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] px-6 py-3 font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
            >
              {api.loading ? "Creating..." : "Create Event"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={api.loading}
              className="rounded-xl bg-[var(--brand-blue-soft)] px-6 py-3 font-semibold text-black transition-all hover:bg-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function FacultyDashboard() {
  const [activeView, setActiveView] = useState<"all" | "published">("all");
  const [events, setEvents] = useState<Event[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const api = useApiData();

  useEffect(() => {
    loadEvents();
  }, [activeView]);

  async function loadEvents() {
    try {
      // For now, both views show approved events
      // You can add filtering logic later based on activeView
      const data = await api.get("/events/approved", { requireAuth: false });
      setEvents(data.data || []);
    } catch (error: any) {
      console.error("Failed to load events:", error);
      toast.error(error.message || "Failed to load events");
    }
  }

  function getStatusColor(status: string) {
    const colors: Record<string, string> = {
      approved: "bg-green-500/20 text-green-400",
      pending: "bg-yellow-500/20 text-yellow-400",
      rejected: "bg-red-500/20 text-red-400",
      published: "bg-blue-500/20 text-blue-400",
    };
    return colors[status] || "bg-gray-500/20 text-gray-400";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-black">Faculty Dashboard</h1>
        {activeView === "published" && (
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-xl bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] px-6 py-3 font-semibold text-white transition-all hover:opacity-90"
          >
            ➕ Create Event
          </button>
        )}
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 rounded-2xl bg-var(--brand-blue-soft) p-2">
        <button
          onClick={() => setActiveView("all")}
          className={`flex-1 rounded-xl px-6 py-3 font-semibold transition-all ${
            activeView === "all"
              ? "bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] text-white"
              : "text-black hover:bg-[var(--brand-border)]"
          }`}
        >
          📋 All Events
        </button>
        <button
          onClick={() => setActiveView("published")}
          className={`flex-1 rounded-xl px-6 py-3 font-semibold transition-all ${
            activeView === "published"
              ? "bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] text-white"
              : "text-black hover:bg-[var(--brand-border)]"
          }`}
        >
          🎉 Published Events
        </button>
      </div>

      {/* Events List */}
      {api.loading && <div className="text-center text-[var(--brand-muted)]">Loading...</div>}
      {!api.loading && events.length === 0 && (
        <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-blue-soft)] p-8 text-center text-[var(--brand-muted)]">
          No events found. Create your first event!
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <div key={event.event_id} className="rounded-lg border border-[var(--brand-border)] bg-white p-6">
            <div className="mb-3 flex items-start justify-between">
              <h3 className="text-lg font-semibold text-black">{event.title}</h3>
              <span className={`rounded-full px-3 py-1 text-xs ${getStatusColor(event.status)}`}>
                {event.status}
              </span>
            </div>
            <p className="mb-4 text-sm text-[var(--brand-muted)] line-clamp-2">{event.description}</p>
            <div className="space-y-2 text-xs text-[var(--brand-muted)]">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--brand-blue-soft)] px-3 py-1 text-[var(--brand-blue)]">
                  {event.category}
                </span>
              </div>
              {event.start_at && (
                <p>📅 {new Date(event.start_at).toLocaleString()}</p>
              )}
              {event.max_participants && (
                <p>
                  👥 {event.current_participants || 0}/{event.max_participants} participants
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onEventCreated={loadEvents}
      />
    </div>
  );
}
