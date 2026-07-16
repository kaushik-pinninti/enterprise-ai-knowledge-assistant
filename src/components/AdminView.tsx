/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Key, 
  Trash2, 
  Plus, 
  Activity, 
  ShieldX,
  Settings
} from "lucide-react";
import { User, AuditLog, ApiKey, UserRole, Workspace } from "../types";

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

interface AdminViewProps {
  currentUser: User;
  allUsers: User[];
  workspaces: Workspace[];
  onLoadAuditLogs: () => Promise<AuditLog[]>;
  onLoadApiKeys: () => Promise<ApiKey[]>;
  onToggleUserActive: (userId: string, active: boolean) => void;
  onChangeUserRole: (userId: string, role: UserRole) => void;
  onCreateApiKey: (keyData: { name: string; role: UserRole; workspaceId: string }) => Promise<ApiKey>;
  onRevokeApiKey: (keyId: string) => void;
}

export default function AdminView({
  currentUser,
  allUsers,
  workspaces,
  onLoadAuditLogs,
  onLoadApiKeys,
  onToggleUserActive,
  onChangeUserRole,
  onCreateApiKey,
  onRevokeApiKey,
}: AdminViewProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [loadingKeys, setLoadingKeys] = useState(true);

  // local administrative dashboard states
  const [activeProvider, setActiveProvider] = useState("gemini");
  const [failoverChain, setFailoverChain] = useState<string[]>(["gemini", "anthropic", "openai", "ollama"]);
  const [rateLimit, setRateLimit] = useState(60);
  const [savingSettings, setSavingSettings] = useState(false);
  
  // monitoring metrics states
  const [systemMetrics, setSystemMetrics] = useState<any>({
    cpuUsage: "0%", ramUsage: "0MB", networkPing: "0ms", databaseStatus: "Offline",
    redisStatus: "Offline", activeTasks: 0, logsCounter: 0, cacheHitRatio: "0%", apiRequestsCount: 0, errorRate: "0%"
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // New API key modal states
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyRole, setNewKeyRole] = useState<UserRole>(UserRole.EMPLOYEE);
  const [newKeyWorkspace, setNewKeyWorkspace] = useState("");

  const isAdmin = currentUser.role === UserRole.ADMIN;

  const loadData = async () => {
    if (!isAdmin) return;
    setLoadingLogs(true);
    setLoadingKeys(true);
    try {
      const logs = await onLoadAuditLogs();
      setAuditLogs(logs);
      const keys = await onLoadApiKeys();
      setApiKeys(keys);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
      setLoadingKeys(false);
    }
  };

  const fetchAdminSettings = async () => {
    try {
      const res = await fetch("/api/admin/settings");
      if (res.ok) {
        const data = await res.json();
        setActiveProvider(data.activeProvider || "gemini");
        setFailoverChain(data.failoverChain || ["gemini", "anthropic", "openai", "ollama"]);
        setRateLimit(data.rateLimit || 60);
      }
    } catch (e) {
      console.error("Failed to load administrative settings:", e);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/admin/monitoring-metrics");
      if (res.ok) {
        const data = await res.json();
        setSystemMetrics(data.metrics);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    loadData();
    if (isAdmin) {
      fetchAdminSettings();
      fetchMetrics();
      const interval = setInterval(fetchMetrics, 4000); // refresh system indicators every 4 seconds!
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeProvider, failoverChain, rateLimit })
      });
      if (res.ok) {
        alert("Administrative settings updated and synced successfully!");
        loadData(); // reload audit logs to see settings update logged!
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const key = await onCreateApiKey({
        name: newKeyName,
        role: newKeyRole,
        workspaceId: newKeyWorkspace || workspaces[0]?.id || "ws-global"
      });
      setApiKeys([...apiKeys, key]);
      setNewKeyName("");
      setShowKeyModal(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRevokeApiKey = (keyId: string) => {
    onRevokeApiKey(keyId);
    setApiKeys(apiKeys.filter((k) => k.id !== keyId));
  };

  if (!isAdmin) {
    return (
      <div id="view-admin-unauthorized" className="p-6 h-full bg-slate-50 flex items-center justify-center font-sans text-left">
        <div className="bg-white border border-slate-200 rounded-xl p-8 max-w-md w-full shadow-lg text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto ring-4 ring-rose-100">
            <ShieldX className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-800 text-sm">Administrative Clearance Required</h3>
          <p className="text-xs text-slate-500 leading-normal">
            Your currently simulated role is <span className="font-bold text-slate-700">{currentUser.role}</span>. This view is restricted to Administrators to inspect system logs and manage credentials.
          </p>
          <div className="bg-amber-50 text-amber-800 p-3.5 rounded-lg border border-amber-100 text-[11px] leading-relaxed">
            <span className="font-bold">Test RBAC instantly:</span> Switch your active testing context to <span className="font-bold">Sarah Jenkins (Admin)</span> using the simulator switcher in the bottom left of the sidebar!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="view-admin" className="p-6 space-y-6 font-sans overflow-y-auto h-full bg-slate-50/50 text-left">
      
      {/* ENTERPRISE ADMIN COGNIZANT PANELS: SYSTEM HEALTH & AI PROVIDER SWITCHER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* System Health Dashboard */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="w-4.5 h-4.5 text-indigo-600" />
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider font-mono">Live System Health Dashboard</h3>
            </div>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold leading-none bg-indigo-50 text-indigo-700 border border-indigo-100">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              Live Telemetry Stream
            </span>
          </div>

          {loadingMetrics ? (
            <div className="space-y-4 animate-pulse py-8">
              <div className="h-12 bg-slate-50 rounded"></div>
              <div className="grid grid-cols-3 gap-4">
                <div className="h-10 bg-slate-50 rounded"></div>
                <div className="h-10 bg-slate-50 rounded"></div>
                <div className="h-10 bg-slate-50 rounded"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 flex-1 flex flex-col justify-between">
              {/* Telemetry metrics grids */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-3 text-center">
                  <span className="text-[10px] text-slate-400 font-bold font-mono uppercase block">Processor Load</span>
                  <span className="text-xl font-extrabold text-slate-800 block mt-1 font-mono">{systemMetrics.cpuUsage}</span>
                  <div className="w-full bg-slate-200 rounded-full h-1 mt-2 overflow-hidden">
                    <div className="bg-indigo-600 h-1 rounded-full transition-all duration-500" style={{ width: systemMetrics.cpuUsage }}></div>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-3 text-center">
                  <span className="text-[10px] text-slate-400 font-bold font-mono uppercase block">Memory RSS</span>
                  <span className="text-xl font-extrabold text-slate-800 block mt-1 font-mono">{systemMetrics.ramUsage}</span>
                  <span className="text-[9px] text-slate-400 font-mono">Node Container limits</span>
                </div>

                <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-3 text-center">
                  <span className="text-[10px] text-slate-400 font-bold font-mono uppercase block">RAG API Latency</span>
                  <span className="text-xl font-extrabold text-slate-800 block mt-1 font-mono">{systemMetrics.networkPing}</span>
                  <span className="text-[9px] text-emerald-600 font-mono">Fast Gateway</span>
                </div>

                <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-3 text-center">
                  <span className="text-[10px] text-slate-400 font-bold font-mono uppercase block">Cache Hit Rate</span>
                  <span className="text-xl font-extrabold text-slate-800 block mt-1 font-mono">{systemMetrics.cacheHitRatio}</span>
                  <div className="w-full bg-slate-200 rounded-full h-1 mt-2 overflow-hidden">
                    <div className="bg-indigo-600 h-1 rounded-full transition-all duration-500" style={{ width: systemMetrics.cacheHitRatio }}></div>
                  </div>
                </div>
              </div>

              {/* Server and infrastructure states */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold font-mono uppercase block">Database Nodes</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      PostgreSQL + pgvector
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">{systemMetrics.databaseStatus}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Google Cloud Firestore
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">Connected (Healthy)</span>
                  </div>
                </div>

                <div className="p-3 border border-slate-200 rounded-xl space-y-2">
                  <span className="text-[10px] text-slate-400 font-bold font-mono uppercase block">Infrastructure Runtimes</span>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      Redis Cache Node
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">{systemMetrics.redisStatus}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${systemMetrics.activeTasks > 0 ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`}></span>
                      Async Document Ingestors
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">{systemMetrics.activeTasks} active tasks</span>
                  </div>
                </div>
              </div>

              {/* Extra telemetry variables */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-100">
                <span>Core API Queries Checked: <strong className="text-slate-600">{systemMetrics.apiRequestsCount}</strong></span>
                <span>Average Error Rates: <strong className="text-indigo-600">{systemMetrics.errorRate}</strong></span>
              </div>
            </div>
          )}
        </div>

        {/* AI Provider Switcher Console */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4 shrink-0">
            <Settings className="w-4.5 h-4.5 text-indigo-600" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider font-mono">Model Provider Config</h3>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 flex-1 flex flex-col justify-between">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 font-mono">Active Primary Provider</label>
              <select
                value={activeProvider}
                onChange={(e) => setActiveProvider(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg cursor-pointer focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="gemini">Google Gemini (Model: gemini-3.5-flash)</option>
                <option value="openai">OpenAI (Model: gpt-4o)</option>
                <option value="anthropic">Anthropic Claude (Model: claude-3-5-sonnet)</option>
                <option value="ollama">Ollama Local (Model: llama3 on port 11434)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1.5 font-mono">Automatic Failover Order</label>
              <div className="space-y-1 bg-slate-50 border border-slate-200/70 rounded-lg p-2">
                {failoverChain.map((providerName, index) => (
                  <div key={providerName} className="flex items-center justify-between text-xs px-2 py-1 bg-white border border-slate-100 rounded shadow-xs">
                    <span className="font-semibold text-slate-700 font-mono capitalize">
                      {index + 1}. {providerName === "gemini" ? "Google Gemini" : providerName === "openai" ? "OpenAI" : providerName === "anthropic" ? "Anthropic Claude" : "Ollama Local"}
                    </span>
                    <span className="text-[9px] font-mono bg-indigo-50 text-indigo-600 px-1 py-0.5 rounded font-bold uppercase leading-none">
                      Priority {index + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block font-mono">Rate Throttling Limit</label>
                <span className="text-xs font-mono font-bold text-indigo-600">{rateLimit} req/min</span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={rateLimit}
                onChange={(e) => setRateLimit(Number(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-indigo-950/15"
            >
              {savingSettings ? "Saving Settings..." : "Save Config & Sync Nodes"}
            </button>
          </form>
        </div>

      </div>

      {/* Grid of Sections: User Management and API Keys */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* User Management Section (2 Columns wide) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-4 shrink-0">
            <Users className="w-4.5 h-4.5 text-emerald-600" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider font-mono">Tenant User Accounts</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-2">User Details</th>
                  <th className="py-2">Workspace Role</th>
                  <th className="py-2">Status</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {allUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50">
                    <td className="py-3">
                      <div className="flex items-center gap-2.5">
                        <img src={user.avatarUrl} alt={user.name} className="w-7 h-7 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-700 block truncate">{user.name}</span>
                          <span className="text-[10px] text-slate-400 font-mono block truncate">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <select
                        value={user.role}
                        onChange={(e) => onChangeUserRole(user.id, e.target.value as UserRole)}
                        className="bg-slate-50 border border-slate-200 px-2 py-1 rounded text-xs text-slate-700 font-semibold cursor-pointer focus:outline-hidden"
                      >
                        <option value={UserRole.ADMIN}>{UserRole.ADMIN}</option>
                        <option value={UserRole.MANAGER}>{UserRole.MANAGER}</option>
                        <option value={UserRole.EMPLOYEE}>{UserRole.EMPLOYEE}</option>
                      </select>
                    </td>
                    <td className="py-3">
                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold leading-none ${
                        user.isActive 
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                          : "bg-rose-50 text-rose-700 border border-rose-100"
                      }`}>
                        {user.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      {user.id !== currentUser.id ? (
                        <button
                          onClick={() => onToggleUserActive(user.id, !user.isActive)}
                          className={`px-2.5 py-1 rounded text-[10px] font-bold border transition ${
                            user.isActive
                              ? "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                          }`}
                        >
                          {user.isActive ? "Deactivate" : "Activate"}
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic font-mono pr-2">Self</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* API Credentials System (1 Column wide) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
            <div className="flex items-center gap-2">
              <Key className="w-4.5 h-4.5 text-emerald-600" />
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider font-mono">Live API Tokens</h3>
            </div>
            <button
              onClick={() => setShowKeyModal(true)}
              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/50 rounded-lg transition"
              title="Issue new key"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[220px]">
            {loadingKeys ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-10 bg-slate-50 rounded"></div>
                <div className="h-10 bg-slate-50 rounded"></div>
              </div>
            ) : apiKeys.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">No active API tokens issued.</div>
            ) : (
              apiKeys.map((key) => (
                <div key={key.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-700 truncate block max-w-[130px]">{key.name}</span>
                    <button
                      onClick={() => handleRevokeApiKey(key.id)}
                      className="p-1 hover:bg-rose-50 hover:text-rose-600 text-slate-400 rounded transition"
                      title="Revoke credentials"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="font-semibold select-all bg-white border px-1.5 py-0.5 rounded">{key.keyPrefix}••••••••</span>
                    <span>Role: {key.role}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Audit System Logs (Entire width bottom) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <Activity className="w-4.5 h-4.5 text-emerald-600" />
            <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider font-mono">Administrative Audit Logs</h3>
          </div>
          <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-bold uppercase border border-emerald-100">
            HTTPS Pipeline Active
          </span>
        </div>

        <div className="overflow-y-auto max-h-[300px] divide-y divide-slate-100">
          {loadingLogs ? (
            <div className="space-y-3 pt-2">
              <div className="h-8 bg-slate-50 rounded animate-pulse"></div>
              <div className="h-8 bg-slate-50 rounded animate-pulse"></div>
              <div className="h-8 bg-slate-50 rounded animate-pulse"></div>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">No audit logs logged in system db.</div>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row justify-between sm:items-center text-xs gap-2">
                <div className="flex gap-3 items-start">
                  <div className="p-1.5 bg-slate-100 text-slate-500 rounded font-mono shrink-0 font-bold text-[9px] uppercase">
                    {log.action.split(" ")[0] || "Log"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-700 text-[11px] leading-normal">{log.details}</p>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      By: {log.userName} ({log.userEmail}) • IP: {log.ipAddress}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono shrink-0">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Key className="w-4 h-4 text-emerald-600" />
                Issue API Token
              </h3>
              <button onClick={() => setShowKeyModal(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateApiKey} className="mt-4 space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 font-mono">Token Descriptive Label</label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. LangChain Vector Bot"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 font-mono">Mapped RBAC Role</label>
                <select
                  value={newKeyRole}
                  onChange={(e) => setNewKeyRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg cursor-pointer"
                >
                  <option value={UserRole.ADMIN}>{UserRole.ADMIN}</option>
                  <option value={UserRole.MANAGER}>{UserRole.MANAGER}</option>
                  <option value={UserRole.EMPLOYEE}>{UserRole.EMPLOYEE}</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 font-mono">Assigned Workspace</label>
                <select
                  value={newKeyWorkspace}
                  onChange={(e) => setNewKeyWorkspace(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg cursor-pointer"
                >
                  {workspaces.map((ws) => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowKeyModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-emerald-950/15"
                >
                  Issue Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
