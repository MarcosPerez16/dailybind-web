import { useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";

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

export default function Account() {
  const { user } = useAuth();

  // Email form state
  const [emailValue, setEmailValue] = useState(user!.email);
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");
  const emailSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const passwordSuccessTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  async function handleEmailSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    if (emailSubmitting) return;

    setEmailSubmitting(true);
    setEmailError("");
    setEmailSuccess("");

    try {
      await api.patch("/account/email", { email: emailValue });

      if (emailSuccessTimer.current) clearTimeout(emailSuccessTimer.current);
      setEmailSuccess("Email updated successfully!");
      emailSuccessTimer.current = setTimeout(() => setEmailSuccess(""), 4000);
    } catch (err) {
      setEmailError(
        extractErrorMessage(err, "Failed to update email. Please try again."),
      );
    } finally {
      setEmailSubmitting(false);
    }
  }

  async function handlePasswordSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    if (passwordSubmitting) return;

    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setPasswordSubmitting(true);

    try {
      await api.patch("/account/password", { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      if (passwordSuccessTimer.current)
        clearTimeout(passwordSuccessTimer.current);
      setPasswordSuccess("Password updated successfully!");
      passwordSuccessTimer.current = setTimeout(
        () => setPasswordSuccess(""),
        4000,
      );
    } catch (err) {
      setPasswordError(
        extractErrorMessage(
          err,
          "Failed to update password. Please try again.",
        ),
      );
    } finally {
      setPasswordSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">My Account</h2>
        <p className="text-sm text-gray-500">Update your email and password</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Update Email
        </h3>

        {emailError && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
            {emailError}
          </div>
        )}

        {emailSuccess && (
          <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm font-medium">
            {emailSuccess}
          </div>
        )}

        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Email</label>
            <input
              type="email"
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <button
            type="submit"
            disabled={emailSubmitting}
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {emailSubmitting ? "Saving…" : "Update Email"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-4">
          Update Password
        </h3>

        {passwordError && (
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">
            {passwordError}
          </div>
        )}

        {passwordSuccess && (
          <div className="bg-green-50 text-green-700 p-3 rounded mb-4 text-sm font-medium">
            {passwordSuccess}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className={labelClass}>Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={inputClass}
              required
            />
          </div>

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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputClass}
              required
            />
          </div>

          <button
            type="submit"
            disabled={passwordSubmitting}
            className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {passwordSubmitting ? "Saving…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
