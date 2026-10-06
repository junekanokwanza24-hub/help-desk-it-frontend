"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        "https://help-desk-it-backend-1.onrender.com/auth/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        },
      );

      if (!res.ok) {
        if (res.status === 401) {
          setError("Incorrect email or password.");
        } else {
          setError("Sign in failed. Try again.");
        }
        return;
      }

      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      window.location.href = "/tickets";
    } catch {
      setError("Couldn't reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-6"
      style={{ backgroundColor: "#FAF8FB" }}
    >
      <div className="w-full max-w-sm">
        {" "}
        {/* Card */}
        <div
          className="rounded-2xl px-7 py-8"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E8E2EE",
          }}
        >
          <div className="flex flex-col items-center mb-8">
            <span
              className="text-[16px] font-medium tracking-tight"
              style={{ color: "#1E1522" }}
            >
              HospitalCare IT Helpdesk
            </span>
          </div>
          <div className="flex items-center justify-center">
            <img src={"/logo.png"} width={150} height={150} />
          </div>
          <h1
            className="text-[20px] font-medium leading-tight mb-1 text-center"
            style={{ color: "#1E1522" }}
          >
            Sign in
          </h1>
          <p
            className="text-[13.5px] mb-7 text-center"
            style={{ color: "#746B7E" }}
          >
            Report equipment issues and track repairs across every department
            and ward.
          </p>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-[13px] font-medium mb-1.5"
                style={{ color: "#1E1522" }}
              >
                Staff email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@hospitalcare.go.th"
                className="w-full h-11 px-3.5 rounded-lg text-[14px] outline-none transition-colors"
                style={{
                  border: "1px solid #E8E2EE",
                  color: "#1E1522",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#613189")}
                onBlur={(e) => (e.target.style.borderColor = "#E8E2EE")}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="password"
                  className="block text-[13px] font-medium"
                  style={{ color: "#1E1522" }}
                >
                  Password
                </label>
                <a
                  href="#"
                  className="text-[13px] font-medium hover:underline"
                  style={{ color: "#613189" }}
                >
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full h-11 px-3.5 pr-11 rounded-lg text-[14px] outline-none transition-colors"
                  style={{
                    border: "1px solid #E8E2EE",
                    color: "#1E1522",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#613189")}
                  onBlur={(e) => (e.target.style.borderColor = "#E8E2EE")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#746B7E" }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <Icon
                    icon={
                      showPassword ? "mdi:eye-off-outline" : "mdi:eye-outline"
                    }
                    width={17}
                    height={17}
                  />
                </button>
              </div>
            </div>

            {error && (
              <p className="text-[13px]" style={{ color: "#B3261E" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-lg text-[14px] font-medium text-white transition-opacity disabled:opacity-60"
              style={{ backgroundColor: "#613189" }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
        <p
          className="text-[12px] text-center mt-6"
          style={{ color: "#9891A0" }}
        >
          Internal system — hospital staff only. For urgent equipment failures
          affecting patient care, call the IT hotline directly.
        </p>
      </div>
    </div>
  );
}
