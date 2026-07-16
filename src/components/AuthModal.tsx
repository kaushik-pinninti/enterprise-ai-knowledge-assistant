/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Briefcase, 
  Mail, 
  Lock, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw
} from "lucide-react";
import { UserRole } from "../types";

interface AuthModalProps {
  onLoginSuccess: (user: any, token: string) => void;
  onRegisterSuccess: (user: any, token: string) => void;
  initialMfaUserId?: string | null;
}

export default function AuthModal({
  onLoginSuccess,
  onRegisterSuccess,
  initialMfaUserId = null,
}: AuthModalProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // MFA login verification states
  const [mfaRequiredUserId, setMfaRequiredUserId] = useState<string | null>(initialMfaUserId);
  const [mfaCode, setMfaCode] = useState("");

  // Password Strength Checker
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "None", color: "bg-slate-200" };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    switch (score) {
      case 1:
        return { score: 25, label: "Weak (Add upper/number/special)", color: "bg-rose-500" };
      case 2:
        return { score: 50, label: "Fair (Add uppercase/special)", color: "bg-amber-500" };
      case 3:
        return { score: 75, label: "Good (Add special symbol)", color: "bg-blue-500" };
      case 4:
        return { score: 100, label: "Strong & Secure", color: "bg-emerald-500" };
      default:
        return { score: 10, label: "Too Short", color: "bg-rose-600" };
    }
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      if (mfaRequiredUserId) {
        const response = await fetch("/api/auth/mfa/login-verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: mfaRequiredUserId, code: mfaCode, rememberMe })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "MFA verification failed.");

        // Persist the token
        if (data.token) {
          localStorage.setItem("saas_jwt_token", data.token);
          if (data.refreshToken) {
            localStorage.setItem("saas_refresh_token", data.refreshToken);
          }
        }

        onLoginSuccess(data.user, data.token);
        return;
      }

      if (isForgotPassword) {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        setSuccessMsg("Reset link dispatched! Fill out password below to reset.");
        setIsForgotPassword(false);
        setIsResetPassword(true);
        return;
      }

      if (isResetPassword) {
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, newPassword: password })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        setSuccessMsg("Password successfully reset! You can now log in.");
        setIsResetPassword(false);
        setPassword("");
        return;
      }

      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const payload = isRegister 
        ? { name, email, password, role } 
        : { email, password, rememberMe };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed.");
      }

      if (data.mfaRequired) {
        setMfaRequiredUserId(data.userId);
        setMfaCode("");
        return;
      }

      // Persist the token
      if (data.token) {
        localStorage.setItem("saas_jwt_token", data.token);
        if (data.refreshToken) {
          localStorage.setItem("saas_refresh_token", data.refreshToken);
        }
      }

      if (isRegister) {
        onRegisterSuccess(data.user, data.token);
      } else {
        onLoginSuccess(data.user, data.token);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected issue occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="saas-auth-overlay" className="fixed inset-0 bg-slate-900/65 backdrop-blur-md flex items-center justify-center z-50 p-4 font-sans animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden text-left flex flex-col md:flex-row transition-all duration-300 transform scale-100">
        
        {/* Main interactive form card container */}
        <div className="flex-1 p-8">
          
          {/* Brand header */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-900/20">
              <Briefcase className="w-4.5 h-4.5 text-emerald-100" />
            </div>
            <span className="font-bold text-sm text-slate-800 tracking-wide uppercase">Enterprise Knowledge Base</span>
          </div>

          {/* Description */}
          <div className="space-y-1 mb-6">
            <h3 className="text-lg font-bold text-slate-800 tracking-tight">
              {mfaRequiredUserId
                ? "Two-Factor Verification"
                : isForgotPassword 
                  ? "Dispatched Reset Link" 
                  : isResetPassword
                    ? "Define New Password"
                    : isRegister 
                      ? "Create SaaS Account" 
                      : "Sign In to Console"}
            </h3>
            <p className="text-xs text-slate-400">
              {mfaRequiredUserId
                ? "Multi-factor authentication is active. Enter the 6-digit verification code from your device."
                : isForgotPassword
                  ? "Enter your email below and we will send a secure reset token link."
                  : isResetPassword
                    ? "Pick a strong password to protect your corporate documents."
                    : "A secure workspace with strict Role-Based Access Control (RBAC)."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs text-left">
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-lg flex items-center gap-2 font-medium animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-lg flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {mfaRequiredUserId ? (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5 font-mono">
                    MFA Verification Code
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      maxLength={6}
                      required
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value)}
                      placeholder="e.g. 123456"
                      className="w-full text-center pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 font-mono text-sm tracking-widest font-extrabold"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2 text-center leading-relaxed">
                    Check your Google Authenticator or registered security device to locate your temporary code.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {isRegister && (
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1 font-mono">Your Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1 font-mono font-semibold">Corporate Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@enterprise.ai"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {!isForgotPassword && (
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block font-mono font-semibold">
                        {isResetPassword ? "Choose New Password" : "Security Password"}
                      </label>
                      {!isRegister && !isResetPassword && (
                        <button
                          type="button"
                          onClick={() => setIsForgotPassword(true)}
                          className="text-[10px] text-emerald-600 hover:underline font-bold"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Meter */}
                    {(isRegister || isResetPassword) && password && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Strength: <b className="text-slate-600 font-bold">{strength.label}</b></span>
                          <span>{strength.score}%</span>
                        </div>
                        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${strength.color}`} 
                            style={{ width: `${strength.score}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {isRegister && (
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1 font-mono font-semibold">Assigned Workspace Role</label>
                    <div className="relative">
                      <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as UserRole)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-emerald-500 cursor-pointer text-xs"
                      >
                        <option value={UserRole.EMPLOYEE}>Employee (Read Only Search/Chat)</option>
                        <option value={UserRole.MANAGER}>Manager (Upload & Invite Allowed)</option>
                        <option value={UserRole.ADMIN}>Admin (Full Access & Console)</option>
                      </select>
                    </div>
                  </div>
                )}

                {!isRegister && !isForgotPassword && !isResetPassword && (
                  <label className="flex items-center gap-2 cursor-pointer py-1 text-[11px] text-slate-500 font-medium">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                      className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                    />
                    Remember my secure credentials
                  </label>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition shadow-lg shadow-emerald-950/20 mt-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Verifying Secure Keys...
                </>
              ) : mfaRequiredUserId ? (
                "Verify Code & Enter"
              ) : isForgotPassword ? (
                "Send Link"
              ) : isResetPassword ? (
                "Save Password"
              ) : isRegister ? (
                "Create Account"
              ) : (
                "Access Workspace"
              )}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          {/* Switch tabs */}
          <div className="mt-5 pt-4 border-t border-slate-100 text-center text-slate-400 text-[11px] font-medium">
            {mfaRequiredUserId ? (
              <button
                type="button"
                onClick={() => setMfaRequiredUserId(null)}
                className="text-emerald-600 hover:underline font-bold"
              >
                Cancel & Back to Sign In
              </button>
            ) : isForgotPassword || isResetPassword ? (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setIsResetPassword(false);
                }}
                className="text-emerald-600 hover:underline font-bold"
              >
                Back to Sign In
              </button>
            ) : isRegister ? (
              <span>Already registered? <button type="button" onClick={() => setIsRegister(false)} className="text-emerald-600 hover:underline font-bold">Sign In</button></span>
            ) : (
              <span>New team member? <button type="button" onClick={() => setIsRegister(true)} className="text-emerald-600 hover:underline font-bold">Register Account</button></span>
            )}
          </div>

          {/* Quick Sandbox Bypass Logins */}
          {!isForgotPassword && !isResetPassword && !mfaRequiredUserId && (
            <div className="mt-4 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-500 text-center leading-normal">
              <span className="font-bold text-slate-700">Developer Sandbox Bypass:</span>
              <div className="mt-1 flex flex-col gap-0.5 font-mono text-[9px] text-left">
                <div>• Admin: <span className="text-emerald-600 font-bold">admin@enterprise.ai</span> (password: <b className="text-slate-700">admin</b>)</div>
                <div>• Manager: <span className="text-emerald-600 font-bold">manager@enterprise.ai</span> (password: <b className="text-slate-700">manager</b>)</div>
                <div>• Employee: <span className="text-emerald-600 font-bold">employee@enterprise.ai</span> (password: <b className="text-slate-700">employee</b>)</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
