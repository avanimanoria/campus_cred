export type EventCard = {
	id: string;
	semester: string;
	title: string;
	venue: string;
	status: "active" | "registered" | "attended" | "missed";
	category: "external" | "internal";
	studentCount?: number;
	points?: number;
	date?: string | Date; // Event date (e.g., "2024-12-01" or Date object)
	source?: string; // "external" for proctor-submitted activities
	file_name?: string; // Document filename for external activities
	file_path?: string; // Document path for external activities
	approval_status?: "pending" | "approved" | "rejected";
};

export type SemesterMetadata = {
	label: string;
	counts: { all: number; mine: number };
};

export type ActivityDistributionItem = {
	label: string;
	value: number;
	color: string;
};

export type CategoryOption = {
	label: string;
	value: "external" | "internal";
};

const baseEvent = {
	title: "Web dev workshop",
	venue: "PJ BLOCK 605 6th FLOOR",
};

export const semesterMetadata: SemesterMetadata[] = [
	{ label: "Sem 1", counts: { all: 10, mine: 2 } },
	{ label: "Sem 2", counts: { all: 5, mine: 1 } },
	{ label: "Sem 3", counts: { all: 35, mine: 0 } },
	{ label: "Sem 4", counts: { all: 20, mine: 4 } },
	{ label: "Sem 5", counts: { all: 0, mine: 0 } },
	{ label: "Sem 6", counts: { all: 0, mine: 0 } },
	{ label: "Sem 7", counts: { all: 0, mine: 0 } },
	{ label: "Sem 8", counts: { all: 0, mine: 0 } },
];

export const allEvents: EventCard[] = (Array.from({ length: 6 }, (_, index) => {
	const pastDate = new Date();
	pastDate.setDate(pastDate.getDate() - (6 - index)); // Past dates get progressively older
	
	return {
		id: `all-sem4-${index}`,
		semester: "Sem 4",
		title: baseEvent.title,
		venue: baseEvent.venue,
		status: (index < 3 ? "active" : "registered") as const,
		category: (index % 2 === 0 ? "external" : "internal") as "external" | "internal",
		date: pastDate.toISOString().split('T')[0], // Past dates
	};
}) as any[]).map((event: any) => {
	const eventCard: EventCard = {
		...event,
		status: getEventStatus(event as EventCard),
	};
	return eventCard;
});

/**
 * Helper function to determine event status based on date
 * If event date is in the past and status is "registered", mark as "attended"
 */
function getEventStatus(event: EventCard): EventCard["status"] {
	if (!event.date) return event.status;
	
	const eventDate = new Date(event.date);
	eventDate.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
	
	const today = new Date();
	today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
	
	// If event is in the past and status is "registered", mark as attended
	if (eventDate < today && event.status === "registered") {
		return "attended";
	}
	return event.status;
}

export const myEvents: EventCard[] = [
	{
		id: `my-sem4-0`,
		semester: "Sem 4",
		title: "AI workshop",
		venue: "606 CLASSROOM",
		status: "attended",
		category: "external",
		points: 10,
		date: "2024-12-05", // Past date
	},
	{
		id: `my-sem4-1`,
		semester: "Sem 4",
		title: "data science workshop",
		venue: "605 CLASS",
		status: "registered",
		category: "external",
		points: 5,
		date: "2025-12-15", // Future date
	},
	{
		id: `my-sem4-2`,
		semester: "Sem 4",
		title: "Web dev workshop",
		venue: "PJ BLOCK 605 6th FLOOR",
		status: "registered",
		category: "internal",
		points: 5,
		date: "2024-12-10", // Past date - will be marked as attended
	},
	{
		id: `my-sem4-3`,
		semester: "Sem 4",
		title: "Leadership summit",
		venue: "Main Auditorium",
		status: "registered",
		category: "internal",
		points: 5,
		date: "2025-12-20", // Future date
	},
	{
		id: `my-sem4-4`,
		semester: "Sem 4",
		title: "quizzed",
		venue: "C-202",
		status: "registered",
		category: "internal",
		points: 5,
		date: "2025-12-03", // Past date (Dec 3) - will be marked as attended since today is Dec 11
	},
].map(event => ({
	...event,
	status: getEventStatus(event),
}));

export const activityDistribution: ActivityDistributionItem[] = [
	{ label: "Societal Needs and Development", value: 5, color: "#b68c5a" },
	{ label: "Environment and Sustainability", value: 3, color: "#63c37d" },
	{ label: "Childhood Development and Pedagogy", value: 2, color: "#06b6d4" },
	{ label: "Women Empowerment Outreach", value: 4, color: "#ec4899" },
	{ label: "Promote Rural Development", value: 3, color: "#84cc16" },
	{ label: "Quality of Life through Technology", value: 6, color: "#3b82f6" },
	{ label: "National Level Initiatives", value: 2, color: "#f97316" },
	{ label: "Innovative approach to promote local tourism", value: 1, color: "#d4af37" },
	{ label: "Innovations and Entrepreneurship", value: 4, color: "#8b5cf6" },
	{ label: "Leadership and Management", value: 5, color: "#f43f5e" },
];

export const totalPoints = activityDistribution.reduce((sum, item) => sum + item.value, 0);

export const CATEGORY_OPTIONS: CategoryOption[] = [
	{ label: "External", value: "external" },
	{ label: "Internal", value: "internal" },
];

export const publishedEvents: EventCard[] = Array.from({ length: 3 }, (_, index) => {
	const pastDate = new Date();
	pastDate.setDate(pastDate.getDate() - (3 - index)); // Past dates
	
	return {
		id: `published-sem4-${index}`,
		semester: "Sem 4",
		title: baseEvent.title,
		venue: baseEvent.venue,
		status: "active",
		category: "internal",
		date: pastDate.toISOString().split('T')[0],
	};
}).map(event => ({
	...event,
	status: getEventStatus(event),
}));
