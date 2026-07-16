/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  FileText, 
  Trash2, 
  Upload, 
  File, 
  Database, 
  ChevronRight, 
  X, 
  FileCode,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { Document, DocumentChunk, User, UserRole } from "../types";

interface DocumentsViewProps {
  documents: Document[];
  currentUser: User;
  onUploadDocument: (fileData: { name: string; content: string; type: string; size: number }) => void;
  onDeleteDocument: (id: string) => void;
  onInspectDocumentChunks: (id: string) => Promise<DocumentChunk[]>;
}

export default function DocumentsView({
  documents,
  currentUser,
  onUploadDocument,
  onDeleteDocument,
  onInspectDocumentChunks,
}: DocumentsViewProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStage, setUploadStage] = useState<string>("");
  const [selectedDocForChunks, setSelectedDocForChunks] = useState<Document | null>(null);
  const [docChunks, setDocChunks] = useState<DocumentChunk[]>([]);
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Check upload permissions
  const canUpload = currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER;

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!canUpload) {
      setErrorMsg("RBAC Restriction: Only Admins and Managers can upload documents.");
      return;
    }
    setErrorMsg("");

    // Read file
    const reader = new FileReader();
    reader.onload = async (e) => {
      const result = e.target?.result as string;
      if (!result) return;

      // Start simulated ingestion stepper
      setUploadProgress(10);
      setUploadStage("Uploading document bytes to sandbox...");
      
      let progress = 10;
      const interval = setInterval(() => {
        progress += 15;
        if (progress >= 100) {
          clearInterval(interval);
          setUploadProgress(null);
          setUploadStage("");
          onUploadDocument({
            name: file.name,
            content: result,
            type: file.type || "text/plain",
            size: file.size
          });
        } else if (progress > 80) {
          setUploadStage("Computing vector nodes and committing chunks...");
        } else if (progress > 50) {
          setUploadStage("Segmenting extracted texts into overlapping chunks...");
        } else if (progress > 30) {
          setUploadStage("Running parser on ingested text content...");
        }
        setUploadProgress(progress);
      }, 350);
    };

    // If it is a text-like structure read as Text, otherwise read as DataURL/base64
    if (file.type.includes("text") || file.name.endsWith(".txt") || file.name.endsWith(".md") || file.name.endsWith(".csv")) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleLoadChunks = async (doc: Document) => {
    setSelectedDocForChunks(doc);
    setLoadingChunks(true);
    try {
      const chunks = await onInspectDocumentChunks(doc.id);
      setDocChunks(chunks);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingChunks(false);
    }
  };

  return (
    <div id="view-documents" className="p-6 space-y-6 font-sans overflow-y-auto h-full bg-slate-50/50 flex flex-col md:flex-row gap-6 items-stretch">
      
      {/* Left side: Upload and Inventory list */}
      <div className="flex-1 space-y-6 flex flex-col">
        {/* Error notification if any */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-lg text-xs flex items-center gap-2 text-left">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Drag and Drop uploader card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-left">
          <h3 className="font-bold text-sm text-slate-800">Ingest Knowledge Asset</h3>
          <p className="text-[10px] text-slate-400 mt-0.5 mb-4">
            Supports PDF, DOCX, TXT, MD, CSV files. Max file upload size 5MB.
          </p>

          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition cursor-pointer ${
              dragActive ? "border-emerald-500 bg-emerald-50/30" : "border-slate-200 bg-slate-50 hover:bg-slate-100/50"
            } ${!canUpload ? "opacity-60 cursor-not-allowed" : ""}`}
            onClick={() => {
              if (canUpload) {
                document.getElementById("hidden-file-input")?.click();
              } else {
                setErrorMsg("RBAC Restriction: Employees cannot upload documents. Please switch your role to 'Manager' or 'Admin' in the footer role switcher.");
              }
            }}
          >
            <input
              id="hidden-file-input"
              type="file"
              className="hidden"
              onChange={handleFileInput}
              disabled={!canUpload}
            />
            
            {uploadProgress !== null ? (
              <div className="w-full max-w-xs space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto animate-spin">
                  <Database className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-700 block">{uploadStage}</span>
                  <span className="text-[10px] text-slate-400 font-mono block">Indexing tokens: {uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-500 h-1.5 rounded-full transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-700 block">Drag & drop files or <span className="text-emerald-600 underline">browse</span></span>
                  <span className="text-[10px] text-slate-400 block mt-1">
                    {canUpload ? "Your file will be instantly parsed and mapped to vectors" : "Disabled under your Employee role permissions"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Inventory list */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs text-left flex-1 flex flex-col">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
            <h3 className="font-bold text-sm text-slate-800">Workspace Document Library</h3>
            <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 font-bold rounded">
              {documents.length} Items Indexed
            </span>
          </div>

          {documents.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs flex-1 flex flex-col justify-center">
              No files are uploaded in this workspace. Ingest files above to start chatting!
            </div>
          ) : (
            <div className="overflow-y-auto flex-1 space-y-2.5 max-h-[350px] pr-1">
              {documents.map((doc) => {
                const isSelected = selectedDocForChunks?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    className={`p-3.5 rounded-lg border transition flex items-center justify-between text-left ${
                      isSelected 
                        ? "border-emerald-500 bg-emerald-50/10 shadow-xs" 
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer" onClick={() => handleLoadChunks(doc)}>
                      <div className="p-2.5 bg-slate-100 rounded-lg text-slate-500 shrink-0 mt-0.5">
                        {doc.name.endsWith(".md") ? <FileCode className="w-4.5 h-4.5 text-blue-500" /> : <FileText className="w-4.5 h-4.5 text-emerald-600" />}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-800 text-xs truncate max-w-[150px] sm:max-w-xs">{doc.name}</h4>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[180px] sm:max-w-sm">
                          Uploaded: {new Date(doc.uploadDate).toLocaleDateString()} • By: {doc.uploadedBy}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                            {(doc.size / 1024).toFixed(1)} KB
                          </span>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded">
                            {doc.chunkCount} Nodes
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-3">
                      <button
                        onClick={() => handleLoadChunks(doc)}
                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition"
                        title="Inspect Chunks"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      
                      {/* Delete action. Only Admins can delete */}
                      <button
                        onClick={() => {
                          if (currentUser.role === UserRole.ADMIN) {
                            onDeleteDocument(doc.id);
                            if (selectedDocForChunks?.id === doc.id) {
                              setSelectedDocForChunks(null);
                              setDocChunks([]);
                            }
                          } else {
                            setErrorMsg("RBAC Restriction: Only Admins can delete documents from the global database. Switch identity to Sarah Jenkins (Admin) in the footer switchboard.");
                          }
                        }}
                        className={`p-1.5 rounded transition ${
                          currentUser.role === UserRole.ADMIN
                            ? "hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                            : "text-slate-300 cursor-not-allowed"
                        }`}
                        title={currentUser.role === UserRole.ADMIN ? "Delete from index" : "Admins only"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Chunks Ingestion Inspector (Drawer interface) */}
      <div className="w-full md:w-80 bg-white border border-slate-200 rounded-xl shadow-xs p-5 flex flex-col text-left">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4 shrink-0">
          <div className="flex items-center gap-1.5">
            <Database className="w-4.5 h-4.5 text-emerald-600" />
            <h3 className="font-bold text-xs text-slate-800">Chunk & Vector Inspector</h3>
          </div>
          {selectedDocForChunks && (
            <button onClick={() => setSelectedDocForChunks(null)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {!selectedDocForChunks ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
            <File className="w-10 h-10 text-slate-200 mb-2.5" />
            <h4 className="font-bold text-slate-500 text-xs">No File Selected</h4>
            <p className="text-[10px] text-slate-400 mt-1">
              Click on any document in the repository library to inspect its underlying logical vector chunks and metadata tokens.
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="pb-3 border-b border-slate-150 text-xs shrink-0">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">Selected Asset</span>
              <h4 className="font-bold text-slate-800 truncate mt-0.5">{selectedDocForChunks.name}</h4>
              <p className="text-[10px] text-slate-500 mt-1 font-medium italic">
                "{selectedDocForChunks.metadata.description}"
              </p>
            </div>

            <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">
                Extracted Chunks ({docChunks.length})
              </span>

              {loadingChunks ? (
                <div className="space-y-2.5 pt-4">
                  <div className="h-16 bg-slate-50 rounded-lg animate-pulse"></div>
                  <div className="h-20 bg-slate-50 rounded-lg animate-pulse"></div>
                  <div className="h-14 bg-slate-50 rounded-lg animate-pulse"></div>
                </div>
              ) : (
                docChunks.map((chunk) => (
                  <div key={chunk.id} className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] leading-relaxed relative">
                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono font-bold uppercase tracking-wider border-b border-slate-200/60 pb-1 mb-1.5">
                      <span>Chunk {chunk.chunkIndex}</span>
                      <span>Page {chunk.pageNumber || 1}</span>
                    </div>
                    <p className="text-slate-600 whitespace-pre-wrap select-all">{chunk.text}</p>
                    <div className="mt-2 text-[9px] text-emerald-600 font-mono font-semibold flex items-center gap-1 justify-end">
                      <CheckCircle className="w-3 h-3" /> Token Index Synced
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
