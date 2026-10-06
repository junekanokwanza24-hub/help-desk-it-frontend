"use client";

import { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import AppShell from "@/src/components/appshell";
import { getCurrentUser, getToken, isAdmin } from "@/src/lib/auth";
import NewTicketModal from "@/src/components/new-ticket-modal";
import { useSearchParams } from "next/navigation";

type TicketStatus = "PENDING" | "IN_PROGRESS" | "SUCCESS" | "ABORTED";
type PriorityType = "HIGH" | "MEDIUM" | "LOW";

interface Ticket {
  id: string;
  title: string;
  status: TicketStatus;
  priority: PriorityType;
  createdAt: string;
  category: { id: string; name: string };
  createdBy: { id: string; firstName: string; lastName: string };
  assignedTo: { id: string; firstName: string; lastName: string } | null;
}

interface TicketsResponse {
  items: Ticket[];
  meta: { total: number; page: number; limit: number; totalPages: number };
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

export default function TicketsListPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [meta, setMeta] = useState<TicketsResponse["meta"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const searchParams = useSearchParams();
  const categoryId = searchParams.get("category");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<
    { id: string; firstName: string; lastName: string }[]
  >([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const currentUser = getCurrentUser();
  const admin = isAdmin(currentUser);

  const fetchTickets = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (categoryId) params.set("category", categoryId);

      const res = await fetch(`${API_BASE}/tickets?${params.toString()}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) throw new Error();

      const data: TicketsResponse = await res.json();
      setTickets(data.items);
      setMeta(data.meta);
    } catch {
      setErrorMsg("Couldn't load tickets. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [status, priority, page, categoryId]);

  // fetch users once on mount (for the assign dropdown)
  useEffect(() => {
    fetch(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
            ? data.items
            : [];
        if (!Array.isArray(data) && !Array.isArray(data?.items)) {
          console.warn("Unexpected /users response shape:", data);
        }
        setUsers(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleAssign = async (ticketId: string, userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ assignedToId: userId || null }),
      });
      if (!res.ok) throw new Error();
      fetchTickets();
    } catch {
      alert("Couldn't assign the ticket. Try again.");
    }
  };

  const handleStatusChange = async (
    ticketId: string,
    newStatus: TicketStatus,
  ) => {
    try {
      const res = await fetch(`${API_BASE}/tickets/${ticketId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error();
      fetchTickets();
    } catch {
      alert("Couldn't update the status. Try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this ticket? This can't be undone.")) return;
    try {
      const res = await fetch(`${API_BASE}/tickets/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      fetchTickets();
    } catch {
      alert("Couldn't delete the ticket. Try again.");
    }
  };

  return (
    <AppShell>
      <div className="px-8 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-[22px] font-medium mb-1"
              style={{ color: "#1E1522" }}
            >
              Tickets
            </h1>
            <p className="text-[13.5px]" style={{ color: "#746B7E" }}>
              {meta ? `${meta.total} total` : "Loading…"}
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13.5px] font-medium text-white"
            style={{ backgroundColor: "#613189" }}
          >
            <Icon icon="mdi:plus" width={16} height={16} />
            New ticket
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-5">
          <select
            value={status}
            onChange={(e) => {
              setPage(1);
              setStatus(e.target.value);
            }}
            className="h-9 px-3 rounded-lg text-[13px] outline-none"
            style={{ border: "1px solid #E8E2EE", color: "#1E1522" }}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="SUCCESS">Resolved</option>
            <option value="ABORTED">Aborted</option>
          </select>

          <select
            value={priority}
            onChange={(e) => {
              setPage(1);
              setPriority(e.target.value);
            }}
            className="h-9 px-3 rounded-lg text-[13px] outline-none"
            style={{ border: "1px solid #E8E2EE", color: "#1E1522" }}
          >
            <option value="">All priorities</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {(status || priority) && (
            <button
              onClick={() => {
                setStatus("");
                setPriority("");
                setPage(1);
              }}
              className="text-[13px] font-medium"
              style={{ color: "#613189" }}
            >
              Clear filters
            </button>
          )}

          {categoryId && (
            <a
              href="/tickets"
              className="text-[13px] font-medium"
              style={{ color: "#613189" }}
            >
              Clear category filter
            </a>
          )}
        </div>

        {errorMsg && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-[13px]"
            style={{ backgroundColor: "#FCEBEB", color: "#A32D2D" }}
          >
            {errorMsg}
          </div>
        )}

        {/* Table */}
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
                {[
                  "Ticket",
                  "Category",
                  "Priority",
                  "Status",
                  "Assigned to",
                  "Created",
                  "",
                ].map((h) => (
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
                    colSpan={7}
                    className="px-4 py-10 text-center text-[13.5px]"
                    style={{ color: "#9891A0" }}
                  >
                    Loading tickets…
                  </td>
                </tr>
              )}

              {!loading && tickets.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-10 text-center text-[13.5px]"
                    style={{ color: "#9891A0" }}
                  >
                    No tickets match these filters.
                  </td>
                </tr>
              )}

              {!loading &&
                tickets.map((t) => {
                  const canChangeStatus =
                    admin || currentUser?.id === t.assignedTo?.id;

                  return (
                    <tr
                      key={t.id}
                      style={{ borderBottom: "1px solid #F0ECF4" }}
                    >
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedTicketId(t.id)}
                          className="text-[13.5px] font-medium hover:underline text-left"
                          style={{ color: "#1E1522" }}
                        >
                          {t.title}
                        </button>
                      </td>
                      <td
                        className="px-4 py-3 text-[13px]"
                        style={{ color: "#746B7E" }}
                      >
                        {t.category.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-[13px] font-medium"
                          style={{ color: PRIORITY_STYLE[t.priority].text }}
                        >
                          {PRIORITY_STYLE[t.priority].label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canChangeStatus ? (
                          <select
                            value={t.status}
                            onChange={(e) =>
                              handleStatusChange(
                                t.id,
                                e.target.value as TicketStatus,
                              )
                            }
                            className="h-7 px-2 rounded-md text-[12px] font-medium outline-none"
                            style={{
                              backgroundColor: STATUS_STYLE[t.status].bg,
                              color: STATUS_STYLE[t.status].text,
                              border: "1px solid transparent",
                            }}
                          >
                            <option value="PENDING">Pending</option>
                            <option value="IN_PROGRESS">In progress</option>
                            <option value="SUCCESS">Resolved</option>
                            <option value="ABORTED">Aborted</option>
                          </select>
                        ) : (
                          <span
                            className="inline-flex px-2.5 py-1 rounded-md text-[12px] font-medium"
                            style={{
                              backgroundColor: STATUS_STYLE[t.status].bg,
                              color: STATUS_STYLE[t.status].text,
                            }}
                          >
                            {STATUS_STYLE[t.status].label}
                          </span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-[13px]"
                        style={{ color: "#746B7E" }}
                      >
                        {admin ? (
                          <select
                            value={t.assignedTo?.id ?? ""}
                            onChange={(e) => handleAssign(t.id, e.target.value)}
                            className="h-7 px-2 rounded-md text-[12.5px] outline-none"
                            style={{
                              border: "1px solid #E8E2EE",
                              color: "#1E1522",
                            }}
                          >
                            <option value="">Unassigned</option>
                            {users.map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.firstName} {u.lastName}
                              </option>
                            ))}
                          </select>
                        ) : t.assignedTo ? (
                          `${t.assignedTo.firstName} ${t.assignedTo.lastName}`
                        ) : (
                          "—"
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-[13px]"
                        style={{ color: "#9891A0" }}
                      >
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {admin && (
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 rounded-md"
                            style={{ color: "#9891A0" }}
                            aria-label="Delete ticket"
                          >
                            <Icon
                              icon="mdi:trash-can-outline"
                              width={16}
                              height={16}
                            />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-[13px]" style={{ color: "#9891A0" }}>
              Page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="h-8 px-3 rounded-lg text-[13px] font-medium disabled:opacity-40"
                style={{ border: "1px solid #E8E2EE", color: "#4A4351" }}
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                disabled={page >= meta.totalPages}
                className="h-8 px-3 rounded-lg text-[13px] font-medium disabled:opacity-40"
                style={{ border: "1px solid #E8E2EE", color: "#4A4351" }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      <NewTicketModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={fetchTickets}
      />

      {selectedTicketId && (
        <TicketDetailModal
          ticketId={selectedTicketId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </AppShell>
  );
}

function TicketDetailModal({
  ticketId,
  onClose,
}: {
  ticketId: string;
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
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col"
      >
        <div
          className="flex items-center gap-2 px-5 py-4 border-b shrink-0"
          style={{ borderColor: "#E8E2EE" }}
        >
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[12px]" style={{ color: "#9891A0" }}>
                  {ticket.category.name}
                </span>
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
      </div>
    </div>
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
