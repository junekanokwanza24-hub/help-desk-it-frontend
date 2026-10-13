"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { getCurrentUser, getToken } from "@/src/lib/auth";

type PriorityType = "HIGH" | "MEDIUM" | "LOW";
type TicketType = "SOFTWARE" | "HARDWARE";

interface Category {
  id: string;
  name: string;
}

interface Department {
  id: string;
  name: string;
}

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const API_BASE = "https://help-desk-it-backend-1.onrender.com";

const PRIORITY_OPTIONS: { value: PriorityType; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
];

const TYPE_OPTIONS: { value: TicketType; label: string }[] = [
  { value: "SOFTWARE", label: "Software" },
  { value: "HARDWARE", label: "Hardware" },
];

const FLOORS = ["B1", ...Array.from({ length: 12 }, (_, i) => String(i + 1))];

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

/** Pull a readable message out of a NestJS error response. */
async function readErrorMessage(res: Response, fallback: string) {
  const body = await res.json().catch(() => null);
  const msg = body?.message;
  if (Array.isArray(msg)) return msg.join(", ");
  if (typeof msg === "string" && msg) return msg;
  return fallback;
}

const inputStyle = { border: "1px solid #E8E2EE", color: "#1E1522" };
const labelStyle = { color: "#4A4351" };

