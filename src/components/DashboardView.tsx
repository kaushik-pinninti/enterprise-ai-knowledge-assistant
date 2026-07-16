/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  FileText, 
  Database, 
  Users2, 
  HardDrive, 
  ArrowRight, 
  Upload, 
  MessageCircle, 
  Activity,
  History,
  ShieldCheck,
  UserCheck,
  Send,
  Mail,
  UserPlus,
  MessageSquare,
  CheckCircle,
  XCircle
} from "lucide-react";
import { Document, User, ActiveTab } from "../types";

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

interface DashboardViewProps {
  documents: Document[];
  allUsers: User[];
  totalStorage: number;
  totalChunks: number;
  setActiveTab: (tab: ActiveTab) => void;
  onQuickUploadTrigger: () => void;
  currentWorkspace: any;
}

export default function DashboardView({
  documents,
  allUsers,
  totalStorage,
  totalChunks,
  setActiveTab,
  onQuickUploadTrigger,
  currentWorkspace,
}: DashboardViewProps) {
  
  // Calculate stats
  const totalDocsCount = documents.length;
  const userCount = allUsers.length;
  
  // Storage Quota representation (say, 50MB quota = 52428800 bytes)
  const quotaBytes = 52428800; 
  const storagePercentage = Math.min(100, Math.round((totalStorage / quotaBytes) * 100 * 100) / 100);
  const formattedStorage = (totalStorage / 1024).toFixed(1) + " KB";

  // Comments & invitations state
  const [comments, setComments] = useState<any[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Employee");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteError, setInviteError] = useState("");

  const fetchComments = async () => {
    if (!currentWorkspace) return;
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}/comments`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !currentWorkspace) return;
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: commentInput.trim() })
      });
      if (res.ok) {
        setCommentInput("");
        fetchComments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteSuccess("");
    setInviteError("");
    if (!inviteEmail.trim() || !currentWorkspace) return;
    try {
      const res = await fetch(`/api/workspaces/${currentWorkspace.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole })
      });
      const data = await res.json();
      if (res.ok) {
        setInviteSuccess(`Successfully invited ${inviteEmail}!`);
        setInviteEmail("");
      } else {
        setInviteError(data.error || "Failed to invite member");
      }
    } catch (e) {
      setInviteError("Invite request failed");
    }
  };

  useEffect(() => {
    fetchComments();
  }, [currentWorkspace]);

  const statCards = [
    {
      title: "Knowledge Base Scope",
      value: `${totalDocsCount} Documents`,
      subtext: "Ingested in active workspace",
      icon: FileText,
      color: "bg-emerald-50 text-emerald-600 border-emerald-100",
      accent: "emerald"
    },
    {
      title: "Vector Data Scale",
      value: `${totalChunks} Chunks`,
      subtext: "Parsed & semantic nodes indexed",
      icon: Database,
      color: "bg-teal-50 text-teal-600 border-teal-100",
      accent: "teal"
    },
    {
      title: "Workspace Seats",
      value: `${userCount} Active Members`,
      subtext: "Role-based accounts synced",
      icon: Users2,
      color: "bg-blue-50 text-blue-600 border-blue-100",
      accent: "blue"
    },
    {
      title: "Storage Utilized",
      value: formattedStorage,
      subtext: `${storagePercentage}% of 50MB SLA quota`,
      icon: HardDrive,
      color: "bg-amber-50 text-amber-600 border-amber-100",
      accent: "amber"
    }
  ];

  return (
    <div id="view-dashboard" className="p-6 space-y-6 font-sans overflow-y-auto h-full bg-slate-50/50">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-emerald-950 p-6 rounded-2xl border border-slate-800 shadow-xl text-left flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-white tracking-tight">Welcome to Enterprise AI Knowledge Engine</h3>
          <p className="text-xs text-emerald-300 mt-1 max-w-xl leading-normal">
            Upload policies, spreadsheets, or strategy papers to create a secure context-aware workspace. Chat with files, perform keyword/semantic hybrid queries, and manage enterprise security logs out-of-the-box.
          </p>
        </div>
        <div className="flex gap-2.5 shrink-0">
          <button
            onClick={() => setActiveTab(ActiveTab.CHAT)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition duration-150 shadow-md shadow-emerald-950/25"
          >
            <MessageCircle className="w-4 h-4" />
            Launch Assistant
          </button>
          <button
            onClick={onQuickUploadTrigger}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition duration-150"
          >
            <Upload className="w-4 h-4" />
            Upload File
          </button>
        </div>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between text-left relative overflow-hidden transition hover:shadow-md">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">{card.title}</span>
                <div className={`p-2 rounded-lg border ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <h4 className="text-xl font-bold text-slate-800 tracking-tight">{card.value}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-normal">{card.subtext}</p>
              </div>
              
              {/* If storage display quota indicator */}
              {card.title === "Storage Utilized" && (
                <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div 
                    className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${storagePercentage}%` }}
                  ></div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Main Content Areas split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Recent Ingested Files (2 Columns wide) */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col text-left">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 rounded text-slate-600">
                <History className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">Recent Uploads & Indexing Queue</h3>
            </div>
            <button
              onClick={() => setActiveTab(ActiveTab.DOCUMENTS)}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5 hover:underline"
            >
              Document Center <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="mt-4 flex-1">
            {documents.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No documents uploaded to this workspace yet. Click "Upload File" to start.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                      <th className="py-2.5">File Name</th>
                      <th className="py-2.5">Date Ingested</th>
                      <th className="py-2.5">Sectors</th>
                      <th className="py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {documents.slice(0, 5).map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-50/50">
                        <td className="py-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700 max-w-[200px] sm:max-w-xs truncate">{doc.name}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              {(doc.size / 1024).toFixed(1)} KB • {doc.type.split("/")[1]?.toUpperCase() || "BINARY"}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 text-slate-500">
                          {new Date(doc.uploadDate).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-slate-600 font-mono font-bold">
                          {doc.chunkCount} Nodes
                        </td>
                        <td className="py-3">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold leading-none bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Completed
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Security / System Insights Feed (1 Column wide) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col text-left">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 rounded text-slate-600">
                <Activity className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">Security Ingestion Pipeline</h3>
            </div>
            <div className="flex items-center gap-1 text-[9px] bg-slate-100 text-slate-600 font-mono px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              Audit Log Active
            </div>
          </div>

          {/* Quick Informative Info Panel */}
          <div className="mt-4 bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-lg">
            <h4 className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              Strict Role-Based Policies
            </h4>
            <p className="text-[10px] text-emerald-700 leading-normal mt-1">
              Actions in this sandbox are securely tracked. Changing your simulated role at the bottom of the sidebar will instantly apply local permission bounds.
            </p>
          </div>

          <div className="mt-4 flex-1 space-y-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
              Live System Status
            </span>
            <div className="space-y-3">
              <div className="flex gap-2 text-[11px] leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0 animate-ping"></span>
                <div className="text-slate-600">
                  <span className="font-semibold text-slate-800 block">RAG Search Pipeline Ready</span>
                  Hybrid lexical vector matching engine online.
                </div>
              </div>
              <div className="flex gap-2 text-[11px] leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                <div className="text-slate-600">
                  <span className="font-semibold text-slate-800 block">Server-Side Gemini SDK Online</span>
                  Integrations running with `gemini-3.5-flash` for summaries.
                </div>
              </div>
              <div className="flex gap-2 text-[11px] leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                <div className="text-slate-600">
                  <span className="font-semibold text-slate-800 block">Durable Persistence Active</span>
                  `db.json` active for transactional state preservation.
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Collaboration row */}
      {currentWorkspace && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Workspace Comments (2 Columns wide) */}
          <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col text-left">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">
                Workspace Wall / Comments for "{currentWorkspace.name}"
              </h3>
            </div>

            <div className="mt-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3 max-h-[220px] overflow-y-auto mb-4 pr-1">
                {comments.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 text-xs">
                    No team comments on this workspace yet. Write the first comment below!
                  </div>
                ) : (
                  comments.map((c, i) => (
                    <div key={i} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                        <span>{c.user}</span>
                        <span className="text-[9px] font-normal font-mono">{new Date(c.timestamp).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-700 text-xs leading-normal">{c.comment}</p>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={handlePostComment} className="flex gap-2 border-t border-slate-100 pt-3 shrink-0">
                <input
                  type="text"
                  required
                  placeholder="Ask a question or post an update to the team..."
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs transition flex items-center gap-1 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" /> Post
                </button>
              </form>
            </div>
          </div>

          {/* Member Invitations panel (1 Column wide) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col text-left">
            <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded">
                <UserPlus className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-800">Invite Team Members</h3>
            </div>

            <form onSubmit={handleSendInvite} className="mt-4 space-y-3.5 text-xs flex-1 flex flex-col justify-between">
              <div className="space-y-3.5">
                {inviteSuccess && (
                  <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-lg flex items-center gap-1.5 font-semibold text-[11px]">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{inviteSuccess}</span>
                  </div>
                )}
                {inviteError && (
                  <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-lg flex items-center gap-1.5 font-semibold text-[11px]">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{inviteError}</span>
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5 font-mono">Team Member Email</label>
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      placeholder="colleague@enterprise.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5 font-mono">Workspace Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs cursor-pointer focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Employee">Employee (Chat scope)</option>
                    <option value="Manager">Manager (Upload scope)</option>
                    <option value="Admin">Admin (Full scope)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 mt-4">
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg text-xs transition shadow-md shadow-indigo-950/10"
                >
                  Send Invitation Link
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
