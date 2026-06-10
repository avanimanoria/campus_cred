"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useApiData } from "@/hooks/useApiData";
import { CreateCategoryModal } from "./create-category-modal";

type CategoryRow = {
	id: number;
	subActivity: string;
	duration: string;
	document: string;
	maxPoints: string | number;
};

type CategorySection = {
	title: string;
	rows: CategoryRow[];
};

// Static framework categories (kept as baseline, then merged with approved categories from API)
const FRAMEWORK_SECTIONS: CategorySection[] = [
	{
		title: "Societal Needs and Development",
		rows: [
			{ id: 1, subActivity: "Create local job opportunities", duration: "2", document: "Report endorsed by competent authority", maxPoints: 20 },
			{ id: 2, subActivity: "Distribution of essential items during calamity or crisis", duration: "0.5", document: "Communication letter with photos", maxPoints: "10/20" },
			{ id: 3, subActivity: "Blood/Plasma or Other Donation Camp (Donor)", duration: "1", document: "Any proof", maxPoints: 10 },
			{ id: 4, subActivity: "Social Service", duration: "1", document: "Write-up on the service with photos", maxPoints: 10 },
			{ id: 5, subActivity: "Volunteer free tutoring for fellow students", duration: "2", document: "Detailed schedule with proof", maxPoints: 10 },
			{ id: 6, subActivity: "Textbook donation camp", duration: "1", document: "Brief write-up with photos", maxPoints: 10 },
			{ id: 7, subActivity: "Food/Clothes donation camp", duration: "0.5", document: "Brief write-up with photos", maxPoints: 10 },
			{ id: 8, subActivity: "Organizing any events or activities", duration: "0.5", document: "Brief write-up with photos", maxPoints: "10/20" },
			{ id: 9, subActivity: "Visiting / Helping Old age homes", duration: "0.5", document: "Brief write-up with photos", maxPoints: "10/20" },
			{ id: 10, subActivity: "Organizing any events or activities in Orphanage", duration: "0.5", document: "Brief write-up with photos", maxPoints: "10/20" },
			{ id: 11, subActivity: "Special Head under Societal Needs and Development", duration: "0.5", document: "Approval of the sub head activity by competent authority", maxPoints: "10/20" },
		],
	},
	{
		title: "Environment and Sustainability",
		rows: [
			{ id: 1, subActivity: "Active member of a community", duration: "2", document: "Membership and proof of work with photos", maxPoints: 20 },
			{ id: 2, subActivity: "Promoting Reduce, Reuse and Recycle to communities", duration: "2", document: "Publication/Article or Seminar/Workshop details with outcomes", maxPoints: 20 },
			{ id: 3, subActivity: "Identifying & Analyzing Sustainability Problems", duration: "2", document: "Publication/Article or Seminar/Workshop details with outcomes", maxPoints: 20 },
			{ id: 4, subActivity: "Possible Solutions for Zero Food Waste Challenge", duration: "2", document: "Publication/Article or Seminar/Workshop details with outcomes", maxPoints: 20 },
			{ id: 5, subActivity: "Creating Innovative Solutions for Sustainable Future", duration: "2", document: "Publication/Article or Seminar/Workshop details with outcomes", maxPoints: 20 },
			{ id: 6, subActivity: "Special Head under Environment and Sustainability", duration: "0.5", document: "Approval of the sub head activity by competent authority", maxPoints: "10/20" },
		],
	},
	{
		title: "Childhood Development and Pedagogy",
		rows: [
			{ id: 1, subActivity: "Teaching in local schools", duration: "2", document: "Letter of Appreciation or Recognition", maxPoints: 20 },
			{ id: 2, subActivity: "Events for school children", duration: "2", document: "Letter of Appreciation or Recognition", maxPoints: 20 },
			{ id: 3, subActivity: "Promoting pedagogy", duration: "2", document: "Letter of Appreciation or Recognition", maxPoints: 20 },
			{ id: 4, subActivity: "Tutoring the slow learning school children", duration: "2", document: "Certified by Proctor/HoD/NGO", maxPoints: 20 },
			{ id: 5, subActivity: "Special Head under Childhood Development and Pedagogy", duration: "0.5", document: "Approval of the sub head activity by competent authority", maxPoints: "10/20" },
		],
	},
	{
		title: "Women Empowerment Outreach",
		rows: [
			{ id: 1, subActivity: "Helping women for skill development", duration: "2", document: "Report on the skill development outcomes with photos", maxPoints: 20 },
			{ id: 2, subActivity: "Teaching basic English language", duration: "2", document: "Report on the English spoken/written outcomes with photos", maxPoints: 20 },
			{ id: 3, subActivity: "Teaching basic Technologies", duration: "2", document: "Report on the skill development outcomes with photos", maxPoints: 20 },
			{ id: 4, subActivity: "Education about women rights", duration: "2", document: "Dissemination with photos", maxPoints: 20 },
			{ id: 5, subActivity: "Organizing any events or activities on women outreach", duration: "2", document: "Detailed schedule with proof", maxPoints: 20 },
			{ id: 6, subActivity: "Spreading awareness on health and hygiene", duration: "2", document: "Dissemination with photos", maxPoints: 20 },
			{ id: 7, subActivity: "Special Head under Women Empowerment Outreach", duration: "0.5", document: "Approval of the sub head activity by competent authority", maxPoints: "10/20" },
		],
	},
	{
		title: "Promote Rural Development",
		rows: [
			{ id: 1, subActivity: "Create rural job opportunities", duration: "2", document: "Report certified by Proctor/HoD/NGO and dissemination", maxPoints: 20 },
			{ id: 2, subActivity: "Improvement of Quality Education in Villages", duration: "2", document: "Report certified by Proctor/HoD/NGO and dissemination", maxPoints: 20 },
			{ id: 3, subActivity: "Improvement of Health Parameters in Villages", duration: "2", document: "Report certified by Proctor/HoD/NGO and dissemination", maxPoints: 20 },
			{ id: 4, subActivity: "Skill Development for the Village Youths", duration: "2", document: "Report certified by Proctor/HoD/NGO and dissemination", maxPoints: 20 },
			{ id: 5, subActivity: "Special Head under Promote Rural Development", duration: "0.5", document: "Approval of the sub head activity by competent authority", maxPoints: "10/20" },
		],
	},
	{
		title: "Quality of Life through Technology",
		rows: [
			{ id: 1, subActivity: "App Development", duration: "2", document: "Report on the App Development with proof of utilization", maxPoints: 20 },
			{ id: 2, subActivity: "Web Development", duration: "2", document: "Report on the Web Development with proof of utilization", maxPoints: 20 },
			{ id: 3, subActivity: "Internal Software Development", duration: "2", document: "Report on the Software Development with proof of utilization", maxPoints: 20 },
			{ id: 4, subActivity: "Special Head under Quality of Life through Technology", duration: "0.5", document: "Approval of the sub head activity by competent authority", maxPoints: "10/20" },
		],
	},
	{
		title: "National Level Initiatives",
		rows: [
			{ id: 1, subActivity: "N.C.C", duration: "2", document: "Certificate", maxPoints: 20 },
			{ id: 2, subActivity: "N.S.S", duration: "2", document: "Certificate", maxPoints: 20 },
			{ id: 3, subActivity: "Digital India", duration: "2", document: "Certificate", maxPoints: 20 },
			{ id: 4, subActivity: "Skill India", duration: "2", document: "Certificate", maxPoints: 20 },
			{ id: 5, subActivity: "Swachh Bharat", duration: "2", document: "Certificate", maxPoints: 20 },
			{ id: 6, subActivity: "AICTE Internship", duration: "2", document: "Certificate", maxPoints: 20 },
			{ id: 7, subActivity: "Any Government Bodies/Agencies-Internships", duration: "2", document: "Certificate", maxPoints: 20 },
			{ id: 8, subActivity: "Special Head under National Level Initiatives", duration: "0.5", document: "Approval of the sub head activity by competent authority", maxPoints: "10/20" },
		],
	},
	{
		title: "Innovative approach to promote local tourism",
		rows: [
			{ id: 1, subActivity: "Promotion of local tourism", duration: "2", document: "Content/Social Media publication with photos and videos disseminating to larger groups", maxPoints: 20 },
			{ id: 2, subActivity: "Promoting any tourist spots", duration: "2", document: "Content/Social Media publication with photos and videos disseminating to larger groups", maxPoints: 20 },
			{ id: 3, subActivity: "Special Head under Innovative approach to promote local tourism", duration: "0.5", document: "Approval of the sub head activity by competent authority", maxPoints: "10/20" },
		],
	},
	{
		title: "Innovations and Entrepreneurship",
		rows: [
			{ id: 1, subActivity: "Prototype Development", duration: "2", document: "Acknowledged by the Industry Representative", maxPoints: 20 },
			{ id: 2, subActivity: "Product Development", duration: "2", document: "Acknowledged by the Industry Representative", maxPoints: 20 },
			{ id: 3, subActivity: "Innovative Technology Development", duration: "2", document: "Acknowledged by the Industry Representative", maxPoints: 20 },
			{ id: 4, subActivity: "Funding for innovative ideas/product", duration: "2", document: "Proof of Funding", maxPoints: 20 },
			{ id: 5, subActivity: "Start-up Company/NGO or similar kind", duration: "2", document: "Proof with details", maxPoints: 20 },
			{ id: 6, subActivity: "Societal Innovations", duration: "2", document: "Acknowledged by the Industry/NGO Representative or competent authority", maxPoints: 20 },
			{ id: 7, subActivity: "Special Head under Innovations and Entrepreneurship", duration: "0.5", document: "Approval of the sub head activity by competent authority", maxPoints: "10/20" },
		],
	},
	{
		title: "Leadership and Management",
		rows: [
			{ id: 1, subActivity: "Professional Self Initiatives", duration: "2", document: "Report on the Self Initiatives outcomes with photos", maxPoints: 20 },
			{ id: 2, subActivity: "Promoting any Technical Events", duration: "2", document: "Report on the Technical Events outcomes with photos", maxPoints: 20 },
			{ id: 3, subActivity: "Promoting any Club Events", duration: "2", document: "Report on the Club Event outcomes with photos", maxPoints: 20 },
			{ id: 4, subActivity: "Professional Society (IEEE, Local Chapter, etc.)", duration: "2", document: "Report on the Society Activity outcomes with photos", maxPoints: 20 },
			{ id: 5, subActivity: "Student Representatives or Team Members or Volunteers (Maximum of 10 participants for 20 Activity Points)", duration: "2", document: "Report on the participants attested by Proctor/HoD", maxPoints: 20 },
			{ id: 6, subActivity: "Special Head under Leadership and Management", duration: "0.5", document: "Approval of the sub head activity by competent authority", maxPoints: "10/20" },
		],
	},
];

