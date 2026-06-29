import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

type PolicyType =
  | "AUTO"
  | "HOME"
  | "RENTERS"
  | "CYCLE"
  | "RV"
  | "ATV"
  | "BOAT"
  | "CLASSIC_CAR"
  | "MEXICO"
  | "UMBRELLA"
  | "JEWELRY"
  | "IDENTITY_THEFT"
  | "GOLF_CART"
  | "RENTAL_HOME"
  | "RENTAL_CONDO"
  | "MANUFACTURED_HOME"
  | "CONDO";

type BiLimit =
  | "LIMIT_25_50"
  | "LIMIT_50_100"
  | "LIMIT_100_300"
  | "LIMIT_250_500"
  | "LIMIT_300_500"
  | "LIMIT_500_500";

type BundledWith = "HOME" | "RENTERS" | "CYCLE";

interface Sale {
  id: string;
  agentId: string;
  date: string;
  clientName: string;
  policyNumber: string;
  policyType: PolicyType;
  biLimit: BiLimit | null;
  premiumAmount: number;
  isBundled: boolean;
  bundledWith: BundledWith | null;
  isPaidInFull: boolean;
  notes: string | null;
  isVoided: boolean;
  enteredById: string;
}

interface AgentUser {
  id: string;
  name: string;
}

interface EditFormState {
  agentId: string;
  date: string;
  clientName: string;
  policyNumber: string;
  policyType: PolicyType | "";
  premiumAmount: string;
  biLimit: BiLimit | "";
  isBundled: boolean;
  bundledWith: BundledWith | "";
  isPaidInFull: boolean;
  notes: string;
}

const POLICY_LABELS: Record<PolicyType, string> = {
  AUTO: "Auto",
  HOME: "Home",
  RENTERS: "Renters",
  CYCLE: "Cycle",
  RV: "RV",
  ATV: "ATV",
  BOAT: "Boat",
  CLASSIC_CAR: "Classic Car",
  MEXICO: "Mexico",
  UMBRELLA: "Umbrella",
  JEWELRY: "Jewelry",
  IDENTITY_THEFT: "Identity Theft",
  GOLF_CART: "Golf Cart",
  RENTAL_HOME: "Rental Home",
  RENTAL_CONDO: "Rental Condo",
  MANUFACTURED_HOME: "Manufactured Home",
  CONDO: "Condo",
};

const BI_LIMIT_LABELS: Record<BiLimit, string> = {
  LIMIT_25_50: "25/50",
  LIMIT_50_100: "50/100",
  LIMIT_100_300: "100/300",
  LIMIT_250_500: "250/500",
  LIMIT_300_500: "300/500",
  LIMIT_500_500: "500/500",
};

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const now = new Date();
const YEAR_OPTIONS = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const inputClass =
  "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function formatDate(iso: string): string {
  // Slice to YYYY-MM-DD then append local midnight to avoid UTC-offset display bugs
  return new Date(iso.slice(0, 10) + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(n);
}

