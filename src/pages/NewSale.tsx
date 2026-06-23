import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

interface User {
  id: string;
  name: string;
}

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

const BUNDLE_ELIGIBLE: PolicyType[] = ["AUTO"];
type BiLimit =
  | "LIMIT_25_50"
  | "LIMIT_50_100"
  | "LIMIT_100_300"
  | "LIMIT_250_500"
  | "LIMIT_300_500"
  | "LIMIT_500_500";
type BundledWith = "HOME" | "RENTERS" | "CYCLE";

interface FormState {
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

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(defaultAgentId: string): FormState {
  return {
    agentId: defaultAgentId,
    date: todayISO(),
    clientName: "",
    policyNumber: "",
    policyType: "",
    premiumAmount: "",
    biLimit: "",
    isBundled: false,
    bundledWith: "",
    isPaidInFull: false,
    notes: "",
  };
}

const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const inputClass =
  "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function NewSale() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState("");

  // user is guaranteed non-null here — ProtectedRoute blocks rendering until auth resolves.
  const [form, setForm] = useState<FormState>(() => emptyForm(user!.id));
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch the user list for the agent dropdown.
  useEffect(() => {
    let active = true;
    api
      .get("/users")
      .then((res) => {
        if (active) setUsers(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (active) setUsersError("Could not load agent list. Please refresh.");
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;

    setForm((prev) => {
      const next = {
        ...prev,
        [name]: type === "checkbox" ? checked : value,
      };

      // When policyType changes away from AUTO, reset AUTO-only fields.
      if (name === "policyType" && value !== "AUTO") {
        next.biLimit = "";
        next.bundledWith = "";
        next.isPaidInFull = false;
      }

      // When isBundled is unchecked, clear bundledWith.
      if (name === "isBundled" && !checked) {
        next.bundledWith = "";
      }

      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setSubmitError("");
    setSuccessMsg("");

    const isAuto = form.policyType === "AUTO";

    const payload = {
      agentId: form.agentId,
      date: form.date,
      clientName: form.clientName.trim(),
      policyNumber: form.policyNumber.trim(),
      policyType: form.policyType,
      premiumAmount: parseFloat(form.premiumAmount),
      biLimit: isAuto && form.biLimit ? form.biLimit : null,
      isBundled: form.isBundled,
      bundledWith:
        isAuto && form.isBundled && form.bundledWith ? form.bundledWith : null,
      isPaidInFull: isAuto ? form.isPaidInFull : false,
      notes: form.notes.trim() || null,
    };

    try {
      await api.post("/sales", payload);
      setForm(emptyForm(user!.id));

      if (successTimer.current) clearTimeout(successTimer.current);
      setSuccessMsg("Sale recorded successfully!");
      successTimer.current = setTimeout(() => setSuccessMsg(""), 4000);
    } catch {
      setSubmitError("Failed to save sale. Please check your entries and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const isAuto = form.policyType === "AUTO";
  const formDisabled = usersLoading || !!usersError || submitting;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">New Sale</h2>
        <p className="text-sm text-gray-500">Log a new insurance policy sale</p>
      </div>

      {usersError && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
          {usersError}
        </div>
      )}

      {submitError && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
          {submitError}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm font-medium">
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Agent */}
          <div>
            <label className={labelClass}>Agent</label>
            <select
              name="agentId"
              value={form.agentId}
              onChange={handleChange}
              className={inputClass}
              required
              disabled={formDisabled}
            >
              {usersLoading ? (
                <option value="">Loading agents…</option>
              ) : (
                <>
                  <option value="">Select agent</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          {/* Date */}
          <div>
            <label className={labelClass}>Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleChange}
              className={inputClass}
              required
              disabled={formDisabled}
            />
          </div>

          {/* Client Name */}
          <div>
            <label className={labelClass}>Client Name</label>
            <input
              type="text"
              name="clientName"
              value={form.clientName}
              onChange={handleChange}
              className={inputClass}
              placeholder="Jane Smith"
              required
              disabled={formDisabled}
            />
          </div>

          {/* Policy Number */}
          <div>
            <label className={labelClass}>Policy Number</label>
            <input
              type="text"
              name="policyNumber"
              value={form.policyNumber}
              onChange={handleChange}
              className={inputClass}
              placeholder="A12-345678"
              required
              disabled={formDisabled}
            />
          </div>

          {/* Policy Type */}
          <div>
            <label className={labelClass}>Policy Type</label>
            <select
              name="policyType"
              value={form.policyType}
              onChange={handleChange}
              className={inputClass}
              required
              disabled={formDisabled}
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
              value={form.premiumAmount}
              onChange={handleChange}
              className={inputClass}
              placeholder="0.00"
              min="0"
              step="0.01"
              required
              disabled={formDisabled}
            />
          </div>

          {/* BI Limit — AUTO only */}
          {isAuto && (
            <div>
              <label className={labelClass}>BI Limit</label>
              <select
                name="biLimit"
                value={form.biLimit}
                onChange={handleChange}
                className={inputClass}
                required={isAuto}
                disabled={formDisabled}
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

          {/* Bundled? — only for bundle-eligible policy types */}
          {form.policyType && BUNDLE_ELIGIBLE.includes(form.policyType) && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isBundled"
              name="isBundled"
              checked={form.isBundled}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              disabled={formDisabled}
            />
            <label
              htmlFor="isBundled"
              className="text-sm font-medium text-gray-700"
            >
              Bundled?
            </label>
          </div>
          )}

          {/* Bundled With — AUTO + isBundled only */}
          {isAuto && form.isBundled && (
            <div>
              <label className={labelClass}>Bundled With</label>
              <select
                name="bundledWith"
                value={form.bundledWith}
                onChange={handleChange}
                className={inputClass}
                required={isAuto && form.isBundled}
                disabled={formDisabled}
              >
                <option value="">Select policy type</option>
                <option value="HOME">Home</option>
                <option value="RENTERS">Renters</option>
                <option value="CYCLE">Cycle</option>
              </select>
            </div>
          )}

          {/* Paid in Full? — AUTO only */}
          {isAuto && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPaidInFull"
                name="isPaidInFull"
                checked={form.isPaidInFull}
                onChange={handleChange}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                disabled={formDisabled}
              />
              <label
                htmlFor="isPaidInFull"
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
              value={form.notes}
              onChange={handleChange}
              className={inputClass}
              rows={3}
              placeholder="Any additional notes…"
              disabled={formDisabled}
            />
          </div>

          <button
            type="submit"
            disabled={formDisabled}
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save Sale"}
          </button>
        </form>
      </div>
    </div>
  );
}
