"use client";

import AppShell from "@/src/components/appshell";
import { getCurrentUser, getToken, isAdmin } from "@/src/lib/auth";
import { useEffect, useState } from "react";

const API_BASE = "http://localhost:3006";

export default function ProfilePage() {
  const user = getCurrentUser();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
      setEmail(user.email);
    }
  }, [user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("All fields are required.");
      return;
    }

    setSavingProfile(true);
    try {
      const res = await fetch(`${API_BASE}/users/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ firstName, lastName, email }),
      });
      if (!res.ok) throw new Error();
      setMessage("Profile updated.");
    } catch {
      setError("Couldn't update your profile. Try again.");
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSavingPassword(true);
    try {
      const res = await fetch(`${API_BASE}/users/me/password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) throw new Error();
      setMessage("Password changed.");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Couldn't change your password. Try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <AppShell>
      <div className="px-8 py-8 max-w-lg">
        <h1
          className="text-[22px] font-medium mb-1"
          style={{ color: "#1E1522" }}
        >
          Profile
        </h1>
        <p className="text-[13.5px] mb-7" style={{ color: "#746B7E" }}>
          {isAdmin(user) ? "Admin account" : "Member account"}
        </p>

        {message && (
          <div
            className="mb-5 px-4 py-3 rounded-lg text-[13px]"
            style={{ backgroundColor: "#EAF3DE", color: "#3B6D11" }}
          >
            {message}
          </div>
        )}
        {error && (
          <div
            className="mb-5 px-4 py-3 rounded-lg text-[13px]"
            style={{ backgroundColor: "#FCEBEB", color: "#A32D2D" }}
          >
            {error}
          </div>
        )}

        {/* Profile details */}
        <form onSubmit={handleProfileSubmit} className="space-y-4 mb-10">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-[13px] font-medium mb-1.5"
                style={{ color: "#1E1522" }}
              >
                First name
              </label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg text-[14px] outline-none"
                style={{ border: "1px solid #E8E2EE", color: "#1E1522" }}
              />
            </div>
            <div>
              <label
                className="block text-[13px] font-medium mb-1.5"
                style={{ color: "#1E1522" }}
              >
                Last name
              </label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg text-[14px] outline-none"
                style={{ border: "1px solid #E8E2EE", color: "#1E1522" }}
              />
            </div>
          </div>

          <div>
            <label
              className="block text-[13px] font-medium mb-1.5"
              style={{ color: "#1E1522" }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3.5 rounded-lg text-[14px] outline-none"
              style={{ border: "1px solid #E8E2EE", color: "#1E1522" }}
            />
          </div>

          <button
            type="submit"
            disabled={savingProfile}
            className="h-10 px-5 rounded-lg text-[13.5px] font-medium text-white disabled:opacity-60"
            style={{ backgroundColor: "#613189" }}
          >
            {savingProfile ? "Saving…" : "Save changes"}
          </button>
        </form>

        <div style={{ borderTop: "1px solid #E8E2EE" }} className="pt-7">
          <h2
            className="text-[15px] font-medium mb-4"
            style={{ color: "#1E1522" }}
          >
            Change password
          </h2>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label
                className="block text-[13px] font-medium mb-1.5"
                style={{ color: "#1E1522" }}
              >
                New password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full h-11 px-3.5 rounded-lg text-[14px] outline-none"
                style={{ border: "1px solid #E8E2EE", color: "#1E1522" }}
              />
            </div>
            <div>
              <label
                className="block text-[13px] font-medium mb-1.5"
                style={{ color: "#1E1522" }}
              >
                Confirm new password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full h-11 px-3.5 rounded-lg text-[14px] outline-none"
                style={{ border: "1px solid #E8E2EE", color: "#1E1522" }}
              />
            </div>
            <button
              type="submit"
              disabled={savingPassword}
              className="h-10 px-5 rounded-lg text-[13.5px] font-medium disabled:opacity-60"
              style={{ border: "1px solid #E8E2EE", color: "#1E1522" }}
            >
              {savingPassword ? "Updating…" : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