export default function SalesHistory() {
  const { user } = useAuth();

  const [sales, setSales] = useState<Sale[]>([]);
  const [users, setUsers] = useState<AgentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [filterAgentId, setFilterAgentId] = useState("ALL");

  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [voidConfirmSale, setVoidConfirmSale] = useState<{
    id: string;
    clientName: string;
  } | null>(null);

  // Fetch users once — static data, no need to refetch on month/year change.
  useEffect(() => {
    let active = true;
    api
      .get("/users")
      .then((res) => {
        if (active) setUsers(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (active) setError("Failed to load users.");
      });
    return () => {
      active = false;
    };
  }, []);

  // Refetch sales whenever month or year changes.
  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/sales", { params: { month, year } });
        if (active) setSales(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (active) setError("Failed to load sales. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, [month, year]);

  const userMap = useMemo(
    () => new Map(users.map((u) => [u.id, u.name])),
    [users],
  );

  const filteredSales = useMemo(() => {
    if (filterAgentId === "ALL") return sales;
    return sales.filter((s) => s.agentId === filterAgentId);
  }, [sales, filterAgentId]);

  function canEditRow(sale: Sale): boolean {
    if (!user) return false;
    if (user.role === "ADMIN") return true;
    return sale.agentId === user.id;
  }

  function openEditModal(sale: Sale) {
    setSaveError("");
    setEditForm({
      agentId: sale.agentId,
      date: sale.date,
      clientName: sale.clientName,
      policyNumber: sale.policyNumber,
      policyType: sale.policyType,
      premiumAmount: String(sale.premiumAmount),
      biLimit: sale.biLimit ?? "",
      isBundled: sale.isBundled,
      bundledWith: sale.bundledWith ?? "",
      isPaidInFull: sale.isPaidInFull,
      notes: sale.notes ?? "",
    });
    setEditingSale(sale);
  }

  function closeModal() {
    setEditingSale(null);
    setEditForm(null);
    setSaveError("");
  }

  function handleEditFormChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;

    setEditForm((prev) => {
      if (!prev) return prev;
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      if (name === "policyType" && value !== "AUTO") {
        next.biLimit = "";
        next.bundledWith = "";
        next.isPaidInFull = false;
      }

      if (name === "isBundled" && !checked) {
        next.bundledWith = "";
      }

      return next;
    });
  }

  async function handleSave(e: React.SubmitEvent) {
    e.preventDefault();
    if (!editingSale || !editForm || saving) return;

    setSaving(true);
    setSaveError("");

    const isAuto = editForm.policyType === "AUTO";
    const payload = {
      agentId: editForm.agentId,
      date: editForm.date,
      clientName: editForm.clientName.trim(),
      policyNumber: editForm.policyNumber.trim(),
      policyType: editForm.policyType,
      premiumAmount: parseFloat(editForm.premiumAmount),
      biLimit: isAuto && editForm.biLimit ? editForm.biLimit : null,
      isBundled: editForm.isBundled,
      bundledWith:
        isAuto && editForm.isBundled && editForm.bundledWith
          ? editForm.bundledWith
          : null,
      isPaidInFull: isAuto ? editForm.isPaidInFull : false,
      notes: editForm.notes.trim() || null,
    };

    try {
      const res = await api.patch(`/sales/${editingSale.id}`, payload);
      const updated: Sale = res.data ?? { ...editingSale, ...payload };
      setSales((prev) =>
        prev.map((s) => (s.id === editingSale.id ? updated : s)),
      );
      closeModal();
      if (successTimer.current) clearTimeout(successTimer.current);
      setSuccessMsg("Sale updated successfully!");
      successTimer.current = setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setSaveError(
        "Failed to save changes. Please check your entries and try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleVoid() {
    if (!voidConfirmSale || voidingId) return;
    const { id } = voidConfirmSale;
    setVoidConfirmSale(null);
    setVoidingId(id);
    try {
      await api.delete(`/sales/${id}`);
      setSales((prev) => prev.filter((s) => s.id !== id));
      if (successTimer.current) clearTimeout(successTimer.current);
      setSuccessMsg("Sale voided.");
      successTimer.current = setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setError("Failed to void sale. Please try again.");
    } finally {
      setVoidingId(null);
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Sales History</h2>
        <p className="text-sm text-gray-500">Current month's entries</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-6 text-sm">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* Filter bar */}
      {!loading && (
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={i + 1} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={filterAgentId}
            onChange={(e) => setFilterAgentId(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-xs"
          >
            <option value="ALL">All Agents</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading sales…</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-800">Sales</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredSales.length} entr
              {filteredSales.length === 1 ? "y" : "ies"}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <th className="text-left font-medium px-5 py-3">Date</th>
                  <th className="text-left font-medium px-5 py-3">Agent</th>
                  <th className="text-left font-medium px-5 py-3">Client</th>
                  <th className="text-left font-medium px-5 py-3">Policy #</th>
                  <th className="text-left font-medium px-5 py-3">Type</th>
                  <th className="text-right font-medium px-5 py-3">Premium</th>
                  <th className="text-left font-medium px-5 py-3">Flags</th>
                  <th className="text-right font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSales.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-5 py-8 text-center text-gray-400"
                    >
                      No sales recorded this month yet.
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 text-gray-700 whitespace-nowrap">
                        {formatDate(sale.date)}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {userMap.get(sale.agentId) ?? "Unknown"}
                      </td>
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {sale.clientName}
                      </td>
                      <td className="px-5 py-3 text-gray-700 font-mono text-xs">
                        {sale.policyNumber}
                      </td>
                      <td className="px-5 py-3 text-gray-700">
                        {POLICY_LABELS[sale.policyType]}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-700 whitespace-nowrap">
                        {formatCurrency(sale.premiumAmount)}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex flex-wrap gap-1">
                          {sale.biLimit && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                              {BI_LIMIT_LABELS[sale.biLimit]}
                            </span>
                          )}
                          {sale.isBundled && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                              Bundled
                            </span>
                          )}
                          {sale.isPaidInFull && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                              PIF
                            </span>
                          )}
                          {sale.notes && (
                            <span
                              title={sale.notes}
                              className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 cursor-default select-none"
                            >
                              <svg
                                width="10"
                                height="10"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                                <polyline points="14 2 14 8 20 8" />
                                <line x1="16" y1="13" x2="8" y2="13" />
                                <line x1="16" y1="17" x2="8" y2="17" />
                              </svg>
                              Note
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => openEditModal(sale)}
                            disabled={
                              !canEditRow(sale) || voidingId === sale.id
                            }
                            className="text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              setVoidConfirmSale({
                                id: sale.id,
                                clientName: sale.clientName,
                              })
                            }
                            disabled={
                              !canEditRow(sale) || voidingId === sale.id
                            }
                            className="text-sm font-medium text-red-500 hover:text-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            {voidingId === sale.id ? "Voiding…" : "Void"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Void Confirmation Modal */}
      {voidConfirmSale && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={() => setVoidConfirmSale(null)}
          onKeyDown={(e) => e.key === "Escape" && setVoidConfirmSale(null)}
          tabIndex={-1}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">
                Void Sale?
              </h3>
              <button
                onClick={() => setVoidConfirmSale(null)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-600">
                Are you sure you want to void the sale for{" "}
                <span className="font-medium text-gray-800">
                  {voidConfirmSale.clientName}
                </span>
                ? This cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setVoidConfirmSale(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleVoid}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md"
              >
                Void Sale
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSale && editForm && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={closeModal}
          onKeyDown={(e) => e.key === "Escape" && closeModal()}
          tabIndex={-1}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">
                Edit Sale
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-4 space-y-4">
              {saveError && (
                <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                  {saveError}
                </div>
              )}

              {/* Agent */}
              <div>
                <label className={labelClass}>Agent</label>
                <select
                  name="agentId"
                  value={editForm.agentId}
                  onChange={handleEditFormChange}
                  className={inputClass}
                  required
                  disabled={user!.role !== "ADMIN"}
                >
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className={labelClass}>Date</label>
                <input
                  type="date"
                  name="date"
                  value={editForm.date}
                  onChange={handleEditFormChange}
                  className={inputClass}
                  required
                />
              </div>

              {/* Client Name */}
              <div>
                <label className={labelClass}>Client Name</label>
                <input
                  type="text"
                  name="clientName"
                  value={editForm.clientName}
                  onChange={handleEditFormChange}
                  className={inputClass}
                  required
                />
              </div>

              {/* Policy Number */}
              <div>
                <label className={labelClass}>Policy Number</label>
                <input
                  type="text"
                  name="policyNumber"
                  value={editForm.policyNumber}
                  onChange={handleEditFormChange}
                  className={inputClass}
                  required
                />
              </div>

              {/* Policy Type */}
              <div>
                <label className={labelClass}>Policy Type</label>
                <select
                  name="policyType"
                  value={editForm.policyType}
                  onChange={handleEditFormChange}
                  className={inputClass}
                  required
                >
                  <option value="">Select type</option>
                  <option value="AUTO">Auto</option>
                  <option value="HOME">Home</option>
                  <option value="RENTERS">Renters</option>
                  <option value="CYCLE">Cycle</option>
                  <option value="RV">RV</option>
                  <option value="ATV">ATV</option>
                  <option value="BOAT">Boat</option>
                  <option value="CLASSIC_CAR">Classic Car</option>
                  <option value="MEXICO">Mexico</option>
                  <option value="UMBRELLA">Umbrella</option>
                  <option value="JEWELRY">Jewelry</option>
                  <option value="IDENTITY_THEFT">Identity Theft</option>
                  <option value="GOLF_CART">Golf Cart</option>
                  <option value="RENTAL_HOME">Rental Home</option>
                  <option value="RENTAL_CONDO">Rental Condo</option>
                  <option value="MANUFACTURED_HOME">Manufactured Home</option>
                  <option value="CONDO">Condo</option>
                </select>
              </div>

              {/* Premium Amount */}
              <div>
                <label className={labelClass}>Premium Amount ($)</label>
                <input
                  type="number"
                  name="premiumAmount"
                  value={editForm.premiumAmount}
                  onChange={handleEditFormChange}
                  className={inputClass}
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              {/* BI Limit — AUTO only */}
              {editForm.policyType === "AUTO" && (
                <div>
                  <label className={labelClass}>BI Limit</label>
                  <select
                    name="biLimit"
                    value={editForm.biLimit}
                    onChange={handleEditFormChange}
                    className={inputClass}
                    required
                  >
                    <option value="">Select BI limit</option>
                    <option value="LIMIT_25_50">25/50</option>
                    <option value="LIMIT_50_100">50/100</option>
                    <option value="LIMIT_100_300">100/300</option>
                    <option value="LIMIT_250_500">250/500</option>
                    <option value="LIMIT_300_500">300/500</option>
                    <option value="LIMIT_500_500">500/500</option>
                  </select>
                </div>
              )}

              {/* Bundled? — AUTO only */}
              {editForm.policyType === "AUTO" && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-isBundled"
                    name="isBundled"
                    checked={editForm.isBundled}
                    onChange={handleEditFormChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="edit-isBundled"
                    className="text-sm font-medium text-gray-700"
                  >
                    Bundled?
                  </label>
                </div>
              )}

              {/* Bundled With — AUTO + isBundled only */}
              {editForm.policyType === "AUTO" && editForm.isBundled && (
                <div>
                  <label className={labelClass}>Bundled With</label>
                  <select
                    name="bundledWith"
                    value={editForm.bundledWith}
                    onChange={handleEditFormChange}
                    className={inputClass}
                    required
                  >
                    <option value="">Select policy type</option>
                    <option value="HOME">Home</option>
                    <option value="RENTERS">Renters</option>
                    <option value="CYCLE">Cycle</option>
                  </select>
                </div>
              )}

              {/* Paid in Full? — AUTO only */}
              {editForm.policyType === "AUTO" && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-isPaidInFull"
                    name="isPaidInFull"
                    checked={editForm.isPaidInFull}
                    onChange={handleEditFormChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label
                    htmlFor="edit-isPaidInFull"
                    className="text-sm font-medium text-gray-700"
                  >
                    Paid in Full?
                  </label>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className={labelClass}>
                  Notes{" "}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  name="notes"
                  value={editForm.notes}
                  onChange={handleEditFormChange}
                  className={inputClass}
                  rows={3}
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