export function AllCategoriesView() {
	const [sections, setSections] = useState<CategorySection[]>(FRAMEWORK_SECTIONS);
	const [openSection, setOpenSection] = useState<string>(FRAMEWORK_SECTIONS[0]?.title || "");
	const [isFormOpen, setIsFormOpen] = useState(false);
	const api = useApiData();

	function mergeSections(base: CategorySection[], extra: CategorySection[]): CategorySection[] {
		const map = new Map<string, CategorySection>();

		base.forEach((section) => {
			map.set(section.title, {
				...section,
				rows: [...section.rows],
			});
		});

		extra.forEach((section) => {
			if (map.has(section.title)) {
				const existing = map.get(section.title)!;
				const offset = existing.rows.length;
				const appended = section.rows.map((row, idx) => ({ ...row, id: offset + idx + 1 }));
				map.set(section.title, { ...existing, rows: [...existing.rows, ...appended] });
			} else {
				map.set(section.title, section);
			}
		});

		return Array.from(map.values());
	}

	async function fetchApprovedCategories() {
		try {
			const result = await api.get("/proctor/categories");
			const grouped = result?.data?.grouped || [];
			const mapped: CategorySection[] = grouped.map((g: any) => ({
				title: g.name,
				rows: (g.subcategories || []).map((sub: any, i: number) => ({
					id: i + 1,
					subActivity: sub.name,
					duration: "—",
					document: "—",
					maxPoints: sub.max_points ?? 0,
				})),
			}));

			const merged = mergeSections(FRAMEWORK_SECTIONS, mapped);
			setSections(merged);
			if (merged.length > 0) setOpenSection(merged[0].title);
		} catch (e: any) {
			console.error("Failed to load categories", e);
			toast.error(e?.message || "Failed to load categories");
		}
	}

	useEffect(() => {
		fetchApprovedCategories();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between rounded-3xl border border-[var(--brand-border)] bg-white px-8 py-5 text-black shadow-md shadow-black/10">
				<h2 className="text-2xl font-semibold">Activity Categories</h2>
				<button
					type="button"
					onClick={() => setIsFormOpen(true)}
					className="flex items-center gap-2 rounded-full bg-[var(--brand-blue)] px-5 py-2 text-sm font-semibold text-white shadow-md shadow-black/20 transition hover:brightness-110"
				>
					<span className="text-lg leading-none">＋</span>
					Add Category
				</button>
			</div>

			{isFormOpen && (
				<CreateCategoryModal
					open={isFormOpen}
					onClose={() => setIsFormOpen(false)}
					onCreated={() => {
						toast.success("Submitted for HOD approval");
						fetchApprovedCategories();
					}}
				/>
			)}

			<div className="overflow-hidden rounded-3xl border border-[var(--brand-border)]">
				{sections.map((section, index) => {
					const isOpen = openSection === section.title;
					return (
						<div key={section.title} className={`${index !== 0 ? "border-t border-[var(--brand-border)]" : ""}`}>
							<button
								type="button"
								onClick={() => setOpenSection(isOpen ? "" : section.title)}
								className="flex w-full items-center justify-between bg-[var(--brand-blue-soft)] px-6 py-4 text-left text-lg font-semibold text-black transition hover:brightness-105"
							>
								<span>{section.title}</span>
								<span className="text-[var(--brand-muted)]">{isOpen ? "▴" : "▾"}</span>
							</button>

							{isOpen && (
								<div className="bg-white px-6 py-5">
									{section.rows.length === 0 ? (
										<div className="rounded-2xl border border-dashed border-[var(--brand-border)] bg-[var(--brand-blue-soft)] px-4 py-6 text-center text-sm font-medium text-[var(--brand-muted)]">
											No activities added yet.
										</div>
									) : (
										<div className="max-h-[500px] overflow-y-auto overflow-x-auto rounded-2xl border border-[var(--brand-border)] bg-white shadow-sm shadow-black/10">
											<table className="w-full border-collapse text-sm text-black">
												<thead className="sticky top-0 bg-[var(--brand-blue-soft)] uppercase tracking-[0.15em] text-xs text-black shadow-sm">
													<tr>
														<th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Sl. No.</th>
														<th className="px-4 py-3 text-left font-semibold min-w-[250px]">Sub Activity Head</th>
														<th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Duration in Weeks</th>
														<th className="px-4 py-3 text-left font-semibold min-w-[300px]">Document as Evidence</th>
														<th className="px-4 py-3 text-left font-semibold whitespace-nowrap">Maximum Activity Points</th>
													</tr>
												</thead>
												<tbody>
													{section.rows.map((row) => (
														<tr key={row.id} className="border-t border-[var(--brand-border)] bg-white hover:bg-[var(--brand-blue-soft)] transition">
															<td className="px-4 py-3 font-semibold text-center">{row.id}</td>
															<td className="px-4 py-3">{row.subActivity}</td>
															<td className="px-4 py-3 text-center">{row.duration}</td>
															<td className="px-4 py-3">{row.document}</td>
															<td className="px-4 py-3 font-semibold text-[var(--brand-blue)] text-center">{row.maxPoints}</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}
