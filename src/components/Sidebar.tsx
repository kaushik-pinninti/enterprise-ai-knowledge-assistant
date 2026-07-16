/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  LayoutDashboard, 
  Files, 
  MessageSquare, 
  Search, 
  BarChart3, 
  ShieldCheck, 
  Settings, 
  ChevronDown, 
  Plus, 
  Briefcase
} from "lucide-react";
import { ActiveTab, User, Workspace, UserRole } from "../types";

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  currentUser: User;
  allUsers: User[];
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  setCurrentWorkspace: (ws: Workspace) => void;
  onSwitchUser: (userId: string) => void;
  onCreateWorkspace: () => void;
  onLogout?: () => void;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  currentUser,
  allUsers,
  workspaces,
  currentWorkspace,
  setCurrentWorkspace,
  onSwitchUser,
  onCreateWorkspace,
  onLogout,
}: SidebarProps) {
  const [workspaceDropdownOpen, setWorkspaceDropdownOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const menuItems = [
    { id: ActiveTab.DASHBOARD, label: "Dashboard", icon: LayoutDashboard, permission: "All" },
    { id: ActiveTab.DOCUMENTS, label: "Document Center", icon: Files, permission: "All" },
    { id: ActiveTab.CHAT, label: "Semantic Chat", icon: MessageSquare, permission: "All" },
    { id: ActiveTab.SEARCH, label: "Hybrid Search", icon: Search, permission: "All" },
    { id: ActiveTab.ANALYTICS, label: "Analytics Hub", icon: BarChart3, permission: "All" },
    { id: ActiveTab.ADMIN, label: "Admin Console", icon: ShieldCheck, permission: "Admin" },
    { id: ActiveTab.SETTINGS, label: "SaaS Settings", icon: Settings, permission: "All" },
  ];

  return (
    <div id="saas-sidebar" className="w-64 bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800 h-screen shrink-0 font-sans">
      {/* Header / Brand */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-900/30">
          <Briefcase className="w-5 h-5 text-emerald-100" />
        </div>
        <div>
          <h1 className="font-bold text-sm leading-none text-white tracking-wide">KNOWLEDGE BASE</h1>
          <span className="text-[10px] text-emerald-400 font-semibold uppercase tracking-wider font-mono">Enterprise AI v1.0</span>
        </div>
      </div>

      {/* Workspace Switcher */}
      <div className="p-4 border-b border-slate-800 relative">
        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5 ml-1">
          Active Workspace
        </label>
        <button
          id="btn-workspace-switcher"
          onClick={() => setWorkspaceDropdownOpen(!workspaceDropdownOpen)}
          className="w-full flex items-center justify-between p-2 bg-slate-800 hover:bg-slate-750 rounded-lg text-left text-sm font-medium transition duration-150 border border-slate-700/50"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-lg shrink-0">{currentWorkspace?.avatarUrl || "📁"}</span>
            <span className="truncate text-white text-xs">{currentWorkspace?.name || "Select Workspace"}</span>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        </button>

        {workspaceDropdownOpen && (
          <div className="absolute left-4 right-4 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
            <div className="max-h-48 overflow-y-auto">
              {workspaces.map((ws) => (
                <button
                  key={ws.id}
                  onClick={() => {
                    setCurrentWorkspace(ws);
                    setWorkspaceDropdownOpen(false);
                  }}
                  className={`w-full text-left p-2.5 flex items-center gap-3 text-xs transition hover:bg-slate-700 ${
                    currentWorkspace?.id === ws.id ? "bg-slate-750 text-white font-semibold" : "text-slate-300"
                  }`}
                >
                  <span className="text-base shrink-0">{ws.avatarUrl || "📁"}</span>
                  <div className="truncate">
                    <div className="truncate font-medium">{ws.name}</div>
                    <div className="text-[10px] text-slate-400 truncate mt-0.5">{ws.description}</div>
                  </div>
                </button>
              ))}
            </div>
            <div className="border-t border-slate-700 p-1 bg-slate-850">
              <button
                onClick={() => {
                  onCreateWorkspace();
                  setWorkspaceDropdownOpen(false);
                }}
                className="w-full text-left p-2 rounded text-xs text-emerald-400 font-semibold flex items-center gap-2 hover:bg-slate-700 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Workspace
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Main Navigation Tab links */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 block font-mono">
          Main Console
        </span>
        {menuItems.map((item) => {
          const Icon = item.icon;
          // Check RBAC representation visually
          const isDisabled = item.permission === "Admin" && currentUser.role !== UserRole.ADMIN;
          
          return (
            <button
              id={`nav-tab-${item.id}`}
              key={item.id}
              disabled={false} // Allow clicking but show a clean warning/overlay inside the view itself! It is better UX
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                activeTab === item.id
                  ? "bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-950/20"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4.5 h-4.5 ${activeTab === item.id ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </div>
              {isDisabled && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-800 text-amber-500 border border-slate-700 rounded uppercase tracking-wider">
                  Admin
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Role Simulator Switcher Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col gap-2 font-mono">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
            RBAC Simulator
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        
        <button
          id="btn-role-switcher"
          onClick={() => setUserDropdownOpen(!userDropdownOpen)}
          className="w-full flex items-center justify-between p-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 rounded text-left text-xs transition duration-150"
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <img 
              src={currentUser.avatarUrl} 
              alt={currentUser.name} 
              className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-700"
              referrerPolicy="no-referrer"
            />
            <div className="truncate">
              <div className="truncate font-semibold text-slate-200 text-[11px] leading-tight">{currentUser.name.split(" ")[0]}</div>
              <div className="text-[9px] text-emerald-400 font-bold leading-none">{currentUser.role}</div>
            </div>
          </div>
          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
        </button>

        {userDropdownOpen && (
          <div className="absolute left-4 bottom-14 right-4 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 py-1 overflow-hidden">
            <div className="p-2 border-b border-slate-700 bg-slate-850 text-[10px] text-slate-400">
              Select simulation identity:
            </div>
            {allUsers.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  onSwitchUser(u.id);
                  setUserDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 text-xs transition hover:bg-slate-750 ${
                  currentUser.id === u.id ? "bg-slate-700 text-white font-semibold" : "text-slate-300"
                }`}
              >
                <img 
                  src={u.avatarUrl} 
                  alt={u.name} 
                  className="w-4 h-4 rounded-full object-cover" 
                  referrerPolicy="no-referrer"
                />
                <div className="text-left leading-none">
                  <div className="font-medium text-[11px]">{u.name}</div>
                  <div className="text-[9px] text-emerald-400 mt-0.5">{u.role}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Sign Out Button */}
        {onLogout && (
          <button
            onClick={onLogout}
            className="mt-1 w-full flex items-center justify-center gap-1.5 py-1.5 border border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900 rounded text-[9px] text-slate-400 hover:text-rose-400 font-bold uppercase tracking-wider transition cursor-pointer"
          >
            Sign Out of SaaS
          </button>
        )}
      </div>
    </div>
  );
}
