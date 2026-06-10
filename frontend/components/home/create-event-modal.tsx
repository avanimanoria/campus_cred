"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useApiData } from "@/hooks/useApiData";
import { auth } from "@/firebase/client";

type CreateEventModalProps = {
	open: boolean;
	onClose: () => void;
	onCreated?: () => void;
};

const fields = [
	{ key: "title", label: "Name :", type: "text", placeholder: "Enter event name" },
	{ key: "description", label: "Description:", type: "textarea", placeholder: "Describe the event" },
	{ key: "venue", label: "Venue:", type: "text", placeholder: "Event venue" },
	{ key: "date", label: "Date:", type: "date", placeholder: "" },
	{ key: "time", label: "Time:", type: "time", placeholder: "" },
	{ key: "dept_id", label: "Department:", type: "text", placeholder: "Department id" },
	{ key: "activity_points", label: "Activity Points:", type: "number", placeholder: "Points" },
	{ key: "category", label: "Category", type: "select", placeholder: "" },
];

type RoleExtensionRow = {
	id: string;
	name: string;
	usn: string;
	email: string;
	semester: string;
	department: string;
	fromDate: string;
	fromTime: string;
	toDate: string;
	toTime: string;
};

export function CreateEventModal({ open, onClose, onCreated }: CreateEventModalProps) {
	const [roleRows, setRoleRows] = useState<RoleExtensionRow[]>([]);
	const [formData, setFormData] = useState<Record<string, string>>({
		title: "",
		description: "",
		venue: "",
		date: "",
		time: "",
		dept_id: "1",
		activity_points: "",
		category: "",
	});
	const api = useApiData();

	const createEmptyRow = (): RoleExtensionRow => ({
		id: Math.random().toString(36).slice(2),
		name: "",
		usn: "",
		email: "",
		semester: "",
		department: "",
		fromDate: "",
		fromTime: "",
		toDate: "",
		toTime: "",
	});

	const addRoleRow = () => setRoleRows((rows) => [...rows, createEmptyRow()]);
	const ensureRoleRows = () => {
		if (roleRows.length === 0) addRoleRow();
	};

	const updateRoleRow = <K extends keyof RoleExtensionRow>(id: string, key: K, value: RoleExtensionRow[K]) =>
		setRoleRows((rows) => rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)));

	const deleteRoleRow = (id: string) =>
		setRoleRows((rows) => rows.filter((row) => row.id !== id));

	if (!open) return null;

	return (
		<div style={{maxHeight: '90vh', overflowY: 'scroll', paddingTop: 200}} className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4 py-8">
			<div className="relative w-full max-w-5xl rounded-3xl border border-[var(--brand-border)] bg-white p-8 text-black shadow-2xl">
				<button
					type="button"
					onClick={onClose}
					className="absolute right-6 top-6 text-2xl font-semibold text-[var(--brand-blue)] transition hover:scale-110"
					aria-label="Close"
				>
					×
				</button>

				<h2 className="text-center text-2xl font-semibold tracking-wide text-black">CREATE EVENT</h2>

				<form
					onSubmit={async (event) => {
						event.preventDefault();
						try {
							const user = auth.currentUser;
							if (!user) {
								toast.error("You must be signed in");
								return;
							}

							const start_at = formData.date && formData.time ? `${formData.date}T${formData.time}` : "";
							await api.post("/faculty/create-event", {
								title: formData.title,
								description: formData.description,
								category: formData.category || "General",
								start_at,
								venue: formData.venue,
								dept_id: parseInt(formData.dept_id || "1", 10),
								payment: { amount: 0, options: [] },
								created_by: user.uid,
							});

							toast.success("Event created! Waiting for HOD approval");
							setFormData({
								title: "",
								description: "",
								venue: "",
								date: "",
								time: "",
								dept_id: "1",
								activity_points: "",
								category: "",
							});
							onCreated?.();
							onClose();
						} catch (error: any) {
							toast.error(error?.message || "Failed to create event");
						}
					}}
					className="mt-6 rounded-[26px] border-2 border-[var(--brand-border)] bg-[var(--brand-blue-soft)] p-8"
				>
					<div className="grid gap-4">
						{fields.map((field) => (
							<label key={field.label} className="flex flex-col gap-2 text-sm font-semibold text-black sm:flex-row sm:items-center">
								<span className="w-36">{field.label}</span>
								{field.type === "textarea" ? (
									<textarea
										required
										value={formData[field.key]}
										onChange={(event) => setFormData((prev) => ({ ...prev, [field.key]: event.target.value }))}
										placeholder={field.placeholder}
										className="h-24 w-full rounded-lg border border-[var(--brand-border)] bg-white px-3 py-2 text-sm text-black outline-none focus:border-[var(--brand-blue)]"
									/>
								) : field.type === "select" ? (
									<select
										required
										value={formData[field.key]}
										onChange={(event) => setFormData((prev) => ({ ...prev, [field.key]: event.target.value }))}
										className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-3 py-2 text-sm text-black outline-none focus:border-[var(--brand-blue)]"
									>
										<option value="">Select</option>
										<option value="external">External</option>
										<option value="internal">Internal</option>
									</select>
								) : (
									<input
										required
										value={formData[field.key]}
										onChange={(event) => setFormData((prev) => ({ ...prev, [field.key]: event.target.value }))}
										type={field.type}
										placeholder={field.placeholder}
										className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-3 py-2 text-sm text-black outline-none focus:border-[var(--brand-blue)]"
									/>
								)}
							</label>
						))}
					</div>

					<div className="mt-12 flex items-center justify-between">
						<button
							type="button"
							onClick={ensureRoleRows}
							className="cursor-pointer rounded-lg bg-[var(--brand-blue-soft)] px-6 py-2 text-xs font-semibold uppercase tracking-wide text-black shadow-md shadow-black/10"
						>
							Role Extension
						</button>
						<button
							type="submit"
							className="cursor-pointer rounded-lg bg-[var(--brand-blue)] px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-md shadow-black/10"
						>
							Create
						</button>
					</div>
				</form>

				{roleRows.length > 0 && (
					<section className="mt-8 space-y-4">
						<div className="flex justify-end">
							<button
								type="button"
								onClick={addRoleRow}
								className="rounded-full bg-[var(--brand-blue)] px-5 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-md shadow-black/20 transition hover:brightness-110"
							>
								+ Add Row
							</button>
						</div>
						<div className="max-h-[360px] overflow-y-auto overflow-x-auto rounded-2xl border border-[var(--brand-border)] bg-white">
							<table className="min-w-full table-fixed text-sm text-black">
								<thead className="text-left text-xs font-semibold uppercase tracking-wide text-black">
									<tr className="bg-[var(--brand-blue-soft)]">
										<th className="rounded-tl-2xl px-4 py-3">Student Name</th>
										<th className="px-4 py-3">USN</th>
										<th className="px-4 py-3">Email</th>
										<th className="px-4 py-3">Semester</th>
										<th className="px-4 py-3">Department</th>
										<th className="px-4 py-3">From Date &amp; Time</th>
										<th className="px-4 py-3">To Date &amp; Time</th>
										<th className="rounded-tr-2xl px-4 py-3 text-center">Action</th>
									</tr>
								</thead>
								<tbody className="bg-white">
									{roleRows.map((row) => (
										<tr key={row.id} className="border-b border-[var(--brand-border)]">
											<td className="px-4 py-3">
												<input
													value={row.name}
													onChange={(event) => updateRoleRow(row.id, "name", event.target.value)}
													placeholder="Student Name"
													className="w-full rounded-md border border-[var(--brand-border)] bg-white px-3 py-2 text-xs text-black outline-none focus:border-[var(--brand-blue)]"
												/>
											</td>
											<td className="px-4 py-3">
												<input
													value={row.usn}
													onChange={(event) => updateRoleRow(row.id, "usn", event.target.value)}
													placeholder="USN"
													className="w-full rounded-md border border-[var(--brand-border)] bg-white px-3 py-2 text-xs text-black outline-none focus:border-[var(--brand-blue)]"
												/>
											</td>
											<td className="px-4 py-3">
												<input
													value={row.email}
													onChange={(event) => updateRoleRow(row.id, "email", event.target.value)}
													type="email"
													placeholder="Email"
													className="w-full rounded-md border border-[var(--brand-border)] bg-white px-3 py-2 text-xs text-black outline-none focus:border-[var(--brand-blue)]"
												/>
											</td>
											<td className="px-4 py-3">
												<input
													value={row.semester}
													onChange={(event) => updateRoleRow(row.id, "semester", event.target.value)}
													placeholder="Semester"
													className="w-full rounded-md border border-[var(--brand-border)] bg-white px-3 py-2 text-xs text-black outline-none focus:border-[var(--brand-blue)]"
												/>
											</td>
											<td className="px-4 py-3">
												<input
													value={row.department}
													onChange={(event) => updateRoleRow(row.id, "department", event.target.value)}
													placeholder="Department"
													className="w-full rounded-md border border-[var(--brand-border)] bg-white px-3 py-2 text-xs text-black outline-none focus:border-[var(--brand-blue)]"
												/>
											</td>
											<td className="px-4 py-3">
												<div className="grid grid-cols-2 gap-2">
													<input
														value={row.fromDate}
														onChange={(event) => updateRoleRow(row.id, "fromDate", event.target.value)}
														type="date"
														className="w-full rounded-md border border-[#d9c4a8] bg-white px-3 py-2 text-xs text-[#3d2a15] outline-none focus:border-[#1a9eff]"
													/>
													<input
														value={row.fromTime}
														onChange={(event) => updateRoleRow(row.id, "fromTime", event.target.value)}
														type="time"
														className="w-full rounded-md border border-[#d9c4a8] bg-white px-3 py-2 text-xs text-[#3d2a15] outline-none focus:border-[#1a9eff]"
													/>
												</div>
											</td>
											<td className="px-4 py-3">
												<div className="grid grid-cols-2 gap-2">
													<input
														value={row.toDate}
														onChange={(event) => updateRoleRow(row.id, "toDate", event.target.value)}
														type="date"
														className="w-full rounded-md border border-[#d9c4a8] bg-white px-3 py-2 text-xs text-[#3d2a15] outline-none focus:border-[#1a9eff]"
													/>
													<input
														value={row.toTime}
														onChange={(event) => updateRoleRow(row.id, "toTime", event.target.value)}
														type="time"
														className="w-full rounded-md border border-[#d9c4a8] bg-white px-3 py-2 text-xs text-[#3d2a15] outline-none focus:border-[#1a9eff]"
													/>
												</div>
											</td>
											<td className="px-4 py-3 text-center">
												<button
													type="button"
													onClick={() => deleteRoleRow(row.id)}
													className="rounded-md bg-[#e34d4f] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm transition hover:brightness-110"
												>
													Delete
												</button>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>
				)}
			</div>
		</div>
	);
}
