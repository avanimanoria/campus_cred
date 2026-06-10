"use client";

import { useMemo, useState, useEffect } from "react";
import toast from "react-hot-toast";

type ApprovalCard = {
	event_id?: number;
	category_id?: number;
	title?: string;
	name?: string;
	venue?: string;
	start_at?: string;
	description?: string;
	category?: string;
	max_points?: number;
	created_at?: string;
};

export function HODApprovalsView() {
	const [activeSubTab, setActiveSubTab] = useState<"events" | "categories">("events");
	const [eventApprovals, setEventApprovals] = useState<ApprovalCard[]>([]);
	const [categoryApprovals, setCategoryApprovals] = useState<ApprovalCard[]>([]);
	const [loading, setLoading] = useState(true);
	const [remarkModal, setRemarkModal] = useState<{ open: boolean; card: ApprovalCard | null; note: string; type: "event" | "category" }>({
		open: false,
		card: null,
		note: "",
		type: "event",
	});

	// Fetch pending events and categories from backend
	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			await Promise.all([fetchPendingEvents(), fetchPendingCategories()]);
			setLoading(false);
		};
		fetchData();
	}, []);

	async function fetchPendingEvents() {
		try {
			const deptId = "1"; // Default dept_id
			const response = await fetch(`http://localhost:5000/api/hod/${deptId}/events/pending`, {
				headers: {
					"x-user-id": "1",
					"x-user-role": "hod"
				}
			});

			if (!response.ok) {
				throw new Error("Failed to fetch pending events");
			}

			const result = await response.json();
			setEventApprovals(result.data || []);
		} catch (error: any) {
			console.error("Failed to fetch pending events:", error);
			toast.error("Failed to load pending events");
		}
	}

	async function fetchPendingCategories() {
		try {
			const deptId = "1"; // Default dept_id
			const response = await fetch(`http://localhost:5000/api/hod/${deptId}/categories/pending`, {
				headers: {
					"x-user-id": "1",
					"x-user-role": "hod"
				}
			});

			if (!response.ok) {
				throw new Error("Failed to fetch pending categories");
			}

			const result = await response.json();
			setCategoryApprovals(result.data || []);
		} catch (error: any) {
			console.error("Failed to fetch pending categories:", error);
			toast.error("Failed to load pending categories");
		}
	}

	async function handleApprove(id: number, type: "event" | "category") {
		try {
			const deptId = "1"; // Default dept_id
			const endpoint = type === "event" 
				? `http://localhost:5000/api/hod/${deptId}/events/approve`
				: `http://localhost:5000/api/hod/${deptId}/categories/approve`;
			
			const requestBody = { [type === "event" ? "event_id" : "category_id"]: id };
			console.log(`Approving ${type}:`, { endpoint, requestBody });
			
			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-user-id": "1",
					"x-user-role": "hod"
				},
				body: JSON.stringify(requestBody)
			});

			const responseData = await response.json();
			console.log(`Response from ${endpoint}:`, responseData);

			if (!response.ok) {
				const errorMessage = responseData.message || responseData.error || `Failed to approve ${type}`;
				throw new Error(errorMessage);
			}

			toast.success(`${type === "event" ? "Event" : "Category"} approved successfully!`);
			if (type === "event") {
				setEventApprovals(prev => prev.filter(e => e.event_id !== id));
			} else {
				setCategoryApprovals(prev => prev.filter(c => c.category_id !== id));
			}
		} catch (error: any) {
			console.error(`Failed to approve ${type}:`, error.message);
			toast.error(error.message || `Failed to approve ${type}`);
		}
	}

	async function handleReject(id: number, remarks: string, type: "event" | "category") {
		try {
			const deptId = "1"; // Default dept_id
			const endpoint = type === "event"
				? `http://localhost:5000/api/hod/${deptId}/events/reject`
				: `http://localhost:5000/api/hod/${deptId}/categories/reject`;
			
			const requestBody = { 
				[type === "event" ? "event_id" : "category_id"]: id, 
				reason: remarks // Use 'reason' to match backend rejectCategory
			};
			console.log(`Rejecting ${type}:`, { endpoint, requestBody });
			
			const response = await fetch(endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"x-user-id": "1",
					"x-user-role": "hod"
				},
				body: JSON.stringify(requestBody)
			});

			const responseData = await response.json();
			console.log(`Response from ${endpoint}:`, responseData);

			if (!response.ok) {
				const errorMessage = responseData.message || responseData.error || `Failed to reject ${type}`;
				throw new Error(errorMessage);
			}

			toast.success(`${type === "event" ? "Event" : "Category"} rejected`);
			if (type === "event") {
				setEventApprovals(prev => prev.filter(e => e.event_id !== id));
			} else {
				setCategoryApprovals(prev => prev.filter(c => c.category_id !== id));
			}
			closeRemarkModal();
		} catch (error: any) {
			console.error(`Failed to reject ${type}:`, error);
			toast.error(error.message || `Failed to reject ${type}`);
		}
	}

	const approvals = useMemo(
		() => (activeSubTab === "events" ? eventApprovals : categoryApprovals),
		[activeSubTab, eventApprovals, categoryApprovals]
	);
	const closeRemarkModal = () => setRemarkModal({ open: false, card: null, note: "", type: "event" });

	return (
		<div className="flex flex-col gap-6">
			<div className="rounded-full bg-[var(--brand-blue-soft)] p-2">
				<div className="grid grid-cols-2 gap-2">
					<button
						type="button"
						onClick={() => setActiveSubTab("events")}
						className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
							activeSubTab === "events"
								? "bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] text-white"
								: "bg-transparent text-black"
						}`}
					>
						Events Approvals
					</button>
					<button
						type="button"
						onClick={() => setActiveSubTab("categories")}
						className={`rounded-full px-6 py-3 text-sm font-semibold transition ${
							activeSubTab === "categories"
								? "bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] text-white"
								: "bg-transparent text-black"
						}`}
					>
						Category Approvals
					</button>
				</div>
			</div>

			<div className="flex flex-col gap-4">
				{loading && (
					<div className="rounded-3xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-blue-soft)] px-6 py-10 text-center text-sm font-medium text-[var(--brand-muted)]">
						Loading pending approvals...
					</div>
				)}
				
				{!loading && approvals.map((item) => {
					const isEvent = activeSubTab === "events";
				const id = isEvent ? (item.event_id || 0) : (item.category_id || 0);				const title = isEvent ? item.title : item.name;
				const eventDate = isEvent && item.start_at ? new Date(item.start_at) : null;					const dateStr = eventDate ? eventDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
					const timeStr = eventDate ? eventDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '';
					const createdDate = !isEvent && item.created_at ? new Date(item.created_at) : null;
					const createdDateStr = createdDate ? createdDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

					return (
					<div
						key={id}
						className="rounded-[36px] bg-gradient-to-r from-[var(--brand-blue-soft)] to-white p-[3px] shadow-lg shadow-black/15"
					>
						<div className="flex flex-col gap-4 rounded-[32px] bg-white p-1">
							<div className="flex flex-col gap-3 rounded-[28px] bg-[var(--brand-blue-soft)] px-8 py-6 text-black">
								<div className="flex flex-col gap-1 text-lg font-semibold">
									<span className="text-xl font-bold">{title}</span>
									{isEvent && item.venue && (
										<span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-muted)]">
											Venue : {item.venue}
										</span>
									)}
									{isEvent && dateStr && (
										<span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-muted)]">
											{dateStr} • {timeStr}
										</span>
									)}
									{!isEvent && item.max_points && (
										<span className="text-sm font-semibold text-[var(--brand-muted)]">
											Max Points: {item.max_points}
										</span>
									)}
									{!isEvent && createdDateStr && (
										<span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--brand-muted)]">
											Requested {createdDateStr}
										</span>
									)}
								</div>

								<div className="flex flex-wrap justify-end gap-3">
									<button
										type="button"
										onClick={() => handleApprove(id, isEvent ? "event" : "category")}
										className="flex items-center gap-2 rounded-full bg-[var(--brand-blue)] px-6 py-2 text-sm font-semibold text-white shadow shadow-black/20 transition hover:brightness-110"
									>
										<span>✔</span>
										Approve
									</button>
									<button
										type="button"
										onClick={() => setRemarkModal({ open: true, card: item, note: "", type: isEvent ? "event" : "category" })}
										className="flex items-center gap-2 rounded-full bg-[var(--brand-blue-dark)] px-6 py-2 text-sm font-semibold text-white shadow shadow-black/20 transition hover:brightness-110"
									>
										<span>✕</span>
										Reject
									</button>
									<button
										type="button"
										onClick={() => setRemarkModal({ open: true, card: item, note: "", type: isEvent ? "event" : "category" })}
										className="flex items-center gap-2 rounded-full bg-[var(--brand-blue-soft)] px-6 py-2 text-sm font-semibold text-black shadow shadow-black/20 transition hover:brightness-110"
									>
										<span>✎</span>
										Remarks
									</button>
								</div>
							</div>
						</div>
					</div>
				)})}

				{!loading && approvals.length === 0 && (
					<div className="rounded-3xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-blue-soft)] px-6 py-10 text-center text-sm font-medium text-[var(--brand-muted)]">
						No pending approvals.
					</div>
				)}
			</div>

			{remarkModal.open && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
					<form
						onSubmit={(event) => {
							event.preventDefault();
							if (remarkModal.card) {
								const id = remarkModal.type === "event" ? remarkModal.card.event_id : remarkModal.card.category_id;
								handleReject(id!, remarkModal.note, remarkModal.type);
							}
						}}
						className="w-full max-w-lg rounded-[36px] bg-white p-6 text-black shadow-2xl shadow-black/30 sm:p-8"
					>
						<div className="flex items-start justify-between">
							<h2 className="text-2xl font-semibold">Add Rejection Remark</h2>
							<button
								type="button"
								onClick={closeRemarkModal}
								className="text-lg font-semibold text-[var(--brand-muted)] transition hover:text-black"
							>
								✕
							</button>
						</div>
						<div className="mt-5 flex flex-col gap-3 text-sm">
							<span className="font-semibold">Rejection Reason:</span>
							<textarea
								rows={5}
								value={remarkModal.note}
								onChange={(event) =>
									setRemarkModal((prev) => ({ ...prev, note: event.target.value }))
								}
								placeholder="Enter the reason for rejection..."
								className="rounded-2xl border border-dashed border-[var(--brand-border)] bg-white px-4 py-3 text-base text-black focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)]"
								required
							/>
						</div>
						<div className="mt-6 flex justify-end gap-3">
							<button
								type="button"
								onClick={closeRemarkModal}
								className="rounded-full border border-[var(--brand-border)] px-6 py-2 text-sm font-semibold text-black transition hover:brightness-110"
							>
								Cancel
							</button>
							<button
								type="submit"
								className="rounded-full bg-[var(--brand-blue)] px-6 py-2 text-sm font-semibold text-white shadow shadow-black/20 transition hover:brightness-110"
							>
								Submit
							</button>
						</div>
					</form>
				</div>
			)}
		</div>
	);
}
