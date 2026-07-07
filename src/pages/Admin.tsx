import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

type Role = "AGENT" | "ADMIN";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  role: Role;
}

const EMPTY_CREATE_FORM: CreateUserForm = {
  name: "",
  email: "",
  password: "",
  role: "AGENT",
};

const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const inputClass =
  "w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function extractErrorMessage(err: unknown, fallback: string): string {
  if (
    err &&
    typeof err === "object" &&
    "response" in err &&
    err.response &&
    typeof err.response === "object" &&
    "data" in err.response &&
    err.response.data &&
    typeof err.response.data === "object" &&
    "message" in err.response.data &&
    typeof err.response.data.message === "string"
  ) {
    return err.response.data.message;
  }
  return fallback;
}

export default function Admin() {
  const { user } = useAuth();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [createForm, setCreateForm] = useState<CreateUserForm>(EMPTY_CREATE_FORM);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const [resettingUser, setResettingUser] = useState<AdminUser | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await api.get("/users");
        if (active) setUsers(Array.isArray(res.data) ? res.data : []);
      } catch {
        if (active) setError("Failed to load users. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
    };
  }, []);

  if (user?.role !== "ADMIN") {
    return <Navigate to="/dashboard" />;
  }

  function handleCreateFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = e.target;
    setCreateForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;

    setCreateError("");

    if (createForm.password !== confirmPassword) {
      setCreateError("Passwords do not match.");
      return;
    }

    setCreating(true);

    try {
      const res = await api.post("/users", createForm);
      const createdUser: AdminUser | undefined = res.data;
      if (createdUser) {
        setUsers((prev) => [...prev, createdUser]);
      }
      setCreateForm(EMPTY_CREATE_FORM);
      setConfirmPassword("");

      if (successTimer.current) clearTimeout(successTimer.current);
      setSuccessMsg("User created successfully!");
      successTimer.current = setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setCreateError(
        extractErrorMessage(err, "Failed to create user. Please try again."),
      );
    } finally {
      setCreating(false);
    }
  }

  function openResetModal(targetUser: AdminUser) {
    setResetError("");
    setNewPassword("");
    setConfirmNewPassword("");
    setResettingUser(targetUser);
  }

  function closeResetModal() {
    setResettingUser(null);
    setNewPassword("");
    setConfirmNewPassword("");
    setResetError("");
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!resettingUser || resetSubmitting) return;

    setResetError("");

    if (newPassword !== confirmNewPassword) {
      setResetError("Passwords do not match.");
      return;
    }

    setResetSubmitting(true);

    try {
      await api.patch(`/users/${resettingUser.id}/password`, { newPassword });
      closeResetModal();

      if (successTimer.current) clearTimeout(successTimer.current);
      setSuccessMsg("Password reset successfully!");
      successTimer.current = setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err) {
      setResetError(
        extractErrorMessage(err, "Failed to reset password. Please try again."),
      );
    } finally {
      setResetSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
        <p className="text-sm text-gray-500">
          Create accounts and manage passwords for agents and admins
        </p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded mb-6 text-sm">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 text-green-700 p-3 rounded mb-6 text-sm font-medium">
          {successMsg}
        </div>
      )}

      {/* Create User */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Create New User
        </h3>

        {createError && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
            {createError}
          </div>
        )}

        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Name</label>
            <input
              type="text"
              name="name"
              value={createForm.name}
              onChange={handleCreateFormChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              name="email"
              value={createForm.email}
              onChange={handleCreateFormChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Password</label>
            <input
              type="password"
              name="password"
              value={createForm.password}
              onChange={handleCreateFormChange}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <div>
            <label className={labelClass}>Role</label>
            <select
              name="role"
              value={createForm.role}
              onChange={handleCreateFormChange}
              className={inputClass}
              required
            >
              <option value="AGENT">Agent</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={creating}
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? "Creating…" : "Create User"}
          </button>
        </form>
      </div>

      {/* User List */}
      {loading ? (
        <p className="text-sm text-gray-500">Loading users…</p>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-800">Users</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <th className="text-left font-medium px-5 py-3">Name</th>
                  <th className="text-left font-medium px-5 py-3">Email</th>
                  <th className="text-left font-medium px-5 py-3">Role</th>
                  <th className="text-right font-medium px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-gray-400">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-800">
                        {u.name}
                      </td>
                      <td className="px-5 py-3 text-gray-700">{u.email}</td>
                      <td className="px-5 py-3 text-gray-700">
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => openResetModal(u)}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          Reset Password
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resettingUser && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          onClick={closeResetModal}
          onKeyDown={(e) => e.key === "Escape" && closeResetModal()}
          tabIndex={-1}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-base font-semibold text-gray-800">
                Reset Password — {resettingUser.name}
              </h3>
              <button
                onClick={closeResetModal}
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

            <form onSubmit={handleResetSubmit} className="px-6 py-4 space-y-4">
              {resetError && (
                <div className="bg-red-50 text-red-600 p-3 rounded text-sm">
                  {resetError}
                </div>
              )}

              <div>
                <label className={labelClass}>New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Confirm New Password</label>
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeResetModal}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetSubmitting}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                >
                  {resetSubmitting ? "Saving…" : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
