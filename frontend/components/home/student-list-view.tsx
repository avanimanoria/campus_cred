"use client";

import { useMemo, useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useApiData } from "@/hooks/useApiData";
import { auth } from "@/firebase/client";

type Student = {
	name?: string;
	student_name?: string;
	semester: number;
	currentPoints?: number;
	lastEvent?: string;
	lastPoints?: number;
	student_email?: string;
	student_usn?: string;
};

type StudentDocs = {
	usn: string;
	name: string;
	docs: Array<{ document_id: number; file_name?: string; verification_status?: string }>;
};

const SEMESTERS = ["All", "Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8"];

export function StudentListView() {
	const [selectedSemester, setSelectedSemester] = useState<string>("All");
	const [openSemesterMenu, setOpenSemesterMenu] = useState(false);
	const [expanded, setExpanded] = useState<string | null>(null);
	const [students, setStudents] = useState<Student[]>([]);
	const [loading, setLoading] = useState(true);
	const [formValues, setFormValues] = useState<Record<string, { eventName: string; activityPoints: string }>>({});
	const [selectedStudentDocs, setSelectedStudentDocs] = useState<StudentDocs | null>(null);
	const [docsLoading, setDocsLoading] = useState(false);
	const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);
	const [selectedActivityType, setSelectedActivityType] = useState<"events" | "external">("events");
	const api = useApiData();

	// Fetch students assigned to this proctor from HOD upload
	useEffect(() => {
		loadStudents();
	}, []);

	async function loadStudents() {
		setLoading(true);
		try {
			// Get logged-in proctor's email from localStorage or Firebase auth
			let proctorEmail = localStorage.getItem("userEmail") || "";
			
			// Fallback to Firebase auth if not in localStorage
			if (!proctorEmail && auth.currentUser?.email) {
				proctorEmail = auth.currentUser.email;
				localStorage.setItem("userEmail", proctorEmail);
			}
			
			if (!proctorEmail) {
				toast.error("Proctor email not found. Please log in again.");
				setLoading(false);
				return;
			}
			const result = await api.get(`/proctor/my-students?proctor_email=${encodeURIComponent(proctorEmail)}`, { requireAuth: false });
			const studentList = ((result?.data || result) as any[]).map((s: any) => ({
				student_name: s.student_name,
				name: s.student_name,
				semester: parseInt(s.semester, 10) || 0,
				student_email: s.student_email,
				student_usn: s.student_usn,
				currentPoints: 0,
				lastEvent: "",
				lastPoints: 0,
			}));

			// Fetch activity points for each student
			const studentsWithPoints = await Promise.all(
				studentList.map(async (student) => {
					try {
						const pointsResponse = await fetch(
							`http://localhost:5000/api/proctor/student/${student.student_usn}/total-points`,
							{
								headers: {
									"x-user-id": "1",
									"x-user-role": "proctor"
								}
							}
						);

						if (pointsResponse.ok) {
							const pointsData = await pointsResponse.json();
							console.log(`Points response for ${student.student_usn}:`, pointsData);
							
							// Handle different response formats
							let totalPoints = 0;
							if (pointsData.data && typeof pointsData.data === 'object') {
								totalPoints = pointsData.data.totalPoints || 0;
							} else if (pointsData.totalPoints !== undefined) {
								totalPoints = pointsData.totalPoints;
							}
							
							const numPoints = parseInt(String(totalPoints), 10);
							console.log(`Parsed points for ${student.student_usn}: ${numPoints}`);
							
							return {
								...student,
								currentPoints: isNaN(numPoints) ? 0 : numPoints
							};
						} else {
							console.warn(`Failed to fetch points for ${student.student_usn}: ${pointsResponse.status}`);
							return student;
						}
					} catch (err) {
						console.error(`Failed to fetch points for ${student.student_usn}:`, err);
					}
					return student;
				})
			);

			setStudents(studentsWithPoints);

			// Initialize form values
			const formInit = studentsWithPoints.reduce((acc: Record<string, any>, student: Student) => {
				const name = student.name || student.student_name || "";
				acc[name] = {
					eventName: student.lastEvent || "",
					activityPoints: (student.lastPoints || 0).toString(),
				};
				return acc;
			}, {});
			setFormValues(formInit);
		} catch (error: any) {
			console.error("Failed to load students:", error);
			toast.error("Failed to load students");
			setStudents([]);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		console.log("Students updated:", students);
	}, [students]);

	async function fetchStudentDocuments(usn: string, name: string) {
		setDocsLoading(true);
		try {
			const response = await fetch(`http://localhost:5000/api/students/certificates/${usn}`, {
				method: "GET",
				headers: {
					"x-user-id": "1",
					"x-user-role": "proctor",
					"Content-Type": "application/json"
				}
			});

			console.log("Response status:", response.status);
			const result = await response.json();
			console.log("Response data:", result);

			if (!response.ok) {
				throw new Error(result.error || "Failed to fetch documents");
			}

			setSelectedStudentDocs({
				usn,
				name,
				docs: Array.isArray(result.data) ? result.data : []
			});
			toast.success("Documents loaded");
		} catch (error: any) {
			console.error("Failed to fetch documents:", error);
			toast.error(error.message || "Failed to load documents");
		} finally {
			setDocsLoading(false);
		}
	}

	async function verifyStudentDocument(docId: number, status: "approved" | "rejected") {
		try {
			const response = await fetch(`http://localhost:5000/api/proctor/documents/${docId}/verify`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-user-id": "1",
					"x-user-role": "proctor"
				},
				body: JSON.stringify({
					verification_status: status,
					verified_by: 1
				})
			});

			const result = await response.json();
			if (!response.ok) {
				throw new Error(result?.error || result?.message || "Failed to update document");
			}

			toast.success(`Document ${status}`);
			if (selectedStudentDocs?.usn) {
				fetchStudentDocuments(selectedStudentDocs.usn, selectedStudentDocs.name);
			}
		} catch (error: any) {
			toast.error(error.message || "Failed to update document");
		}
	}

	async function submitActivityPoints(studentName: string, student: Student) {
		const eventName = formValues[studentName]?.eventName || "";
		const activityPoints = formValues[studentName]?.activityPoints || "";

		if (!eventName || !activityPoints) {
			toast.error("Please fill in both event name and activity points");
			return;
		}

		try {
			const response = await fetch(`http://localhost:5000/api/proctor/activity_points/award`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-user-id": "1",
					"x-user-role": "proctor"
				},
				body: JSON.stringify({
					user_id: student.student_usn,
					event_id: null,
					points: parseInt(activityPoints, 10),
					category: "external",
					semester: student.semester,
					awarded_by: "1"
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to submit activity points");
			}

			await response.json();
			toast.success("Activity points submitted successfully!");

			// Reset form for this student
			setFormValues((prev) => ({
				...prev,
				[studentName]: {
					eventName: "",
					activityPoints: ""
				}
			}));

			// Fetch updated points for this specific student
			if (student.student_usn) {
				const pointsResponse = await fetch(
					`http://localhost:5000/api/proctor/student/${student.student_usn}/total-points`,
					{
						headers: {
							"x-user-id": "1",
							"x-user-role": "proctor"
						}
					}
				);

				if (pointsResponse.ok) {
					const pointsData = await pointsResponse.json();
					let totalPoints = 0;
					if (pointsData.data && typeof pointsData.data === 'object') {
						totalPoints = pointsData.data.totalPoints || 0;
					} else if (pointsData.totalPoints !== undefined) {
						totalPoints = pointsData.totalPoints;
					}

					// Update the modal with new points
					setSelectedStudentForModal((prev) => {
						if (!prev) return null;
						return {
							...prev,
							currentPoints: parseInt(String(totalPoints), 10)
						};
					});
				}
			}

			// Also reload all students to keep everything in sync
			await loadStudents();

			// Trigger window event to notify parent component (Home) to refresh pie chart
			window.dispatchEvent(new Event('activityPointsUpdated'));
		} catch (error: any) {
			console.error("Submit error:", error);
			toast.error(error.message || "Failed to submit activity points");
		}
	}

	// Fetch updated points when modal opens
	useEffect(() => {
		if (selectedStudentForModal?.student_usn) {
			const fetchLatestPoints = async () => {
				try {
					const response = await fetch(
						`http://localhost:5000/api/proctor/student/${selectedStudentForModal.student_usn}/total-points`,
						{
							headers: {
								"x-user-id": "1",
								"x-user-role": "proctor"
							}
						}
					);

					if (response.ok) {
						const data = await response.json();
						let totalPoints = 0;
						if (data.data && typeof data.data === 'object') {
							totalPoints = data.data.totalPoints || 0;
						} else if (data.totalPoints !== undefined) {
							totalPoints = data.totalPoints;
						}

						const numPoints = parseInt(String(totalPoints), 10);
						setSelectedStudentForModal((prev) => {
							if (!prev) return null;
							return {
								...prev,
								currentPoints: isNaN(numPoints) ? 0 : numPoints
							};
						});
					}
				} catch (err) {
					console.error("Failed to fetch updated points:", err);
				}
			};

			fetchLatestPoints();
		}
	}, [selectedStudentForModal?.student_usn]);

	const filteredStudents = useMemo(() => {
		if (selectedSemester === "All") return students;
		const semesterNumber = Number(selectedSemester.replace("Semester ", ""));
		return students.filter((student) => student.semester === semesterNumber);
	}, [selectedSemester, students]);

	return (
		<div className="flex flex-col gap-6">
			<div className="flex items-center justify-end">
				<div className="relative">
					<button
						type="button"
						onClick={() => setOpenSemesterMenu((prev) => !prev)}
						className="flex items-center gap-2 rounded-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] px-5 py-2 text-sm font-semibold text-white shadow-md shadow-black/20 transition hover:brightness-110"
					>
						<span className="text-xs font-semibold uppercase tracking-[0.2em]">semesters</span>
						<span className="text-white/80">▾</span>
					</button>
					{openSemesterMenu && (
						<ul className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl bg-white text-sm text-black shadow-lg shadow-black/20">
							{SEMESTERS.map((option) => (
								<li key={option}>
									<button
										type="button"
										onClick={() => {
											setSelectedSemester(option);
											setOpenSemesterMenu(false);
											setExpanded(null);
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
				{loading && (
					<div className="rounded-3xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-blue-soft)] px-6 py-10 text-center text-sm font-medium text-[var(--brand-muted)]">
						Loading students...
					</div>
				)}

				{!loading && filteredStudents.length === 0 && (
					<div className="rounded-3xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-blue-soft)] px-6 py-10 text-center text-sm font-medium text-[var(--brand-muted)]">
						No students assigned to you.
					</div>
				)}

				{!loading && filteredStudents.map((student) => {
					const studentName = student.name || student.student_name || "Unknown";
					return (
						<div key={student.student_usn || studentName} className="rounded-3xl bg-gradient-to-b from-[var(--brand-blue-soft)] to-white p-[2px] shadow-md shadow-black/15">
							<div className="rounded-[26px] bg-white p-1">
								<button
									type="button"
									onClick={() => setSelectedStudentForModal(student)}
									className="flex w-full items-center justify-between rounded-[24px] bg-[var(--brand-blue-soft)] px-6 py-4 text-left text-lg font-semibold text-black transition hover:brightness-105"
								>
									<span className="hover:underline cursor-pointer">{studentName}</span>
									<span className="text-[var(--brand-muted)]">→</span>
								</button>
							</div>
						</div>
					);
				})}
			</div>

			{selectedStudentForModal && (
				<div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
					<div className="rounded-3xl bg-white p-8 shadow-lg shadow-black/20 max-w-2xl mx-4 max-h-96 overflow-y-auto">
						<div className="flex items-center justify-between mb-6">
							<h3 className="text-2xl font-semibold text-black">
								{selectedStudentForModal.name || selectedStudentForModal.student_name}
							</h3>
							<button
								onClick={() => setSelectedStudentForModal(null)}
								className="text-2xl text-[var(--brand-muted)] hover:text-black transition"
							>
								×
							</button>
						</div>
						<form
							onSubmit={(event) => {
								event.preventDefault();
								const studentName = selectedStudentForModal.name || selectedStudentForModal.student_name || "Unknown";
								submitActivityPoints(studentName, selectedStudentForModal);
							}}
							className="space-y-5"
						>
							{selectedStudentForModal.student_usn && (
								<div className="text-xs text-[var(--brand-muted)]">
									<span>USN: {selectedStudentForModal.student_usn}</span>
								</div>
							)}
							{selectedStudentForModal.student_email && (
								<div className="text-xs text-[var(--brand-muted)]">
									<span>Email: {selectedStudentForModal.student_email}</span>
								</div>
							)}
							<div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.2em] text-black">
								<span>➜</span>
								<span>current activity points : {selectedStudentForModal.currentPoints}</span>
							</div>

							{/* Activity Type Slider */}
							<div className="flex items-center gap-2 bg-[var(--brand-blue-soft)] rounded-full p-1">
								<button
									type="button"
									onClick={() => setSelectedActivityType("events")}
									className={`flex-1 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.15em] transition ${
										selectedActivityType === "events"
											? "bg-[var(--brand-blue)] text-white shadow-md"
											: "text-black hover:bg-white/50"
									}`}
								>
									📅 Events
								</button>
								<button
									type="button"
									onClick={() => setSelectedActivityType("external")}
									className={`flex-1 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-[0.15em] transition ${
										selectedActivityType === "external"
											? "bg-[var(--brand-blue)] text-white shadow-md"
											: "text-black hover:bg-white/50"
									}`}
								>
									⭐ External
								</button>
							</div>

							<div className="flex flex-col gap-3 text-sm">
								{selectedActivityType === "external" && (
									<button
										type="button"
										onClick={() => {
											const usn = selectedStudentForModal.student_usn || "";
											const name = selectedStudentForModal.name || selectedStudentForModal.student_name || "";
											fetchStudentDocuments(usn, name);
											setSelectedStudentForModal(null);
										}}
										className="flex w-fit items-center gap-2 rounded-full bg-[var(--brand-blue)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white shadow shadow-black/20 transition hover:brightness-110"
									>
										<span className="text-base leading-none">⇩</span>
										<span>ext docs</span>
									</button>
								)}
								{selectedActivityType === "external" && (
									<>
										<label className="flex flex-col gap-2">
											<span className="text-xs uppercase text-[var(--brand-muted)]">Event name</span>
											<input
												type="text"
												value={formValues[selectedStudentForModal.name || selectedStudentForModal.student_name || ""]?.eventName ?? ""}
												onChange={(event) => {
													const studentName = selectedStudentForModal.name || selectedStudentForModal.student_name || "";
													setFormValues((prev) => ({
														...prev,
														[studentName]: {
															...prev[studentName],
															eventName: event.target.value,
														},
													}));
												}}
												className="rounded-lg border border-dashed border-[var(--brand-border)] bg-white px-3 py-2 text-base font-medium text-black focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
											/>
										</label>
										<label className="flex flex-col gap-2">
											<span className="text-xs uppercase text-[var(--brand-muted)]">Activity points</span>
											<input
												type="number"
												min={0}
												value={formValues[selectedStudentForModal.name || selectedStudentForModal.student_name || ""]?.activityPoints ?? ""}
												onChange={(event) => {
													const studentName = selectedStudentForModal.name || selectedStudentForModal.student_name || "";
													setFormValues((prev) => ({
														...prev,
														[studentName]: {
															...prev[studentName],
															activityPoints: event.target.value,
														},
													}));
												}}
												className="rounded-lg border border-dashed border-[var(--brand-border)] bg-white px-3 py-2 text-base font-medium text-black focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
											/>
										</label>
									</>
								)}
							</div>
							<div className="mt-5 flex justify-end gap-3">
								<button
									type="button"
									onClick={() => setSelectedStudentForModal(null)}
									className="rounded-full bg-[var(--brand-blue-soft)] px-6 py-2 text-sm font-semibold text-black shadow shadow-black/10 transition hover:brightness-110"
								>
									Close
								</button>
								<button
									type="submit"
									className="rounded-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] px-6 py-2 text-sm font-semibold text-white shadow shadow-black/20 transition hover:brightness-110"
								>
									Submit
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

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
						{docsLoading ? (
							<p className="text-[var(--brand-muted)]">Loading documents...</p>
						) : selectedStudentDocs.docs.length === 0 ? (
							<p className="text-[var(--brand-muted)]">No external certificates uploaded yet.</p>
						) : (
							<div className="space-y-4">
								{selectedStudentDocs.docs.map((doc: any) => (
									<div key={doc.document_id} className="rounded-2xl border border-[var(--brand-border)] p-4">
										<div className="flex flex-wrap items-center justify-between gap-3">
											<div>
												<p className="text-sm font-semibold text-black">{doc.file_name || "Document"}</p>
												<p className="text-xs text-[var(--brand-muted)]">Status: {doc.verification_status || "pending"}</p>
											</div>
											<div className="flex items-center gap-2">
												<button
													onClick={() => verifyStudentDocument(doc.document_id, "approved")}
													className="rounded-full bg-[var(--brand-blue)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-white"
												>
													Approve
												</button>
												<button
													onClick={() => verifyStudentDocument(doc.document_id, "rejected")}
													className="rounded-full bg-red-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.15em] text-red-700"
												>
													Reject
												</button>
											</div>
										</div>
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
