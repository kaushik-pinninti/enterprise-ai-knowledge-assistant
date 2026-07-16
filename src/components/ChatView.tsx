/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, 
  Send, 
  MessageSquare, 
  FileText, 
  ChevronDown, 
  Sparkles, 
  Link2, 
  Copy, 
  Check, 
  Download, 
  FileSearch, 
  Database,
  Mic,
  Sliders,
  Volume2,
  VolumeX,
  Square,
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { ChatSession, Message, Document } from "../types";

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

interface ChatViewProps {
  documents: Document[];
  sessions: ChatSession[];
  activeSession: ChatSession | null;
  messages: Message[];
  loadingMessage: boolean;
  onSelectSession: (session: ChatSession) => void;
  onCreateSession: (title?: string) => Promise<ChatSession>;
  onSendMessage: (message: string, selectedDocIds: string[]) => void;
  onVoiceCommand?: (command: string) => void;
}

export default function ChatView({
  documents,
  sessions,
  activeSession,
  messages,
  loadingMessage,
  onSelectSession,
  onCreateSession,
  onSendMessage,
  onVoiceCommand,
}: ChatViewProps) {
  const [inputText, setInputText] = useState("");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [showDocSelector, setShowDocSelector] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<any | null>(null);
  const [showNewSessionModal, setShowNewSessionModal] = useState(false);
  const [sessionTitleInput, setSessionTitleInput] = useState("");
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);

  const handleShareSession = async () => {
    if (!activeSession) return;
    try {
      const res = await fetch(`/api/chat/sessions/${activeSession.id}/share`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const shareUrl = `${window.location.origin}${data.shareUrl}`;
        await navigator.clipboard.writeText(shareUrl);
        setShareLinkCopied(true);
        setTimeout(() => setShareLinkCopied(false), 3000);
      }
    } catch (e) {
      console.error("Failed to share session", e);
    }
  };

  // Voice AI States
  const [isRecording, setIsRecording] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("Zephyr");
  const [voiceSpeed, setVoiceSpeed] = useState(1.0);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [transcribing, setTranscribing] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  // Update selected document IDs whenever documents change
  useEffect(() => {
    setSelectedDocIds(documents.map((d) => d.id));
  }, [documents]);

  // Scroll to bottom when messages list changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingMessage]);

  // Stop playing speech on component unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const handleSend = () => {
    if (!inputText.trim() || loadingMessage) return;
    onSendMessage(inputText.trim(), selectedDocIds);
    setInputText("");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleDocSelection = (id: string) => {
    if (selectedDocIds.includes(id)) {
      setSelectedDocIds(selectedDocIds.filter((docId) => docId !== id));
    } else {
      setSelectedDocIds([...selectedDocIds, id]);
    }
  };

  const handleCopy = (text: string, msgId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(msgId);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const handleExportChat = () => {
    if (messages.length === 0) return;
    const md = messages
      .map((m) => `### ${m.role === "user" ? "USER" : "ASSISTANT"} (${new Date(m.timestamp).toLocaleString()})\n\n${m.content}\n`)
      .join("\n---\n\n");

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Thread_Export_${activeSession?.title.replace(/\s+/g, "_") || "Chat"}.md`;
    a.click();
  };

  const handleCreateNewSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionTitleInput.trim()) return;
    try {
      const sess = await onCreateSession(sessionTitleInput.trim());
      setSessionTitleInput("");
      setShowNewSessionModal(false);
      onSelectSession(sess);
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // Voice AI Logic
  // ----------------------------------------------------

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      } catch (e) {
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setTranscribing(true);
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(",")[1];
          await transcribeAndProcess(base64Audio);
        };
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const transcribeAndProcess = async (base64Audio: string) => {
    try {
      const response = await fetch("/api/voice/stt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64Audio })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.text) {
          const phrase = data.text.toLowerCase().trim();

          // Voice Commands processing
          if (phrase.includes("open dashboard") || phrase.includes("go to dashboard") || phrase === "dashboard") {
            if (onVoiceCommand) onVoiceCommand("dashboard");
            return;
          }
          if (phrase.includes("search documents") || phrase.includes("search for")) {
            const query = phrase.replace("search documents", "").replace("search for", "").trim();
            if (onVoiceCommand) onVoiceCommand(`search:${query}`);
            return;
          }
          if (phrase.includes("upload file") || phrase.includes("go to documents") || phrase === "documents") {
            if (onVoiceCommand) onVoiceCommand("documents");
            return;
          }
          if (phrase.includes("create workspace") || phrase.includes("new workspace")) {
            if (onVoiceCommand) onVoiceCommand("create_workspace");
            return;
          }
          if (phrase.includes("logout") || phrase.includes("sign out")) {
            if (onVoiceCommand) onVoiceCommand("logout");
            return;
          }

          // Fallback to text inside input bar
          setInputText(data.text);
        }
      }
    } catch (err) {
      console.error("Failed to transcribe:", err);
    } finally {
      setTranscribing(false);
    }
  };

  const handleSpeakText = async (text: string, msgId: string) => {
    if (speakingMsgId === msgId) {
      if (audioRef.current) {
        if (audioRef.current.paused) {
          audioRef.current.play();
        } else {
          audioRef.current.pause();
          setSpeakingMsgId(null);
        }
      }
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Strip citations & markdown elements for clean TTS output
    const cleanText = text.replace(/\[.*?\]/g, "").replace(/[*#`_-]/g, "");

    try {
      setSpeakingMsgId(msgId);
      const response = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: cleanText, voice: selectedVoice })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audio) {
          const audio = new Audio(`data:audio/wav;base64,${data.audio}`);
          audio.playbackRate = voiceSpeed;
          audio.onended = () => setSpeakingMsgId(null);
          audioRef.current = audio;
          audio.play();
        } else {
          setSpeakingMsgId(null);
        }
      } else {
        setSpeakingMsgId(null);
      }
    } catch (err) {
      console.error("TTS play failed:", err);
      setSpeakingMsgId(null);
    }
  };

  const handleStopSpeaking = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSpeakingMsgId(null);
  };

  return (
    <div id="view-chat" className="flex h-full font-sans bg-slate-50/50">
      
      {/* Session List Panel */}
      <div className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0 text-left">
        <div className="p-4 border-b border-slate-150 flex justify-between items-center bg-slate-50">
          <span className="font-bold text-xs text-slate-700 uppercase tracking-wider font-mono">Chat Records</span>
          <button
            onClick={() => setShowNewSessionModal(true)}
            className="p-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {sessions.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-[10px]">No chats created yet in workspace.</div>
          ) : (
            sessions.map((sess) => (
              <button
                key={sess.id}
                onClick={() => onSelectSession(sess)}
                className={`w-full text-left p-2.5 rounded-lg text-xs flex items-center gap-2.5 transition duration-150 ${
                  activeSession?.id === sess.id 
                    ? "bg-slate-100 text-slate-800 font-bold" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                <MessageSquare className="w-4 h-4 shrink-0 text-slate-400" />
                <span className="truncate flex-1">{sess.title}</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white border-r border-slate-200">
        
        {/* Chat Header Controls */}
        <div className="h-14 border-b border-slate-200 px-6 flex items-center justify-between shrink-0 bg-slate-50">
          <div className="flex items-center gap-2 text-left">
            <span className="text-sm font-bold text-slate-800 truncate">
              {activeSession ? activeSession.title : "Workspace Assisting Module"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Context Document Selector Toggle */}
            <div className="relative">
              <button
                onClick={() => setShowDocSelector(!showDocSelector)}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-[10px] font-semibold text-slate-600 flex items-center gap-1.5 transition"
              >
                <Database className="w-3.5 h-3.5 text-slate-500" />
                <span>Scope ({selectedDocIds.length}/{documents.length})</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showDocSelector && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-3 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-150 mb-2 text-left">
                    <span className="font-bold text-slate-700">Context Documents</span>
                    <button
                      onClick={() => setSelectedDocIds(documents.map(d => d.id))}
                      className="text-[9px] text-emerald-600 hover:underline font-semibold"
                    >
                      Select All
                    </button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 text-left">
                    {documents.length === 0 ? (
                      <div className="text-center py-4 text-slate-400 text-[10px]">No files available in workspace.</div>
                    ) : (
                      documents.map((doc) => (
                        <label key={doc.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded cursor-pointer truncate">
                          <input
                             type="checkbox"
                             checked={selectedDocIds.includes(doc.id)}
                             onChange={() => toggleDocSelection(doc.id)}
                             className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                          />
                          <span className="truncate text-slate-600 flex-1">{doc.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Share conversation */}
            {activeSession && (
              <button
                onClick={handleShareSession}
                className={`p-1.5 rounded-lg transition flex items-center gap-1.5 text-[10px] font-bold ${
                  shareLinkCopied 
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-150 shadow-xs" 
                    : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                }`}
                title="Get public share link"
              >
                <Link2 className="w-3.5 h-3.5" />
                {shareLinkCopied ? <span>Link Copied!</span> : <span>Share</span>}
              </button>
            )}

            {/* Export conversation */}
            {messages.length > 0 && (
              <button
                onClick={handleExportChat}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
                title="Export thread as Markdown"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Conversation window */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto space-y-3 p-6 animate-fade-in">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-xs">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">Enterprise AI Knowledge Assistant</h3>
              <p className="text-xs text-slate-500 leading-normal">
                Ask a question about vacation policies, performance cycles, marketing guidelines, or whatever document content is ingested inside this active workspace!
              </p>
              
              <div className="w-full pt-4 grid grid-cols-1 gap-2">
                <button
                  onClick={() => setInputText("How many vacation days do employees receive in 2026?")}
                  className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:border-emerald-450 hover:bg-emerald-50/5 rounded-lg text-left text-[11px] transition duration-150 leading-relaxed font-medium block shadow-xs"
                >
                  "How many vacation days do employees receive in 2026?"
                </button>
                <button
                  onClick={() => setInputText("What metrics track success in the Q3 Campaign Strategy playbook?")}
                  className="p-2.5 bg-white border border-slate-200 text-slate-600 hover:border-emerald-450 hover:bg-emerald-50/5 rounded-lg text-left text-[11px] transition duration-150 leading-relaxed font-medium block shadow-xs"
                >
                  "What metrics track success in the Q3 Campaign Strategy playbook?"
                </button>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isAssistant = msg.role === "assistant";
              const isPlaying = speakingMsgId === msg.id;

              return (
                <div
                  key={msg.id}
                  className={`flex gap-4.5 text-left max-w-3xl animate-fade-in ${
                    isAssistant ? "mr-auto animate-slide-in-left" : "ml-auto flex-row-reverse animate-slide-in-right"
                  }`}
                >
                  {/* Avatar */}
                  <div className={`w-8.5 h-8.5 rounded-xl shrink-0 flex items-center justify-center text-xs font-bold shadow-xs ${
                    isAssistant ? "bg-emerald-600 text-white" : "bg-slate-700 text-white"
                  }`}>
                    {isAssistant ? <Sparkles className="w-4.5 h-4.5" /> : "U"}
                  </div>

                  {/* Bubble Container */}
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-700">
                        {isAssistant ? "Enterprise AI Assistant" : "You"}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      
                      {isAssistant && msg.providerUsed && (
                        <div className="flex items-center gap-1 text-[9px] font-semibold bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono border border-emerald-100 uppercase">
                          AI: {msg.providerUsed}
                        </div>
                      )}

                      {isAssistant && msg.confidenceScore && (
                        <div className="flex items-center gap-1 text-[9px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                          Confidence: {Math.round(msg.confidenceScore * 100)}%
                        </div>
                      )}
                    </div>

                    <div className={`p-4 rounded-2xl text-xs leading-relaxed font-medium text-slate-700 relative overflow-hidden group shadow-xs ${
                      isAssistant 
                        ? "bg-white border border-slate-200/85" 
                        : "bg-slate-800 text-slate-100"
                    }`}>
                      {/* Render Content */}
                      <p className="whitespace-pre-wrap">{msg.content}</p>

                      {/* Source citations */}
                      {isAssistant && msg.citations && msg.citations.length > 0 && (
                        <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1 font-mono">Sources Citation:</span>
                          {msg.citations.map((cit, idx) => (
                            <button
                              key={idx}
                              onClick={() => setSelectedCitation(cit)}
                              className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-[10px] font-bold text-emerald-700 border border-emerald-100 rounded flex items-center gap-1 transition"
                            >
                              <Link2 className="w-3 h-3" />
                              <span>{cit.documentName.length > 20 ? cit.documentName.slice(0, 18) + "..." : cit.documentName}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Action items on hover & Voice Controls */}
                      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition flex gap-1 bg-white border border-slate-200/80 rounded-md p-0.5 shadow-xs">
                        {isAssistant && (
                          <button
                            onClick={() => handleSpeakText(msg.content, msg.id)}
                            className={`p-1 rounded transition ${isPlaying ? "text-rose-500 bg-rose-50 hover:bg-rose-100" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100"}`}
                            title={isPlaying ? "Stop Speaking" : "Listen to Response"}
                          >
                            {isPlaying ? <VolumeX className="w-3.5 h-3.5 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition"
                          title="Copy response"
                        >
                          {copiedMessageId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>

                      {/* Speech active visualizer */}
                      {isPlaying && (
                        <div className="mt-3 bg-slate-50 border border-slate-150 p-2 rounded-xl flex items-center gap-3 font-mono text-[9px] text-slate-500">
                          <Volume2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 animate-bounce" />
                          <span className="flex-1">Voice synthesis active ({selectedVoice} Voice)...</span>
                          <button 
                            onClick={handleStopSpeaking}
                            className="bg-slate-200 hover:bg-slate-300 px-2 py-0.5 rounded font-bold text-slate-700 flex items-center gap-0.5"
                          >
                            <Square className="w-2.5 h-2.5" /> Stop
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Follow-up suggestions */}
                    {isAssistant && msg.followUpSuggestions && msg.followUpSuggestions.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-2 text-left">
                        {msg.followUpSuggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => setInputText(suggestion)}
                            className="px-3 py-1.5 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-[10px] text-slate-600 hover:text-emerald-800 font-medium rounded-full transition shadow-xs"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {loadingMessage && (
            <div className="flex gap-4.5 text-left max-w-3xl mr-auto animate-pulse">
              <div className="w-8.5 h-8.5 rounded-xl shrink-0 bg-slate-200 flex items-center justify-center">
                <Sliders className="w-4 h-4 text-slate-400 animate-spin" />
              </div>
              <div className="space-y-1.5 flex-1">
                <span className="text-[11px] font-bold text-slate-400">Thinking and querying documents...</span>
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                  <div className="h-3 bg-slate-100 rounded w-full"></div>
                  <div className="h-3 bg-slate-100 rounded w-5/6"></div>
                  <div className="h-3 bg-slate-100 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Voice Command helper bar when recording */}
        {isRecording && (
          <div className="mx-4 p-2 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-800 flex items-center justify-between text-left animate-pulse shadow-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
              <span><b>Live Recording User Audio...</b> Speak a Voice command like: <i>"open dashboard"</i>, <i>"go to documents"</i>, or ask a standard RAG question!</span>
            </div>
            <button onClick={stopRecording} className="bg-rose-600 text-white font-bold px-2 py-0.5 rounded text-[9px]">Stop Recording</button>
          </div>
        )}

        {transcribing && (
          <div className="mx-4 p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[10px] text-emerald-800 flex items-center gap-2 text-left animate-pulse shadow-sm">
            <Sliders className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            <span><b>Whisper-Grade Transcription active...</b> Feeding PCM stream to Gemini API for high-fidelity transcription.</span>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 bg-white border-t border-slate-200 shrink-0 text-left">
          <div className="max-w-3xl mx-auto relative flex gap-2">
            
            {/* Voice controls & Settings trigger */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`p-3 rounded-xl transition ${isRecording ? "bg-rose-500 text-white animate-bounce shadow-lg shadow-rose-950/20" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                title={isRecording ? "Stop Recording Voice" : "Record Voice Question"}
              >
                <Mic className="w-4 h-4" />
              </button>
              
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowVoiceSettings(!showVoiceSettings)}
                  className={`p-3 rounded-xl transition ${showVoiceSettings ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}
                  title="Voice Preferences"
                >
                  <Sliders className="w-4 h-4" />
                </button>

                {showVoiceSettings && (
                  <div className="absolute bottom-12 left-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 p-4 text-xs animate-in slide-in-from-bottom-2 duration-150">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-150 mb-3 text-left">
                      <span className="font-bold text-slate-700 flex items-center gap-1"><Volume2 className="w-3.5 h-3.5" /> Voice AI Panel</span>
                      <button onClick={() => setShowVoiceSettings(false)} className="text-[10px] text-slate-400 font-bold hover:text-slate-600">Close</button>
                    </div>

                    <div className="space-y-3.5 text-left">
                      <div>
                        <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1 font-mono">Speaker Character</label>
                        <select
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 text-xs rounded cursor-pointer"
                        >
                          <option value="Zephyr">Zephyr (Cheerfully Calm)</option>
                          <option value="Puck">Puck (Tech Forward)</option>
                          <option value="Fenrir">Fenrir (Deep Voice)</option>
                          <option value="Kore">Kore (Warm Professional)</option>
                          <option value="Charon">Charon (Corporate Bold)</option>
                        </select>
                      </div>

                      <div>
                        <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 font-mono">
                          <span>Speaking Speed</span>
                          <span className="text-slate-700">{voiceSpeed}x</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.1"
                          value={voiceSpeed}
                          onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                          className="w-full accent-emerald-600 cursor-pointer"
                        />
                      </div>

                      <div className="p-2 bg-emerald-50/50 border border-emerald-100 rounded text-[9px] text-slate-500 leading-normal flex items-start gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-700">Supported Voice Commands:</span>
                          <p className="mt-0.5 italic text-[8.5px]">"open dashboard", "go to documents", "search documents &lt;query&gt;", "logout"</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Main input text field */}
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Ask me anything about vacation policies, campaign rules, budgets, manuals..."
              rows={1}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/35 focus:border-emerald-500 transition resize-none leading-relaxed"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || loadingMessage}
              className={`px-4 bg-emerald-600 text-white rounded-xl text-xs font-semibold flex items-center justify-center transition-all shrink-0 ${
                inputText.trim() && !loadingMessage ? "hover:bg-emerald-500 shadow-md shadow-emerald-950/20" : "opacity-50 cursor-not-allowed"
              }`}
            >
              <Send className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Side Citation Viewer Panel (Drawers on click) */}
      {selectedCitation && (
        <div className="w-80 bg-white border-l border-slate-200 shadow-2xl h-full flex flex-col text-left shrink-0 animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
            <h4 className="font-bold text-xs text-slate-700 flex items-center gap-1.5">
              <FileSearch className="w-4 h-4 text-emerald-600" />
              Citation Details
            </h4>
            <button onClick={() => setSelectedCitation(null)} className="p-1 hover:bg-slate-200 rounded text-slate-400">
              <Plus className="w-4 h-4 rotate-45" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Source File</span>
              <h5 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 break-all">
                <FileText className="w-4 h-4 text-slate-500" />
                {selectedCitation.documentName}
              </h5>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[9px] font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                  Page {selectedCitation.pageNumber || 1}
                </span>
                <span className="text-[9px] font-mono font-semibold px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded border border-emerald-100 flex items-center gap-0.5">
                  Verified Chunk Index
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-3 border-t border-slate-100">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Matching Excerpt</span>
              <div className="p-3 bg-slate-50 rounded-lg text-[11px] leading-relaxed text-slate-600 whitespace-pre-wrap border border-slate-200 italic font-medium">
                "{selectedCitation.snippet}"
              </div>
            </div>

            <div className="bg-emerald-50 text-emerald-800 p-3 rounded-lg border border-emerald-100 text-[10px] leading-normal flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <span className="font-bold">Fact-Checked & Anchored</span>
                <p className="mt-0.5 text-emerald-700 leading-normal">
                  Our system verifies that generated answers align strictly with the matching highlighted text snippet.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Session Modal */}
      {showNewSessionModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-xl max-w-sm w-full p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 text-left">
              <h3 className="font-bold text-sm text-slate-800">Create Chat Session</h3>
              <button onClick={() => setShowNewSessionModal(false)} className="p-1 hover:bg-slate-100 rounded text-slate-400">
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateNewSession} className="mt-4 space-y-4 text-left">
              <div>
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1 font-mono">
                  Session Topic / Title
                </label>
                <input
                  type="text"
                  required
                  value={sessionTitleInput}
                  onChange={(e) => setSessionTitleInput(e.target.value)}
                  placeholder="e.g. Q3 Social Campaign Q&A"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 text-xs rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSessionModal(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-emerald-950/15"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
