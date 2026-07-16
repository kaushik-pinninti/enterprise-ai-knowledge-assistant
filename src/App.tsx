/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  ActiveTab, 
  User, 
  Workspace, 
  Document, 
  ChatSession, 
  Message, 
  Notification, 
  UserRole,
  AuditLog,
  ApiKey,
  DocumentChunk
} from "./types";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DashboardView from "./components/DashboardView";
import DocumentsView from "./components/DocumentsView";
import ChatView from "./components/ChatView";
import SearchView from "./components/SearchView";
import AnalyticsView from "./components/AnalyticsView";
import AdminView from "./components/AdminView";
import SettingsView from "./components/SettingsView";
import AuthModal from "./components/AuthModal";
import { 
  X, 
  FolderOpen
} from "lucide-react";

// Safe local fetch wrapper to inject JWT Authorization Header
const customFetch = async (url: RequestInfo | URL, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem("saas_jwt_token");
  const headers = { ...options.headers } as Record<string, string>;
  if (token && typeof url === "string" && url.startsWith("/api/")) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return window.fetch(url, { ...options, headers });
};
// Lexically override fetch inside this file
const fetch = customFetch;

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>(ActiveTab.DASHBOARD);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingApp, setLoadingApp] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState(false);

  // Dark Mode State
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("saas_dark_theme") === "true";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("saas_dark_theme", darkMode ? "true" : "false");
  }, [darkMode]);

  // Workspace Creation Dialog Modal
  const [showWorkspaceModal, setShowWorkspaceModal] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState("");
  const [newWorkspaceAvatar, setNewWorkspaceAvatar] = useState("📁");
  const [mfaRequiredUserId, setMfaRequiredUserId] = useState<string | null>(null);

  // Load Initial Application Context State on boot
  const loadAppData = async () => {
    try {
      const response = await fetch("/api/auth/me");
      if (response.ok) {
        const data = await response.json();
        setCurrentUser(data.user);
        setAllUsers(data.allUsers || []);
        setWorkspaces(data.workspaces || []);
        setMfaRequiredUserId(null);
        
        // Default to first workspace if not set
        if (data.workspaces && data.workspaces.length > 0) {
          const defaultWs = currentWorkspace 
            ? data.workspaces.find((w: any) => w.id === currentWorkspace.id) || data.workspaces[0]
            : data.workspaces[0];
          setCurrentWorkspace(defaultWs);
        }
      } else {
        const data = await response.json().catch(() => ({}));
        if (data.mfaRequired) {
          setMfaRequiredUserId(data.userId);
        }
      }
    } catch (err) {
      console.error("Express backend not active yet or booting up...", err);
    } finally {
      setLoadingApp(false);
    }
  };

  useEffect(() => {
    loadAppData();
  }, []);

  // Sync Documents & Chats on workspace swap
  useEffect(() => {
    if (currentWorkspace) {
      loadDocuments(currentWorkspace.id);
      loadSessions(currentWorkspace.id);
      loadNotifications();
    }
  }, [currentWorkspace]);

  // Sync Messages on Session swap
  useEffect(() => {
    if (activeSession) {
      loadMessages(activeSession.id);
    } else {
      setMessages([]);
    }
  }, [activeSession]);

  const loadDocuments = async (wsId: string) => {
    try {
      const response = await fetch(`/api/documents/list?workspaceId=${wsId}`);
      if (response.ok) {
        const docs = await response.json();
        setDocuments(docs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadSessions = async (wsId: string) => {
    try {
      const response = await fetch("/api/chat/sessions");
      if (response.ok) {
        const sess = await response.json();
        const filtered = sess.filter((s: any) => s.workspaceId === wsId);
        setSessions(filtered);
        
        // Set first active session or create session if empty
        if (filtered.length > 0) {
          setActiveSession(filtered[0]);
        } else {
          setActiveSession(null);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadMessages = async (sessId: string) => {
    try {
      const response = await fetch(`/api/chat/messages?sessionId=${sessId}`);
      if (response.ok) {
        const msgs = await response.json();
        setMessages(msgs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadNotifications = async () => {
    try {
      const response = await fetch("/api/notifications/list");
      if (response.ok) {
        const notifs = await response.json();
        setNotifications(notifs);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Auth logins SUCCESS callback triggers
  const handleLoginSuccess = (user: User, token?: string) => {
    if (token) {
      localStorage.setItem("saas_jwt_token", token);
    }
    setMfaRequiredUserId(null);
    setCurrentUser(user);
    loadAppData();
  };

  const handleRegisterSuccess = (user: User, token?: string) => {
    if (token) {
      localStorage.setItem("saas_jwt_token", token);
    }
    setMfaRequiredUserId(null);
    setCurrentUser(user);
    loadAppData();
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      // Ignored
    }
    localStorage.removeItem("saas_jwt_token");
    localStorage.removeItem("saas_refresh_token");
    setCurrentUser(null);
    setWorkspaces([]);
    setCurrentWorkspace(null);
    setActiveTab(ActiveTab.DASHBOARD);
  };

  const handleVoiceCommand = (command: string) => {
    if (command === "dashboard") {
      setActiveTab(ActiveTab.DASHBOARD);
    } else if (command === "documents") {
      setActiveTab(ActiveTab.DOCUMENTS);
    } else if (command === "create_workspace") {
      setShowWorkspaceModal(true);
    } else if (command === "logout") {
      handleLogout();
        } else if (command.startsWith("search:")) {
      setActiveTab(ActiveTab.SEARCH);
    }
  };

  // Switch identity context instantly (RBAC simulator helper)
  const handleSwitchUser = async (userId: string) => {
    try {
      const response = await fetch("/api/auth/switch-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });
      if (response.ok) {
        await loadAppData();
        // Reload docs for current workspace
        if (currentWorkspace) {
          loadDocuments(currentWorkspace.id);
          loadSessions(currentWorkspace.id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Create Workspace action
  const handleCreateWorkspaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;

    try {
      const response = await fetch("/api/workspaces/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newWorkspaceName,
          description: newWorkspaceDesc,
          avatarUrl: newWorkspaceAvatar
        })
      });
      if (response.ok) {
        const data = await response.json();
        setNewWorkspaceName("");
        setNewWorkspaceDesc("");
        setShowWorkspaceModal(false);
        
        // Reload workspaces and switch to it
        await loadAppData();
        setCurrentWorkspace(data.workspace);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Document Ingestion actions
  const handleUploadDocument = async (fileData: { name: string; content: string; type: string; size: number }) => {
    if (!currentWorkspace) return;
    try {
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...fileData,
          workspaceId: currentWorkspace.id
        })
      });
      if (response.ok) {
        await loadDocuments(currentWorkspace.id);
        await loadNotifications();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Delete Document from Knowledge Base
  const handleDeleteDocument = async (id: string) => {
    if (!currentWorkspace) return;
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        await loadDocuments(currentWorkspace.id);
        await loadNotifications();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Inspect specific Document Chunks / Vectors
  const handleInspectDocumentChunks = async (id: string): Promise<DocumentChunk[]> => {
    try {
      const response = await fetch(`/api/documents/${id}/chunks`);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  // AI Chat session creation
  const handleCreateSession = async (title?: string): Promise<ChatSession> => {
    if (!currentWorkspace) throw new Error("No active workspace selected");
    const response = await fetch("/api/chat/sessions/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workspaceId: currentWorkspace.id,
        title
      })
    });
    const newSess = await response.json();
    setSessions([newSess, ...sessions]);
    setActiveSession(newSess);
    return newSess;
  };

  // AI Chat prompting
  const handleSendMessage = async (text: string, selectedDocIds: string[]) => {
    if (!currentWorkspace) return;
    
    let currentSess = activeSession;
    if (!currentSess) {
      try {
        currentSess = await handleCreateSession(`Investigation regarding ${text.slice(0, 20)}...`);
      } catch (err) {
        console.error(err);
        return;
      }
    }

    setLoadingMessage(true);
    
    // Optimistically push User message to state
    const optUserMsg: Message = {
      id: `opt-msg-${Date.now()}`,
      sessionId: currentSess.id,
      role: "user",
      content: text,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, optUserMsg]);

    try {
      const response = await fetch("/api/chat/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: currentSess.id,
          message: text,
          workspaceId: currentWorkspace.id,
          selectedDocIds
        })
      });

      if (response.ok) {
        await response.json();
        // Fully replace message log with actual database synced messages
        await loadMessages(currentSess.id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessage(false);
    }
  };

  // Hybrid Document Search matching
  const handleSearchDocs = async (query: string, filters: { author: string; documentId: string }) => {
    if (!currentWorkspace) return [];
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          workspaceId: currentWorkspace.id,
          filters
        })
      });
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  // Admin user toggling
  const handleToggleUserActive = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch("/api/admin/toggle-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isActive })
      });
      if (response.ok) {
        loadAppData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleChangeUserRole = async (userId: string, role: UserRole) => {
    try {
      const response = await fetch("/api/admin/change-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role })
      });
      if (response.ok) {
        loadAppData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // API credentials actions
  const handleLoadApiKeys = async (): Promise<ApiKey[]> => {
    const response = await fetch("/api/apikeys/list");
    return response.ok ? await response.json() : [];
  };

  const handleCreateApiKey = async (keyData: { name: string; role: UserRole; workspaceId: string }): Promise<ApiKey> => {
    const response = await fetch("/api/apikeys/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(keyData)
    });
    return await response.json();
  };

  const handleRevokeApiKey = async (keyId: string) => {
    await fetch(`/api/apikeys/${keyId}`, { method: "DELETE" });
  };

  // Fetch Audit Logs
  const handleLoadAuditLogs = async (): Promise<AuditLog[]> => {
    const response = await fetch("/api/admin/audit-logs");
    return response.ok ? await response.json() : [];
  };

  // Fetch Analytics reporting summary
  const handleLoadAnalyticsSummary = async () => {
    const response = await fetch("/api/analytics/summary");
    return response.ok ? await response.json() : null;
  };

  // Read all system notifications
  const handleReadAllNotifications = async () => {
    try {
      const response = await fetch("/api/notifications/read-all", { method: "POST" });
      if (response.ok) {
        loadNotifications();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Edit profile actions
  const handleUpdateProfile = async (name: string, email: string) => {
    // Mock profile save locally and log audit
    if (currentUser) {
      const updated = { ...currentUser, name, email };
      setCurrentUser(updated);
    }
  };

  const handleTriggerEmailVerification = () => {
    if (currentUser) {
      const updated = { ...currentUser, emailVerified: true };
      setCurrentUser(updated);
    }
  };

  // Render view router based on active tab selection
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case ActiveTab.DASHBOARD:
        return (
          <DashboardView
            documents={documents}
            allUsers={allUsers}
            totalStorage={documents.reduce((sum, d) => sum + d.size, 0)}
            totalChunks={documents.reduce((sum, d) => sum + d.chunkCount, 0)}
            setActiveTab={setActiveTab}
            onQuickUploadTrigger={() => setActiveTab(ActiveTab.DOCUMENTS)}
            currentWorkspace={currentWorkspace}
          />
        );
      case ActiveTab.DOCUMENTS:
        return (
          <DocumentsView
            documents={documents}
            currentUser={currentUser!}
            onUploadDocument={handleUploadDocument}
            onDeleteDocument={handleDeleteDocument}
            onInspectDocumentChunks={handleInspectDocumentChunks}
          />
        );
      case ActiveTab.CHAT:
        return (
          <ChatView
            documents={documents}
            sessions={sessions}
            activeSession={activeSession}
            messages={messages}
            loadingMessage={loadingMessage}
            onSelectSession={onSelectSession}
            onCreateSession={handleCreateSession}
            onSendMessage={handleSendMessage}
            onVoiceCommand={handleVoiceCommand}
          />
        );
      case ActiveTab.SEARCH:
        return (
          <SearchView
            documents={documents}
            onSearch={handleSearchDocs}
          />
        );
      case ActiveTab.ANALYTICS:
        return <AnalyticsView onLoadSummary={handleLoadAnalyticsSummary} />;
      case ActiveTab.ADMIN:
        return (
          <AdminView
            currentUser={currentUser!}
            allUsers={allUsers}
            workspaces={workspaces}
            onLoadAuditLogs={handleLoadAuditLogs}
            onLoadApiKeys={handleLoadApiKeys}
            onToggleUserActive={handleToggleUserActive}
            onChangeUserRole={handleChangeUserRole}
            onCreateApiKey={handleCreateApiKey}
            onRevokeApiKey={handleRevokeApiKey}
          />
        );
      case ActiveTab.SETTINGS:
        return (
          <SettingsView
            currentUser={currentUser!}
            onUpdateProfile={handleUpdateProfile}
            onTriggerEmailVerification={handleTriggerEmailVerification}
          />
        );
      default:
        return <div className="p-6 text-center text-slate-500 text-xs">Tab not implemented.</div>;
    }
  };

  const onSelectSession = (session: ChatSession) => {
    setActiveSession(session);
  };

  // Loading Screen
  if (loadingApp) {
    return (
      <div id="saas-loader" className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center text-slate-300 font-sans p-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold mb-4 shadow-xl">
          E
        </div>
        <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-500 animate-pulse">
          Booting Enterprise Core
        </span>
      </div>
    );
  }

  // Auth Guard Overlay
  if (!currentUser) {
    return (
      <AuthModal
        onLoginSuccess={handleLoginSuccess}
        onRegisterSuccess={handleRegisterSuccess}
        initialMfaUserId={mfaRequiredUserId}
      />
    );
  }

  return (
    <div id="saas-app-container" className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      
      {/* Side Nav Panel */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        allUsers={allUsers}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        setCurrentWorkspace={setCurrentWorkspace}
        onSwitchUser={handleSwitchUser}
        onCreateWorkspace={() => setShowWorkspaceModal(true)}
        onLogout={handleLogout}
      />

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Header
          currentUser={currentUser}
          currentWorkspace={currentWorkspace}
          activeTab={activeTab}
          notifications={notifications}
          onReadAllNotifications={handleReadAllNotifications}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />

        {/* Dynamic Inner Tab View */}
        <main className="flex-1 overflow-hidden">
          {renderActiveTabContent()}
        </main>
      </div>

      {/* Workspace Creator Modal */}
      {showWorkspaceModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 text-left">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <FolderOpen className="w-4.5 h-4.5 text-emerald-600" />
                Initialize Workspace
              </h3>
              <button onClick={() => setShowWorkspaceModal(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateWorkspaceSubmit} className="mt-4 space-y-4 text-left">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 font-mono">Workspace Label</label>
                <input
                  type="text"
                  required
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="e.g. Q4 Executive Board Prep"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 font-mono">Avatar Symbol</label>
                <select
                  value={newWorkspaceAvatar}
                  onChange={(e) => setNewWorkspaceAvatar(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg cursor-pointer"
                >
                  <option value="📁">📁 Document Folder</option>
                  <option value="🏢">🏢 Corporate Headquarters</option>
                  <option value="🚀">🚀 Launch Initiatives</option>
                  <option value="💡">💡 Innovation Strategy</option>
                  <option value="⚖️">⚖️ Legal & Audit Files</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase block mb-1 font-mono font-semibold">Description</label>
                <textarea
                  value={newWorkspaceDesc}
                  onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                  placeholder="Summarize the core theme or topics of this context compartment..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg resize-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWorkspaceModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-emerald-950/15"
                >
                  Create Workspace
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
