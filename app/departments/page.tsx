"use client";

import { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import AppShell from "@/src/components/appshell";
import { getToken } from "@/src/lib/auth";

interface Department {
  id: string;
  name: string;
  ticketCount: number;
}

const API_BASE = "https://help-desk-it-backend-1.onrender.com";

export default function DepartmentsListPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(
    null,
  );

  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/departments`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const data: Department[] = await res.json();
      setDepartments(data);
    } catch {
      setErrorMsg("Couldn't load departments. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  return (
    <AppShell>
      <div className="px-8 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-[22px] font-medium mb-1"
              style={{ color: "#1E1522" }}
            >
              Departments
            </h1>
            <p className="text-[13.5px]" style={{ color: "#746B7E" }}>
              {loading ? "Loading…" : `${departments.length} total`}
            </p>
          </div>
          <button
            onClick={() => setNewModalOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13.5px] font-medium text-white"
            style={{ backgroundColor: "#613189" }}
          >
            <Icon icon="mdi:plus" width={16} height={16} />
            New department
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
                {["Department", "Tickets", ""].map((h) => (
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
                    Loading departments…
                  </td>
                </tr>
              )}

              {!loading && departments.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-10 text-center text-[13.5px]"
                    style={{ color: "#9891A0" }}
                  >
                    No departments yet.
                  </td>
                </tr>
              )}

              {!loading &&
                departments.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-[#FAF8FB]"
                    style={{ borderBottom: "1px solid #F0ECF4" }}
                  >
                    <td
                      className="px-4 py-3 text-[13.5px] font-medium"
                      style={{ color: "#1E1522" }}
                    >
                      {d.name}
                    </td>
                    <td
                      className="px-4 py-3 text-[13px]"
                      style={{ color: "#746B7E" }}
                    >
                      {d.ticketCount ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setEditingDepartment(d)}
                          className="p-1.5 rounded-md hover:bg-[#F3EDF9]"
                          style={{ color: "#746B7E" }}
                          aria-label={`Edit ${d.name}`}
                        >
                          <Icon
                            icon="mdi:pencil-outline"
                            width={16}
                            height={16}
                          />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {newModalOpen && (
        <DepartmentFormModal
          onClose={() => setNewModalOpen(false)}
          onSaved={fetchDepartments}
        />
      )}

      {editingDepartment && (
        <DepartmentFormModal
          department={editingDepartment}
          onClose={() => setEditingDepartment(null)}
          onSaved={fetchDepartments}
        />
      )}
    </AppShell>
  );
}

/** Create when `department` is omitted, edit (rename) when provided. */
function DepartmentFormModal({
  department,
  onClose,
  onSaved,
}: {
  department?: Department;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!department;
  const [name, setName] = useState(department?.name ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }
    if (isEdit && trimmed === department.name) {
      onClose();
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(
        isEdit
          ? `${API_BASE}/departments/${department.id}`
          : `${API_BASE}/departments`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ name: trimmed }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.message ||
            (isEdit
              ? "Failed to update department"
              : "Failed to create department"),
        );
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : isEdit
            ? "Couldn't update the department."
            : "Couldn't create the department.",
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
          {isEdit ? "Edit department" : "New department"}
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
          placeholder="Department name"
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
            {submitting
              ? isEdit
                ? "Saving…"
                : "Creating…"
              : isEdit
                ? "Save"
                : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
