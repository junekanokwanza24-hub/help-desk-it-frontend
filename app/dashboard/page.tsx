"use client";

import { useEffect, useState, useCallback } from "react";
import { Icon } from "@iconify/react";
import AppShell from "@/src/components/appshell";
import { getToken } from "@/src/lib/auth";

type TicketStatus = "PENDING" | "IN_PROGRESS" | "SUCCESS" | "ABORTED";
type PriorityType = "HIGH" | "MEDIUM" | "LOW";

interface TicketRow {
  id: string;
  title: string;
  status: TicketStatus;
  priority: PriorityType;
  createdAt: string;
  category?: string;
}

interface DashboardStats {
  totals: {
    all: number;
    pending: number;
    inProgress: number;
    success: number;
    aborted: number;
    unassigned: number;
    highOpen: number;
  };
  avgResolutionHours: number | null;
  trend: { date: string; created: number; resolved: number }[];
  byCategory: { name: string; count: number }[];
  byDepartment: { name: string; count: number }[];
  byPriority: { priority: PriorityType; count: number }[];
  workload: { name: string; count: number }[];
  recent: TicketRow[];
  oldestOpen: TicketRow[];
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

const API_BASE = "https://help-desk-it-backend-1.onrender.com";
const RANGES = [7, 14, 30];

function formatDuration(hours: number | null) {
  if (hours === null) return "—";
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)} hr`;
  return `${(hours / 24).toFixed(1)} days`;
}

function daysOpen(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${API_BASE}/dashboard/stats?days=${days}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error();
      setStats(await res.json());
    } catch {
      setErrorMsg("Couldn't load dashboard. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <AppShell>
      <div className="px-8 py-8 w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1
              className="text-[22px] font-medium mb-1"
              style={{ color: "#1E1522" }}
            >
              Dashboard
            </h1>
            <p className="text-[13.5px]" style={{ color: "#746B7E" }}>
              {loading && !stats
                ? "Loading…"
                : `${stats?.totals.all ?? 0} tickets overall`}
            </p>
          </div>
          <div
            className="flex rounded-lg overflow-hidden"
            style={{ border: "1px solid #E8E2EE" }}
          >
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setDays(r)}
                className="h-9 px-3 text-[13px] font-medium"
                style={{
                  backgroundColor: days === r ? "#613189" : "#fff",
                  color: days === r ? "#fff" : "#4A4351",
                }}
              >
                {r}d
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div
            className="mb-4 px-4 py-3 rounded-lg text-[13px]"
            style={{ backgroundColor: "#FCEBEB", color: "#A32D2D" }}
          >
            {errorMsg}
          </div>
        )}

        {!stats && loading && (
          <p
            className="py-16 text-center text-[13.5px]"
            style={{ color: "#9891A0" }}
          >
            Loading dashboard…
          </p>
        )}

        {stats && (
          <div
            className="flex flex-col gap-4"
            style={{ opacity: loading ? 0.6 : 1 }}
          >
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatCard label="Total" value={stats.totals.all} />
              <StatCard
                label="Pending"
                value={stats.totals.pending}
                color={STATUS_STYLE.PENDING.text}
              />
              <StatCard
                label="In progress"
                value={stats.totals.inProgress}
                color={STATUS_STYLE.IN_PROGRESS.text}
              />
              <StatCard
                label="Resolved"
                value={stats.totals.success}
                color={STATUS_STYLE.SUCCESS.text}
              />
              <StatCard
                label="Aborted"
                value={stats.totals.aborted}
                color={STATUS_STYLE.ABORTED.text}
              />
            </div>

            {/* Attention row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <StatCard
                label="High priority, still open"
                value={stats.totals.highOpen}
                color={stats.totals.highOpen > 0 ? "#A32D2D" : undefined}
                icon="mdi:alert-circle-outline"
              />
              <StatCard
                label="Unassigned (open)"
                value={stats.totals.unassigned}
                color={stats.totals.unassigned > 0 ? "#854F0B" : undefined}
                icon="mdi:account-question-outline"
              />
              <StatCard
                label="Avg. resolution time"
                value={formatDuration(stats.avgResolutionHours)}
                icon="mdi:timer-outline"
              />
            </div>

            {/* Trend */}
            <Card title={`Created vs resolved · last ${days} days`}>
              <TrendChart data={stats.trend} />
            </Card>

            {/* Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="By category">
                <BarList items={stats.byCategory} empty="No categories yet." />
              </Card>
              <Card title="Top departments">
                <BarList
                  items={stats.byDepartment}
                  empty="No department data."
                />
              </Card>
              <Card title="Open tickets by priority">
                <BarList
                  items={(["HIGH", "MEDIUM", "LOW"] as PriorityType[]).map(
                    (p) => ({
                      name: PRIORITY_STYLE[p].label,
                      count:
                        stats.byPriority.find((x) => x.priority === p)?.count ??
                        0,
                      color: PRIORITY_STYLE[p].text,
                    }),
                  )}
                  empty="No open tickets."
                />
              </Card>
              <Card title="Workload (open tickets per assignee)">
                <BarList items={stats.workload} empty="No assigned tickets." />
              </Card>
            </div>

            {/* Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="Oldest open tickets">
                <TicketList
                  items={stats.oldestOpen}
                  empty="Nothing open. 🎉"
                  meta={(t) => `${daysOpen(t.createdAt)}d open`}
                />
              </Card>
              <Card title="Recent tickets">
                <TicketList
                  items={stats.recent}
                  empty="No tickets yet."
                  meta={(t) => new Date(t.createdAt).toLocaleDateString()}
                />
              </Card>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl p-5 bg-white"
      style={{ border: "1px solid #E8E2EE" }}
    >
      <h2 className="text-[14px] font-medium mb-4" style={{ color: "#1E1522" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "#1E1522",
  icon,
}: {
  label: string;
  value: number | string;
  color?: string;
  icon?: string;
}) {
  return (
    <div
      className="rounded-xl px-4 py-4 bg-white"
      style={{ border: "1px solid #E8E2EE" }}
    >
      <div className="flex items-center justify-between mb-1">
        <p className="text-[12px] font-medium" style={{ color: "#9891A0" }}>
          {label}
        </p>
        {icon && <Icon icon={icon} width={16} height={16} color="#9891A0" />}
      </div>
      <p className="text-[24px] font-medium" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function BarList({
  items,
  empty,
}: {
  items: { name: string; count: number; color?: string }[];
  empty: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0)
    return (
      <p className="text-[13px] py-4 text-center" style={{ color: "#9891A0" }}>
        {empty}
      </p>
    );
  return (
    <div className="flex flex-col gap-3">
      {items.map((i) => (
        <div key={i.name}>
          <div className="flex justify-between text-[12.5px] mb-1">
            <span className="truncate" style={{ color: "#4A4351" }}>
              {i.name}
            </span>
            <span style={{ color: "#746B7E" }}>{i.count}</span>
          </div>
          <div
            className="h-2 rounded-full"
            style={{ backgroundColor: "#F3EDF9" }}
          >
            <div
              className="h-2 rounded-full"
              style={{
                width: `${(i.count / max) * 100}%`,
                backgroundColor: i.color ?? "#613189",
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendChart({
  data,
}: {
  data: { date: string; created: number; resolved: number }[];
}) {
  const max = Math.max(1, ...data.flatMap((d) => [d.created, d.resolved]));
  const H = 120;
  const labelEvery = Math.ceil(data.length / 7);

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-[12px]">
        <span
          className="flex items-center gap-1.5"
          style={{ color: "#746B7E" }}
        >
          <span
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: "#613189" }}
          />
          Created
        </span>
        <span
          className="flex items-center gap-1.5"
          style={{ color: "#746B7E" }}
        >
          <span
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: "#3B6D11" }}
          />
          Resolved
        </span>
      </div>
      <div className="flex items-end gap-1" style={{ height: H }}>
        {data.map((d) => (
          <div
            key={d.date}
            className="flex-1 flex items-end justify-center gap-0.5 h-full"
            title={`${d.date} — created ${d.created}, resolved ${d.resolved}`}
          >
            <div
              className="w-full rounded-t-sm"
              style={{
                height: `${(d.created / max) * 100}%`,
                minHeight: d.created ? 2 : 0,
                backgroundColor: "#613189",
              }}
            />
            <div
              className="w-full rounded-t-sm"
              style={{
                height: `${(d.resolved / max) * 100}%`,
                minHeight: d.resolved ? 2 : 0,
                backgroundColor: "#3B6D11",
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-2">
        {data.map((d, i) => (
          <div
            key={d.date}
            className="flex-1 text-center text-[10.5px]"
            style={{ color: "#9891A0" }}
          >
            {i % labelEvery === 0 ? d.date.slice(5) : ""}
          </div>
        ))}
      </div>
    </div>
  );
}

function TicketList({
  items,
  empty,
  meta,
}: {
  items: TicketRow[];
  empty: string;
  meta: (t: TicketRow) => string;
}) {
  if (items.length === 0)
    return (
      <p className="text-[13px] py-4 text-center" style={{ color: "#9891A0" }}>
        {empty}
      </p>
    );
  return (
    <div className="flex flex-col">
      {items.map((t) => (
        <div
          key={t.id}
          className="flex items-center justify-between gap-3 py-2.5"
          style={{ borderBottom: "1px solid #F0ECF4" }}
        >
          <div className="min-w-0">
            <p
              className="text-[13.5px] font-medium truncate"
              style={{ color: "#1E1522" }}
            >
              {t.title}
            </p>
            <p className="text-[12px]" style={{ color: "#9891A0" }}>
              {meta(t)}
              {t.category ? ` · ${t.category}` : ""}
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
          </div>
        </div>
      ))}
    </div>
  );
}
