/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  ADMIN = "Admin",
  MANAGER = "Manager",
  EMPLOYEE = "Employee",
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string;
  joinedAt: string;
  emailVerified: boolean;
  mfaEnabled?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  avatarUrl?: string;
  createdAt: string;
  ownerId: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: UserRole;
  joinedAt: string;
}

export interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadDate: string;
  uploadedBy: string; // User Name or ID
  workspaceId: string;
  status: "pending" | "processing" | "completed" | "failed";
  version: number;
  chunkCount: number;
  metadata: {
    title?: string;
    author?: string;
    sourceFilename: string;
    pageCount?: number;
    description?: string;
  };
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  workspaceId: string;
  chunkIndex: number;
  text: string;
  pageNumber?: number;
}

export interface ChatSession {
  id: string;
  title: string;
  workspaceId: string;
  userId: string;
  createdAt: string;
}

export interface MessageCitation {
  documentId: string;
  documentName: string;
  chunkId: string;
  pageNumber?: number;
  snippet: string;
}

export interface Message {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: MessageCitation[];
  confidenceScore?: number; // 0.0 to 1.0
  followUpSuggestions?: string[];
  providerUsed?: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  action: string;
  ipAddress: string;
  timestamp: string;
  details: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  read: boolean;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  role: UserRole;
  workspaceId: string;
  createdAt: string;
  lastUsedAt?: string;
}

// Sidebar/Tab selection enum
export enum ActiveTab {
  DASHBOARD = "dashboard",
  DOCUMENTS = "documents",
  CHAT = "chat",
  SEARCH = "search",
  ANALYTICS = "analytics",
  ADMIN = "admin",
  SETTINGS = "settings",
}
