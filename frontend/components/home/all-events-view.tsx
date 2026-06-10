"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { EventCard } from "./home-data";
import { EventsGrid } from "./events-grid";
import { useApiData } from "@/hooks/useApiData";

type AllEventsViewProps = { events: EventCard[]; role: string; activeTab: string; refreshKey?: number; registeredEventIds?: Set<string>; onRefresh?: () => void };

export function AllEventsView({ events, role, activeTab, refreshKey = 0, registeredEventIds = new Set(), onRefresh }: AllEventsViewProps) {
const [approvedEvents, setApprovedEvents] = useState<EventCard[]>(events);
const [loading, setLoading] = useState(false);
const api = useApiData<{ data?: any[] }>();
const registeredIdsKey = useMemo(() => Array.from(registeredEventIds).sort().join("|"), [registeredEventIds]);
const lastFetchKeyRef = useRef<string>("");

// Fetch approved events so only HOD-approved items show up in "All" and "Published"
// Also filter out events the student is already registered for
useEffect(() => {
const fetchKey = `${role}|${activeTab}|${refreshKey}|${registeredIdsKey}`;
if (lastFetchKeyRef.current === fetchKey) return;
lastFetchKeyRef.current = fetchKey;
fetchApprovedEvents();
}, [role, activeTab, refreshKey, registeredIdsKey]);

async function fetchApprovedEvents() {
setLoading(true);
try {
// For faculty "published" view, fetch from faculty/events to get student counts
const endpoint = (role === "Faculty" && activeTab === "published") 
? "/faculty/events" 
: "/events/approved";

const result = await api.get(endpoint, { requireAuth: false });
let transformedEvents = (result?.data || []).map((event: any) => ({
id: String(event.event_id),
title: event.title,
venue: event.venue || "",
status: "active" as const,
category: (event.category?.toLowerCase?.() === "external" ? "external" : "internal") as EventCard["category"],
semester: "",
studentCount: event.student_count || 0,
date: event.start_at || event.event_date || "",
}));

// For students, filter out already-registered events
if (role === "Student" && registeredEventIds.size > 0) {
transformedEvents = transformedEvents.filter(
event => !registeredEventIds.has(event.id)
);
}

setApprovedEvents(transformedEvents);
} catch (error) {
console.error("Failed to fetch approved events:", error);
setApprovedEvents(events);
} finally {
setLoading(false);
}
}

if (loading) {
return (
<div className="flex items-center justify-center p-8">
<div className="text-lg text-[var(--brand-muted)]">Loading events...</div>
</div>
);
}

return (
<div className="flex flex-col gap-6">
<div className="grid flex-1 gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
<EventsGrid activeTab={activeTab} role={role} events={approvedEvents} emptyMessage="No events available." onRegister={onRefresh} />
</div>
</div>
);
}
