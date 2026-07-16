/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Bell, 
  ShieldAlert, 
  Info, 
  CheckCircle2, 
  AlertTriangle,
  UserCheck,
  Sun,
  Moon
} from "lucide-react";
import { User, Workspace, Notification, ActiveTab, UserRole } from "../types";

interface HeaderProps {
  currentUser: User;
  currentWorkspace: Workspace | null;
  activeTab: ActiveTab;
  notifications: Notification[];
  onReadAllNotifications: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export default function Header({
  currentUser,
  currentWorkspace,
  activeTab,
  notifications,
  onReadAllNotifications,
  darkMode,
  onToggleDarkMode,
}: HeaderProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const tabTitles: Record<ActiveTab, string> = {
    [ActiveTab.DASHBOARD]: "System Overview",
    [ActiveTab.DOCUMENTS]: "Document Knowledge Repository",
    [ActiveTab.CHAT]: "AI Context Assistant",
    [ActiveTab.SEARCH]: "Hybrid & Semantic Search Engine",
    [ActiveTab.ANALYTICS]: "Operations Analytics",
    [ActiveTab.ADMIN]: "Admin System Controls",
    [ActiveTab.SETTINGS]: "SaaS Configuration Panel",
  };

  const getRolePermissionsExplanation = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return "Full Administrative Access: Manage Users, Delete Documents, Audit Logs, API keys, and Workspace Settings.";
      case UserRole.MANAGER:
        return "Manager Access: Upload Files, Create Workspaces, Invite Members, Chat, and view Analytics.";
      case UserRole.EMPLOYEE:
        return "Employee Access: Semantic Chat and Hybrid Document Search only. Uploading and administrative actions are restricted.";
    }
  };

  return (
    <header id="saas-header" className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 font-sans shadow-xs">
      {/* Active Area Title */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">
            {currentWorkspace?.name || "No Workspace Selected"}
          </span>
          <h2 className="text-base font-bold text-slate-800 leading-tight">
            {tabTitles[activeTab]}
          </h2>
        </div>
        
        {/* Dynamic RBAC Badge indicator */}
        <div className="hidden md:flex items-center gap-1.5 ml-4 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-mono text-emerald-700 font-semibold uppercase">
          <UserCheck className="w-3.5 h-3.5" />
          {currentUser.role} Mode
        </div>
      </div>

      {/* Permissions Context Banner Info - extremely elegant & useful */}
      <div className="hidden lg:flex items-center gap-2 bg-slate-50 border border-slate-200 py-1.5 px-3 rounded-md max-w-md xl:max-w-xl text-left">
        <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <p className="text-[10px] text-slate-500 leading-normal truncate">
          <span className="font-semibold text-slate-700">RBAC: </span>
          {getRolePermissionsExplanation(currentUser.role)}
        </p>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition duration-150 cursor-pointer"
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {darkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Alerts Notification Indicator */}
        <div className="relative">
          <button
            id="btn-notifications"
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition duration-150 relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white font-mono font-bold text-[8px] rounded-full flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-2xl z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50">
                <span className="text-xs font-bold text-slate-700">Notifications ({unreadCount} unread)</span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => {
                      onReadAllNotifications();
                      setShowNotifications(false);
                    }}
                    className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">
                    No notifications yet.
                  </div>
                ) : (
                  notifications.map((notif) => {
                    const iconMap = {
                      success: <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />,
                      error: <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />,
                      warning: <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />,
                      info: <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />,
                    };
                    return (
                      <div key={notif.id} className={`p-3 flex gap-2.5 items-start text-xs hover:bg-slate-50 ${!notif.read ? "bg-slate-50/50" : ""}`}>
                        {iconMap[notif.type]}
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-700 leading-tight">{notif.title}</h4>
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-normal">{notif.message}</p>
                          <span className="text-[9px] text-slate-400 block mt-1 font-mono">
                            {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Identity Display */}
        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-100"
            referrerPolicy="no-referrer"
          />
          <div className="hidden xl:flex flex-col text-left">
            <span className="text-xs font-bold text-slate-700 leading-none">{currentUser.name}</span>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5">{currentUser.email}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
