"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";

type Student = {
	name: string;
	usn: string;
	points: number;
	semester: number;
	email?: string;
};

type ProctorGroup = {
	proctor: string;
	email?: string;
	students: Student[];
};

const SEMESTERS = ["All", "Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8"];

export function ProctorStudentView() {
	const [selectedSemester, setSelectedSemester] = useState("All");
	const [openGroup, setOpenGroup] = useState<string | null>(null);
	const [isSemesterMenuOpen, setIsSemesterMenuOpen] = useState(false);
	const [proctorGroups, setProctorGroups] = useState<ProctorGroup[]>([]);
	const [loading, setLoading] = useState(true);
	const [selectedStudentDocs, setSelectedStudentDocs] = useState<{usn: string; name: string; docs: any[]} | null>(null);
	const [selectedStudentActivities, setSelectedStudentActivities] = useState<{usn: string; name: string; activities: any[]} | null>(null);
	const [loadingActivities, setLoadingActivities] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Fetch proctor-student mappings from backend
	async function fetchProctorMappings() {
		setLoading(true);
		try {
			const response = await fetch("http://localhost:5000/api/hod/proctor-mappings", {
				headers: {
					"x-user-id": "1",
					"x-user-role": "hod"
				}
			});

			if (!response.ok) {
				throw new Error("Failed to fetch proctor mappings");
			}

			const result = await response.json();
			const mappings = result.data || [];

			// Transform API data to component format
			const groups: ProctorGroup[] = mappings.map((mapping: any) => ({
				proctor: mapping.proctor_name || "Unknown Proctor",
				email: mapping.proctor_email,
				students: (mapping.students || []).map((student: any) => ({
					name: student.student_name,
					usn: student.student_id || student.student_usn,
					email: student.student_email,
					points: 0, // Will be calculated from activities
					semester: student.semester || 1,
				}))
			}));

			// Fetch activity points for each student
			for (const group of groups) {
				for (const student of group.students) {
					try {
						const pointsResponse = await fetch(
							`http://localhost:5000/api/students/activity-points/${student.usn}`,
							{
								headers: {
									"x-user-id": "1",
									"x-user-role": "proctor"
								}
							}
						);
						if (pointsResponse.ok) {
							const pointsData = await pointsResponse.json();
							student.points = pointsData.data?.totalPoints || 0;
						}
					} catch (error) {
						console.error(`Failed to fetch points for student ${student.usn}:`, error);
						student.points = 0;
					}
				}
			}

			setProctorGroups(groups);
			if (groups.length > 0 && !openGroup) {
				setOpenGroup(groups[0].proctor);
			}
		} catch (error: any) {
			console.error("Failed to fetch proctor mappings:", error);
			toast.error("Failed to load proctor-student data");
		} finally {
			setLoading(false);
		}
	}

	// Load data on mount
	useEffect(() => {
		fetchProctorMappings();
	}, []);

	async function fetchStudentDocuments(usn: string, name: string) {
		try {
			const response = await fetch(`http://localhost:5000/api/students/certificates/${usn}`, {
				headers: {
					"x-user-id": "1",
					"x-user-role": "proctor"
				}
			});

			if (!response.ok) {
				throw new Error("Failed to fetch documents");
			}

			const result = await response.json();
			setSelectedStudentDocs({
				usn,
				name,
				docs: result.data || []
			});
		} catch (error: any) {
			console.error("Failed to fetch documents:", error);
			toast.error("Failed to load documents");
		}
	}

	async function fetchStudentActivities(usn: string, name: string) {
		setLoadingActivities(true);
		try {
			const response = await fetch(`http://localhost:5000/api/students/activities/${usn}`, {
				headers: {
					"x-user-id": "1",
					"x-user-role": "proctor"
				}
			});

			if (!response.ok) {
				throw new Error("Failed to fetch activities");
			}

			const result = await response.json();
			setSelectedStudentActivities({
				usn,
				name,
				activities: result.data || []
			});
		} catch (error: any) {
			console.error("Failed to fetch activities:", error);
			toast.error("Failed to load student activities");
		} finally {
			setLoadingActivities(false);
		}
	}

	async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		// Validate file type
		const validTypes = [
			"application/vnd.ms-excel",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"text/csv",
		];
		if (!validTypes.includes(file.type) && !file.name.endsWith(".csv")) {
			toast.error("Please upload a valid Excel or CSV file");
			return;
		}

		// Upload to backend
		const formData = new FormData();
		formData.append("excel", file);

		try {
			const response = await fetch("http://localhost:5000/api/hod/upload-excel", {
				method: "POST",
				body: formData,
				headers: {
					"x-user-id": "1",
					"x-user-role": "hod"
				}
			});

			if (!response.ok) {
				throw new Error("Upload failed");
			}

			const result = await response.json();
			toast.success(result.message || "Excel uploaded successfully!");
			
			// Refresh the data after successful upload
			await fetchProctorMappings();
		} catch (error: any) {
			toast.error(error.message || "Failed to upload Excel");
		} finally {
			e.target.value = ""; // Reset input
		}
	}

	const filteredGroups = useMemo(
		() =>
			proctorGroups.map((group) => {
				const students = selectedSemester === 'All' ? group.students : group.students.filter((student) => `Semester ${student.semester}` === selectedSemester);
				return { ...group, students };
			}),
		[selectedSemester, proctorGroups]
	);

	if (loading) {
		return (
			<div className="flex items-center justify-center p-8">
				<div className="text-lg text-[var(--brand-muted)]">Loading proctor-student data...</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			{/* Hidden file input */}
			<input
				ref={fileInputRef}
				type="file"
				accept=".xlsx,.xls,.csv"
				onChange={handleFileUpload}
				className="hidden"
			/>
			
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<button
					type="button"
					onClick={() => fileInputRef.current?.click()}
					className="w-full rounded-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] px-5 py-2 text-sm font-semibold text-white shadow-md shadow-black/20 transition hover:brightness-110 sm:w-auto"
				>
					upload excel sheet
				</button>
				<div className="relative w-full sm:w-auto">
					<button
						type="button"
						onClick={() => setIsSemesterMenuOpen((prev) => !prev)}
						className="flex w-full items-center justify-between gap-3 rounded-full bg-[var(--brand-blue-soft)] px-5 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-black shadow-md shadow-black/10 transition hover:brightness-105"
					>
						<span>semesters</span>
						<span className="text-lg leading-none">▾</span>
					</button>
					{isSemesterMenuOpen && (
						<ul className="absolute right-0 z-10 mt-2 w-44 overflow-hidden rounded-xl bg-white text-sm text-black shadow-lg shadow-black/20">
							{SEMESTERS.map((option) => (
								<li key={option}>
									<button
										type="button"
										onClick={() => {
											setSelectedSemester(option);
											setIsSemesterMenuOpen(false);
										}}
										className={`flex w-full px-4 py-2 text-left transition hover:bg-[var(--brand-blue-soft)] ${
											selectedSemester === option ? "bg-[var(--brand-blue-soft)] font-semibold" : ""
										}`}
									>
										{option}
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			<div className="flex flex-col gap-4">
				{filteredGroups.map((group, index) => {
					const isOpen = openGroup === group.proctor;
					return (
						<div
							key={`${group.proctor}-${index}`}
							className="rounded-3xl bg-gradient-to-r from-[var(--brand-blue-soft)] to-white p-[2px] shadow-md shadow-black/15"
						>
							<div className="rounded-[26px] bg-white p-1">
								<button
									type="button"
									onClick={() => setOpenGroup(isOpen ? null : group.proctor)}
									className="flex w-full items-center justify-between rounded-[24px] bg-[var(--brand-blue-soft)] px-6 py-4 text-left text-lg font-semibold text-black transition hover:brightness-105"
								>
									<span>Proctor - {group.proctor}</span>
									<span className="text-[var(--brand-muted)]">{isOpen ? "▴" : "▾"}</span>
								</button>

								{isOpen && (
									<div className="mx-4 mb-4 mt-3 rounded-2xl bg-[var(--brand-blue-soft)] px-6 py-5 text-black shadow-inner shadow-black/10">
										{group.students.length === 0 ? (
											<div className="rounded-xl border border-dashed border-[var(--brand-border)] bg-white/70 px-4 py-6 text-center text-sm font-medium text-[var(--brand-muted)]">
												No students for the selected semester.
											</div>
										) : (
											<ul className="flex flex-col gap-3 text-sm font-medium">
												{group.students
													.sort((a, b) => a.name.localeCompare(b.name))
													.map((student) => (
													<li
														key={student.usn}
														className="flex flex-nowrap items-center justify-between gap-6 rounded-xl bg-white px-4 py-3 text-black shadow shadow-black/10"
													>
														<button
															type="button"
															onClick={() => fetchStudentActivities(student.usn, student.name)}
															className="font-semibold text-[var(--brand-blue)] hover:text-[var(--brand-blue-dark)] hover:underline transition whitespace-nowrap text-left"
														>
															{student.name}
														</button>
														<div className="flex items-center gap-4 flex-shrink-0">
															<span className="text-[var(--brand-blue)]">→</span>
															<span className="w-24 text-center">{student.usn}</span>
															<span className="text-[var(--brand-blue)]">→</span>
															<span className="font-semibold w-20 text-right">Points: {student.points}</span>
														</div>
													</li>
												))}
											</ul>
										)}
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>

			{selectedStudentDocs && (
				<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
					<div className="rounded-3xl bg-white p-8 shadow-lg shadow-black/20 max-w-2xl mx-4 max-h-96 overflow-y-auto">
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-2xl font-semibold text-black">
								{selectedStudentDocs.name} - External Certificates
							</h3>
							<button
								onClick={() => setSelectedStudentDocs(null)}
								className="text-2xl text-[var(--brand-muted)] hover:text-black transition"
							>
								×
							</button>
						</div>
						{selectedStudentDocs.docs.length === 0 ? (
							<p className="text-[var(--brand-muted)]">No external certificates uploaded yet.</p>
						) : (
							<div className="space-y-3">
								{selectedStudentDocs.docs.map((doc: any) => (
									<a
										key={doc.id || doc.file_name}
										href={`http://localhost:5000/${doc.file_path}`}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-3 rounded-xl bg-[var(--brand-blue-soft)] p-4 text-black hover:brightness-105 transition"
									>
										<span className="text-2xl">📄</span>
										<div className="flex-1">
											<p className="font-semibold">{doc.file_name}</p>
											<p className="text-xs text-[var(--brand-muted)]">Uploaded: {new Date(doc.uploaded_at).toLocaleDateString()}</p>
										</div>
										<span className="text-lg">↓</span>
									</a>
								))}
							</div>
						)}
					</div>
				</div>
			)}

			{selectedStudentActivities && (
				<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
					<div className="rounded-3xl bg-white p-8 shadow-lg shadow-black/20 max-w-2xl mx-4 max-h-96 overflow-y-auto">
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-2xl font-semibold text-black">
								{selectedStudentActivities.name} - Activities
							</h3>
							<button
								onClick={() => setSelectedStudentActivities(null)}
								className="text-2xl text-[var(--brand-muted)] hover:text-black transition"
							>
								×
							</button>
						</div>
						{loadingActivities ? (
							<p className="text-[var(--brand-muted)]">Loading activities...</p>
						) : selectedStudentActivities.activities.length === 0 ? (
							<p className="text-[var(--brand-muted)]">No activities found for this student.</p>
						) : (
							<div className="space-y-3">
								{selectedStudentActivities.activities.map((activity: any) => (
									<div
										key={activity.id || activity.event_id}
										className="rounded-xl bg-[var(--brand-blue-soft)] p-4 text-black"
									>
										<p className="font-semibold">{activity.event_name || activity.name}</p>
										<p className="text-sm text-[var(--brand-muted)]">Points: {activity.points || 0}</p>
										{activity.date && (
											<p className="text-xs text-[var(--brand-muted)]">Date: {new Date(activity.date).toLocaleDateString()}</p>
										)}
										{activity.description && (
											<p className="text-xs text-[var(--brand-muted)] mt-1">{activity.description}</p>
										)}
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
