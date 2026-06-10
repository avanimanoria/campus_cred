"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Doughnut } from "react-chartjs-2";
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from "chart.js";
import {
	ActivityDistributionItem,
	CategoryOption,
	EventCard,
	SemesterMetadata,
} from "./home-data";
import { EventsGrid } from "./events-grid";
import toast from "react-hot-toast";

ChartJS.register(ArcElement, Tooltip, Legend);

type MyEventsViewProps = {
	events: EventCard[];
	metadata: SemesterMetadata[];
	activityDistribution: ActivityDistributionItem[];
	totalPoints: number;
	categories: CategoryOption[];
	role: string;
    activeTab: string;
	onExternalUpload?: (event: EventCard) => void;
	onRefresh?: () => void;
};

export function MyEventsView({
	events,
	metadata,
	activityDistribution,
	totalPoints,
	categories,
	role,
    activeTab,
	onExternalUpload,
	onRefresh
}: MyEventsViewProps) {
	const [selectedSemester, setSelectedSemester] = useState(
		() => events[0]?.semester ?? metadata[0]?.label ?? ""
	);
	const [category, setCategory] = useState<CategoryOption["value"]>("internal");
	const [isUploading, setIsUploading] = useState(false);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [totalPointsServer, setTotalPointsServer] = useState<number>(0);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Update selected semester when events change (e.g., after fetching new data)
	useEffect(() => {
		if (events.length > 0 && !selectedSemester) {
			setSelectedSemester(events[0].semester);
		}
	}, [events]);

	// Fetch total points for the logged-in student (includes external submissions)
	useEffect(() => {
		const fetchTotalPoints = async () => {
			try {
				const emailPrefix = (typeof window !== "undefined" && localStorage.getItem("userEmail")?.split("@")[0]) || "";
				if (!emailPrefix) return;

				const profileResp = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/students/profile`,
					{
						headers: {
							"x-user-id": emailPrefix,
							"x-user-role": "student"
						}
					}
				);

				if (!profileResp.ok) return;
				const profileData = await profileResp.json();
				const studentUsn = profileData?.student_usn || profileData?.data?.student_usn;
				if (!studentUsn) return;

				const pointsResp = await fetch(`http://localhost:5000/api/proctor/student/${studentUsn}/total-points`, {
					headers: {
						"x-user-id": studentUsn,
						"x-user-role": "student"
					}
				});

				if (!pointsResp.ok) return;
				const pointsData = await pointsResp.json();
				setTotalPointsServer(pointsData.data?.totalPoints || 0);
			} catch (err) {
				console.error("Failed to fetch total points:", err);
			}
		};

		fetchTotalPoints();

		// Listen for activity points update event from proctor submission
		const handlePointsUpdate = () => {
			fetchTotalPoints();
		};
		window.addEventListener('activityPointsUpdated', handlePointsUpdate);

		return () => {
			window.removeEventListener('activityPointsUpdated', handlePointsUpdate);
		};
	}, []);
	const [studentUSN, setStudentUSN] = useState<string | null>(null);

	// Fetch student USN on mount
	useEffect(() => {
		const fetchStudentProfile = async () => {
			try {
				const emailPrefix = (typeof window !== "undefined" && localStorage.getItem("userEmail")?.split("@")[0]) || "student";
				const response = await fetch(
					`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/students/profile`,
					{
						headers: {
							"x-user-id": emailPrefix,
							"x-user-role": "student",
						},
					}
				);
				if (response.ok) {
					const data = await response.json();
					setStudentUSN(data?.student_usn || data?.data?.student_usn);
				}
			} catch (err) {
				console.error("Failed to fetch student profile:", err);
			}
		};

		fetchStudentProfile();
	}, []);

	const handleUploadClick = () => {
		fileInputRef.current?.click();
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate PDF file
		if (file.type !== "application/pdf") {
			toast.error("Please select a PDF file");
			return;
		}

		// Show confirmation dialog
		setSelectedFile(file);
	};

	const handleSubmitFile = async () => {
		if (!selectedFile) return;

		setIsUploading(true);
		try {
			// Get email prefix for authentication
			const emailPrefix = (typeof window !== "undefined" && localStorage.getItem("userEmail")?.split("@")[0]) || "student";

			// First, fetch student profile to get actual USN
			const profileResponse = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/students/profile`,
				{
					headers: {
						"x-user-id": emailPrefix,
						"x-user-role": "student",
					},
				}
			);

			if (!profileResponse.ok) {
				toast.error("Failed to fetch student profile");
				setIsUploading(false);
				return;
			}

			const profileData = await profileResponse.json();
			const studentUSN = profileData?.student_usn || profileData?.data?.student_usn;

			if (!studentUSN) {
				toast.error("Could not determine student USN");
				setIsUploading(false);
				return;
			}

			// Now upload certificate with correct USN
			const formData = new FormData();
			formData.append("file", selectedFile);

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"}/students/upload-certificate`,
				{
					method: "POST",
					headers: {
						"x-user-id": studentUSN,
						"x-user-role": "student",
					},
					body: formData,
				}
			);

			if (response.ok) {
				const responseData = await response.json().catch(() => null);
				const uploadedFileName = responseData?.file_name || responseData?.data?.file_name || selectedFile.name;
				const uploadedFilePath = responseData?.file_path || responseData?.data?.file_path || "";
				const semesterLabel = selectedSemester || metadata[0]?.label || "";

				onExternalUpload?.({
					id: `pending-${Date.now()}`,
					semester: semesterLabel,
					title: `External Activity: ${uploadedFileName.replace(/\.pdf$/i, "")}`,
					venue: "",
					status: "registered",
					category: "external",
					points: 0,
					date: new Date().toISOString(),
					source: "student-upload",
					file_name: uploadedFileName,
					file_path: uploadedFilePath || undefined,
					approval_status: "pending"
				});

				onRefresh?.();
				toast.success("PDF uploaded successfully!");
				setSelectedFile(null);
				// Reset file input
				if (fileInputRef.current) {
					fileInputRef.current.value = "";
				}
			} else {
				toast.error("Failed to upload PDF");
			}
		} catch (error) {
			console.error("Upload error:", error);
			toast.error("Upload failed");
		} finally {
			setIsUploading(false);
		}
	};

	const handleCancelFile = () => {
		setSelectedFile(null);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const filteredEvents = useMemo(() => {
		return events.filter((event) => {
			// If no semester is selected, show all events
			const semesterMatch = !selectedSemester || selectedSemester === "" || event.semester === selectedSemester;
			const categoryMatch = event.category === category;
			return semesterMatch && categoryMatch;
		});
	}, [events, selectedSemester, category]);

	// Calculate activity distribution based on attended events and include external activity points
	const { calculatedDistribution, calculatedTotalPoints } = useMemo(() => {
		// Default distribution with 10 categories
		const distribution: Record<string, number> = {
			"Societal Needs and Development": 0,
			"Environment and Sustainability": 0,
			"Childhood Development and Pedagogy": 0,
			"Women Empowerment Outreach": 0,
			"Promote Rural Development": 0,
			"Quality of Life through Technology": 0,
			"National Level Initiatives": 0,
			"Innovative approach to promote local tourism": 0,
			"Innovations and Entrepreneurship": 0,
			"Leadership and Management": 0,
		};

		// For now, distribute points from attended events
		// Map: if event is internal, assign to Leadership; if external, assign based on event title keywords
		events.forEach((event) => {
			// Only count attended events
			if (event.status !== "attended") return;

			const points = event.points || 5; // Default 5 points per event if not specified
			const title = event.title.toLowerCase();

			// Simple categorization based on event title for demo
			if (title.includes("leadership") || title.includes("management")) {
				distribution["Leadership and Management"] += points;
			} else if (title.includes("tech") || title.includes("coding") || title.includes("development")) {
				distribution["Quality of Life through Technology"] += points;
			} else if (title.includes("environment") || title.includes("sustainability")) {
				distribution["Environment and Sustainability"] += points;
			} else if (title.includes("innovation") || title.includes("entrepreneurship")) {
				distribution["Innovations and Entrepreneurship"] += points;
			} else if (title.includes("rural")) {
				distribution["Promote Rural Development"] += points;
			} else if (title.includes("woman") || title.includes("women")) {
				distribution["Women Empowerment Outreach"] += points;
			} else if (title.includes("child") || title.includes("pedagogy")) {
				distribution["Childhood Development and Pedagogy"] += points;
			} else if (title.includes("tourism")) {
				distribution["Innovative approach to promote local tourism"] += points;
			} else if (title.includes("national") || title.includes("ncc") || title.includes("nss")) {
				distribution["National Level Initiatives"] += points;
			} else {
				// Default to Societal Needs for unmatched events
				distribution["Societal Needs and Development"] += points;
			}
		});

		const internalTotal = Object.values(distribution).reduce((sum, val) => sum + val, 0);

		// External points = total from server minus internal counted points
		const externalPoints = Math.max((totalPointsServer || 0) - internalTotal, 0);
		if (externalPoints > 0) {
			distribution["External Activities"] = (distribution["External Activities"] || 0) + externalPoints;
		}

		const total = Object.values(distribution).reduce((sum, val) => sum + val, 0);

		// Convert to ActivityDistributionItem format
		const colorMap: Record<string, string> = {
			"Societal Needs and Development": "#b68c5a",
			"Environment and Sustainability": "#63c37d",
			"Childhood Development and Pedagogy": "#06b6d4",
			"Women Empowerment Outreach": "#ec4899",
			"Promote Rural Development": "#84cc16",
			"Quality of Life through Technology": "#3b82f6",
			"National Level Initiatives": "#f97316",
			"Innovative approach to promote local tourism": "#d4af37",
			"Innovations and Entrepreneurship": "#8b5cf6",
			"Leadership and Management": "#f43f5e",
			"External Activities": "#2eb88a",
		};

		const result = Object.entries(distribution)
			.map(([label, value]) => ({
				label,
				value,
				color: colorMap[label] || "#999",
			}))
			.filter((item) => item.value > 0); // Only show categories with points

		return { calculatedDistribution: result, calculatedTotalPoints: total };
	}, [events, totalPointsServer]);

	const chartData = useMemo(
		() => ({
			labels: calculatedDistribution.map((item) => item.label),
			datasets: [
				{
					data: calculatedDistribution.map((item) => item.value),
					backgroundColor: calculatedDistribution.map((item) => item.color),
					borderWidth: 1,
				},
			],
		}),
		[calculatedDistribution]
	);

	const displayTotalPoints = totalPointsServer || calculatedTotalPoints;

	const chartOptions = useMemo(
		() => ({
			cutout: "65%",
			plugins: {
				legend: { display: false },
				tooltip: {
					callbacks: {
						label: (context: any) => {
							const label = context.label ?? "";
							const value = context.parsed ?? 0;
							const percentage = displayTotalPoints ? ((value / displayTotalPoints) * 100).toFixed(1) : "0.0";
							return `${label}: ${value} points (${percentage}%)`;
						},
					},
				},
			},
		}),
		[displayTotalPoints]
	);

	const categoryLabel =
		categories.find((option) => option.value === category)?.label ?? "Internal";

	return (
		<div className="flex flex-col gap-6">
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex flex-wrap items-center gap-3">
					<div className="relative">
						<select
							value={category}
							onChange={(event) => setCategory(event.target.value as typeof category)}
							className="appearance-none rounded-full border border-[var(--brand-border)] bg-[var(--brand-blue-soft)] px-5 py-2 pr-10 text-sm font-semibold text-black shadow-md shadow-black/10 focus:outline-none"
						>
							{categories.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
						<span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-black">
							⌄
						</span>
					</div>
					{category === "external" && (
						<>
							<input
								ref={fileInputRef}
								type="file"
								accept=".pdf"
								onChange={handleFileChange}
								className="hidden"
							/>
							<button
								type="button"
								onClick={handleUploadClick}
								disabled={isUploading}
								className="rounded-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] px-5 py-2 text-sm font-semibold text-white shadow-md shadow-black/20 transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isUploading ? "Uploading..." : "Upload"}
							</button>
						</>
					)}
				</div>
			</div>

			<div className="flex flex-wrap justify-center gap-3 lg:justify-start">
				{metadata.map((semester) => {
					const count = semester.counts.mine;
					const formattedCount = count > 0 ? String(count).padStart(2, "0") : "--";
					const isSelected = selectedSemester === semester.label;
					return (
						<button
							key={semester.label}
							type="button"
							onClick={() => setSelectedSemester(semester.label)}
							className={`flex min-w-[86px] flex-col items-center rounded-3xl border border-[var(--brand-border)] px-4 py-3 text-xs font-semibold uppercase tracking-wide transition ${
								isSelected
									? "bg-gradient-to-b from-[var(--brand-blue)] to-[var(--brand-blue-dark)] text-white"
									: "bg-white text-black"
							}`}
						>
							<span className="text-sm">{semester.label}</span>
						</button>
					);
				})}
			</div>

		<div className="flex flex-col gap-6 lg:flex-row">
			<div className="grid flex-1 gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
					<EventsGrid
                        activeTab={activeTab}
                        role={role}
						events={filteredEvents}
						emptyMessage={`No ${categoryLabel.toLowerCase()} events for ${selectedSemester || "this semester"}.`}
					/>
				</div>

				<aside className="flex w-full flex-col gap-4 rounded-3xl border border-[var(--brand-border)] bg-white p-6 text-black shadow-md shadow-black/10 lg:w-[320px]">
					<h2 className="text-xl font-semibold">Activity Points Distribution</h2>
					<div className="relative mx-auto h-48 w-48">
						<Doughnut data={chartData} options={chartOptions} />
						<div className="absolute inset-0 flex items-center justify-center text-3xl font-bold">{displayTotalPoints}</div>
					</div>
					<ul className="space-y-3 text-sm">
						{calculatedDistribution.map((item) => (
							<li key={item.label} className="flex items-start gap-3">
								<span className="mt-1 h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
								<div className="flex-1">
									<p className="font-semibold">{item.label}</p>
									<p className="text-xs text-[var(--brand-muted)]">
										{item.value} points ({displayTotalPoints ? ((item.value / displayTotalPoints) * 100).toFixed(1) : "0.0"}%)
									</p>
								</div>
							</li>
						))}
					</ul>
				</aside>
			</div>

			{/* File Upload Confirmation Modal */}
			{selectedFile && (
				<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
					<div className="rounded-3xl bg-white p-8 shadow-lg shadow-black/20 max-w-md mx-4">
						<h3 className="text-2xl font-semibold text-black mb-4">Confirm Upload</h3>
						<p className="text-[var(--brand-muted)] mb-6">
							File: <span className="font-semibold">{selectedFile.name}</span>
						</p>
						<p className="text-[var(--brand-muted)] mb-6">
							Size: <span className="font-semibold">{(selectedFile.size / 1024).toFixed(2)} KB</span>
						</p>
						<p className="text-[var(--brand-muted)] mb-8">
							Are you sure you want to upload this PDF?
						</p>
						<div className="flex gap-4">
							<button
								onClick={handleCancelFile}
								disabled={isUploading}
								className="flex-1 rounded-full border-2 border-[var(--brand-border)] px-6 py-3 text-sm font-semibold text-black transition hover:bg-[var(--brand-blue-soft)] disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								onClick={handleSubmitFile}
								disabled={isUploading}
								className="flex-1 rounded-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{isUploading ? "Uploading..." : "Submit"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
