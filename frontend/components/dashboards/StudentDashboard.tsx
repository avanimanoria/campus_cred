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
  location?: string;
  max_participants?: number;
  current_participants?: number;
  is_registered?: boolean;
}

export function StudentDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [registering, setRegistering] = useState<number | null>(null);
  const api = useApiData();

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const data = await api.get(`/events/approved?student_id=${user.uid}`);
      setEvents(data.data || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to load events");
    }
  }

  async function handleRegister(eventId: number) {
    try {
      const user = auth.currentUser;
      if (!user) {
        toast.error("You must be signed in");
        return;
      }

      setRegistering(eventId);
      await api.post(`/students/register/${eventId}`, {
        student_id: user.uid,
      });

      toast.success("Successfully registered for event!");
      
      // Optimistic update
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.event_id === eventId
            ? {
                ...event,
                is_registered: true,
                current_participants: (event.current_participants || 0) + 1,
              }
            : event
        )
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to register");
    } finally {
      setRegistering(null);
    }
  }

  const categories = ["all", ...new Set(events.map((e) => e.category))];
  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "all" || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  function isEventFull(event: Event) {
    if (!event.max_participants) return false;
    return (event.current_participants || 0) >= event.max_participants;
  }

  function isEventPast(event: Event) {
    if (!event.end_at) return false;
    return new Date(event.end_at) < new Date();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-black">Student Dashboard</h1>
        <p className="mt-2 text-[var(--brand-muted)]">Explore and register for approved events</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-4 py-3 text-black placeholder-[var(--brand-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="rounded-lg border border-[var(--brand-border)] bg-white px-4 py-3 text-black focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "all" ? "All Categories" : cat}
            </option>
          ))}
        </select>
      </div>

      {/* Events Grid */}
      {api.loading && <div className="text-center text-[var(--brand-muted)]">Loading events...</div>}
      {!api.loading && filteredEvents.length === 0 && (
        <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-blue-soft)] p-8 text-center">
          <p className="text-lg text-[var(--brand-muted)]">
            {searchQuery || selectedCategory !== "all"
              ? "No events match your filters"
              : "No approved events available"}
          </p>
        </div>
      )}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredEvents.map((event) => {
          const isFull = isEventFull(event);
          const isPast = isEventPast(event);
          const canRegister = !event.is_registered && !isFull && !isPast;

          return (
            <div
              key={event.event_id}
              className="flex flex-col rounded-xl border border-[var(--brand-border)] bg-white p-6 shadow-lg shadow-black/10"
            >
              {/* Category Badge */}
              <div className="mb-3">
                <span className="rounded-full bg-[var(--brand-blue-soft)] px-3 py-1 text-sm font-semibold text-[var(--brand-blue)]">
                  {event.category}
                </span>
              </div>

              {/* Title */}
              <h3 className="mb-2 text-xl font-bold text-black">{event.title}</h3>

              {/* Description */}
              <p className="mb-4 flex-1 text-sm text-[var(--brand-muted)] line-clamp-3">
                {event.description || "No description provided"}
              </p>

              {/* Event Details */}
              <div className="mb-4 space-y-2 text-xs text-[var(--brand-muted)]">
                {event.start_at && (
                  <div className="flex items-center gap-2">
                    <span>📅</span>
                    <span>{new Date(event.start_at).toLocaleString()}</span>
                  </div>
                )}
                {event.location && (
                  <div className="flex items-center gap-2">
                    <span>📍</span>
                    <span>{event.location}</span>
                  </div>
                )}
                {event.max_participants && (
                  <div className="flex items-center gap-2">
                    <span>👥</span>
                    <span>
                      {event.current_participants || 0}/{event.max_participants}
                    </span>
                    {isFull && <span className="text-red-500">(Full)</span>}
                  </div>
                )}
              </div>

              {/* Action Button */}
              {event.is_registered ? (
                <button
                  disabled
                  className="w-full rounded-lg bg-[var(--brand-blue-soft)] px-4 py-3 font-semibold text-[var(--brand-blue)]"
                >
                  ✓ Registered
                </button>
              ) : isPast ? (
                <button
                  disabled
                  className="w-full rounded-lg bg-[var(--brand-blue-soft)] px-4 py-3 font-semibold text-[var(--brand-muted)]"
                >
                  Event Ended
                </button>
              ) : isFull ? (
                <button
                  disabled
                  className="w-full rounded-lg bg-red-100 px-4 py-3 font-semibold text-red-600"
                >
                  Event Full
                </button>
              ) : (
                <button
                  onClick={() => handleRegister(event.event_id)}
                  disabled={registering === event.event_id}
                  className="w-full rounded-lg bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] px-4 py-3 font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                >
                  {registering === event.event_id ? "Registering..." : "Register Now"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
