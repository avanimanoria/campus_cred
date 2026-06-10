"use client";

import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import { useApiData } from "@/hooks/useApiData";
import toast from "react-hot-toast";

type EventStudent = {
	student_id?: string;
	name?: string;
	student_name?: string;
	usn?: string;
	student_usn?: string;
	email?: string;
	student_email?: string;
	semester?: string;
	department?: string;
	status?: string;
};

export default function EventStudents() {
	const params = useParams();
	const eventId = params.id as string;
	const [students, setStudents] = useState<EventStudent[]>([]);
	const [loading, setLoading] = useState(true);
	const [eventTitle, setEventTitle] = useState("Event");
	const api = useApiData();

	useEffect(() => {
		loadEventStudents();
	}, [eventId]);

	async function loadEventStudents() {
		setLoading(true);
		try {
			// Fetch students who registered for this specific event
			const result = await api.get(`/faculty/events/${eventId}/students`, { requireAuth: false });

			// Support multiple response shapes to avoid runtime map errors
			const payload = (result as any)?.data ?? result;
			const studentSource = Array.isArray(payload)
				? payload
				: Array.isArray((payload as any)?.students)
					? (payload as any).students
					: Array.isArray((payload as any)?.data)
						? (payload as any).data
						: Array.isArray((payload as any)?.data?.students)
							? (payload as any).data.students
							: [];

			const studentList = studentSource.map((s: any) => ({
				student_id: s.student_id || s.user_id,
				name: s.name || s.student_name,
				student_name: s.student_name || s.name,
				usn: s.usn || s.student_usn,
				student_usn: s.student_usn || s.usn,
				email: s.email || s.student_email,
				student_email: s.student_email || s.email,
				semester: s.semester,
				department: s.department || s.dept,
				status: s.status,
			}));

			setStudents(studentList);

			// Try to get event title
			const titleCandidate = (payload as any)?.event_title || (payload as any)?.eventTitle;
			if (titleCandidate) setEventTitle(titleCandidate);
		} catch (error: any) {
			console.error("Failed to load event students:", error);
			toast.error("Failed to load students for this event");
			setStudents([]);
		} finally {
			setLoading(false);
		}
	}

	if (loading) {
		return (
			<section className="rounded-3xl border border-[var(--brand-border)] bg-[var(--brand-blue-soft)] p-6 shadow-lg shadow-black/20">
				<div className="text-center text-black">Loading students...</div>
			</section>
		);
	}

	return (
		<section className="rounded-3xl border border-[var(--brand-border)] bg-white p-6 shadow-lg shadow-black/20">
			<div className="mb-4">
				<h2 className="text-2xl font-semibold text-black">{eventTitle}</h2>
				<p className="mt-1 text-sm text-[var(--brand-muted)]">
					{students.length} student{students.length !== 1 ? "s" : ""} registered for this event
				</p>
			</div>

			{students.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-blue-soft)] px-6 py-8 text-center text-black">
					<p>No students have registered for this event yet.</p>
				</div>
			) : (
				<div className="overflow-x-auto">
					<table className="min-w-full table-fixed border-collapse text-sm text-black">
						<thead>
							<tr className="bg-[var(--brand-blue)] text-left font-semibold uppercase tracking-wide text-white">
								<th className="border border-[var(--brand-border)] px-4 py-3">Sl. No.</th>
								<th className="border border-[var(--brand-border)] px-4 py-3">Student Name</th>
								<th className="border border-[var(--brand-border)] px-4 py-3">USN</th>
								<th className="border border-[var(--brand-border)] px-4 py-3">Email</th>
								<th className="border border-[var(--brand-border)] px-4 py-3">Semester</th>
								<th className="border border-[var(--brand-border)] px-4 py-3">Department</th>
								<th className="border border-[var(--brand-border)] px-4 py-3">Status</th>
							</tr>
						</thead>
						<tbody>
							{students.map((student, index) => (
								<tr key={student.student_id || index} className={index % 2 === 0 ? "bg-white" : "bg-[var(--brand-blue-soft)]"}>
									<td className="border border-[var(--brand-border)] px-4 py-3 text-center font-medium">{index + 1}</td>
									<td className="border border-[var(--brand-border)] px-4 py-3 font-medium">{student.name || student.student_name}</td>
									<td className="border border-[var(--brand-border)] px-4 py-3">{student.usn || student.student_usn}</td>
									<td className="border border-[var(--brand-border)] px-4 py-3">{student.email || student.student_email}</td>
									<td className="border border-[var(--brand-border)] px-4 py-3">{student.semester}</td>
									<td className="border border-[var(--brand-border)] px-4 py-3">{student.department}</td>
									<td className="border border-[var(--brand-border)] px-4 py-3">
										<span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${
											student.status === "attended" ? "bg-green-100 text-green-800" : "bg-[var(--brand-blue)] text-white"
										}`}>
											{student.status || "Registered"}
										</span>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</section>
	);
}
