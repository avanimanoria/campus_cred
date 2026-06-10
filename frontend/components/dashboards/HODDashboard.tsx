"use client";

import { useState, useEffect } from "react";
import { useApiData } from "@/hooks/useApiData";
import { ExcelUpload } from "./ExcelUpload";
import toast from "react-hot-toast";

interface Event {
  event_id: number;
  title: string;
  description?: string;
  category: string;
  status: string;
  created_by: string;
  faculty_name?: string;
  start_at?: string;
  end_at?: string;
}

interface ProctorMapping {
  proctor_id: number;
  proctor_name: string;
  proctor_email: string;
  students: Array<{
    student_id: number;
    student_name: string;
    student_email: string;
  }>;
}

export function HODDashboard() {
  const [activeView, setActiveView] = useState<"approvals" | "proctor-students">("approvals");
  const [pendingEvents, setPendingEvents] = useState<Event[]>([]);
  const [proctorMappings, setProctorMappings] = useState<ProctorMapping[]>([]);
  const api = useApiData();

  useEffect(() => {
    loadPendingEvents();
    loadProctorMappings();
  }, []);

  async function loadPendingEvents() {
    try {
      const data = await api.get("/hod/pending-events");
      setPendingEvents(data.data || []);
    } catch (error: any) {
      console.error("Failed to load pending events:", error);
    }
  }

  async function loadProctorMappings() {
    try {
      const data = await api.get("/hod/proctor-mappings");
      setProctorMappings(data.data || []);
    } catch (error: any) {
      console.error("Failed to load proctor mappings:", error);
    }
  }

  async function handleApproveEvent(eventId: number) {
    try {
      await api.post(`/hod/approve-event/${eventId}`, { status: "approved" });
      toast.success("Event approved successfully!");
      setPendingEvents((prev) => prev.filter((e) => e.event_id !== eventId));
    } catch (error: any) {
      toast.error(error.message || "Failed to approve event");
    }
  }

  async function handleRejectEvent(eventId: number) {
    try {
      await api.post(`/hod/approve-event/${eventId}`, { status: "rejected" });
      toast.success("Event rejected");
      setPendingEvents((prev) => prev.filter((e) => e.event_id !== eventId));
    } catch (error: any) {
      toast.error(error.message || "Failed to reject event");
    }
  }

  async function handleExcelUpload(file: File) {
    const formData = new FormData();
    formData.append("excel", file);

    try {
      const result = await api.post("/hod/upload-excel", formData);
      toast.success(result.message || "Excel uploaded successfully!");
      loadProctorMappings();
    } catch (error: any) {
      toast.error(error.message || "Failed to upload Excel");
      throw error;
    }
  }

  return (
    <div className="space-y-6">
      {/* View Tabs */}
      <div className="flex gap-4 rounded-2xl bg-[var(--brand-blue-soft)] p-2">
        <button
          onClick={() => setActiveView("approvals")}
          className={`flex-1 rounded-xl px-6 py-3 font-semibold transition-all ${
            activeView === "approvals"
              ? "bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] text-white"
              : "text-black hover:bg-[var(--brand-border)]"
          }`}
        >
          Event Approvals
        </button>
        <button
          onClick={() => setActiveView("proctor-students")}
          className={`flex-1 rounded-xl px-6 py-3 font-semibold transition-all ${
            activeView === "proctor-students"
              ? "bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] text-white"
              : "text-black hover:bg-[var(--brand-border)]"
          }`}
        >
          Proctor-Student Mapping
        </button>
      </div>

      {/* Excel Upload Section */}
      <ExcelUpload onUpload={handleExcelUpload} />

      {/* Approvals View */}
      {activeView === "approvals" && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-black">
            Pending Event Approvals ({pendingEvents.length})
          </h2>
          {api.loading && <div className="text-center text-[var(--brand-muted)]">Loading...</div>}
          {!api.loading && pendingEvents.length === 0 && (
            <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-blue-soft)] p-8 text-center text-[var(--brand-muted)]">
              No pending events for approval
            </div>
          )}
          <div className="grid gap-4">
            {pendingEvents.map((event) => (
              <div
                key={event.event_id}
                className="rounded-lg border border-[var(--brand-border)] bg-white p-6 transition-shadow hover:shadow-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-black">{event.title}</h3>
                    <p className="mt-2 text-sm text-[var(--brand-muted)]">{event.description}</p>
                    <div className="mt-3 flex gap-4 text-sm">
                      <span className="rounded-full bg-[var(--brand-blue-soft)] px-3 py-1 text-[var(--brand-blue)]">
                        {event.category}
                      </span>
                      <span className="text-[var(--brand-muted)]">By: {event.faculty_name}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveEvent(event.event_id)}
                      className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-green-700"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectEvent(event.event_id)}
                      className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Proctor-Student Mapping View */}
      {activeView === "proctor-students" && (
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold text-black">
            Proctor-Student Hierarchy ({proctorMappings.length} Proctors)
          </h2>
          {api.loading && <div className="text-center text-[var(--brand-muted)]">Loading...</div>}
          {!api.loading && proctorMappings.length === 0 && (
            <div className="rounded-lg border border-[var(--brand-border)] bg-[var(--brand-blue-soft)] p-8 text-center text-[var(--brand-muted)]">
              No proctor mappings found. Upload an Excel file to create mappings.
            </div>
          )}
          <div className="grid gap-4">
            {proctorMappings.map((proctor) => (
              <div
                key={proctor.proctor_id}
                className="rounded-lg border border-[var(--brand-border)] bg-white p-6"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)]">
                    <span className="text-xl font-bold text-white">
                      {proctor.proctor_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-black">{proctor.proctor_name}</h3>
                    <p className="text-sm text-[var(--brand-muted)]">{proctor.proctor_email}</p>
                  </div>
                  <span className="ml-auto rounded-full bg-[var(--brand-blue-soft)] px-3 py-1 text-sm text-[var(--brand-blue)]">
                    {proctor.students.length} Students
                  </span>
                </div>
                <div className="grid gap-2 border-t border-[var(--brand-border)] pt-4">
                  {proctor.students.map((student) => (
                    <div
                      key={student.student_id}
                      className="flex items-center justify-between rounded-lg bg-[var(--brand-blue-soft)] p-3"
                    >
                      <div>
                        <p className="font-medium text-black">{student.student_name}</p>
                        <p className="text-sm text-[var(--brand-muted)]">{student.student_email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
