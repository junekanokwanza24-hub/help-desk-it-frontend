"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import AppShell from "@/src/components/appshell";
import { getCurrentUser, getToken, isAdmin } from "@/src/lib/auth";

type Role = "ADMIN" | "USER";

interface AppUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  createdAt: string;
}

const API_BASE = "http://localhost:3006";

export default function UsersPage() {
  const router = useRouter();
  const admin = isAdmin(getCurrentUser());

  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  // kick non-admins out — client-side only, see note about backend guards
  useEffect(() => {
    if (!admin) {
      router.replace("/tickets");
    }
  }, [admin, router]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/users`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const data: AppUser[] = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setErrorMsg("Couldn't load users. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (id: string, role: Role) => {
    try {
      const res = await fetch(`${API_BASE}/users/${id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error();
      fetchUsers();
    } catch {
      alert("Couldn't update role. Try again.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this user? This can't be undone.")) return;
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        // most likely a foreign key error — this user has tickets/comments
        throw new Error();
      }
      fetchUsers();
    } catch {
      alert(
        "Couldn't delete this user — they likely have tickets, comments, or attachments linked to their account.",
      );
    }
  };

  if (!admin) return null; // avoid a flash of content before redirect fires

  return (
    <AppShell>
      <div className="px-8 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-[22px] font-medium mb-1"
              style={{ color: "#1E1522" }}
            >
              Users
            </h1>
            <p className="text-[13.5px]" style={{ color: "#746B7E" }}>
              {users.length ? `${users.length} total` : "Loading…"}
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg text-[13.5px] font-medium text-white"
            style={{ backgroundColor: "#613189" }}
          >
            <Icon icon="mdi:plus" width={16} height={16} />
            New user
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
                {["Name", "Email", "Role", "Joined", ""].map((h) => (
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
                    colSpan={5}
                    className="px-4 py-10 text-center text-[13.5px]"
                    style={{ color: "#9891A0" }}
                  >
                    Loading users…
                  </td>
                </tr>
              )}

              {!loading && users.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-[13.5px]"
                    style={{ color: "#9891A0" }}
                  >
                    No users yet.
                  </td>
                </tr>
              )}

              {!loading &&
                users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #F0ECF4" }}>
                    <td
                      className="px-4 py-3 text-[13.5px] font-medium"
                      style={{ color: "#1E1522" }}
                    >
                      {u.firstName} {u.lastName}
                    </td>
                    <td
                      className="px-4 py-3 text-[13px]"
                      style={{ color: "#746B7E" }}
                    >
                      {u.email}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={(e) =>
                          handleRoleChange(u.id, e.target.value as Role)
                        }
                        className="h-7 px-2 rounded-md text-[12.5px] outline-none"
                        style={{
                          border: "1px solid #E8E2EE",
                          color: "#1E1522",
                        }}
                      >
                        <option value="USER">User</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </td>
                    <td
                      className="px-4 py-3 text-[13px]"
                      style={{ color: "#9891A0" }}
                    >
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="p-1.5 rounded-md"
                        style={{ color: "#9891A0" }}
                        aria-label="Delete user"
                      >
                        <Icon
                          icon="mdi:trash-can-outline"
                          width={16}
                          height={16}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <NewUserModal
          onClose={() => setModalOpen(false)}
          onCreated={fetchUsers}
        />
      )}
    </AppShell>
  );
}

function NewUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("USER");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ firstName, lastName, email, password, role }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message || "Failed to create user");
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Couldn't create the user.",
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
          New user
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
          placeholder="First name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="h-9 px-3 rounded-lg text-[13px] outline-none"
          style={{ border: "1px solid #E8E2EE" }}
        />
        <input
          required
          placeholder="Last name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="h-9 px-3 rounded-lg text-[13px] outline-none"
          style={{ border: "1px solid #E8E2EE" }}
        />
        <input
          required
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-9 px-3 rounded-lg text-[13px] outline-none"
          style={{ border: "1px solid #E8E2EE" }}
        />
        <input
          required
          type="password"
          placeholder="Password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-9 px-3 rounded-lg text-[13px] outline-none"
          style={{ border: "1px solid #E8E2EE" }}
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="h-9 px-3 rounded-lg text-[13px] outline-none"
          style={{ border: "1px solid #E8E2EE" }}
        >
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
        </select>

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
