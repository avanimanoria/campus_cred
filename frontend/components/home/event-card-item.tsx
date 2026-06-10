import { FaDochub, FaDownload } from "react-icons/fa";
import { EventCard } from "./home-data";
import { useRouter } from "next/navigation";
import { useApiData } from "@/hooks/useApiData";
import { useState } from "react";

export function EventCardItem({ event, role , activeTab, onRegister}: { event: EventCard; role: string, activeTab: string, onRegister?: () => void }) {
	const isRegistered = event.status === "registered";
	const isAttended = event.status === "attended";
	const isMissed = event.status === "missed";
	const isExternal = event.category === "external";
	const isExternalActivity = event.source === "external" || event.source === "student-upload"; // External activity sources
	const isPendingApproval = event.approval_status === "pending";
	const hasDocument = Boolean(event.file_path);
	const statusLabel = isPendingApproval
		? "Approval Pending"
		: event.approval_status === "rejected"
			? "Rejected"
			: event.approval_status === "approved"
				? "Approved"
				: isAttended
					? "Attended"
					: isMissed
						? "Missed"
					: isRegistered
						? "Registered"
						: "Active";
    const router = useRouter();
	const api = useApiData();
	const [isRegistering, setIsRegistering] = useState(false);

	const handleRegister = async () => {
		setIsRegistering(true);
		try {
			const result = await api.post(`/students/register/${event.id}`);
			if (result?.status === 'success') {
				onRegister?.();
				router.refresh();
			}
		} catch (error) {
			console.error("Registration failed:", error);
			alert("Failed to register for event");
		} finally {
			setIsRegistering(false);
		}
	};

	const handleDownloadDocument = () => {
		if (event.file_path) {
			// Download the document
			const link = document.createElement('a');
			link.href = `http://localhost:5000/${event.file_path}`;
			link.download = event.file_name || 'document.pdf';
			link.target = '_blank';
			link.click();
		}
	};

	return (
		<article className="rounded-3xl bg-gradient-to-b from-white via-[var(--brand-blue-soft)] to-white p-6 shadow-lg shadow-black/15 h-48 flex flex-col justify-between transition-all duration-300 ease-out hover:scale-110 hover:shadow-2xl hover:shadow-black/20 cursor-pointer">
			<div>
				<span className="inline-flex items-center rounded-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white shadow-md shadow-black/20">
					{statusLabel}
				</span>
				<h3 className="mt-4 text-lg font-semibold text-black">{event.title}</h3>
				{activeTab === "mine" && event.date && (
					<p className="text-xs uppercase tracking-wide text-black mt-2">
						Date : {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
					</p>
				)}
			</div>
			
			<div className={`flex ${activeTab === "mine" ? "justify-end" : "items-end justify-between"} gap-4 ${activeTab === "all" ? "mt-auto" : ""}`}>
				<div className={`${activeTab === "mine" ? "hidden" : "space-y-2"}`}>
					{activeTab === "all" && <p className="text-xs uppercase tracking-wide text-black">Venue : {event.venue}</p>}
					{activeTab === "all" && event.date && (
						<p className="text-xs uppercase tracking-wide text-black">
							Date : {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
						</p>
					)}
					{activeTab === "all" && event.date && (
						<p className="text-xs uppercase tracking-wide text-black">
							Time : {new Date(event.date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true })}
						</p>
					)}
				</div>
				
				<div className="flex flex-col gap-2 ml-auto">
					{role === "Faculty" && activeTab == "published" && (
						<span onClick={()=>{
                        router.push(`/event-students/${event.id}`);
                    }} className="rounded-full bg-[var(--brand-blue-soft)] px-3 py-1 text-xs font-semibold text-black shadow-sm cursor-pointer hover:bg-white transition">
							{event.studentCount || 0} registered
						</span>
					)}
					{role =="Student" && activeTab == "all" && <button
						type="button"
						onClick={handleRegister}
						disabled={isRegistering}
						className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
							isRegistering ? "opacity-50 cursor-not-allowed" : ""
						} ${
							isRegistered ? "bg-white text-[var(--brand-blue)] hover:bg-[var(--brand-blue-soft)]" : "bg-[var(--brand-blue)] text-white hover:bg-[var(--brand-blue-dark)]"
						}`}
					>
						{isRegistering ? "Registering..." : "Register now"}
					</button>}
					{role=="Student" && (isAttended || (isPendingApproval && (isExternal || isExternalActivity))) && <button
						type="button"
						onClick={hasDocument ? handleDownloadDocument : undefined}
						className={`flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition bg-[var(--brand-blue-soft)] text-[var(--brand-blue)] hover:bg-white`}
					>
						{(isExternal || isExternalActivity) && (
							<>
								<FaDochub size={18} />
								Document
							</>
						)}
						{!isExternal && !isExternalActivity && (
							<>
								<FaDownload size={18} />
								Download
							</>
						)}
					</button>}
				</div>
			</div>
		</article>
	);
}
