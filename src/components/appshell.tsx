"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import {
  getCurrentUser,
  getToken,
  isAdmin,
  logout,
  AuthUser,
} from "../lib/auth";

const navItems = [
  {
    href: "/tickets",
    label: "Tickets",
    icon: "mdi:ticket-outline",
    adminOnly: false,
  },
  {
    href: "/categories",
    label: "Categories",
    icon: "mdi:shape-outline",
    adminOnly: true,
  },
  {
    href: "/users",
    label: "Users",
    icon: "mdi:account-multiple-outline",
    adminOnly: true,
  },
];

const API_BASE = "http://localhost:3006";
const POLL_INTERVAL_MS = 30_000;

interface Notification {
  id: string;
  message: string;
  read: boolean;
  createdAt: string;
  ticket: { id: string; title: string } | null;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const current = getCurrentUser();
    if (!current) {
      router.replace("/login");
      return;
    }
    setUser(current);
    setChecked(true);
  }, [router]);

  if (!checked) {
    return <div className="min-h-screen bg-white" />;
  }

  const initials = user ? `${user.firstName[0]}${user.lastName[0]}` : "";

  return (
    <div className="min-h-screen flex bg-white">
      {/* Sidebar */}
      <aside
        className="w-60 shrink-0 flex flex-col justify-between border-r"
        style={{ borderColor: "#E8E2EE" }}
      >
        <div>
          <div
            className="flex items-center justify-between gap-2 px-5 h-16 border-b"
            style={{ borderColor: "#E8E2EE" }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: "#F3EDF9" }}
              >
                <Icon
                  icon="mdi:headset"
                  width={18}
                  height={18}
                  color="#613189"
                />
              </div>
              <span
                className="text-[15px] font-medium tracking-tight truncate"
                style={{ color: "#1E1522" }}
              >
                IT HelpDesk
              </span>
            </div>
            {user && <NotificationBell userId={user.id} router={router} />}
          </div>

          <nav className="px-3 py-4 space-y-1">
            {navItems
              .filter((item) => !item.adminOnly || isAdmin(user))
              .map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 px-3 h-9 rounded-lg text-[13.5px] font-medium transition-colors"
                    style={{
                      color: active ? "#613189" : "#4A4351",
                      backgroundColor: active ? "#F3EDF9" : "transparent",
                    }}
                  >
                    <Icon icon={item.icon} width={17} height={17} />
                    {item.label}
                  </a>
                );
              })}
          </nav>
        </div>

        <div className="px-3 py-4 border-t" style={{ borderColor: "#E8E2EE" }}>
          <a
            href="/profile"
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg mb-1 transition-colors"
            style={{
              backgroundColor:
                pathname === "/profile" ? "#F3EDF9" : "transparent",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-medium shrink-0"
              style={{ backgroundColor: "#613189", color: "#FFFFFF" }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p
                className="text-[13px] font-medium truncate"
                style={{ color: "#1E1522" }}
              >
                {user?.firstName} {user?.lastName}
              </p>
              <p
                className="text-[11.5px] truncate"
                style={{ color: "#9891A0" }}
              >
                {isAdmin(user) ? "Admin" : "Member"}
              </p>
            </div>
          </a>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2.5 px-2 h-8 rounded-lg text-[13px] font-medium transition-colors"
            style={{ color: "#746B7E" }}
          >
            <Icon icon="mdi:logout" width={16} height={16} />
            Log out
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function NotificationBell({
  userId,
  router,
}: {
  userId: string;
  router: ReturnType<typeof useRouter>;
}) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/notifications?userId=${userId}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // fail silently — the bell just won't update this cycle
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // close popover on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleItemClick = async (n: Notification) => {
    setOpen(false);
    if (!n.read) {
      // optimistic update so the badge/list feel instant
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)),
      );
      fetch(`${API_BASE}/notifications/${n.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ read: true }),
      }).catch(() => {});
    }
    if (n.ticket) {
      router.push(`/tickets/${n.ticket.id}`);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch(`${API_BASE}/notifications/mark-all-read/${userId}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
    } catch {
      fetchNotifications(); // fall back to server state if it failed
    }
  };

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: open ? "#F3EDF9" : "transparent" }}
        aria-label="Notifications"
      >
        <Icon icon="mdi:bell-outline" width={18} height={18} color="#4A4351" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[10px] font-medium text-white"
            style={{ backgroundColor: "#A32D2D" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-10 w-80 rounded-xl overflow-hidden shadow-lg z-50"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E8E2EE",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "#E8E2EE" }}
          >
            <span
              className="text-[13.5px] font-medium"
              style={{ color: "#1E1522" }}
            >
              Notifications
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[12px] font-medium"
                style={{ color: "#613189" }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 && (
              <p
                className="px-4 py-6 text-center text-[13px]"
                style={{ color: "#9891A0" }}
              >
                Loading…
              </p>
            )}

            {!loading && notifications.length === 0 && (
              <p
                className="px-4 py-6 text-center text-[13px]"
                style={{ color: "#9891A0" }}
              >
                No notifications yet.
              </p>
            )}

            {notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleItemClick(n)}
                className="w-full text-left px-4 py-3 border-b flex flex-col gap-0.5"
                style={{
                  borderColor: "#F0ECF4",
                  backgroundColor: n.read ? "transparent" : "#FAF8FB",
                }}
              >
                <span
                  className="text-[13px]"
                  style={{
                    color: "#1E1522",
                    fontWeight: n.read ? 400 : 500,
                  }}
                >
                  {n.message}
                </span>
                <span className="text-[11.5px]" style={{ color: "#9891A0" }}>
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
