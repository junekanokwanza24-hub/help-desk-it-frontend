"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { getCurrentUser, getToken } from "@/src/lib/auth";

type PriorityType = "HIGH" | "MEDIUM" | "LOW";

interface Category {
  id: string;
  name: string;
}

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const API_BASE = "http://localhost:3006";

const PRIORITY_OPTIONS: { value: PriorityType; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext ?? ""))
    return "mdi:file-image-outline";
  if (ext === "pdf") return "mdi:file-pdf-box";
  if (["doc", "docx"].includes(ext ?? "")) return "mdi:file-word-outline";
  if (["xls", "xlsx", "csv"].includes(ext ?? ""))
    return "mdi:file-excel-outline";
  if (ext === "zip") return "mdi:folder-zip-outline";
  return "mdi:file-outline";
}

export default function NewTicketModal({
  isOpen,
  onClose,
  onCreated,
}: NewTicketModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState<PriorityType>("MEDIUM");
  const [department, setDepartment] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = getCurrentUser();

  useEffect(() => {
    if (!isOpen) return;
    // reset form each time it opens
    setTitle("");
    setDescription("");
    setCategoryId("");
    setPriority("MEDIUM");
    setDepartment("");
    setPhoneNumber("");
    setReporterName("");
    setDeviceName("");
    setFiles([]);
    setErrorMsg("");

    fetch(`${API_BASE}/categories`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) =>
        setCategories(Array.isArray(data) ? data : (data.items ?? [])),
      )
      .catch(() => setCategories([]));
  }, [isOpen]);

  if (!isOpen) return null;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadAttachments = async (ticketId: string) => {
    if (files.length === 0) return;
    setUploadingFiles(true);
    try {
      await Promise.all(
        files.map((file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("ticketId", ticketId);
          formData.append("uploadedById", user?.id ?? "");
          return fetch(`${API_BASE}/attachments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${getToken()}` },
            body: formData,
          });
        }),
      );
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setErrorMsg("Title is required.");
      return;
    }
    if (!categoryId) {
      setErrorMsg("Please choose a category.");
      return;
    }
    if (
      !department.trim() ||
      !phoneNumber.trim() ||
      !reporterName.trim() ||
      !deviceName.trim()
    ) {
      setErrorMsg(
        "Please fill in department, phone, reporter name, and device name.",
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/tickets`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          categoryId,
          priority,
          status: "PENDING",
          department: department.trim(),
          phoneNumber: phoneNumber.trim(),
          reporterName: reporterName.trim(),
          deviceName: deviceName.trim(),
        }),
      });

      if (!res.ok) throw new Error();
      const ticket = await res.json();

      await uploadAttachments(ticket.id);

      onCreated();
      onClose();
    } catch {
      setErrorMsg("Couldn't create the ticket. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || uploadingFiles;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(30, 21, 34, 0.45)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-white shadow-xl"
        style={{ border: "1px solid #E8E2EE" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid #E8E2EE" }}
        >
          <h2
            className="flex items-center  gap-2 text-[16px] font-medium"
            style={{ color: "#1E1522" }}
          >
            <Icon icon={"gridicons:notice-outline"} /> New ticket
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md"
            style={{ color: "#9891A0" }}
            aria-label="Close"
          >
            <Icon icon="mdi:close" width={18} height={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
          {errorMsg && (
            <div
              className="mb-4 px-4 py-3 rounded-lg text-[13px]"
              style={{ backgroundColor: "#FCEBEB", color: "#A32D2D" }}
            >
              {errorMsg}
            </div>
          )}

          <div className="mb-4">
            <label
              className="block mb-1.5 text-[13px] font-medium"
              style={{ color: "#4A4351" }}
            >
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Briefly describe the issue"
              className="w-full h-9 px-3 rounded-lg text-[13.5px] outline-none"
              style={{ border: "1px solid #E8E2EE", color: "#1E1522" }}
            />
          </div>

          <div className="mb-4">
            <label
              className="block mb-1.5 text-[13px] font-medium"
              style={{ color: "#4A4351" }}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any relevant details"
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-[13.5px] outline-none resize-none"
              style={{ border: "1px solid #E8E2EE", color: "#1E1522" }}
            />
          </div>

          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label
                className="block mb-1.5 text-[13px] font-medium"
                style={{ color: "#4A4351" }}
              >
                Reporter name
              </label>
              <input
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="Who's reporting this?"
                className="w-full h-9 px-3 rounded-lg text-[13.5px] outline-none"
                style={{ border: "1px solid #E8E2EE", color: "#1E1522" }}
              />
            </div>
            <div className="flex-1">
              <label
                className="block mb-1.5 text-[13px] font-medium"
                style={{ color: "#4A4351" }}
              >
                Department
              </label>
              <input
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Production"
                className="w-full h-9 px-3 rounded-lg text-[13.5px] outline-none"
                style={{ border: "1px solid #E8E2EE", color: "#1E1522" }}
              />
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label
                className="block mb-1.5 text-[13px] font-medium"
                style={{ color: "#4A4351" }}
              >
                Extension number
              </label>
              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. Extension 123"
                className="w-full h-9 px-3 rounded-lg text-[13.5px] outline-none"
                style={{ border: "1px solid #E8E2EE", color: "#1E1522" }}
              />
            </div>
            <div className="flex-1">
              <label
                className="block mb-1.5 text-[13px] font-medium"
                style={{ color: "#4A4351" }}
              >
                Device name (for VNC)
              </label>
              <input
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. PC-PROD-014"
                className="w-full h-9 px-3 rounded-lg text-[13.5px] outline-none"
                style={{ border: "1px solid #E8E2EE", color: "#1E1522" }}
              />
            </div>
          </div>

          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label
                className="block mb-1.5 text-[13px] font-medium"
                style={{ color: "#4A4351" }}
              >
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-[13px] outline-none"
                style={{ border: "1px solid #E8E2EE", color: "#1E1522" }}
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label
                className="block mb-1.5 text-[13px] font-medium"
                style={{ color: "#4A4351" }}
              >
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityType)}
                className="w-full h-9 px-3 rounded-lg text-[13px] outline-none"
                style={{ border: "1px solid #E8E2EE", color: "#1E1522" }}
              >
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Attachments */}
          <div className="mb-2">
            <label
              className="block mb-1.5 text-[13px] font-medium"
              style={{ color: "#4A4351" }}
            >
              Attachments
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                addFiles(e.dataTransfer.files);
              }}
              className="flex flex-col items-center justify-center gap-1.5 rounded-lg py-6 cursor-pointer"
              style={{
                border: `1.5px dashed ${dragActive ? "#613189" : "#E8E2EE"}`,
                backgroundColor: dragActive ? "#FAF8FB" : "transparent",
              }}
            >
              <Icon
                icon="mdi:tray-arrow-up"
                width={20}
                height={20}
                style={{ color: "#9891A0" }}
              />
              <p className="text-[13px]" style={{ color: "#746B7E" }}>
                Click to upload or drag and drop
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={(e) => addFiles(e.target.files)}
                className="hidden"
              />
            </div>

            {files.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {files.map((file, i) => (
                  <div
                    key={`${file.name}-${i}`}
                    className="flex items-center justify-between px-3 py-2 rounded-lg"
                    style={{ border: "1px solid #E8E2EE" }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon
                        icon={fileIcon(file.name)}
                        width={18}
                        height={18}
                        style={{ color: "#613189", flexShrink: 0 }}
                      />
                      <span
                        className="text-[13px] truncate"
                        style={{ color: "#1E1522" }}
                      >
                        {file.name}
                      </span>
                      <span
                        className="text-[12px] flex-shrink-0"
                        style={{ color: "#9891A0" }}
                      >
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(i)}
                      className="p-1 rounded-md flex-shrink-0"
                      style={{ color: "#9891A0" }}
                      aria-label="Remove file"
                    >
                      <Icon icon="mdi:close" width={14} height={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-2 px-6 py-4"
          style={{ borderTop: "1px solid #E8E2EE" }}
        >
          <button
            onClick={onClose}
            disabled={busy}
            className="h-9 px-2 rounded-lg text-[13.5px] font-medium disabled:opacity-40"
            style={{ border: "1px solid #E8E2EE", color: "#4A4351" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="h-9 px-2 flex items-center rounded-lg text-[13.5px] font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: "#613189" }}
          >
            {submitting
              ? "Creating…"
              : uploadingFiles
                ? "Uploading files…"
                : "Create ticket"}
            <Icon icon={"bi:plus"} width={25} />
          </button>
        </div>
      </div>
    </div>
  );
}
