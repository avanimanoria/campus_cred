"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import toast from "react-hot-toast";

interface ExcelUploadProps {
  onUpload: (file: File) => Promise<void>;
}

export function ExcelUpload({ onUpload }: ExcelUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
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

    // Preview CSV data
    if (file.name.endsWith(".csv")) {
      Papa.parse(file, {
        header: true,
        preview: 5,
        complete: (results) => {
          setPreview(results.data.slice(0, 5));
        },
      });
    }

    // Upload file
    setUploading(true);
    setProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);

    try {
      await onUpload(file);
      setProgress(100);
      toast.success("File uploaded successfully!");
      setTimeout(() => {
        setProgress(0);
        setPreview([]);
      }, 2000);
    } catch (error) {
      setProgress(0);
      // Error already handled in parent
    } finally {
      clearInterval(progressInterval);
      setUploading(false);
      e.target.value = ""; // Reset input
    }
  }

  return (
    <div className="rounded-lg border border-[var(--brand-border)] bg-white p-6 shadow-md shadow-black/10">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-black">Upload Proctor-Student Mapping</h3>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="rounded-lg bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] px-6 py-2 font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
        >
          upload excel sheet
        </button>
      </div>
      
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />
      
      <div className="mb-4 rounded-lg bg-[var(--brand-blue-soft)] p-4 text-sm text-[var(--brand-muted)]">
        <p className="mb-2 font-semibold">Excel Format:</p>
        <ul className="list-inside list-disc space-y-1 text-xs">
          <li>Column 1: proctor_email</li>
          <li>Column 2: proctor_name</li>
          <li>Column 3: student_email (comma-separated for multiple)</li>
          <li>Column 4: student_name (comma-separated for multiple)</li>
        </ul>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="mb-4 space-y-3 rounded-lg bg-[var(--brand-blue-soft)] p-6">
          <div className="flex items-center justify-center">
            <svg
              className="h-10 w-10 animate-spin text-[var(--brand-blue)]"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </div>
          <div className="text-center text-sm text-[var(--brand-muted)]">Uploading...</div>
          <div className="h-2 overflow-hidden rounded-full bg-white">
            <div
              className="h-full bg-gradient-to-r from-[var(--brand-blue)] to-[var(--brand-blue-dark)] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-center text-xs text-[var(--brand-muted)]">{progress}%</div>
        </div>
      )}

      {preview.length > 0 && (
        <div className="mt-4 rounded-lg bg-[var(--brand-blue-soft)] p-4">
          <p className="mb-2 text-sm font-semibold text-black">Preview (first 5 rows):</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--brand-border)]">
                  {Object.keys(preview[0] || {}).map((key) => (
                    <th key={key} className="p-2 text-left text-[var(--brand-blue)]">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, idx) => (
                  <tr key={idx} className="border-b border-[var(--brand-border)]">
                    {Object.values(row).map((val: any, vidx) => (
                      <td key={vidx} className="p-2 text-black">
                        {String(val).substring(0, 30)}
                        {String(val).length > 30 ? "..." : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
