import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";

interface SummaryRow {
  agentId: string;
  agentName: string;
  totalSales?: number;
  totalPremium?: number;
}
interface BundleRow {
  agentId: string;
  bundlePercentage?: number;
}
interface PifRow {
  agentId: string;
  pifPercentage?: number;
}

type BiLimitKey =
  | "LIMIT_25_50"
  | "LIMIT_50_100"
  | "LIMIT_100_300"
  | "LIMIT_250_500"
  | "LIMIT_300_500"
  | "LIMIT_500_500";

const BI_LIMIT_KEYS: BiLimitKey[] = [
  "LIMIT_25_50",
  "LIMIT_50_100",
  "LIMIT_100_300",
  "LIMIT_250_500",
  "LIMIT_300_500",
  "LIMIT_500_500",
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const now = new Date();
const YEAR_OPTIONS = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

const BI_LIMIT_LABELS: Record<BiLimitKey, string> = {
  LIMIT_25_50: "25/50",
  LIMIT_50_100: "50/100",
  LIMIT_100_300: "100/300",
  LIMIT_250_500: "250/500",
  LIMIT_300_500: "300/500",
  LIMIT_500_500: "500/500",
};

interface BiLimitsApiRow {
  agentId: string;
  totalAutoSales?: number;
  tiers?: Partial<Record<BiLimitKey, number>>;
}

interface BiLimitDisplayRow {
  agentId: string;
  agentName: string;
  tiers: Record<BiLimitKey, number>;
}

interface UserRow {
  id: string;
  name: string;
}

// Merged per-agent row used by the leaderboard.
interface LeaderboardRow {
  agentId: string;
  agentName: string;
  totalSales: number;
  totalPremium: number;
  bundlePercent: number;
  pifPercent: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatPercent(value: number): string {
  return `${Math.round(value || 0)}%`;
}

const TotalSalesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M7 14l4-4 3 3 5-5" />
  </svg>
);
const PremiumIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23" />
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);
const BundleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <path d="M3.27 6.96L12 12.01l8.73-5.05" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);
const PifIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

interface StatCardProps {
  label: string;
  value: string;
  icon: ReactNode;
}

function StatCard({ label, value, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{label}</span>
        <span className="flex items-center justify-center w-9 h-9 rounded-full bg-blue-50 text-blue-600">
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold text-gray-800">{value}</p>
    </div>
  );
}