export default function NewTicketModal({
  isOpen,
  onClose,
  onCreated,
}: NewTicketModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState<PriorityType>("MEDIUM");
  const [type, setType] = useState<TicketType>("SOFTWARE");
  const [department, setDepartment] = useState("");
  const [floor, setFloor] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [deviceName, setDeviceName] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
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
    setType("SOFTWARE");
    setDepartment("");
    setFloor("");
    setPhoneNumber("");
    setReporterName("");
    setDeviceName("");
    setFiles([]);
    setErrorMsg("");

    const headers = { Authorization: `Bearer ${getToken()}` };
    let cancelled = false;

    fetch(`${API_BASE}/categories`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled)
          setCategories(Array.isArray(data) ? data : (data.items ?? []));
      })
      .catch(() => !cancelled && setCategories([]));

    fetch(`${API_BASE}/departments`, { headers })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (!cancelled)
          setDepartments(Array.isArray(data) ? data : (data.items ?? []));
      })
      .catch(() => !cancelled && setDepartments([]));

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const busy = submitting || uploadingFiles;

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  /** Returns the number of files that failed to upload. */
  const uploadAttachments = async (ticketId: string) => {
    if (files.length === 0) return 0;
    setUploadingFiles(true);
    try {
      const results = await Promise.allSettled(
        files.map(async (file) => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("ticketId", ticketId);
          if (user?.id) formData.append("uploadedById", user.id);

          const res = await fetch(`${API_BASE}/attachments`, {
            method: "POST",
            headers: { Authorization: `Bearer ${getToken()}` },
            body: formData,
          });
          if (!res.ok) throw new Error(file.name);
        }),
      );
      return results.filter((r) => r.status === "rejected").length;
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
      !department ||
      !floor ||
      !phoneNumber.trim() ||
      !reporterName.trim() ||
      !deviceName.trim()
    ) {
      setErrorMsg(
        "Please fill in department, floor, phone, reporter name, and device name.",
      );
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    // 1) create the ticket
    let ticketId: string;
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
          type,
          department,
          floor,
          phoneNumber: phoneNumber.trim(),
          reporterName: reporterName.trim(),
          deviceName: deviceName.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(res, "Couldn't create the ticket. Try again."),
        );
      }
      const ticket = await res.json();
      ticketId = ticket.id;
    } catch (err) {
      setErrorMsg(
        err instanceof Error && err.message
          ? err.message
          : "Couldn't create the ticket. Try again.",
      );
      setSubmitting(false);
      return;
    }

    // 2) ticket exists from here on — never show "couldn't create" again,
    //    otherwise the user retries and ends up with duplicates
    try {
      const failed = await uploadAttachments(ticketId);
      onCreated();
      if (failed > 0) {
        setFiles([]);
        setErrorMsg(
          `Ticket created, but ${failed} file${failed === 1 ? "" : "s"} failed to upload. You can close this window.`,
        );
        return;
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const ticketCreatedWithErrors = errorMsg.startsWith("Ticket created");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: "rgba(30, 21, 34, 0.45)" }}
      onClick={() => !busy && onClose()}
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
            className="flex items-center gap-2 text-[16px] font-medium"
            style={{ color: "#1E1522" }}
          >
            <Icon icon={"gridicons:notice-outline"} /> New ticket
          </h2>
          <button
            onClick={onClose}
            disabled={busy}
            className="p-1 rounded-md disabled:opacity-40"
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
              style={
                ticketCreatedWithErrors
                  ? { backgroundColor: "#FDF3E3", color: "#854F0B" }
                  : { backgroundColor: "#FCEBEB", color: "#A32D2D" }
              }
            >
              {errorMsg}
            </div>
          )}

          <div className="mb-4">
            <label
              className="block mb-1.5 text-[13px] font-medium"
              style={labelStyle}
            >
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Briefly describe the issue"
              className="w-full h-9 px-3 rounded-lg text-[13.5px] outline-none"
              style={inputStyle}
            />
          </div>

          <div className="mb-4">
            <label
              className="block mb-1.5 text-[13px] font-medium"
              style={labelStyle}
            >
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add any relevant details"
              rows={4}
              className="w-full px-3 py-2 rounded-lg text-[13.5px] outline-none resize-none"
              style={inputStyle}
            />
          </div>

          {/* Reporter / Extension */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label
                className="block mb-1.5 text-[13px] font-medium"
                style={labelStyle}
              >
                Reporter name
              </label>
              <input
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="Who's reporting this?"
                className="w-full h-9 px-3 rounded-lg text-[13.5px] outline-none"
                style={inputStyle}
              />
            </div>
            <div className="flex-1">
              <label
                className="block mb-1.5 text-[13px] font-medium"
                style={labelStyle}
              >
                Extension number
              </label>
              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. Extension 123"
                className="w-full h-9 px-3 rounded-lg text-[13.5px] outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Department / Floor */}
          <div className="flex gap-3 mb-4">
            <div className="flex-[2]">
              <label
                className="block mb-1.5 text-[13px] font-medium"
                style={labelStyle}
              >
                Department
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-[13px] outline-none"
                style={inputStyle}
              >
                <option value="">Select department</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label
                className="block mb-1.5 text-[13px] font-medium"
                style={labelStyle}
              >
                Floor
              </label>
              <select
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-[13px] outline-none"
                style={inputStyle}
              >
                <option value="">Select</option>
                {FLOORS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Device / Type */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label
                className="block mb-1.5 text-[13px] font-medium"
                style={labelStyle}
              >
                Device name (for VNC)
              </label>
              <input
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. PC-PROD-014"
                className="w-full h-9 px-3 rounded-lg text-[13.5px] outline-none"
                style={inputStyle}
              />
            </div>
            <div className="flex-1">
              <label
                className="block mb-1.5 text-[13px] font-medium"
                style={labelStyle}
              >
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TicketType)}
                className="w-full h-9 px-3 rounded-lg text-[13px] outline-none"
                style={inputStyle}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category / Priority */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <label
                className="block mb-1.5 text-[13px] font-medium"
                style={labelStyle}
              >
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-9 px-3 rounded-lg text-[13px] outline-none"
                style={inputStyle}
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
                style={labelStyle}
              >
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityType)}
                className="w-full h-9 px-3 rounded-lg text-[13px] outline-none"
                style={inputStyle}
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
              style={labelStyle}
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
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = ""; // allow re-selecting the same file
                }}
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
                      disabled={busy}
                      className="p-1 rounded-md flex-shrink-0 disabled:opacity-40"
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
            className="h-9 px-3 rounded-lg text-[13.5px] font-medium disabled:opacity-40"
            style={{ border: "1px solid #E8E2EE", color: "#4A4351" }}
          >
            {ticketCreatedWithErrors ? "Close" : "Cancel"}
          </button>
          {!ticketCreatedWithErrors && (
            <button
              onClick={handleSubmit}
              disabled={busy}
              className="h-9 pl-3 pr-1.5 flex items-center rounded-lg text-[13.5px] font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: "#613189" }}
            >
              {submitting && !uploadingFiles
                ? "Creating…"
                : uploadingFiles
                  ? "Uploading files…"
                  : "Create ticket"}
              <Icon icon={"bi:plus"} width={25} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
