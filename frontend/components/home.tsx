"use client";

import { useEffect, useState } from "react";
import { useUserRole, mapRoleToTitle } from "@/firebase/hooks";
import {
	activityDistribution,
	allEvents,
	CATEGORY_OPTIONS,
	myEvents,
	semesterMetadata,
	totalPoints,
	publishedEvents,
} from "./home/home-data";
import { AllEventsView } from "./home/all-events-view";
import { MyEventsView } from "./home/my-events-view";
import Header from "./header";
import { CreateEventModal } from "./home/create-event-modal";
import { StudentListView } from "./home/student-list-view";
import { AllCategoriesView } from "./home/all-categories-view";
import { ProctorStudentView } from "./home/proctor-student-view";
import { HODApprovalsView } from "./home/hod-approvals-view";
import { useApiData } from "@/hooks/useApiData";

export default function Home() {
	const [activeTab, setActiveTab] = useState<"all" | "mine" | "published" | "students" | "categories" | "proctorStudent" | "approvals">("all");
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [refreshKey, setRefreshKey] = useState(0);
	const { role: rawRole, loading } = useUserRole();
	const role = mapRoleToTitle(rawRole) || "Student";
	const [studentEvents, setStudentEvents] = useState<any[]>(myEvents);
	const api = useApiData();

	const buildEventKey = (event: any) => {
		const fileKey = event.file_name || event.file_path || "";
		const titleKey = event.title || "";
		const dateKey = event.date || event.start_at || "";
		return `${fileKey}|${titleKey}|${dateKey}`;
	};

	const getPendingUploads = (events: any[]) =>
		events.filter(
			(event) => event?.source === "student-upload" || event?.approval_status === "pending"
		);

	// Fetch student events
	const fetchStudentEvents = async () => {
		if (role !== "Student") return;
		try {
			// Fallback auth: if Firebase user is not available, derive the ID from localStorage email
			const storedEmail =
				(typeof window !== "undefined" &&
					(localStorage.getItem("userEmail") || localStorage.getItem("userEmailPrefix"))) || "";
			const emailPrefix = storedEmail ? storedEmail.split("@")[0] : "";

			if (!emailPrefix) {
				console.warn("No email prefix found in localStorage for student events fetch");
				return;
			}

			console.log("Fetching student events for:", emailPrefix);

			const result = await api.get("/students/my-events", {
				requireAuth: false,
				headers: emailPrefix
					? {
						"x-user-id": emailPrefix,
						"x-user-role": "student",
					}
					: undefined,
			});
			
			console.log("Student events API response:", result);
			
			if (result?.data) {
				const transformed = result.data.map((event: any) => {
					// Handle external activities (submitted by proctor) differently
					if (event.source === "external") {
						return {
							id: String(event.event_id),
							title: event.file_name ? `External Activity: ${event.file_name.replace('.pdf', '')}` : "External Activity",
							venue: "",
							status: "attended" as const,
							category: "external" as const,
							semester: event.semester ? `Sem ${event.semester}` : "",
							points: event.points || 0,
							date: event.start_at,
							source: event.source,
							file_name: event.file_name,
							file_path: event.file_path,
							approval_status: event.verification_status || event.approval_status,
						};
					}
					
					// Handle regular events
					return {
						id: String(event.event_id),
						title: event.title,
						venue: event.venue || "",
						status: (event.registration_status === "attended"
							? "attended"
							: event.event_status === "missed"
								? "missed"
								: (event.registration_status || "registered")) as "active" | "registered" | "attended" | "missed",
						category: (event.category?.toLowerCase?.() === "external" ? "external" : "internal") as "external" | "internal",
						semester: event.semester ? `Sem ${event.semester}` : "",
						points: event.points || 5,
						date: event.start_at || event.event_date || event.date,
						approval_status: event.verification_status || event.approval_status,
					};
				});
				console.log("Transformed student events:", transformed);
				setStudentEvents((prev) => {
					const incomingKeys = new Set(transformed.map(buildEventKey));
					const pendingUploads = prev.filter(
						(event) =>
							(event?.source === "student-upload" || event?.approval_status === "pending") &&
							!incomingKeys.has(buildEventKey(event))
					);
					return [...pendingUploads, ...transformed];
				});
			} else {
				console.log("No data in student events response");
				setStudentEvents((prev) => getPendingUploads(prev));
			}
		} catch (error) {
			console.error("Failed to fetch student events:", error);
			setStudentEvents((prev) => getPendingUploads(prev));
		}
	};

	// When role changes, set a sensible default active tab per-role so the
	// dashboard shown matches the signed-in persona.
	useEffect(() => {
		if (role === "HOD") {
			setActiveTab("approvals");
			return;
		}
		if (role === "Faculty") {
			setActiveTab("mine");
			return;
		}
		if (role === "Proctor") {
			setActiveTab("students");
			return;
		}
		// default for students and unknown roles
		setActiveTab("all");
	}, [role]);

	// Fetch student events when role is Student
	useEffect(() => {
		if (role === "Student") {
			// Small delay to ensure localStorage is ready
			const timer = setTimeout(() => {
				fetchStudentEvents();
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [role, refreshKey]);

	// Also fetch when component mounts and user is already logged in
	useEffect(() => {
		if (!loading && role === "Student") {
			const emailInStorage = typeof window !== "undefined" && localStorage.getItem("userEmail");
			if (emailInStorage) {
				fetchStudentEvents();
			}
		}
	}, [loading]);

	// Keep UI-safe tab adjustments if the active tab is incompatible with role
	useEffect(() => {
		if (role === "Faculty" && activeTab === "mine") {
			setActiveTab("all");
		}
		if (role === "Proctor" && activeTab === "published") {
			setActiveTab("all");
		}
		if (role === "Student" && activeTab === "students") {
			setActiveTab("all");
		}
		if (role === "HOD" && (activeTab === "mine" || activeTab === "published" || activeTab === "students" || activeTab === "categories")) {
			setActiveTab("all");
		}
	}, [role, activeTab]);

	if (loading) {
		return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
	}

	const tabs =
		role === "Proctor"
			? [
					{ key: "all" as const, label: "All events"},
					{ key: "students" as const, label: "Students List"},
					{ key: "categories" as const, label: "Categories"},
			  ]
			: role === "HOD"
			? [
					{ key: "all" as const, label: "All events"},
					{ key: "proctorStudent" as const, label: "Proctor-Student"},
					{ key: "approvals" as const, label: "Approvals"},
			  ]
			: [
					{ key: "all" as const, label: "All events"},
					...(role !== "Faculty"
						? [{ key: "mine" as const, label: "My Events"}]
						: []),
					...(role === "Faculty"
						? [{ key: "published" as const, label: "Published"}]
						: []),
			  ];

	// Compute set of event IDs student is already registered for
const registeredEventIds = new Set(
studentEvents
.filter(e => e.status === "registered" || e.status === "attended")
.map(e => e.id)
);

return (
<>
        <Header role={role} />
        <main className="content">
          <div className="px-6 py-8 text-black">
<div className="mx-auto flex max-w-6xl flex-col gap-8">
<div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
<div className="flex w-full flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
<div className="flex w-full max-w-xl rounded-full bg-[var(--brand-blue-soft)] p-2">
{tabs.map((tab) => {
const isActive = activeTab === tab.key;
return (
<button
key={tab.key}
type="button"
onClick={() => setActiveTab(tab.key)}
className={`flex flex-1 items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition ${
isActive
? "bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] text-white"
: "text-black"
}`}
>
<span>{tab.icon}</span>
{tab.label}
</button>
);
})}
</div>
{role === "Faculty" && activeTab === "published" && (
<button
type="button"
onClick={() => setIsCreateModalOpen(true)}
className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-black/20 transition hover:brightness-110"
>
<span className="text-lg leading-none">＋</span>
Create Event
</button>
)}
</div>
</div>

{activeTab === "all" ? (
<AllEventsView events={allEvents} role={role} activeTab={activeTab} refreshKey={refreshKey} registeredEventIds={registeredEventIds} onRefresh={fetchStudentEvents} />
) : activeTab === "published" ? (
<AllEventsView events={publishedEvents} role={role} activeTab={activeTab} refreshKey={refreshKey} />
) : activeTab === "students" ? (
<StudentListView />
) : activeTab === "categories" ? (
<AllCategoriesView />
) : activeTab === "proctorStudent" ? (
<ProctorStudentView />
) : activeTab === "approvals" ? (
<HODApprovalsView/>
) : (
<MyEventsView
events={studentEvents}
activeTab={activeTab}
role={role}
metadata={semesterMetadata}
activityDistribution={activityDistribution}
totalPoints={totalPoints}
categories={CATEGORY_OPTIONS}
onExternalUpload={(newEvent) => setStudentEvents((prev) => [newEvent, ...prev])}
onRefresh={fetchStudentEvents}
/>
)}
</div>
</div>
        </main>
<CreateEventModal
open={isCreateModalOpen}
onClose={() => setIsCreateModalOpen(false)}
onCreated={() => setRefreshKey((prev) => prev + 1)}
/>
        </>
);
}

