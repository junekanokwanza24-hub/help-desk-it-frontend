"use client";

import { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import AppShell from "@/src/components/appshell";
import { getToken } from "@/src/lib/auth";

type TicketStatus = "PENDING" | "IN_PROGRESS" | "SUCCESS" | "ABORTED";
type PriorityType = "HIGH" | "MEDIUM" | "LOW";

interface Category {
  id: string;
  name: string;
  ticketCount: number;
}

interface TicketListItem {
  id: string;
  title: string;
  status: TicketStatus;
  priority: PriorityType;
  createdAt: string;
}

interface Attachment {
  id: string;
  fileUrl: string;
  fileName: string;
}

interface TicketDetail {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: PriorityType;
  department: string | null;
  phoneNumber: string | null;
  reporterName: string | null;
  deviceName: string | null;
  createdAt: string;
  category: { id: string; name: string };
  createdBy: { id: string; firstName: string; lastName: string };
  assignedTo: { id: string; firstName: string; lastName: string } | null;
  attachments: Attachment[];
}

const STATUS_STYLE: Record<
  TicketStatus,
  { bg: string; text: string; label: string }
> = {
  PENDING: { bg: "#F1EFE8", text: "#5F5E5A", label: "Pending" },
  IN_PROGRESS: { bg: "#F3EDF9", text: "#613189", label: "In progress" },
  SUCCESS: { bg: "#EAF3DE", text: "#3B6D11", label: "Resolved" },
  ABORTED: { bg: "#FCEBEB", text: "#A32D2D", label: "Aborted" },
};

const PRIORITY_STYLE: Record<PriorityType, { text: string; label: string }> = {
  HIGH: { text: "#A32D2D", label: "High" },
  MEDIUM: { text: "#854F0B", label: "Medium" },
  LOW: { text: "#5F5E5A", label: "Low" },
};

const API_BASE = "http://localhost:3006";
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg)$/i;

