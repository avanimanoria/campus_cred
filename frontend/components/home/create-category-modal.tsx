"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useApiData } from "@/hooks/useApiData";

type CreateCategoryModalProps = {
	open: boolean;
	onClose: () => void;
	onCreated?: () => void;
};

export function CreateCategoryModal({ open, onClose, onCreated }: CreateCategoryModalProps) {
	const [formData, setFormData] = useState<{
		category_name: string;
		max_points: string;
	}>({
		category_name: "",
		max_points: "",
	});
	const api = useApiData();

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 px-4 py-8">
			<div className="relative w-full max-w-2xl rounded-3xl border border-[var(--brand-border)] bg-white p-8 text-black shadow-2xl">
				<button
					type="button"
					onClick={onClose}
					className="absolute right-6 top-6 text-2xl font-semibold text-[var(--brand-blue)] transition hover:scale-110"
					aria-label="Close"
				>
					×
				</button>

				<h2 className="text-center text-2xl font-semibold tracking-wide text-black">CREATE ACTIVITY CATEGORY</h2>

				<form
					onSubmit={async (event) => {
						event.preventDefault();
						try {
							const response = await fetch("http://localhost:5000/api/proctor/categories", {
								method: "POST",
								headers: {
									"Content-Type": "application/json",
									"x-user-id": "1",
									"x-user-role": "proctor",
								},
								body: JSON.stringify({
									category_name: formData.category_name,
									max_points: parseInt(formData.max_points || "0", 10),
									proposed_by: 1,
								}),
							});

							if (!response.ok) {
								const error = await response.json();
								throw new Error(error.message || "Failed to create category");
							}

							toast.success("Category submitted for approval!");
							setFormData({
								category_name: "",
								max_points: "",
							});
							onCreated?.();
							onClose();
						} catch (error: any) {
							console.error("Failed to create category:", error);
							toast.error(error?.message || "Failed to create category");
						}
					}}
					className="mt-6 rounded-[26px] border-2 border-[var(--brand-border)] bg-[var(--brand-blue-soft)] p-8"
				>
					<div className="grid gap-4">
						<label className="flex flex-col gap-2 text-sm font-semibold text-black sm:flex-row sm:items-center">
							<span className="w-36">Category Name :</span>
							<input
								required
								value={formData.category_name}
								onChange={(e) => setFormData((prev) => ({ ...prev, category_name: e.target.value }))}
								type="text"
								placeholder="Enter category name"
								className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-3 py-2 text-sm text-black outline-none focus:border-[var(--brand-blue)]"
							/>
						</label>

						<label className="flex flex-col gap-2 text-sm font-semibold text-black sm:flex-row sm:items-center">
							<span className="w-36">Maximum Points :</span>
							<input
								required
								value={formData.max_points}
								onChange={(e) => setFormData((prev) => ({ ...prev, max_points: e.target.value }))}
								type="number"
								placeholder="Enter maximum points"
								min="0"
								className="w-full rounded-lg border border-[var(--brand-border)] bg-white px-3 py-2 text-sm text-black outline-none focus:border-[var(--brand-blue)]"
							/>
						</label>
					</div>

					<div className="mt-8 flex justify-end gap-3">
						<button
							type="button"
							onClick={onClose}
							className="cursor-pointer rounded-lg bg-[var(--brand-blue-soft)] px-6 py-2 text-xs font-semibold uppercase tracking-wide text-black shadow-md shadow-black/10 transition hover:brightness-90"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="cursor-pointer rounded-lg bg-[var(--brand-blue)] px-6 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-md shadow-black/10 transition hover:brightness-110"
						>
							Submit for Approval
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
