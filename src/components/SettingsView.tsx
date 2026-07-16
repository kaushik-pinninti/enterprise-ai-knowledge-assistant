/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  User, 
  Settings, 
  Bell, 
  Moon, 
  Sun, 
  CheckCircle,
  ShieldCheck,
  Smartphone,
  Laptop,
  Tablet,
  XCircle
} from "lucide-react";
import { User as UserType } from "../types";

// Safe local fetch wrapper to inject JWT Authorization Header
const customFetch = async (url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem("saas_jwt_token");
  const headers = { ...options.headers } as Record<string, string>;
  if (token && typeof url === "string" && url.startsWith("/api/")) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return window.fetch(url, { ...options, headers });
};
const fetch = customFetch;

interface SettingsViewProps {
  currentUser: UserType;
  onUpdateProfile: (name: string, email: string) => void;
  onTriggerEmailVerification: () => void;
}

export default function SettingsView({
  currentUser,
  onUpdateProfile,
  onTriggerEmailVerification,
}: SettingsViewProps) {
  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [theme, setTheme] = useState("light");
  const [language, setLanguage] = useState("en");
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [savedMsg, setSavedMsg] = useState("");

  // MFA states
  const [mfaEnabled, setMfaEnabled] = useState(currentUser.mfaEnabled || false);
  const [mfaSecret, setMfaSecret] = useState("");
  const [qrPlaceholder, setQrPlaceholder] = useState("");
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaCodeInput, setMfaCodeInput] = useState("");
  const [mfaError, setMfaError] = useState("");
  const [mfaSuccess, setMfaSuccess] = useState("");

  // Sessions list state
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateProfile(name, email);
    setSavedMsg("Profile information updated successfully.");
    setTimeout(() => setSavedMsg(""), 2000);
  };

  const fetchSessions = async () => {
    try {
      const res = await fetch("/api/auth/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleSetupMfa = async () => {
    setMfaError("");
    setMfaSuccess("");
    try {
      const res = await fetch("/api/auth/mfa/setup", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setMfaSecret(data.secret);
        setQrPlaceholder(data.qrCodePlaceholder);
        setShowMfaSetup(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError("");
    setMfaSuccess("");
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: mfaCodeInput, enable: true })
      });
      const data = await res.json();
      if (res.ok) {
        setMfaEnabled(true);
        if (data.token) {
          localStorage.setItem("saas_jwt_token", data.token);
        }
        if (data.refreshToken) {
          localStorage.setItem("saas_refresh_token", data.refreshToken);
        }
        setMfaSuccess("Multi-Factor Authentication enabled successfully!");
        setShowMfaSetup(false);
        setMfaCodeInput("");
      } else {
        setMfaError(data.error || "Verification failed");
      }
    } catch (e) {
      setMfaError("MFA verify request failed");
    }
  };

  const handleDisableMfa = async () => {
    if (!confirm("Are you sure you want to disable Multi-Factor Authentication?")) return;
    setMfaError("");
    setMfaSuccess("");
    try {
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: "000000", enable: false }) // 000000 bypass key for disable
      });
      const data = await res.json();
      if (res.ok) {
        setMfaEnabled(false);
        if (data.token) {
          localStorage.setItem("saas_jwt_token", data.token);
        }
        if (data.refreshToken) {
          localStorage.setItem("saas_refresh_token", data.refreshToken);
        }
        setMfaSuccess("MFA deactivated successfully.");
      } else {
        setMfaError(data.error || "Failed to deactivate MFA");
      }
    } catch (e) {
      console.error(e);
      setMfaError("MFA disable request failed");
    }
  };

  const handleRevokeSession = async (sessId: string) => {
    try {
      const res = await fetch("/api/auth/sessions/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: sessId })
      });
      if (res.ok) {
        setSessions(sessions.filter(s => s.id !== sessId));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return (
    <div id="view-settings" className="p-6 space-y-6 font-sans overflow-y-auto h-full bg-slate-50/50 text-left flex flex-col md:flex-row gap-6">
      
      {/* Left settings card */}
      <div className="flex-1 space-y-6">
        {/* Profile Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <User className="w-4.5 h-4.5 text-emerald-600" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider font-mono">Profile Details</h3>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            {savedMsg && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-lg flex items-center gap-2 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{savedMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5 font-mono">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5 font-mono">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold leading-none ${
                  currentUser.emailVerified 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                    : "bg-rose-50 text-rose-700 border border-rose-100"
                }`}>
                  {currentUser.emailVerified ? "Email Verified" : "Verification Pending"}
                </span>
                {!currentUser.emailVerified && (
                  <button
                    type="button"
                    onClick={onTriggerEmailVerification}
                    className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Resend Verification Link
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs transition shadow-md shadow-emerald-950/15"
              >
                Save Profile
              </button>
            </div>
          </form>
        </div>

        {/* Global UI Preferences Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <Settings className="w-4.5 h-4.5 text-emerald-600" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider font-mono">General Configurations</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Theme Selector */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5 font-mono">App Theme</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTheme("light")}
                    className={`flex-1 py-1.5 border rounded-lg flex items-center justify-center gap-1.5 font-bold font-mono text-[10px] uppercase ${
                      theme === "light" 
                        ? "border-emerald-500 bg-emerald-50/15 text-emerald-700" 
                        : "border-slate-200 hover:border-slate-300 text-slate-500"
                    }`}
                  >
                    <Sun className="w-4 h-4" /> Light Mode
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`flex-1 py-1.5 border rounded-lg flex items-center justify-center gap-1.5 font-bold font-mono text-[10px] uppercase ${
                      theme === "dark" 
                        ? "border-emerald-500 bg-emerald-50/15 text-emerald-700" 
                        : "border-slate-200 hover:border-slate-300 text-slate-500"
                    }`}
                  >
                    <Moon className="w-4 h-4" /> Dark Mode
                  </button>
                </div>
              </div>

              {/* Language selection */}
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5 font-mono">Regional Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-1 focus:ring-emerald-500 text-xs cursor-pointer"
                >
                  <option value="en">English (US)</option>
                  <option value="es">Español (ES)</option>
                  <option value="fr">Français (FR)</option>
                  <option value="ja">日本語 (JP)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Multi-Factor Authentication (MFA) Setup Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <ShieldCheck className="w-4.5 h-4.5 text-indigo-600" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider font-mono">Multi-Factor Authentication (MFA)</h3>
          </div>

          <div className="space-y-4 text-xs">
            {mfaSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-lg flex items-center gap-2 font-medium">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{mfaSuccess}</span>
              </div>
            )}
            
            {mfaError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-lg flex items-center gap-2 font-medium">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{mfaError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-slate-50 border border-slate-200/60 p-4 rounded-lg">
              <div className="space-y-1">
                <span className="font-bold text-slate-700 block text-xs">Device Authenticator (TOTP)</span>
                <span className="text-[10px] text-slate-400 block max-w-sm">
                  Add an extra layer of defense by requiring an active verification code from your Google Authenticator or custom TOTP device on login.
                </span>
              </div>
              <div>
                {mfaEnabled ? (
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 border border-emerald-100 font-bold px-2 py-1 rounded">MFA ACTIVE</span>
                    <button
                      onClick={handleDisableMfa}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold transition"
                    >
                      Disable
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleSetupMfa}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-indigo-950/15 whitespace-nowrap"
                  >
                    Setup MFA
                  </button>
                )}
              </div>
            </div>

            {/* Interactive TOTP Verification form */}
            {showMfaSetup && (
              <div className="border border-indigo-100 bg-indigo-50/10 p-4 rounded-lg space-y-4 animate-in slide-in-from-top-2 duration-150">
                <h4 className="font-bold text-xs text-indigo-950 font-mono uppercase">Setup Security Device</h4>
                <div className="text-[10px] text-slate-500 space-y-1.5 leading-relaxed">
                  <p>1. Open your Authenticator app (Google Authenticator, Microsoft, or Apple Settings Keychains).</p>
                  <p>2. Tap add account and enter this secret key manually:</p>
                  <div className="p-2.5 bg-white border border-slate-200 rounded font-mono font-bold text-slate-700 select-all tracking-wider text-center mb-2">{mfaSecret}</div>
                  {qrPlaceholder && (
                    <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                      <p>Or scan this QR Code with your phone's Authenticator app:</p>
                      <div className="flex justify-center p-2 bg-white border border-slate-200 rounded-xl max-w-[170px] mx-auto shadow-xs">
                        <img src={qrPlaceholder} alt="MFA Authenticator QR Code" className="w-36 h-36" referrerPolicy="no-referrer" />
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleVerifyMfa} className="space-y-3">
                  <div>
                    <label className="text-[9px] text-indigo-900 font-bold uppercase tracking-wider block mb-1">Enter Authenticator Verification Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="e.g. 123456"
                      value={mfaCodeInput}
                      onChange={(e) => setMfaCodeInput(e.target.value)}
                      className="w-full text-center tracking-widest px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 font-mono font-extrabold"
                    />
                  </div>
                  <div className="flex justify-end gap-2 text-xs pt-1">
                    <button
                      type="button"
                      onClick={() => setShowMfaSetup(false)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition"
                    >
                      Verify & Activate
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Alert & Notification Preferences */}
      <div className="w-full md:w-80 space-y-4 shrink-0">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-4">
            <Bell className="w-4.5 h-4.5 text-emerald-600" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider font-mono">Notification Settings</h3>
          </div>

          <div className="space-y-4 text-xs">
            <label className="flex items-start gap-3 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-left">
              <input
                type="checkbox"
                checked={emailNotifs}
                onChange={() => setEmailNotifs(!emailNotifs)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 mt-0.5"
              />
              <div>
                <span className="font-bold text-slate-700 block">Email Reports</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-normal">Weekly summaries of workspace activity and vector counts.</span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-1.5 hover:bg-slate-50 rounded cursor-pointer text-left">
              <input
                type="checkbox"
                checked={pushNotifs}
                onChange={() => setPushNotifs(!pushNotifs)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 mt-0.5"
              />
              <div>
                <span className="font-bold text-slate-700 block">Push Alerts</span>
                <span className="text-[10px] text-slate-400 block mt-0.5 leading-normal">Real-time alerts when document indexing completes.</span>
              </div>
            </label>
          </div>
        </div>

        {/* Device Sessions Revocation Panel */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 mb-3">
            <Laptop className="w-4.5 h-4.5 text-emerald-600" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider font-mono">Active Sessions</h3>
          </div>

          <div className="space-y-2 max-h-[250px] overflow-y-auto">
            {loadingSessions ? (
              <div className="space-y-2 animate-pulse py-2">
                <div className="h-10 bg-slate-50 rounded"></div>
                <div className="h-10 bg-slate-50 rounded"></div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-[10px]">No other active sessions.</div>
            ) : (
              sessions.map((sess) => (
                <div key={sess.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-left space-y-1.5">
                  <div className="flex justify-between items-start gap-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {sess.device.toLowerCase().includes("iphone") ? (
                        <Smartphone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      ) : sess.device.toLowerCase().includes("ipad") ? (
                        <Tablet className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      ) : (
                        <Laptop className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      )}
                      <span className="font-bold text-slate-700 text-[11px] truncate block leading-normal">{sess.device}</span>
                    </div>
                    {sess.id !== "sess-cur" && (
                      <button
                        onClick={() => handleRevokeSession(sess.id)}
                        className="text-[9px] font-bold text-rose-600 hover:text-rose-700 hover:underline shrink-0 font-mono"
                      >
                        Revoke
                      </button>
                    )}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                    <span>IP: {sess.ip}</span>
                    <span>{sess.id === "sess-cur" ? "Active Now" : "Inactive"}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