export default function Dashboard() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [biLimitRows, setBiLimitRows] = useState<BiLimitDisplayRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const [summaryRes, bundlesRes, pifRes, biLimitsRes, usersRes] =
          await Promise.all([
            api.get("/metrics/summary", { params: { month, year } }),
            api.get("/metrics/bundles", { params: { month, year } }),
            api.get("/metrics/pif", { params: { month, year } }),
            api.get("/metrics/bi-limits", { params: { month, year } }),
            api.get("/users"),
          ]);

        const summary: SummaryRow[] = Array.isArray(summaryRes.data)
          ? summaryRes.data
          : [];
        const bundles: BundleRow[] = Array.isArray(bundlesRes.data)
          ? bundlesRes.data
          : [];
        const pif: PifRow[] = Array.isArray(pifRes.data) ? pifRes.data : [];

        const bundleByAgent = new Map(
          bundles.map((b) => [b.agentId, b.bundlePercentage ?? 0])
        );
        const pifByAgent = new Map(
          pif.map((p) => [p.agentId, p.pifPercentage ?? 0])
        );

        const merged: LeaderboardRow[] = summary.map((s) => ({
          agentId: s.agentId,
          agentName: s.agentName,
          totalSales: s.totalSales ?? 0,
          totalPremium: s.totalPremium ?? 0,
          bundlePercent: bundleByAgent.get(s.agentId) ?? 0,
          pifPercent: pifByAgent.get(s.agentId) ?? 0,
        }));

        merged.sort((a, b) => b.totalPremium - a.totalPremium);

        const userMap = new Map<string, string>(
          (Array.isArray(usersRes.data) ? (usersRes.data as UserRow[]) : []).map(
            (u) => [u.id, u.name]
          )
        );

        const biLimitsApi: BiLimitsApiRow[] = Array.isArray(biLimitsRes.data)
          ? biLimitsRes.data
          : [];

        const biMerged: BiLimitDisplayRow[] = biLimitsApi.map((row) => ({
          agentId: row.agentId,
          agentName: userMap.get(row.agentId) ?? "Unknown",
          tiers: BI_LIMIT_KEYS.reduce(
            (acc, key) => {
              acc[key] = row.tiers?.[key] ?? 0;
              return acc;
            },
            {} as Record<BiLimitKey, number>
          ),
        }));

        biMerged.sort((a, b) => a.agentName.localeCompare(b.agentName));

        if (active) {
          setRows(merged);
          setBiLimitRows(biMerged);
        }
      } catch {
        if (active)
          setError("Failed to load dashboard metrics. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [month, year]);

  // Office-wide aggregates.
  const totalSales = rows.reduce((sum, r) => sum + r.totalSales, 0);
  const totalPremium = rows.reduce((sum, r) => sum + r.totalPremium, 0);
  // Sales-weighted office averages, falling back to a simple average.
  const bundleAvg =
    totalSales > 0
      ? rows.reduce((sum, r) => sum + r.bundlePercent * r.totalSales, 0) /
        totalSales
      : rows.length
      ? rows.reduce((sum, r) => sum + r.bundlePercent, 0) / rows.length
      : 0;
  const pifAvg =
    totalSales > 0
      ? rows.reduce((sum, r) => sum + r.pifPercent * r.totalSales, 0) /
        totalSales
      : rows.length
      ? rows.reduce((sum, r) => sum + r.pifPercent, 0) / rows.length
      : 0;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-sm text-gray-500">Monthly performance</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>{name}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <Link
            to="/new-sale"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Sale
          </Link>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-6 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading metrics…</p>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total Sales"
              value={totalSales.toLocaleString("en-US")}
              icon={<TotalSalesIcon />}
            />
            <StatCard
              label="Total Premium"
              value={formatCurrency(totalPremium)}
              icon={<PremiumIcon />}
            />
            <StatCard
              label="Bundle %"
              value={formatPercent(bundleAvg)}
              icon={<BundleIcon />}
            />
            <StatCard
              label="Paid in Full %"
              value={formatPercent(pifAvg)}
              icon={<PifIcon />}
            />
          </div>

          {/* Leaderboard */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">
                Agent Leaderboard
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <th className="text-left font-medium px-5 py-3">Agent</th>
                    <th className="text-right font-medium px-5 py-3">
                      Total Sales
                    </th>
                    <th className="text-right font-medium px-5 py-3">
                      Total Premium
                    </th>
                    <th className="text-right font-medium px-5 py-3">
                      Bundle %
                    </th>
                    <th className="text-right font-medium px-5 py-3">PIF %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-8 text-center text-gray-400"
                      >
                        No sales recorded this month yet.
                      </td>
                    </tr>
                  ) : (
                    rows.map((r) => (
                      <tr key={r.agentId} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-800">
                          {r.agentName}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700">
                          {r.totalSales.toLocaleString("en-US")}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700">
                          {formatCurrency(r.totalPremium)}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700">
                          {formatPercent(r.bundlePercent)}
                        </td>
                        <td className="px-5 py-3 text-right text-gray-700">
                          {formatPercent(r.pifPercent)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* BI Limit Breakdown */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">
                BI Limit Breakdown
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Auto policies only · current month
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase text-xs">
                    <th className="text-left font-medium px-5 py-3">Agent</th>
                    {BI_LIMIT_KEYS.map((key) => (
                      <th
                        key={key}
                        className="text-right font-medium px-5 py-3"
                      >
                        {BI_LIMIT_LABELS[key]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {biLimitRows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-5 py-8 text-center text-gray-400"
                      >
                        No AUTO sales recorded this month.
                      </td>
                    </tr>
                  ) : (
                    biLimitRows.map((r) => (
                      <tr key={r.agentId} className="hover:bg-gray-50">
                        <td className="px-5 py-3 font-medium text-gray-800">
                          {r.agentName}
                        </td>
                        {BI_LIMIT_KEYS.map((key) => (
                          <td
                            key={key}
                            className="px-5 py-3 text-right text-gray-700"
                          >
                            {formatPercent(r.tiers[key])}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