export default function CategoriesListPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/categories`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const data: Category[] = await res.json();
      setCategories(data);
    } catch {
      setErrorMsg("Couldn't load categories. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <AppShell>
      <div className="px-8 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-[22px] font-medium mb-1"
              style={{ color: "#1E1522" }}
            >
              Categories
            </h1>
            <p className="text-[13.5px]" style={{ color: "#746B7E" }}>
              {categories.length ? `${categories.length} total` : "Loading…"}
            </p>
          </div>
          <button
            onClick={() => setNewCategoryModalOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13.5px] font-medium text-white"
            style={{ backgroundColor: "#613189" }}
          >
            <Icon icon="mdi:plus" width={16} height={16} />
            New category
          </button>
        </div>

        {errorMsg && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-[13px]"
            style={{ backgroundColor: "#FCEBEB", color: "#A32D2D" }}
          >
            {errorMsg}
          </div>
        )}

        <div
          className="rounded-xl overflow-hidden"
          style={{ border: "1px solid #E8E2EE" }}
        >
          <table
            className="w-full text-left"
            style={{ borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ backgroundColor: "#FAF8FB" }}>
                {["Category", "Tickets", ""].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[12px] font-medium"
                    style={{
                      color: "#9891A0",
                      borderBottom: "1px solid #E8E2EE",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-[13.5px]"
                    style={{ color: "#9891A0" }}
                  >
                    Loading categories…
                  </td>
                </tr>
              )}

              {!loading && categories.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-[13.5px]"
                    style={{ color: "#9891A0" }}
                  >
                    No categories yet.
                  </td>
                </tr>
              )}

              {!loading &&
                categories.map((c) => (
                  <tr
                    key={c.id}
                    onClick={() => setActiveCategory(c)}
                    className="cursor-pointer hover:bg-[#FAF8FB]"
                    style={{ borderBottom: "1px solid #F0ECF4" }}
                  >
                    <td
                      className="px-4 py-3 text-[13.5px] font-medium"
                      style={{ color: "#1E1522" }}
                    >
                      {c.name}
                    </td>
                    <td
                      className="px-4 py-3 text-[13px]"
                      style={{ color: "#746B7E" }}
                    >
                      {c.ticketCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Icon
                        icon="mdi:chevron-right"
                        width={18}
                        height={18}
                        color="#9891A0"
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {newCategoryModalOpen && (
        <NewCategoryModal
          onClose={() => setNewCategoryModalOpen(false)}
          onCreated={fetchCategories}
        />
      )}

      {activeCategory && (
        <CategoryTicketsModal
          category={activeCategory}
          onClose={() => setActiveCategory(null)}
        />
      )}
    </AppShell>
  );
}

function NewCategoryModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to create category");
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't create the category.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl p-6 w-full max-w-sm flex flex-col gap-3"
      >
        <h2
          className="text-[16px] font-medium mb-1"
          style={{ color: "#1E1522" }}
        >
          New category
        </h2>

        {error && (
          <div
            className="px-3 py-2 rounded-lg text-[12.5px]"
            style={{ backgroundColor: "#FCEBEB", color: "#A32D2D" }}
          >
            {error}
          </div>
        )}

        <input
          required
          autoFocus
          placeholder="Category name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-9 px-3 rounded-lg text-[13px] outline-none"
          style={{ border: "1px solid #E8E2EE" }}
        />

        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-9 rounded-lg text-[13px] font-medium"
            style={{ border: "1px solid #E8E2EE", color: "#4A4351" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 h-9 rounded-lg text-[13px] font-medium text-white disabled:opacity-50"
            style={{ backgroundColor: "#613189" }}
          >
            {submitting ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CategoryTicketsModal({
  category,
  onClose,
}: {
  category: Category;
  onClose: () => void;
}) {
  const [tickets, setTickets] = useState<TicketListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await fetch(
          `${API_BASE}/tickets?category=${category.id}&limit=100`,
          { headers: { Authorization: `Bearer ${getToken()}` } },
        );
        if (!res.ok) throw new Error();
        const data = await res.json();
        setTickets(Array.isArray(data.items) ? data.items : []);
      } catch {
        setErrorMsg("Couldn't load tickets for this category.");
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [category.id]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col"
      >
        {selectedTicketId ? (
          <TicketDetailPanel
            ticketId={selectedTicketId}
            onBack={() => setSelectedTicketId(null)}
            onClose={onClose}
          />
        ) : (
          <>
            <div
              className="flex items-center justify-between px-5 py-4 border-b shrink-0"
              style={{ borderColor: "#E8E2EE" }}
            >
              <div>
                <h2
                  className="text-[15px] font-medium"
                  style={{ color: "#1E1522" }}
                >
                  {category.name}
                </h2>
                <p className="text-[12.5px]" style={{ color: "#9891A0" }}>
                  {category.ticketCount} ticket
                  {category.ticketCount === 1 ? "" : "s"}
                </p>
              </div>
              <button onClick={onClose} aria-label="Close">
                <Icon icon="mdi:close" width={20} height={20} color="#9891A0" />
              </button>
            </div>

            <div className="overflow-y-auto px-2 py-2">
              {loading && (
                <p
                  className="px-3 py-8 text-center text-[13px]"
                  style={{ color: "#9891A0" }}
                >
                  Loading tickets…
                </p>
              )}

              {errorMsg && (
                <p
                  className="px-3 py-8 text-center text-[13px]"
                  style={{ color: "#A32D2D" }}
                >
                  {errorMsg}
                </p>
              )}

              {!loading && !errorMsg && tickets.length === 0 && (
                <p
                  className="px-3 py-8 text-center text-[13px]"
                  style={{ color: "#9891A0" }}
                >
                  No tickets in this category yet.
                </p>
              )}

              {!loading &&
                tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTicketId(t.id)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-3 rounded-lg hover:bg-[#FAF8FB] text-left"
                  >
                    <div className="min-w-0">
                      <p
                        className="text-[13.5px] font-medium truncate"
                        style={{ color: "#1E1522" }}
                      >
                        {t.title}
                      </p>
                      <p className="text-[12px]" style={{ color: "#9891A0" }}>
                        {new Date(t.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className="text-[12px] font-medium"
                        style={{ color: PRIORITY_STYLE[t.priority].text }}
                      >
                        {PRIORITY_STYLE[t.priority].label}
                      </span>
                      <span
                        className="inline-flex px-2 py-1 rounded-md text-[11.5px] font-medium"
                        style={{
                          backgroundColor: STATUS_STYLE[t.status].bg,
                          color: STATUS_STYLE[t.status].text,
                        }}
                      >
                        {STATUS_STYLE[t.status].label}
                      </span>
                      <Icon
                        icon="mdi:chevron-right"
                        width={16}
                        height={16}
                        color="#9891A0"
                      />
                    </div>
                  </button>
                ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function TicketDetailPanel({
  ticketId,
  onBack,
  onClose,
}: {
  ticketId: string;
  onBack: () => void;
  onClose: () => void;
}) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const fetchDetail = async () => {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        if (!res.ok) throw new Error();
        const data: TicketDetail = await res.json();
        setTicket(data);
      } catch {
        setErrorMsg("Couldn't load ticket details.");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [ticketId]);

  return (
    <>
      <div
        className="flex items-center gap-2 px-5 py-4 border-b shrink-0"
        style={{ borderColor: "#E8E2EE" }}
      >
        <button onClick={onBack} aria-label="Back">
          <Icon icon="mdi:arrow-left" width={18} height={18} color="#4A4351" />
        </button>
        <h2
          className="text-[15px] font-medium flex-1 truncate"
          style={{ color: "#1E1522" }}
        >
          {ticket?.title ?? "Ticket details"}
        </h2>
        <button onClick={onClose} aria-label="Close">
          <Icon icon="mdi:close" width={20} height={20} color="#9891A0" />
        </button>
      </div>

      <div className="overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {loading && (
          <p className="text-[13px]" style={{ color: "#9891A0" }}>
            Loading…
          </p>
        )}

        {errorMsg && (
          <p className="text-[13px]" style={{ color: "#A32D2D" }}>
            {errorMsg}
          </p>
        )}

        {!loading && ticket && (
          <>
            <div className="flex items-center gap-2">
              <span
                className="text-[12px] font-medium"
                style={{ color: PRIORITY_STYLE[ticket.priority].text }}
              >
                {PRIORITY_STYLE[ticket.priority].label} priority
              </span>
              <span
                className="inline-flex px-2 py-1 rounded-md text-[11.5px] font-medium"
                style={{
                  backgroundColor: STATUS_STYLE[ticket.status].bg,
                  color: STATUS_STYLE[ticket.status].text,
                }}
              >
                {STATUS_STYLE[ticket.status].label}
              </span>
            </div>

            <div>
              <p
                className="text-[11.5px] font-medium mb-1"
                style={{ color: "#9891A0" }}
              >
                DESCRIPTION
              </p>
              <p className="text-[13.5px]" style={{ color: "#1E1522" }}>
                {ticket.description || "—"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <InfoField label="Reported by" value={ticket.reporterName} />
              <InfoField label="Department" value={ticket.department} />
              <InfoField label="Phone" value={ticket.phoneNumber} />
              <InfoField label="Device" value={ticket.deviceName} />
              <InfoField
                label="Created by"
                value={`${ticket.createdBy.firstName} ${ticket.createdBy.lastName}`}
              />
              <InfoField
                label="Assigned to"
                value={
                  ticket.assignedTo
                    ? `${ticket.assignedTo.firstName} ${ticket.assignedTo.lastName}`
                    : "Unassigned"
                }
              />
            </div>

            <div>
              <p
                className="text-[11.5px] font-medium mb-2"
                style={{ color: "#9891A0" }}
              >
                ATTACHMENTS ({ticket.attachments.length})
              </p>
              {ticket.attachments.length === 0 ? (
                <p className="text-[13px]" style={{ color: "#9891A0" }}>
                  No files attached.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {ticket.attachments.map((a) =>
                    IMAGE_EXT.test(a.fileName) ? (
                      <a
                        key={a.id}
                        href={a.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-lg overflow-hidden"
                        style={{ border: "1px solid #E8E2EE" }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={a.fileUrl}
                          alt={a.fileName}
                          className="w-full h-20 object-cover"
                        />
                      </a>
                    ) : (
                      <a
                        key={a.id}
                        href={a.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center justify-center gap-1 h-20 rounded-lg px-1"
                        style={{ border: "1px solid #E8E2EE" }}
                      >
                        <Icon
                          icon="mdi:file-outline"
                          width={20}
                          height={20}
                          color="#746B7E"
                        />
                        <span
                          className="text-[10.5px] text-center truncate w-full"
                          style={{ color: "#746B7E" }}
                        >
                          {a.fileName}
                        </span>
                      </a>
                    ),
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function InfoField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-[11.5px]" style={{ color: "#9891A0" }}>
        {label}
      </p>
      <p className="text-[13px]" style={{ color: "#1E1522" }}>
        {value || "—"}
      </p>
    </div>
  );
}
